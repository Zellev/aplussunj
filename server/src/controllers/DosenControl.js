const { User, Dosen, Matakuliah, Kelas, Paket_soal, Ujian, 
        Ref_kel_matkul, Ref_jenis_ujian, Ref_peminatan, 
        Soal_essay, Rel_paketsoal_soal, Rel_mahasiswa_paketsoal, 
        Rel_mahasiswa_kelas, Mahasiswa, Jawaban_mahasiswa } = require('../models');
const { createKode, paginator, paginatorMN, 
        shuffleArray, dateFull, todaysdate } = require('../helpers/global');
const { Op, fn, col } = require('sequelize');
const { ujianValidator, soalValidator } = require('../validator/SearchValidator');
const { promisify } = require('util');
const ExcelJS = require('exceljs');
const CacheControl = require('../controllers/CacheControl');
const jp = require('jsonpath');
const fs = require('fs');
const createError = require('../errorHandlers/ApiErrors');
const pdf = require('html-pdf');
const unlinkAsync = promisify(fs.unlink);
const path = require('path');
const config = require('../config/dbconfig');

const pathAll = (filename, filetype) => {
  if(filetype === 'xlsx'){
    return path.join(__dirname,'../../public/fileuploads/xlsxInput/' + filename);
  } else if(filetype === 'pdf'){
    return path.join(__dirname,'../../public/pdftemplate/' + filename);
  } else if(filetype === 'picture'){
    return path.join(__dirname,'../../public/fileuploads/picInput/gambar_soal/' + filename);
  }
}

const getKelas = async (options) => {
  const user = options.req;
  const kelas = await user.getDosen({
    attributes: ['id_dosen'],
    include: {
      model: Kelas, as: 'Kelases',
      attributes: ['id_kelas', 'id_matkul'],
      through: { attributes: [] }
    }
  });
  const kelasJson = kelas.toJSON();
  if('id_kelas' in options){
    if(Array.isArray(options.id_kelas)===true){
      return kelasJson.Kelases.some((i) => {
        return options.id_kelas.map(j => parseInt(j.id_kelas))
              .includes((parseInt(i.id_kelas)))
      });
    }
    return kelasJson.Kelases.map(i => i.id_kelas).includes(parseInt(options.id_kelas));
  }
  return kelasJson.Kelases.map(i => i.id_matkul).includes(parseInt(options.id_matkul));
}

// const pkCheck = async (idSeksi, tanggal_mulai, waktu_mulai ) => { await Paket_soal.findAll({
//     where:{
//       [Op.and]:[
//         {tanggal_mulai: tanggal_mulai}, {waktu_mulai:waktu_mulai}, {status:'terbit'}, 
//         {aktif:1}, {'$Kelases.id_seksi$': {[Op.eq]:idSeksi}}
//       ]
//     },
//     include:{model:Kelas, as:'Kelases'}
//   });
//   if(pkCheck.length !== 0){
//     const filterProc = ({id_seksi}) => id_seksi !== idSeksi;
//     let kosek = pkCheck.flatMap(el => el.Kelases).filter(filterProc);
//     kosek = kosek.map(({id_seksi}) => id_seksi)
//     return createError.Conflict(`waktu mulai ujian ${waktu_mulai} pada kelas ini
//           bentrok dengan kelas ${kosek} pada tanggal ${tanggal_mulai}`);
//   } else {
//     return;
//   }
// } // check paket soal yang bentrok dengan kelas

// function getUjianhistoryAll, getSoalHistory?

const getHistory = async (user, include) => {
  let obj, data, key;
  if(include === 'ujian'){
    obj = {
      model: Ujian, as: 'Ujians',
      attributes: {
        exclude: ['durasi_per_soal', 'bobot_per_soal', 'status_ujian', 
        'aktif', 'created_at', 'updated_at']
      },
      include: [        
        {model: Ref_jenis_ujian, as: 'RefJenis', attributes: ['jenis_ujian']},
        {model: Paket_soal, as: 'Paketsoals', attributes: ['id_paket'], 
          include: {model: Soal_essay, as: 'Soals', attributes: ['id_soal'], 
          through: {attributes: []}}
        },
      ]
    }
  } else {
    obj = {
      model: Soal_essay, as: 'Soals',
      attributes: {
        exclude: ['created_at', 'updated_at']
      },
      include: [
        // {model: Paket_soal, as: 'Paketsoals', attributes: ['id_paket']},
        {model: Matakuliah, as: 'Matkul', attributes: ['id_matkul', 'nama_matkul']},
      ]
    }
  }
  const dosen = await user.getDosen({ include: [ obj ] });
  const dosenJson = dosen.toJSON();
  const nama = dosenJson.nama_lengkap.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
  const dataDosen = {
    username: user.username,
    nidn: dosenJson.NIDN,
    nidk: dosenJson.NIDK,
    nama_lengkap: nama,
  }
  if(include === 'ujian'){
    data = dosenJson.Ujians.map((i) => {
      return {
        no_ujian: i.id_ujian,
        jenis_ujian: i.RefJenis.jenis_ujian,
        judul_ujian: i.judul_ujian,        
        tanggal_mulai: i.tanggal_mulai,
        waktu_mulai: i.waktu_mulai,
        durasi_ujian: i.durasi_ujian,
        bobot_total: i.bobot_total,
        deskripsi: i.deskripsi,
        jml_paket: i.PaketSoals.length,
        jml_soal: i.PaketSoals[0].Soals.length,
      }
    }); key = 'ujian';
  } else {     
    data = dosenJson.Soals.map((i) => {
      let gmbr, audio, video;
      !i.gambar_soal.length ? gmbr = 0 : gmbr = i.gambar_soal.length;
      !i.audio_soal ? audio = 0 : audio = 1;
      !i.video_soal ? video = 0 : video = 1;
      return {
        no_soal: i.id_soal,
        matakuliah: i.Matkul.nama_matkul,
        soal: i.soal,
        gambar_soal: gmbr,
        audio_soal: audio,
        video_soal: video,
        status: i.status
      }
    }); key = 'soal';
  }
  return {
    dosen: dataDosen,
    [key]: data
  }
}

module.exports = {

  async getStatus(req, res, next){
    try {
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: [
          {
            model: Kelas, as: 'Kelases', attributes: ['id_kelas'],
            include: {model: Ujian, as: 'Ujians', attributes: ['id_ujian']}
          },
          {model: Soal_essay, as: 'Soals', attributes: ['id_soal']}
        ]
      })
      const totalKelas = dosen.Kelases.length
      const totalSoal = dosen.Soals.length
      let sumUjian = 0;
      for (let i of dosen.Kelases){
        const ujian = i.Ujians.length
        sumUjian += ujian;
      }
      CacheControl.getStatus(req);
      res.status(200).json({
        total_kelas: totalKelas,
        total_ujian: sumUjian,
        total_soal: totalSoal
      });
    } catch (error) {
      next(error);
    }
  },

  async getDashboard(req, res, next){ 
    try {
      const user = req.user;
      const dosen = await user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases',
          through: {attributes:[]},
          include: {
            model: Ujian, as: 'Ujians', where: {status_ujian:'draft'}, required: false,
            include: {
              model: Paket_soal, as: 'PaketSoals'
            },                       
            through: {attributes:[]}
          },
          order: [
            [{ model: Ujian, as: 'Ujians' }, 'created_at', 'ASC']
          ]
        }
      });
      const kelasJson = dosen.toJSON();
      const kelasDosen = await Promise.all(kelasJson.Kelases.map(async (i) => {        
        const matkul = await Matakuliah.findOne({
          attributes:['id_matkul','nama_matkul'],
          where:{id_matkul: i.id_matkul}
        });
        return {
          id_kelas: i.id_kelas,
          kode_seksi: i.kode_seksi,
          matakuliah: matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          deskripsi: i.deskripsi,
        }
      }));
      const ujian = jp.query(kelasJson, '$.Kelases[*].Ujians[*]');
      const soal = await Soal_essay.findAll({
        where:{[Op.and]:[{id_dosen: dosen.id_dosen}, {status: 'draft'}]},
        order: [['created_at', 'ASC']]
      });
      CacheControl.getDashboardDosen(req);
      res.status(200).json({
        kelas: kelasDosen,
        ujian_draft: ujian,
        soal_draft: soal
      });
    } catch (error) {
      next(error);
    }
  },
  
  async getAllMatkulDosen(req, res, next){
    try {      
      const user = req.user;
      const dosen = await user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases',
          attributes: ['id_kelas','id_matkul'],
          through: {attributes:[]},
          include: {
            model: Matakuliah, as: 'Matkul'
          }
        }
      });
      const kelasJson = dosen.toJSON();
      const matkul = jp.query(kelasJson, '$.Kelases[*].Matkul');
      CacheControl.getAllMatkulDosen(req);
      res.status(200).json({
        matakuliah: matkul
      });
    } catch (error) {
      next(error);
    }
  },

  async getMatkul(req, res, next) {
    try {
      const { id_matkul } = req.params;
      const val = await Matakuliah.findOne({
        where: {id_matkul: id_matkul},
        include: [
          {model: Ref_kel_matkul, as: 'KelMk', attributes: ['id_kel_mk','kelompok_matakuliah']},
          {model: Ref_peminatan, as: 'RefPemin', attributes: ['id_peminatan','peminatan']}
        ]
      });
      if (!val) { throw createError.NotFound('data matakuliah tidak ditemukan.')}
      const matkul = {
        id_matkul: val.id_matkul,
        kode_matkul: val.kode_matkul,
        kelompok_Mk: val.KelMk.kelompok_matakuliah,
        peminatan: val.RefPemin.peminatan,
        nama_matkul: val.nama_matkul,
        sks: val.sks,
        desktripsi: val.desktripsi,
        created_at: val.created_at,
        updated_at: val.updated_at
      };
      CacheControl.getMatkulDosen(req);
      res.status(200).json(matkul);
    } catch (error) {
      next(error);
    }
  },

  async getAllKelasDosen(req, res, next){
    try {      
      const user = req.user;
      const dosen = await user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases',
          through: {attributes:[]},
          include: {
            model: Matakuliah, as: 'Matkul', attributes: ['nama_matkul']
          }
        }
      });
      const kelasJson = dosen.toJSON();
      const kelasDosen = kelasJson.Kelases.map((i) => {
        return {
          id_kelas: i.id_kelas,
          kode_seksi: i.kode_seksi,
          matakuliah: i.Matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          deskripsi: i.deskripsi,
        }
      });
      CacheControl.getAllKelasDosen(req);
      res.status(200).json({
        kelas: kelasDosen
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      let path = req.route.path;
      let dosen, dosenUser;
      if(path === '/profil-dosen/:id_dosen'){
        const { id_dosen } = req.params;
        dosen = await Dosen.findOne({
            where: {id_dosen: id_dosen}
        });        
        if(!dosen){throw createError.NotFound('user tidak ditemukan.')}
        dosenUser = await dosen.getUser({
          attributes: {exclude: ['password','id_role']}
        });
        CacheControl.getProfilDosen(req);        
      } else {
        dosen = await Dosen.findOne({
          where: {id_user: req.user.id}
        });
        dosenUser = await dosen.getUser({
          attributes: {exclude: ['password','id_role']}
        });
        CacheControl.getmyProfileDosen(req); 
      }
      res.status(200).json({
        dosen: dosen,
        user: dosenUser
      });
    } catch (error) {
      next(error);
    }
  },

  async putProfile(req, res, next){
    try {
      const user = req.user;
      const { username, email, keterangan, nama_lengkap, alamat, no_telp } = req.body;        
      let updateVal1 = {
        username: username,
        email: email,
        keterangan: keterangan,
        updated_at: fn('NOW')
      };
      let updateVal2 = {
        nama_lengkap: nama_lengkap,
        alamat: alamat,
        nomor_telp: no_telp,
        updated_at: fn('NOW')
      };
      await User.update(updateVal1, {
        where: { id: user.id }
      });
      await Dosen.update(updateVal2, {
        where: { id_user: user.id }
      });
      CacheControl.putmyProfileDosen;
      res.status(200).json({
        success: true,
        msg: `profil anda berhasil diubah`
      });
    } catch (error) {
      next(error);
    }
  },
  // Paket soal operation
  async setUjian(req, res, next){
    try {
      const idKelas = req.body.id_kelas;
      const { judul_ujian, jenis_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, 
              durasi_per_soal, bobot_per_soal, bobot_total, deskripsi } = req.body;
      const refJenis = await Ref_jenis_ujian.findOne({
        attributes:['id_jenis_ujian','jenis_ujian'],
        where: {jenis_ujian: jenis_ujian}
      });
      // pkCheck(idKelas, date, waktu_mulai);
      const ujian = await Ujian.create({        
        judul_ujian: judul_ujian,
        id_jenis_ujian: refJenis.id_jenis_ujian,
        tanggal_mulai: tanggal_mulai,
        waktu_mulai: waktu_mulai,
        durasi_ujian: durasi_ujian,
        durasi_per_soal: durasi_per_soal,
        bobot_per_soal: bobot_per_soal,
        bobot_total: bobot_total,
        deskripsi: deskripsi,
        status_ujian: 'draft',
        tipe_penilaian: null,
        aktif: 0,
        created_at: fn('NOW')
      }).then(async (o) => {
        o.addKelases(idKelas);
      });
      CacheControl.postNewUjianDraft;
      res.status(200).json({
        success: true,
        msg: 'Ujian berhasil dibuat',
        id_ujian: ujian.id_ujian
      });
    } catch (error) {
      next(error);
    }
  },
  
  async setUjiandanRelasi(req, res, next){
    try {
      const kdPaket = createKode(config.codegen.panjang_kode_paket);
      const idKelas = req.body.id_kelas;
      let idPaket;        
      const { judul_ujian, jenis_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, durasi_per_soal, 
              bobot_per_soal, bobot_total, status_ujian, deskripsi, id_soal, bobot_soal, kata_kunci_soal,
              tipe_penilaian } = req.body;
      const refJenis = await Ref_jenis_ujian.findOne({
        attributes:['id_jenis_ujian','jenis_ujian'],
        where:{jenis_ujian:jenis_ujian}
      });
      // await pkCheck(idKelas, date, waktu_mulai);      
      await Ujian.create({
        judul_ujian: judul_ujian,
        id_jenis_ujian: refJenis.id_jenis_ujian,
        tanggal_mulai: tanggal_mulai,
        waktu_mulai: waktu_mulai,
        durasi_ujian: durasi_ujian,
        durasi_per_soal: durasi_per_soal,
        bobot_per_soal: bobot_per_soal,
        bobot_total: bobot_total,
        deskripsi: deskripsi,
        status_ujian: status_ujian,
        tipe_penilaian: tipe_penilaian,
        aktif: 1,
        created_at: fn('NOW')
      }).then(async (o) => {
        const json = o.toJSON();
        idPaket = await Paket_soal.create({
          kode_paket: kdPaket,
          id_ujian: json.id_ujian,          
          aktif: 1
        }).then((o) => {
          return o.get({plain:true})
        });
        o.addKelases(idKelas);
      });
      const soal = id_soal.map((i, j) => {
        let k = j + 1;
        if(!k) k = id_soal.indexOf(i)+1;      
        return {
          id_paket: idPaket.id_paket,
          id_soal: i,
          no_urut_soal: k,
          bobot_soal: bobot_soal[j],
          kata_kunci_soal: kata_kunci_soal[j] || null
        }        
      });
      await Rel_paketsoal_soal.bulkCreate(soal);
      CacheControl.postNewUjianAktif;
      res.status(200).json({
        success: true,
        msg: `Ujian dengan kode paket ${kdPaket} berhasil dibuat, dengan soal sebanyak ${id_soal.length} butir`,
        kode_paket: kdPaket
      }) 
    } catch (error) {
      next(error)
    }
  },

  async generatePaketSoalUjian(req, res, next){
    try {      
      const idKelas = req.body.id_kelas;
      const { jml_paket, judul_ujian, jenis_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, 
              durasi_per_soal, bobot_per_soal, bobot_total, deskripsi, id_soal, bobot_soal, 
              kata_kunci_soal, tipe_penilaian } = req.body;      
      let soal = [], i, arrIdPaket = [];
      const refJenis = await Ref_jenis_ujian.findOne({
        attributes:['id_jenis_ujian','jenis_ujian'],
        where:{jenis_ujian:jenis_ujian}
      });
      // await pkCheck(idKelas, date, waktu_mulai);      
      const ujian = await Ujian.create({
          judul_ujian: judul_ujian,
          id_jenis_ujian: refJenis.id_jenis_ujian,
          tanggal_mulai: tanggal_mulai,
          waktu_mulai: waktu_mulai,
          durasi_ujian: durasi_ujian,
          durasi_per_soal: durasi_per_soal,
          bobot_per_soal: bobot_per_soal,
          bobot_total: bobot_total,
          deskripsi: deskripsi,
          status_ujian: 'akan dimulai',
          tipe_penilaian: tipe_penilaian,
          aktif: 1,
          created_at: fn('NOW')
        })
      ujian.addKelases(idKelas);
      const json = ujian.toJSON();
      for(i = 0; i < jml_paket; i++){ 
        const kdPaket = await createKode(config.codegen.panjang_kode_paket);        
        const idPaket = await Paket_soal.create({
          id_ujian: json.id_ujian,
          kode_paket: kdPaket,
          aktif: 1
        }).then((o) => {
          return o.get({plain:true})
        });
        if(i > 0){
          shuffleArray(id_soal, kata_kunci_soal, bobot_soal);
          soal.push(id_soal.map((i, j) => {
            let k = j + 1;
            if(!k) k = id_soal.indexOf(i)+1;
            return {
              id_paket: idPaket.id_paket,
              id_soal: i,
              no_urut_soal: k,
              bobot_soal: bobot_soal[j],
              kata_kunci_soal: kata_kunci_soal[j] || null
            }        
          }));
        } else {
          soal.push(id_soal.map((i, j) => {
            let k = j + 1;
            if(!k) k = id_soal.indexOf(i)+1;
            return {
              id_paket: idPaket.id_paket,
              id_soal: i,
              no_urut_soal: k,
              bobot_soal: bobot_soal[j],
              kata_kunci_soal: kata_kunci_soal[j] || null
            }        
          }));
        }        
        arrIdPaket.push(kdPaket);
      }
      await Rel_paketsoal_soal.bulkCreate(soal.flat());
      const mhs = await Rel_mahasiswa_kelas.findAll({
        where: {id_kelas: idKelas},
        raw: true
      }).then((o) => { return o.map(({id_mahasiswa}) => { return id_mahasiswa})});
      if(mhs.length !== 0){
        shuffleArray(mhs);
        const mapped = mhs.map((i) => {
          const randomPaket = Math.floor(Math.random() * arrIdPaket.length);
          const idPaket = arrIdPaket[randomPaket]
          return {
            id_paket: idPaket,
            id_mhs: i
          }
        });
        await Rel_mahasiswa_paketsoal.bulkCreate(mapped, {
          updateOnDuplicate: ['id_paket', 'id_mhs']
        });
      }
      CacheControl.postNewUjianAktif;
      res.status(200).json({
        success: true,
        msg: `Ujian dengan ${jml_paket} paket soal berhasil dibuat, dengan soal sebanyak ${id_soal.length}
              butir per paket`
      });
    } catch (error) {
      next(error);
    }
  },

  async generatePaketSoal(req, res, next){
    try {
      const { id_ujian } = req.params;
      const { jml_paket, quota_soal } = req.body;
      const ujian = await Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: {
          model: Kelas, as: 'Kelases', attributes: ['id_matkul'],
          through: {attributes:[]}
        }
      });
      const idMatkul = ujian.Kelases[0].id_matkul;
      let opt = {
        req: req.user,
        id_matkul: idMatkul
      }
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        const dosen = await opt.req.getDosen({attributes:['id_dosen']});

        let soals = await Soal_essay.findAll({ attributes: ['id_soal'], // returns array of id_soal
        where: { [Op.and]: [{id_matkul: idMatkul}, {id_dosen: dosen.id_dosen}]} 
        }).then((o) => { return o.map(({id_soal}) => { return id_soal})}); // [ 1, 2, 3, 4, 5,...]

        if (!soals) throw createError.NotFound(`tidak ada soal pada matakuliah ${idMatkul}.`);
        if(!quota_soal) {
          throw createError.BadRequest('quota soal tidak boleh kosong!');
        } else if (typeof quota_soal !== 'number') {
          throw createError.BadRequest('quota soal berupa angka!')
        }
        let soal = [], i, arr = [];
        for(i = 0; i < jml_paket; i++){
          const kdPaket = await createKode(config.codegen.panjang_kode_paket); // PkSoal
          const idPaket = await Paket_soal.create({
            id_ujian: id_ujian,
            kode_paket: kdPaket,
            aktif: 1
          });
          // if(i > 0){  // Soal
            shuffleArray(soals);
            if(soals.length > quota_soal){
              soals.splice(quota_soal);
            }
            soal.push(soals.map((i, j) => {
              let k = j + 1;
              if(!k) k = soals.indexOf(i)+1;
              return {
                id_paket: idPaket.id,
                id_soal: i,
                no_urut_soal: k,
                bobot_soal: 0
              }        
            }));
          // } else {
          //   if(soals.length > quota_soal){
          //     soals.splice(quota_soal);
          //   }
          //   soal = soals.map((i, j) => {        
          //     return {
          //       id_paket: idPaket.id,
          //       id_soal: i,
          //       no_urut_soal: j + 1,
          //       bobot_soal: 0
          //     }        
          //   });
          // }
          arr.push(kdPaket);
        }
        await Rel_paketsoal_soal.bulkCreate(soal.flat());
        res.status(200).json({
          success: true,
          msg: `${jml_paket} paket soal berhasil dibuat untuk ujian ${ujian.judul_ujian},
                dengan ${quota_soal} butir soal per paket.`
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah data ujian ini...');
      }
    } catch (error) {
      next(error);
    }
  },

  async generatePaketSoalstrict(req, res, next){
    try {
      const { id_ujian } = req.params;
      const { jml_paket, id_soal, bobot_soal, kata_kunci_soal, tipe_penilaian } = req.body;
      const ujian = await Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: {
          model: Kelas, as: 'Kelases', attributes: ['id_kelas', 'id_matkul'],
          through: {attributes:[]}
        }
      });
      const idMatkul = ujian.Kelases[0].id_matkul;
      let opt = {
        req: req.user,
        id_matkul: idMatkul
      }
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        let soal = [], i, arrIdPaket = [];
        for(i = 0; i < jml_paket; i++){
          const kdPaket = await createKode(config.codegen.panjang_kode_paket);
          const idPaket = await Paket_soal.create({
            id_ujian: id_ujian,
            kode_paket: kdPaket,
            aktif: 1
          }).then((o) => { return o.get({plain:true}) });
          if(i > 0){
            shuffleArray(id_soal, kata_kunci_soal, bobot_soal);
            soal.push(id_soal.map((i, j) => {
              let k = j + 1;
              if(!k) k = id_soal.indexOf(i)+1;
              return {
                id_paket: idPaket.id_paket,
                id_soal: i,
                no_urut_soal: k,
                bobot_soal: bobot_soal[j],
                kata_kunci_soal: kata_kunci_soal[j] || null
              }
            }));
          } else {
            soal.push(id_soal.map((i, j) => {
              let k = j + 1;
              if(!k) k = id_soal.indexOf(i)+1;     
              return {
                id_paket: idPaket.id_paket,
                id_soal: i,
                no_urut_soal: k,
                bobot_soal: bobot_soal[j],
                kata_kunci_soal: kata_kunci_soal[j] || null
              }
            }));
          }
          arrIdPaket.push(idPaket);
        }
        await Ujian.update({
          tipe_penilaian: tipe_penilaian,
          status_ujian: 'akan dimulai',
          aktif: 1,
          updated_at: fn('NOW')
        }, {
          where: {id_ujian: id_ujian}
        });
        await Rel_paketsoal_soal.bulkCreate(soal.flat());
        for(let i of ujian.Kelases){ // relasikan tiap paket ke mhs yg ada di kelas ujian
          const mhs = await Rel_mahasiswa_kelas.findAll({
            where: {id_kelas: i.id_kelas},
            raw: true
          }).then((o) => { return o.map(({id_mahasiswa}) => { return id_mahasiswa})});
          if(mhs.length !== 0){
            shuffleArray(mhs);
            const mapped = mhs.map((i) => {
              const randomPaket = Math.floor(Math.random() * arrIdPaket.length);
              const idPaket = arrIdPaket[randomPaket]
              return {
                id_paket: idPaket,
                id_mhs: i
              }
            });
            await Rel_mahasiswa_paketsoal.bulkCreate(mapped, {
              updateOnDuplicate: ['id_paket', 'id_mhs']
            });
          }
        }
        CacheControl.postNewPaketSoal;
        res.status(200).json({
          success: true,
          msg: `${jml_paket} paket soal berhasil dibuat untuk ujian ${ujian.judul_ujian},
                dengan total ${id_soal.length} butir soal per paket.`
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah data ujian ini...');
      }
    } catch (error) {
      next(error);
    }
  },

  async getAllUjian(req, res, next){
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const user = req.user;
      const dosen = await user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases',
          through: {attributes:[]}
        }
      });
      const ujian = dosen.Kelases.map(async (i) => {
        const o  = await i.getUjians({
          // where: {aktif: 1},
          offset: (pages - 1) * limits,
          limit: limits,
          include: [
            {model: Ref_jenis_ujian, as: 'RefJenis'}
          ],
          order: [
            ['created_at', 'DESC']
          ]
        })
        return await Promise.all(o)
      });
      let opt = {
        finder: ujian.flat(),
        model: Ujian
      }
      const result = await paginatorMN(opt, pages, limits);
      const vals = result.results.map((i) => {
        return {
          id_ujian: i.id_ujian,
          jenis_ujian: i.RefJenis.jenis_ujian,
          judul_ujian: i.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.waktu_mulai,
          status_ujian: i.status_ujian,
          aktif: i.aktif
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      req.apicacheGroup = 'ujian-dosen-all';
      res.status(200).json({
          next: result.next,
          previous: result.previous,
          paket_soal: vals
      });
    } catch (error) {
      next(error);
    }
  },

  async getUjian(req, res, next){
    try {
      const { id_ujian } = req.params;
      const ujian = await Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: [
          {model: Paket_soal, as: 'PaketSoals'},
          {model: Ref_jenis_ujian, as: 'RefJenis'},
          {
            model: Kelas, as: 'Kelases', attributes: ['id_kelas'],
            through: {attributes:[]}
          }
        ]
      });
      if(!ujian) throw createError.NotFound('data ujian tidak ditemukan.');
      let opt = {
        req: req.user,
        id_kelas: ujian.Kelases[0].id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(kelasExist){
        const data = {
          id_ujian: ujian.id_ujian,
          jenis_ujian: ujian.RefJenis.jenis_ujian,
          judul_ujian: ujian.judul_ujian,
          tanggal_mulai: ujian.tanggal_mulai,
          waktu_mulai: ujian.waktu_mulai,
          durasi_ujian: ujian.durasi_ujian,
          durasi_per_soal: ujian.durasi_per_soal,
          bobot_total: ujian.bobot_total,
          deskripsi: ujian.deskripsi,
          created_at: ujian.created_at,
          updated_at: ujian.updated_at,
          status: ujian.status,
          tipe_penilaian: ujian.tipe_penilaian,
          paket_soal: ujian.PaketSoals
        }
        req.apicacheGroup = 'ujian-dosen';
        res.status(200).json(data);
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk melihat detail ujian ini.');
      }
    } catch (error) {
      next(error);
    }
  },

  async getSoalUjian(req, res, next){    
    try {
      const { id_ujian } = req.params;
      const pkSoal = await Paket_soal.findOne({
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: id_ujian},
        include: [
          { model: Soal_essay, as:'Soals', attributes: ['id_soal', 'soal'], 
          through: {attributes: ['bobot_soal']} }
        ],
        order: [
          [{model: Soal_essay, as:'Soals'}, 'id_soal', 'ASC']
        ]
      });
      const soal = pkSoal.Soals.map((i) => {
        return {
          id_soal: i.id_soal,
          soal: i.soal,
          bobot_soal: i.Rel_paketsoal_soal.bobot_soal,
          gambar_soal: i.gambar_soal,
          audio_soal: i.audio_soal,
          video_soal: i.video_soal,
          status: i.status,
          created_at: i.created_at,
          updated_at: i.updated_at
        }
      });
      req.apicacheGroup = 'soal-ujian';
      res.status(200).json({
        soal: soal
      })
    } catch (error) {
      next(error);
    }
  },

  async printUjianPdf(req, res, next){
    try {
      const ujian = await getHistory(req.user, 'ujian');
      const options = {format: 'A4'};
      const tanggal = dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(pathAll('ujian_dosen.hbs', 'pdf'), {
        kop_surat: img,
        data_dosen: ujian.dosen,
        data: ujian.ujian,
        tanggal: tanggal
      }, function (err, HTML) {
        if(err) return createError.internal('Error while reading Handlebars: '+ err);
        pdf.create(HTML, options).toBuffer(function (err, buffer) {
          if (err) {
            return createError.BadRequest('Error while generating PDF: '+ err);
          }
          const output = ((val) => {
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment;filename="${req.user.id}_${todaysdate()}-ujian.pdf"`
            })
            const download = Buffer.from(val);
            res.end(download);
          });
          output(buffer);
        })
      });
    } catch (error) {
      next(error);
    }
  },

  async printUjianXcel(req, res, next){
    try {
      const ujian = await getHistory(req.user, 'ujian');
      const newWB = new ExcelJS.Workbook();
      const newWS = newWB.addWorksheet('Status_app');      
      var reColumns = [
        {header:'No. Ujian', key:'no_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Jenis Ujian', key:'jenis_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Judul Ujian', key:'judul_ujian', style:{font:{name: 'Times New Roman'}}},        
        {header:'Tanggal Mulai', key:'tanggal_mulai', style:{font:{name: 'Times New Roman'}}},
        {header:'Waktu Mulai', key:'waktu_mulai', style:{font:{name: 'Times New Roman'}}},
        {header:'Durasi Ujian', key:'durasi_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Bobot Total', key:'bobot_total', style:{font:{name: 'Times New Roman'}}},
        {header:'Deskripsi', key:'deskripsi', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Paket', key:'jml_paket', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Soal per Paket', key:'jml_soal', style:{font:{name: 'Times New Roman'}}},
      ];
      newWS.columns = reColumns;
      newWS.addRows(ujian.ujian);
      newWS.getCell('L1').value = 'Nama Lengkap :';
      newWS.getCell('L2').value = 'NIDN :';
      newWS.getCell('L3').value = 'NIDK :';
      newWS.getCell('L4').value = 'Username :';
      newWS.mergeCells('M1:R1');
      newWS.getCell('M1').value = ujian.dosen.nama_lengkap;
      newWS.getCell('M1').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M2:R2');
      newWS.getCell('M2').value = ujian.dosen.nidn;
      newWS.getCell('M2').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M3:R3');
      newWS.getCell('M3').value = ujian.dosen.nidk;
      newWS.getCell('M3').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M4:R4');
      newWS.getCell('M4').value = ujian.dosen.username;
      newWS.getCell('M4').alignment = { horizontal:'left'} ;
      newWS.mergeCells('L5:R5');
      newWS.getCell('L5').value = 'tertanggal, ' + dateFull();
      newWS.getCell('L5').alignment = { horizontal:'center'} ;
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${todaysdate()}-ujian.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error);
    }
  },

  async searchUjian(req, res, next) {
    try {
      let { find } = req.query;
      const validator = ujianValidator(find);
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const user = req.user
      const dosen = await user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases',
          through: {attributes:[]}
        }
      });
      const ujian = dosen.Kelases.map(async (i) => {
        const o = await i.getUjians({
          where: {
            [Op.or]: validator
          },
          offset: (pages - 1) * limits,
          limit: limits,
          include: [
            {model: Paket_soal, as: 'PaketSoals', attributes: ['kode_paket']},
            {model: Ref_jenis_ujian, as: 'RefJenis'}
          ],
          order: [
            ['created_at', 'DESC']
          ]
        })
        return await Promise.all(o)
      });
      let opt = {
        finder: ujian.flat(),
        model: Ujian
      };
      const result = await paginatorMN(opt, pages, limits);
      const vals = result.results.map((i) => {
        return {
          id_ujian: i.id_ujian,
          jenis_ujian: i.RefJenis.jenis_ujian,
          judul_ujian: i.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.waktu_mulai,
          status_ujian: i.status_ujian,
          aktif: i.aktif,
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      req.apicacheGroup = 'ujian-dosen-all';
      res.status(200).json({
          next: result.next,
          previous: result.previous,
          paket_soal: vals
      });
    } catch (error) {
      next(error)
    }
  },

  async putUjian(req, res, next){
    try {
      const { jenis_ujian, judul_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, 
              durasi_per_soal, bobot_per_soal, bobot_total, status, aktif, deskripsi } = req.body;
      const { id_ujian } = req.params;
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: Ujian, as: 'Ujians', attributes: ['id_ujian'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        const jenisUjian = await Ref_jenis_ujian.findOne({
          attributes:['id_jenis_ujian','jenis_ujian'],
          where:{jenis_ujian:jenis_ujian}
        });
        let updateVal = {
          judul_ujian: judul_ujian,
          jenis_ujian: jenisUjian.id_jenis_ujian,
          tanggal_mulai: tanggal_mulai,
          waktu_mulai: waktu_mulai,
          durasi_ujian: durasi_ujian,
          durasi_per_soal: durasi_per_soal,
          bobot_per_soal: bobot_per_soal,
          bobot_total: bobot_total,
          status: status,
          aktif: aktif,
          deskripsi: deskripsi,
          updated_at: fn('NOW')
        };
        await Ujian.update(updateVal, {
          where: { id_ujian: id_ujian }
        });
        CacheControl.putUjian;
        res.status(200).json({
          success: true,
          msg: `data ujian berhasil diubah`
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk mengubah data ujian ini!');
      }      
    } catch (error) {
      next(error)
    }
  },

  async deleteUjian(req, res, next){
    try {
      const { id_ujian } = req.params;
      const ujian = await Ujian.findOne({
        where: {id_ujian: id_ujian}
      });
      if (!ujian) { throw createError.NotFound('data ujian tidak ditemukan.')}
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: Ujian, as: 'Ujians', attributes: ['id_ujian'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        await Ujian.destroy({
          where:{
            id_ujian: ujian.id_ujian
          }
        });
        CacheControl.deleteUjian;
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk menghapus data ujian ini!');
      } 
    } catch (error) {
      next(error);
    }
  },

  async patchStatusUjian(req, res, next){
    try {
      const { id_ujian } = req.params;
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: Ujian, as: 'Ujians', attributes: ['id_ujian'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        const status_ujian = req.body.status_ujian;
        let updateVal = {
          status_ujian: status_ujian,
          updated_at: fn('NOW')
        };        
        await Ujian.update(updateVal, {
          where: { id_ujian: id_ujian }
        });
        CacheControl.patchStatusUjian;
        res.status(200).json({
          success: true,
          msg: 'status ujian berhasil diubah'
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk mengubah data ujian ini!');
      } 
    } catch (error) {
      next(error);
    }
  },

  async patchKeaktifanUjian(req, res, next){
    try {
      const { id_ujian } = req.params;
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: Ujian, as: 'Ujians', attributes: ['id_ujian'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        const aktivasi = await Ujian.findOne({
          attributes:['id_ujian','aktif'],
          where:{id_ujian:id_ujian}
        });
        var updateVal, keaktifan;
        if(aktivasi.aktif === false){
          updateVal = {
            aktif: 1,
            updated_at: fn('NOW')
          };
          keaktifan = 'di aktifkan';
        } else {
          updateVal = {
            aktif: 0,
            updated_at: fn('NOW')
          };
          keaktifan = 'di non-aktifkan';
        }      
        await Ujian.update(updateVal, {
          where: { id_ujian: id_ujian }
        });
        CacheControl.patchKeaktifanUjian;
        res.status(200).json({
          success: true,
          msg: `ujian berhasil ${keaktifan}`
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk mengubah data ujian ini!');
      } 
    } catch (error) {
      next(error);
    }
  },
  // PaketSoal operation
  async getPaketSoal(req, res, next){
    try {
      const idPaket = req.params.id_paket;
      const paket = await Paket_soal.findOne({
        where: {id_paket: idPaket},
        include: [
          {model: Soal_essay, as: 'Soals', attributes: ['id_soal'], through: {attributes:[]}}
        ]
      });
      if(!paket) throw createError.NotFound('data paket soal tidak ditemukan');
      const json = paket.toJSON();
      const data = {
        id_paket: json.id_paket,
        kode_paket: json.kode_paket,
        ujian: json.id_ujian,
        aktif: json.aktif,
        jml_soal: json.Soals.length,        
      }
      CacheControl.getPaketSoal(req);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async getPkSoalMhs(req, res, next){
    try {
      const idPaket = req.params.id_paket;
      const paket = await Rel_mahasiswa_paketsoal.findOne({
        where: {id_paket: idPaket},
        include: [
          {model: Mahasiswa, as: 'Mahasiswa', attributes: ['id_mhs','NIM','nama_lengkap']},
          {model: Paket_soal, as: 'PaketSoal'}
        ]
      });
      if(!paket) throw createError.NotFound('data paket-soal tidak ditemukan');
      CacheControl.getPaketSoalMhs(req);
      res.status(200).json({
        success: true,
        paket_soal: paket.PaketSoal,
        relasi_mahasiswa: paket.Mahasiswa
      });
    } catch (error) {
      next(error);
    }
  },

  async getNilaiTotalMhs(req, res, next){
    try {
      const { id_paket, id_mhs } = req.params;
      const paket = await Rel_mahasiswa_paketsoal.findOne({
        where: {[Op.and]: [{id_paket: id_paket}, {id_mhs: id_mhs}]},
        include: [
          {model: Mahasiswa, as: 'Mahasiswa', attributes: ['id_mhs','NIM','nama_lengkap']},
          {model: Paket_soal, as: 'PaketSoal', include: {
            model: Rel_paketsoal_soal, as: 'PaketSoal_Soal', attributes: ['id'],
          }}
        ]
      });
      if(!paket) throw createError.NotFound('data paket-soal tidak ditemukan');
      const json = paket.toJSON();
      const data = { 
        id_mhs: json.id_mhs,
        id_paket: json.id_paket,
        nilai_total: json.nilai_total,
        waktu_mulai_pengerjaan: json.waktu_mulai,
        waktu_selesai_pengerjaan: json.waktu_selesai,
        lama_pengerjaan: json.lama_pengerjaan,
      }
      CacheControl.getNilaiTotalMhs(req);
      res.status(200).json({
        data_relasi: data,
        paket_soal: json.PaketSoal,
        data_mahasiswa: json.Mahasiswa
      });
    } catch (error) {
      next(error);
    }
  },

  async patchKeaktifanPkSoal(req, res, next){
    try {
      const { id_paket } = req.params;
      const aktivasi = await Paket_soal.findOne({
        attributes:['id_paket','aktif'],
        where: {id_paket: id_paket}
      });
      var updateVal, keaktifan;
      if(aktivasi.aktif === false){
        updateVal = {
          aktif: 1,
          updated_at: fn('NOW')
        };
        keaktifan = 'di aktifkan';
      } else {
        updateVal = {
          aktif: 0,
          updated_at: fn('NOW')
        };
        keaktifan = 'di non-aktifkan';
      }      
      await Paket_soal.update(updateVal, {
        where: { id_paket: id_paket }
      });
      CacheControl.patchKeaktifanPkSoal;
      res.status(200).json({
        success: true,
        msg: `paket soal ${id_paket} berhasil ${keaktifan}`
      })
    } catch (error) {
      next(error);
    }
  },

  async deletePaketSoal(req, res, next){
    try {
      const { id_paket } = req.params;
      const paketExist = await Paket_soal.findOne({where: {id_paket: id_paket}});
      if (!paketExist) { throw createError.NotFound('data paket-soal tidak ditemukan.')}
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: Kelas, as: 'Kelases', attributes: ['id_kelas'], 
          through: {attributes:[]},
          include: {model: Ujian, as:'Ujians', attributes: ['id_ujian'], 
            through: {attributes:[]},
              include: {model: Paket_soal, as: 'PaketSoals', attributes: ['id_paket'],
              where: { id_paket: id_paket }}}}
      });
      if(dosen){
        await Paket_soal.destroy({
          where:{
            id_paket: id_paket
        }});
        CacheControl.deletePaketSoal;
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk menghapus data paket-soal ini!');
      } 
    } catch (error) {
      next(error);
    }
  },

  // Relasi Kelas-PaketSoal operation
  async kelasSetUjian(req, res, next){
    try {
      const { id_kelas } = req.params;
      const { id_ujian } = req.body;
      let opt = {
        req: req.user,
        id_kelas: id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(!id_ujian) { 
        throw createError.BadRequest('id ujian tidak boleh kosong!');
      } else if(kelasExist === true) {
        const kelas = await Kelas.findByPk(id_kelas);
        kelas.addUjians(id_ujian);
        CacheControl.postNewUjianKelas;
        res.status(200).json({
          success: true,
          msg: `kelas berhasil direlasikan dengan ujian, ${id_ujian}`
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu kelas ini...');
      }      
    } catch (error) {
      next(error);
    }
  },

  async kelasPutUjian(req, res, next){
    try {
      const { id_kelas } = req.params;
      const { id_ujian } = req.body;
      let opt = {
        req: req.user,
        id_kelas: id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(!id_ujian) { 
        throw createError.BadRequest('id ujian tidak boleh kosong!');
      } else if(kelasExist === true) {
        const kelas = await Kelas.findByPk(id_kelas);
        kelas.setUjians(id_ujian);
        CacheControl.putUjianKelas;
        res.status(200).json({
          success: true,
          msg: `relasi ujian pada kode seksi ${kelas.kode_seksi} berhasil diubah ke ${id_ujian}`
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu kelas ini...');
      }      
    } catch (error) {
      next(error);
    }
  },

  async kelasDelUjian(req, res, next){
    try {
      const { id_kelas } = req.params;
      const { id_ujian } = req.body;
      let opt = {
        req: req.user,
        id_kelas: id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(!id_ujian) { 
        throw createError.BadRequest('id ujian tidak boleh kosong!');
      } else if(kelasExist === true) {
        const kelas = await Kelas.findByPk(id_kelas);
        kelas.removeUjians(id_ujian);
        CacheControl.deleteUjianKelas;
        res.status(200).json({
          success: true,
          msg: `relasi ujian ${id_ujian} pada kode seksi ${kelas.kode_seksi} berhasil dihapus`
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu kelas ini...');
      }      
    } catch (error) {
      next(error);
    }
  },
  // Relasi PaketSoal-Kelas operation
  async ujianSetKelas(req, res, next){
    try {
      const { id_kelas } = req.body;
      const { id_ujian } = req.params;
      let opt = {
        req: req.user,
        id_kelas: id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(!id_kelas) { 
        throw createError.BadRequest('id_kelas tidak boleh kosong!');
      } else if(kelasExist === true) {
        const ujian = await Ujian.findByPk(id_ujian);
        if(!ujian) { throw createError.NotFound('ujian tidak terdaftar.'); }
        ujian.addKelases(id_kelas);
        CacheControl.postNewUjianKelas;
        res.status(200).json({
          success: true,
          msg: `ujian berhasil direlasikan dengan kelas ${id_kelas}`
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu kelas ini...');
      }      
    } catch (error) {
      next(error);
    }
  },

  async ujianPutKelas(req, res, next){
    try {
      const { id_kelas } = req.body;
      const { id_ujian } = req.params;
      let opt = {
        req: req.user,
        id_kelas: id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(!id_kelas) { 
        throw createError.BadRequest('id_kelas tidak boleh kosong!');
      } else if(kelasExist === true) {
        const ujian = await Ujian.findByPk(id_ujian);
        if(!ujian) { throw createError.NotFound('ujian tidak terdaftar.'); }
        ujian.setKelases(id_kelas);
        CacheControl.putUjianKelas;
        res.status(200).json({
          success: true,
          msg: `ujian pada kelas ${id_kelas}, berhasil diubah`
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu kelas ini...');
      }      
    } catch (error) {
      next(error);
    }
  },

  async ujianDelKelas(req, res, next){
    try {
      const { id_kelas } = req.body;
      const { id_ujian } = req.params;
      let opt = {
        req: req.user,
        id_kelas: id_kelas
      }
      const kelasExist = await getKelas(opt);
      if(!id_kelas) { 
        throw createError.BadRequest('id_kelas tidak boleh kosong!');
      } else if(kelasExist === true) {
        const ujian = await Ujian.findByPk(id_ujian);
        if(!ujian) { throw createError.NotFound('ujian tidak terdaftar.'); }
        ujian.removeKelases(id_kelas);
        CacheControl.deleteUjianKelas;
        res.status(200).json({
          success: true,
          msg: `ujian berhasil dihapus pada kelas ${id_kelas}`
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu kelas ini...');
      }      
    } catch (error) {
      next(error);
    }
  },  
  // Soal Operation
  async setSoal(req, res, next){
    try {
      const { id_matkul, soal, status } = req.body;
      let { gambar_soal_1, gambar_soal_2, gambar_soal_3, audio_soal, video_soal } = req.files;
      if(!id_matkul) throw createError.BadRequest('id matkul tidak boleh kosong!');
      let opt = {
        req: req.user,
        id_matkul: id_matkul
      }, vals = [];
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        const dosen = await opt.req.getDosen({attributes:['id_dosen']});
        const soalExist = await Soal_essay.findOne({
          attributes: ['id_dosen','soal'],
          where:{[Op.and]: [{id_dosen: dosen.id_dosen}, {soal: soal}]} // spam detection
        })
        if(soalExist) throw createError.Conflict('data soal sudah terdaftar');        
        if(gambar_soal_1){vals.push(gambar_soal_1[0].filename)}
        if(gambar_soal_2){vals.push(gambar_soal_2[0].filename)}
        if(gambar_soal_3){vals.push(gambar_soal_3[0].filename)}
        if(req.body.audio_soal) {
          audio_soal = req.body.audio_soal;
        } else if(audio_soal) {
          audio_soal = audio_soal[0].filename;
        } else {
          audio_soal = null;
        }
        if(req.body.video_soal) {
          video_soal = req.body.video_soal;
        } else if(video_soal) {
          video_soal = video_soal[0].filename;
        } else {
          video_soal = null;
        }
        const idSoal = await Soal_essay.create({
          id_matkul: id_matkul,
          id_dosen: dosen.id_dosen,          
          soal: soal,
          status: status,
          gambar_soal: vals,
          audio_soal: audio_soal,
          video_soal: video_soal,
          created_at: fn('NOW')
        });
        CacheControl.postNewSoal;
        res.status(200).json({
          success: true,
          msg: `soal berhasil ditambahkan ke bank soal matakuliah ${id_matkul}`,
          id_soal: idSoal.id_soal
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah berserta kelas ini...');
      }     
    } catch (error) {
      next(error);
    }
  },

  async setSoalBulk(req, res, next){
    let picPatharr = [];
    try {      
      const id_matkul = req.body.id_matkul;
      if(!id_matkul) throw createError.BadRequest('id matkul tidak boleh kosong!');
      const excelFile = pathAll(req.files.soal_bulk[0].filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Soal_adder');
      let data = [], imgArray = [];
      for (const image of ws.getImages()) {            
        const img = workbook.model.media.find(m => m.index === image.imageId);
        const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
        const picPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'picture');
        fs.appendFileSync(picPath, img.buffer);
        imgArray.push({[row]:`${row}.${col}.${img.name}.${img.extension}`});
        picPatharr.push(picPath);
      }
      imgArray = imgArray.reduce((acc, element) => { // groupBy key
        const [key, val] = Object.entries(element)[0];
        (acc[key] || (acc[key] = [])).push(val);
        return acc;
      }, []);
      let opt = {
        req: req.user,
        id_matkul: id_matkul
      }          
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        const dosen = await opt.req.getDosen({attributes:['id_dosen']});
        for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
          if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          let img = imgArray[rowNum-1];          
          !img ? img = []: img = imgArray[rowNum-1];           
            data.push({
              id_matkul: id_matkul,
              id_dosen: dosen.id_dosen,
              soal: row[1],
              gambar_soal: img,
              audio_soal: row[5],
              video_soal: row[6],
              status: 'terbit',
              created_at: fn('NOW')
            });
          }
        }
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah ini');
      } 
      await Soal_essay.bulkCreate(data);
      CacheControl.postNewSoal;
      res.status(200).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.files.soal_bulk[0].originalname
      });
    } catch (error) {
      if(req.files.soal_bulk) {
        await unlinkAsync(req.files.soal_bulk[0].path);
      }
      if(picPatharr.length ){
        for(let i of picPatharr){
          await unlinkAsync(i);
        }
      }
      if(req.audioPatharr && req.audioPatharr.length){
        for(let i of req.audioPatharr){
          await unlinkAsync(i);
        }
      }
      if(req.videoPatharr && req.videoPatharr.length){
        for(let i of req.videoPatharr){
          await unlinkAsync(i);
        }
      }      
      next(error);
    }
  },

  async setSoaldanRelasi(req, res, next){
    try {
      const { id_ujian, soal } = req.body;
      let { gambar_soal_1, gambar_soal_2, gambar_soal_3, audio_soal, video_soal } = req.files;
      const ujian = await Ujian.findOne({ 
        where: {id_ujian: id_ujian},
        attributes: ['id_ujian', 'judul_ujian'],
        include: {model: Kelas, as: 'Kelases', attributes: ['id_kelas', 'id_matkul']}
      });
      const idMatkul = ujian.Kelases[0].id_matkul
      let opt = {
        req: req.user,
        id_matkul: idMatkul
      }, vals = [];
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        const dosen = await opt.req.getDosen({attributes:['id_dosen']});
        if(gambar_soal_1){vals.push(gambar_soal_1[0].filename)}
        if(gambar_soal_2){vals.push(gambar_soal_2[0].filename)}
        if(gambar_soal_3){vals.push(gambar_soal_3[0].filename)}
        if(req.body.audio_soal) {
          audio_soal = req.body.audio_soal;
        } else if(audio_soal) {
          audio_soal = audio_soal[0].filename;
        } else {
          audio_soal = null;
        }
        if(req.body.video_soal) {
          video_soal = req.body.video_soal;
        } else if(video_soal) {
          video_soal = video_soal[0].filename;
        } else {
          video_soal = null;
        }
        const data = await Soal_essay.create({
          id_matkul: idMatkul,
          id_dosen: dosen.id_dosen,          
          soal: soal,
          status: 'terbit',
          gambar_soal: vals,
          audio_soal: audio_soal,
          video_soal: video_soal,
          created_at: fn('NOW')
        });
        CacheControl.postNewSoal;
        res.status(200).json({
          success: true,
          msg: `soal berhasil ditambahkan ke bank soal matakuliah ${idMatkul}`,
          id_soal: data.id_soal
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah berserta kelas ini...');
      }     
    } catch (error) {
      next(error);
    }
  },

  async getSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      const dosen = await req.user.getDosen({attributes: ['id_dosen']});
      const soal = await Soal_essay.findOne({
        where: {[Op.and]: [{id_dosen: dosen.id_dosen}, {id_soal: id_soal}]}, 
        include: [
          {model: Matakuliah, as: 'Matkul', attributes: ['id_matkul', 'nama_matkul']},
          {model: Paket_soal, as: 'PaketSoals', required: false, 
            through: {attributes: ['no_urut_soal', 'bobot_soal', 'kata_kunci_soal']},
            include: {model: Ujian, as: 'Ujian', attributes: ['id_ujian', 'judul_ujian']}
          },
        ]        
      });
      let opt = {
        req: req.user,
        id_matkul: soal.Matkul.id_matkul
      }, dataUjian = [];
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        const soalJson = soal.toJSON();
        const dataSoal = {
          id_soal: soalJson.id_soal,
          matakuliah: soalJson.Matkul.nama_matkul,
          soal: soalJson.soal,
          gambar_soal: soalJson.gambar_soal,
          audio_soal: soalJson.audio_soal,
          video_soal: soalJson.video_soal,
          status: soalJson.status,
          created_at: soalJson.created_at,
          updated_at: soalJson.updated_at
        }
        if(soalJson.PaketSoals.length !== 0){
          dataUjian = soalJson.PaketSoals.map((i) => {
            return {
              id_paket: i.id_paket,
              id_ujian: i.Ujian.id_ujian,
              judul_ujian: i.Ujian.judul_ujian,
              bobot_soal: i.Rel_paketsoal_soal.bobot_soal,
              no_urut_soal: i.Rel_paketsoal_soal.no_urut_soal,
              kata_kunci_soal: i.Rel_paketsoal_soal.kata_kunci_soal
            }
          });
        }
        CacheControl.getSoal(req);
        res.status(200).json({
          soal: dataSoal,
          relasi_paket: dataUjian
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk melihat soal ini!');
      }
    } catch (error) {
      next(error);
    }
  },

  async printSoalPdf(req, res, next){
    try {
      const soal = await getHistory(req.user, 'soal');
      const options = {format: 'A4'};
      const tanggal = dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(pathAll('soal_dosen.hbs', 'pdf'), {
        kop_surat: img,
        data_dosen: soal.dosen,
        data: soal.soal,
        tanggal: tanggal
      }, function (err, HTML) {
        if(err) return createError.internal('Error while reading Handlebars: '+ err);
        pdf.create(HTML, options).toBuffer(function (err, buffer) {
          if (err) {
            return createError.BadRequest('Error while generating PDF: '+ err);
          }
          const output = ((val) => {
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment;filename="${req.user.id}_${todaysdate()}-soal.pdf"`
            })
            const download = Buffer.from(val);
            res.end(download);
          });
          output(buffer);
        })
      });
    } catch (error) {
      next(error);
    }
  },

  async printSoalXcel(req, res, next){
    try {
      const ujian = await getHistory(req.user, 'soal');
      const newWB = new ExcelJS.Workbook();
      const newWS = newWB.addWorksheet('Status_app');      
      var reColumns = [
        {header:'No. Soal', key:'no_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Matakuliah', key:'jenis_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Soal', key:'judul_ujian', style:{font:{name: 'Times New Roman'}}},        
        {header:'Gambar Soal', key:'tanggal_mulai', style:{font:{name: 'Times New Roman'}}},
        {header:'Audio Soal', key:'waktu_mulai', style:{font:{name: 'Times New Roman'}}},
        {header:'Video Soal', key:'durasi_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Status Soal', key:'bobot_total', style:{font:{name: 'Times New Roman'}}},
      ];
      newWS.columns = reColumns;
      newWS.addRows(ujian.ujian);
      newWS.getCell('I1').value = 'Nama Lengkap :';
      newWS.getCell('I2').value = 'NIDN :';
      newWS.getCell('I3').value = 'NIDK :';
      newWS.getCell('I4').value = 'Username :';
      newWS.mergeCells('J1:O1');
      newWS.getCell('J1').value = ujian.dosen.nama_lengkap;
      newWS.getCell('J1').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J2:O2');
      newWS.getCell('J2').value = ujian.dosen.nidn;
      newWS.getCell('J2').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J3:O3');
      newWS.getCell('J3').value = ujian.dosen.nidk;
      newWS.getCell('J3').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J4:O4');
      newWS.getCell('J4').value = ujian.dosen.username;
      newWS.getCell('J4').alignment = { horizontal:'left'} ;
      newWS.mergeCells('I5:O5');
      newWS.getCell('I5').value = 'tertanggal, ' + dateFull();
      newWS.getCell('I5').alignment = { horizontal:'center'} ;
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${todaysdate()}-soal.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error);
    }
  },

  async getAllSoal(req, res, next){
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const user = req.user
      const dosen = await user.getDosen({attributes:['id_dosen']});
      let opt = {
        where: {id_dosen: dosen.id_dosen},
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_soal', 'ASC']] // status terbit asc
      }, vals = [];
      const soal = await paginator(Soal_essay, pages, limits, opt);
      for (let i of soal.results){     
        i.status === 'draft' ? i.status = 'DRAFT':i.status = 'TERBIT';   
        let matkul = await i.getMatkul({attributes:['nama_matkul']});
        vals.push({
          id_soal: i.id_soal,
          matakuliah: matkul.nama_matkul,
          soal: i.soal,
          status: i.status
        })
      }
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getAllSoal(req);
      res.status(200).json({
          next: soal.next,
          previous: soal.previous,
          soal: vals
      });
    } catch (error) {
      next(error);
    }
  },

  async getAllSoalMatkul(req, res, next){
    try {
      const idMatkul = req.params.id_matkul;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const dosen = await req.user.getDosen({attributes:['id_dosen']});
      let opt = {
        where: {[Op.and]: [
          {id_matkul: idMatkul}, {id_dosen: dosen.id_dosen}
        ]},
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_soal', 'ASC']] // status terbit asc
      }, vals = [];
      const soal = await paginator(Soal_essay, pages, limits, opt);
      for (let i of soal.results){     
        i.status === 'draft' ? i.status = 'DRAFT':i.status = 'TERBIT';
        vals.push({
          id_soal: i.id_soal,
          soal: i.soal,
          status: i.status
        })
      }
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getAllSoalMk(req);
      res.status(200).json({
          next: soal.next,
          previous: soal.previous,
          soal: vals
      });
    } catch (error) {
      next(error);
    }
  },

  async searchSoal(req, res, next){
    try {
      let { find } = req.query;      
      const validator = soalValidator(find);      
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const user = req.user;
      const dosen = await user.getDosen({attributes:['id_dosen']});
      let opt = {        
        where: {[Op.and]: [{id_dosen: dosen.id_dosen}, {
            [Op.or]: validator
          }]
        },
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [{model: Matakuliah, as: 'Matkul'}],
        order: [['id_soal', 'ASC']]
      }, vals = [];
      const soal = await paginator(Soal_essay, pages, limits, opt);
      if (soal.results.length === 0) {vals.push('No record...')}
      for (let i of soal.results){      
        i.status === 'draft' ? i.status = 'DRAFT':i.status = 'TERBIT';
        vals.push({
          id_soal: i.id_soal,
          matakuliah: i.Matkul.nama_matkul,
          soal: i.soal,
          gambar_soal: i.gambar_soal,
          status: i.status
        })
      }
      CacheControl.getAllSoal(req);
      res.status(200).json({
        next: soal.next,
        previous: soal.previous,
        soal: vals
      })
    } catch (error) {
      next(error);
    }
  },

  async putSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      const dosen = await req.user.getDosen({
        attributes:['id_dosen'],
        include: {model:Soal_essay, as: 'Soals',
        attributes: ['id_soal'],
          where: {id_soal:id_soal}}
      })
      if(dosen){
        const { soal, array_gambar_soal, status } = req.body;
        let { gambar_soal_1, gambar_soal_2, gambar_soal_3, audio_soal, video_soal } = req.files;
        if(gambar_soal_1){array_gambar_soal[0] = gambar_soal_1[0].filename}
        if(gambar_soal_2){array_gambar_soal[1] = gambar_soal_2[0].filename}
        if(gambar_soal_3){array_gambar_soal[2] = gambar_soal_3[0].filename}
        if(req.body.audio_soal) {
          audio_soal = req.body.audio_soal;
        } else if(audio_soal) {
          audio_soal = audio_soal[0].filename;
        } else {
          audio_soal = null;
        }
        if(req.body.video_soal) {
          video_soal = req.body.video_soal;
        } else if(video_soal) {
          video_soal = video_soal[0].filename;
        } else {
          video_soal = null;
        }
        let updateVal = {
          soal: soal,
          gambar_soal: array_gambar_soal,
          audio_soal: audio_soal,
          video_soal: video_soal,
          status: status,
          updated_at: fn('NOW')
        };
        await Soal_essay.update(updateVal, {
          where: { id_soal: id_soal }
        });
        CacheControl.putSoal;
        res.status(200).json({
          success: true,
          msg: 'soal berhasil diedit'
        });
      } else{
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah soal ini!')
      }      
    } catch (error) {
      next(error);
    }
  },

  async putSoalBulk(req, res, next){
    let picPatharr = [], audioPatharr = [], videoPatharr = [];
    try {      
      const id_matkul = req.body.id_matkul;
      if(!id_matkul) throw createError.BadRequest('id matkul tidak boleh kosong!');
      const excelFile = pathAll(req.files.soal_bulk[0].filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Soal_updater');
      let data = [], imgArray = [];
      for (const image of ws.getImages()) {            
        const img = workbook.model.media.find(m => m.index === image.imageId);
        const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
        const picPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'picture');
        fs.appendFileSync(picPath, img.buffer);
        imgArray.push({[row]:`${row}.${col}.${img.name}.${img.extension}`});
        picPatharr.push(picPath);
      }
      imgArray = imgArray.reduce((acc, element) => { // groupBy key
        const [key, val] = Object.entries(element)[0];
        (acc[key] || (acc[key] = [])).push(val);
        return acc;
      }, []);
      let opt = {
        req: req.user,
        id_matkul: id_matkul
      }          
      const matkulExist = await getKelas(opt);
      const dosen = await opt.req.getDosen({attributes:['id_dosen']});
      if(matkulExist){
        for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
          if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          let img = imgArray[rowNum-1];
          if(img){
            img = await Soal_essay.findOne({
              attributes: ['gambar_soal'],
              where: {id_soal: row[1]},
              raw: true
            }).then((i) => { return i.gambar_soal });
          } else {
            img = imgArray[rowNum-1];
          }
          row[6] = row[6] ?? null;
          row[7] = row[7] ?? null;
            data.push({
              id_soal: row[1],
              id_matkul: id_matkul,
              id_dosen: dosen.id_dosen,
              soal: row[2],
              gambar_soal: img,
              audio_soal: row[6],
              video_soal: row[7],
              status: row[8],
              updated_at: fn('NOW')
            });
          }
        }
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah ini');
      } 
      await Soal_essay.bulkCreate(data, {
        updateOnDuplicate: ['id_soal', 'id_matkul', 'id_dosen', 'soal', 
            'gambar_soal', 'audio_soal', 'video_soal', 'status', 'updated_at']
      });
      CacheControl.putSoal;
      res.status(200).json({
        success: true,
        msg: `DB soal matakuliah ${id_matkul} berhasil diubah sesuai: ${req.files.soal_bulk[0].originalname}`
      });
    } catch (error) {
      if(picPatharr.length){
        for(let i of picPatharr){
          await unlinkAsync(i);
        }
      }
      if(audioPatharr.length){
        for(let i of audioPatharr){
          await unlinkAsync(i);
        }
      }
      if(videoPatharr.length){
        for(let i of videoPatharr){
          await unlinkAsync(i);
        }
      }
      if(req.files.soal_bulk) {
        await unlinkAsync(req.files.soal_bulk[0].path);
      }
      next(error);
    }
  },

  async patchGambarSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      const { array_gambar_soal } = req.body;
      const { gambar_soal_1, gambar_soal_2, gambar_soal_3 } = req.files;
      if(gambar_soal_1){array_gambar_soal[0] = gambar_soal_1[0].filename}
      if(gambar_soal_2){array_gambar_soal[1] = gambar_soal_2[0].filename}
      if(gambar_soal_3){array_gambar_soal[2] = gambar_soal_3[0].filename}
      let updateVal = {
        gambar_soal: array_gambar_soal,
        updated_at: fn('NOW')
      };
      await Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      CacheControl.patchGambarSoal;
      res.status(200).json({
        success: true,
        msg: 'gambar soal berhasil diubah'
      });
    } catch (error) {
      error(next);
    }
  },

  async patchAudioSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      let { audio_soal } = req.file;
      if(req.body.audio_soal) {
        audio_soal = req.body.audio_soal;
      } else if(audio_soal) {
        audio_soal = audio_soal[0].filename;
      } else {
        audio_soal = null;
      }
      let updateVal = {
        audio_soal: audio_soal,
        updated_at: fn('NOW')
      };
      await Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      CacheControl.patchAudioSoal;
      res.status(200).json({
        success: true,
        msg: 'audio soal berhasil diubah'
      });
    } catch (error) {
      error(next);
    }
  },

  async patchVideoSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      let { video_soal } = req.file;
      if(req.body.video_soal) {
        video_soal = req.body.video_soal;
      } else if(video_soal) {
        video_soal = video_soal[0].filename;
      } else {
        video_soal = null;
      }
      let updateVal = {
        video_soal: video_soal,
        updated_at: fn('NOW')
      };
      await Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      CacheControl.patchVideoSoal;
      res.status(200).json({
        success: true,
        msg: 'video soal berhasil diubah'
      });
    } catch (error) {
      error(next);
    }
  },

  async patchStatusSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      const status = await Soal_essay.findOne({
        attributes:['id_soal','status'],
        where: {id_soal:id_soal}
      });
      var updateVal, statusSoal;
      if(status.status === 'draft'){
        updateVal = {
          status: 'terbit',
          updated_at: fn('NOW')
        };
        statusSoal = 'di terbitkan';
      } else {
        updateVal = {
          status: 'draft',
          updated_at: fn('NOW')
        };
        statusSoal = 'di draft-kan';
      }      
      await Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      CacheControl.patchStatusSoal;
      res.status(200).json({
        success: true,
        msg: `soal ${id_soal} berhasil ${statusSoal}`
      })
    } catch (error) {
      next(error);
    }
  },

  async deleteSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      const getSoal = await Soal_essay.findOne({
        attributes: ['id_soal','id_matkul'],
        where: {id_soal: id_soal}
      });
      let opt = {
        req: req.user,
        id_matkul: getSoal.id_matkul
      }
      const matkulExist = await getKelas(opt)
      if(matkulExist){
        if (!getSoal) { throw createError.NotFound('data soal tidak ditemukan.')}
        await Soal_essay.destroy({
          where:{
            id_soal: getSoal.id_soal
          }
        });
        CacheControl.deleteSoal;
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk menghapus soal ini!')
      }      
    } catch (error) {
      next(error);
    }
  },

  // Relasi Soal-PaketSoal operation
  /* soal yg diset harus sesuai dengan id_matkul pkSoal
     untuk front-end buat id_soal dari setiap soal yg di tambahkan di paket, 
     quota soal per paket = durasi paket / durasi per soal (hasil jika desimal, bulatkan ke belakang),
     jika tidak ada durasi per soal, quota unlimited?..., check juga jika total bobot soal yg ditambah melebihi 
     bobot total paket, check quota soal && bobot total soal, bisa dibilang bobot total soal sebagai jatah soal,
     hirarki pembatasan soal:
      1. Quota Soal
      2. Bobot Total Paket
  */
  async pkSoalsetSoal(req, res, next){
    try {
      const id_paket = req.params.id_paket;
      const { tipe_penilaian, id_soal, bobot_soal, kata_kunci_soal } = req.body;
      let soal;
      const countSoal = await Rel_paketsoal_soal.count({
        where:{ id_paket: id_paket }
      });
      if(countSoal){
        soal = id_soal.map((i, j) => {
          return {
            id_paket: id_paket,
            id_soal: i,
            no_urut_soal: countSoal + j + 1,
            bobot_soal: bobot_soal[j],
            kata_kunci_soal: kata_kunci_soal[j] || null
          }
        });
      } else {
        soal = id_soal.map((i, j) => {
          let k = j + 1;
          if(!k) k = id_soal.indexOf(i)+1;      
          return {
            id_paket: id_paket,
            id_soal: i,
            no_urut_soal: k,
            bobot_soal: bobot_soal[j],
            kata_kunci_soal: kata_kunci_soal[j] || null
          }        
        });
      }
      const idUjian = await Paket_soal.findOne({ 
        where: {id_paket: id_paket}, attributes: ['id_ujian'],
        raw: true
      });
      await Ujian.update({
        tipe_penilaian: tipe_penilaian,
        updated_at: fn('NOW')
      }, {        
        where: {id_ujian: idUjian.id_ujian} 
      });
      await Rel_paketsoal_soal.bulkCreate(soal);
      CacheControl.postNewSoalPkSoal;
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} soal berhasil ditambahkan`
      })
    } catch (error) {
      next(error);
    }
  },

  async pkSoalputSoal(req, res, next){
    try {
      const id_paket = req.params.id_paket;
      const { id_soal, bobot_soal, kata_kunci_soal } = req.body;
      const updateSoal = id_soal.map((i, j) => {
        let k = j + 1;
        if(!k) k = id_soal.indexOf(i)+1;
        return {
          id_paket: id_paket,
          id_soal: i,
          no_urut_soal: k,
          bobot_soal: bobot_soal[j],
          kata_kunci_soal: kata_kunci_soal[j] || null
        }        
      });
      await Rel_paketsoal_soal.bulkCreate(updateSoal, {
        updateOnDuplicate: ['id_paket','id_soal','no_urut_soal', 'bobot_soal', 'kata_kunci_soal']
      });
      CacheControl.putSoalPkSoal;
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} soal berhasil diupdate pada paket ${id_paket}`
      })
    } catch (error) {
      next(error);
    }
  },

  async pkSoaldelSoal(req, res, next){
    try {
      const id_paket = req.params.id_paket;
      const id_soal = req.body.id_soal;
      const pkSoal = await Paket_soal.findByPk(id_paket);
      pkSoal.removeSoals(id_soal);
      CacheControl.deleteSoalPkSoal;
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} soal berhasil dihapus dari paket ${pkSoal.kode_paket}`
      })
    } catch (error) {
      next(error);
    }
  },

  async patchBobotSoal(req, res, next){
    try {
      const idSoal = req.params.id_soal;
      const bobotSoal = req.body.bobot_soal;      
      const relasi = await Rel_paketsoal_soal.findOne({
        where: {id_soal: idSoal}, attributes: ['id_soal']
      });
      if(!relasi) {
        throw createError.NotFound(`data soal ${idSoal} pada relasi soal_paket-soal tidak ditemukan`);
      } 
      await Rel_paketsoal_soal.update({bobot_soal: bobotSoal}, { 
        where: {id_soal: idSoal}
      });
      CacheControl.patchBobotSoal;
      res.status(200).json({
        success: true,
        msg: `bobot-soal untuk soal ${idSoal} berhasil diubah`
      })
    } catch (error) {
      next(error);
    }
  },

  async patchBobotSoalBulk(req, res, next){
    try {
      const { id_soal, bobot_soal } = req.body;
      for(let i of id_soal){
        const relasi = await Rel_paketsoal_soal.findOne({
          where: {id_soal: i}, attributes: ['id_soal']
        });
        if(!relasi) {
          throw createError.NotFound(`data soal ${i} pada relasi soal_paket-soal tidak ditemukan`);
        }
      }
      const updateVal = id_soal.map((i, j) => {
        return {
          id_soal: i,
          bobot_soal: bobot_soal[j]
        }
      });
      await Rel_paketsoal_soal.bulkCreate(updateVal, { 
        updateOnDuplicate: ['id_soal', 'bobot_soal']
      });
      CacheControl.patchBobotSoal;
      res.status(200).json({
        success: true,
        msg: `bobot-soal untuk soal ${id_soal} berhasil diubah`
      })
    } catch (error) {
      next(error);
    }
  },

  async patchKunciSoal(req, res, next){
    try {
      const idSoal = req.params.id_soal;
      const kunciSoal = req.body.kata_kunci_soal;      
      const relasi = await Rel_paketsoal_soal.findOne({
        where: {id_soal: idSoal}, attributes: ['id_soal']
      });
      if(!relasi) {
        throw createError.NotFound(`data soal ${idSoal} pada relasi soal_paket-soal tidak ditemukan`);
      } 
      await Rel_paketsoal_soal.update({kata_kunci_soal: kunciSoal}, { 
        where: {id_soal: idSoal}
      });
      CacheControl.patchKunciSoal;
      res.status(200).json({
        success: true,
        msg: `kata_kunci-soal untuk soal ${idSoal} berhasil diubah`
      })
    } catch (error) {
      next(error);
    }
  },

  async patchKunciSoalBulk(req, res, next){
    try {
      const { id_soal, kata_kunci_soal } = req.body;
      for(let i of id_soal){
        const relasi = await Rel_paketsoal_soal.findOne({
          where: {id_soal: i}, attributes: ['id_soal']
        });
        if(!relasi) {
          throw createError.NotFound(`data soal ${i} pada relasi soal_paket-soal tidak ditemukan`);
        }
      }
      const updateVal = id_soal.map((i, j) => {
        return {
          id_soal: i,
          kata_kunci_soal: kata_kunci_soal[j] || null
        }
      });
      await Rel_paketsoal_soal.bulkCreate(updateVal, { 
        updateOnDuplicate: ['id_soal', 'kata_kunci_soal']
      });
      CacheControl.patchKunciSoal;
      res.status(200).json({
        success: true,
        msg: `kata-kunci-soal untuk soal ${id_soal} berhasil diubah`
      })
    } catch (error) {
      next(error);
    }
  },
  // Jawaban Operation
  async getSoalPenilaian(req, res, next){    
    try {
      const { id_ujian } = req.params;
      const pkSoal = await Paket_soal.findOne({
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: id_ujian},
        include: [
          { model: Soal_essay, as: 'Soals', through: {
            where: {kata_kunci_soal: null},
            attributes: ['bobot_soal', 'kata_kunci_soal']
          }}
        ],
        order: [
          [{model: Soal_essay, as:'Soals'}, 'id_soal', 'ASC']
        ]
      });
      const soal = pkSoal.Soals.map((i) => {
        return {
          id_soal: i.id_soal,
          soal: i.soal,
          bobot_soal: i.Rel_paketsoal_soal.bobot_soal,
          gambar_soal: i.gambar_soal,
          audio_soal: i.audio_soal,
          video_soal: i.video_soal,
          status: i.status,
          created_at: i.created_at,
          updated_at: i.updated_at
        }
      });
      CacheControl.getSoalPenilaian(req);
      res.status(200).json({
        soal: soal
      })
    } catch (error) {
      next(error);
    }
  },

  async getAllJawabanSoalAnon(req, res, next){
    try {
      const  idSoal = req.params.id_soal;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit); 
      const relasi = await Rel_paketsoal_soal.findAll({
        where: {id_soal: idSoal}, 
        attributes: ['id'],
        raw: true
      }).then((i) => { return i.map(({id}) => id)});
      let opt = {        
        where: {id_relasi_soalpksoal: {[Op.in]: relasi}},
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_jawaban', 'ASC']]
      }
      const jawaban = await paginator(Jawaban_mahasiswa, pages, limits, opt);
      const jwb = jawaban.results.map((i) => {
        return {
          id_jawaban: i.id_jawaban,
          jawaban: i.jawaban,
          gambar_jawaban: i.gambar_jawaban,
          audio_jawaban: i.audio_jawaban,
          video_jawaban: i.video_jawaban,
          nilai_jawaban: i.nilai_jawaban
        }
      });
      CacheControl.getAllJawabanSoalAnon(req);
      res.status(200).json({
        next: jawaban.next,
        previous: jawaban.previous,
        jawaban: jwb
      })
    } catch (error) {
      (next);
    }
  },

  async getAllJawabanSoal(req, res, next){
    try {
      const idSoal = req.params.id_soal;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const relasi = await Rel_paketsoal_soal.findAll({
        where: {id_soal: idSoal}, 
        attributes: ['id'],
        raw: true
      }).then((i) => { return i.map(({id}) => id)});
      let opt = {        
        where: {id_relasi_soalpksoal: {[Op.in]: relasi}},
        offset: (pages - 1) * limits,
        limit: limits,
        include: {
          model: Mahasiswa, as: 'Mahasiswa', attributes: ['id_mhs','NIM','nama_lengkap']
        },
        order: [['id_jawaban', 'ASC']]
      }
      const jawaban = await paginator(Jawaban_mahasiswa, pages, limits, opt);
      const jwb = jawaban.results.map((i) => {
        return {
          id_jawaban: i.id_jawaban,
          jawaban: i.jawaban,
          gambar_jawaban: i.gambar_jawaban,
          audio_jawaban: i.audio_jawaban,
          video_jawaban: i.video_jawaban,
          nilai_jawaban: i.nilai_jawaban,
          data_penjawab: i.Mahasiswa
        }
      });
      CacheControl.getAllJawabanSoal(req);
      res.status(200).json({
        next: jawaban.next,
        previous: jawaban.previous,
        jawaban: jwb
      })
    } catch (error) {
      (next);
    }
  },

  async getJawaban(req, res, next){
    try {
      const idJawaban = req.params.id_jawaban;
        const jawaban = await Jawaban_mahasiswa.findOne({
          where: {id_jawaban: idJawaban}
        });
        if(!jawaban) throw createError.NotFound('data jawaban tidak ditemukan.')
        const jwb = {
          id_jawaban: jawaban.id_jawaban,
          id_relasi_soalpksoal: jawaban.id_relasi_soalpksoal,
          jawaban: jawaban.jawaban,
          gambar_jawaban: jawaban.gambar_jawaban,
          nilai_jawaban: jawaban.nilai_jawaban,
          created_at: jawaban.created_at,
          updated_at: jawaban.updated_at
        }
        CacheControl.getJawaban(req);
        res.status(200).json(jwb);
    } catch (error) {
      next(error);
    }
  },

  async setNilaiJawaban(req, res, next){
    try {
      const idJawaban = req.params.id_jawaban;
      const nilai = req.body.nilai;
      const jawaban = await Jawaban_mahasiswa.findOne({
        where: {id_jawaban: idJawaban},
        include: {
          model: Rel_paketsoal_soal, as: 'RelPaketSoal', attributes: ['bobot_soal']
        }
      });
      if(!jawaban) throw createError.NotFound('data jawaban tidak ditemukan.');
      const bobot_soal = jawaban.RelPaketSoal.bobot_soal
      if(nilai > bobot_soal) {
        throw createError.BadRequest(`nilai tidak boleh lebih besar dari bobot soal: ${bobot_soal}`);        
      }
      let val, status;
      if(req.method === 'POST') {
        val = { nilai_jawaban: nilai }, status = 'ditambahkan';
      } else {
        val = { nilai_jawaban: nilai, updated_at: fn('NOW') }, status = 'diubah';
      }
      await Jawaban_mahasiswa.update(val, {
        where: { id_jawaban: idJawaban }
      });
      CacheControl.postputNilaiJawaban;
      res.status(200).json({
        success: true,
        msg: `nilai jawaban berhasil ${status}`
      })
    } catch (error) {
      next(error);
    }
  },

  async setNilaiTotal(req, res, next){
    try {
      const id = req.params.id_relasi_pksoalmhs;
      const nilai = req.body.nilai_akhir;
      const nilaiTotal = await Rel_mahasiswa_paketsoal.findOne({
        where: {id: id}
      })
      if(!nilaiTotal) throw createError.NotFound('data relasi tidak ditemukan.');

      if(nilai > 100) {
        throw createError.BadRequest('nilai tidak boleh lebih besar dari total bobot soal.')
      }
      let val, status;
      if(req.method === 'POST') {
        val = { nilai_total: nilai }, status = 'ditambahkan'
      } else {
        val = { nilai_total: nilai, updated_at: fn('NOW') }, status = 'diubah'
      } 
      await Rel_mahasiswa_paketsoal.update(val, {
        where: {id: id}
      });
      CacheControl.postNewNilaiTotal;
      res.status(200).json({
        success: true,
        msg: `nilai total berhasil ${status}`
      })
    } catch (error) {
      next(error);
    }
  },

  async setNilaiUjian(req, res, next){
    try {
      const idUjian = req.params.id_ujian;
      const paket_soal = await Paket_soal.findAll({ 
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: idUjian},
        include: [
          {
            model: Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto',
            attributes: ['id', 'kata_kunci_soal'],
            where: {kata_kunci_soal: {[Op.ne]: null}},
            required: false
          }, {
            model: Rel_paketsoal_soal, as: 'PaketSoal_Soal_manual',
            attributes: ['id'],
            where: {kata_kunci_soal: null}
          }
        ],
        order: [
          [{model: Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto'}, 'id', 'ASC']
        ]
      });
      let arrId = jp.query(paket_soal, '$[*].PaketSoal_Soal_manual[*].id');
      if(!arrId.length) {
        throw createError.NotFound('data ujian tidak ditemukan atau penilaian ujian berupa automatis.');
      }
      const arrIdauto = jp.query(paket_soal, '$[*].PaketSoal_Soal_auto[*].id');
      if(arrIdauto.length) {
        const jawaban = await Jawaban_mahasiswa.findAll({
          attributes: ['id_jawaban', 'id_relasi_soalpksoal', 'jawaban'],
          where: {[Op.and]: [
            {id_relasi_soalpksoal: {[Op.in]: arrIdauto}}, 
            {nilai_jawaban: null}
          ]},
          order: [['id_relasi_soalpksoal', 'ASC']],
          raw: true
        });
        const arrayktKunci = jp.query(paket_soal, '$[*].PaketSoal_Soal_auto[*]');
        const nilaiJawaban = jawaban.map((i) => {
          let jawaban = i.jawaban.toLowerCase(), totalNilai = 0;
          for(let j = 0; j < arrayktKunci.length; j++){
            if(arrayktKunci[j].id === i.id_relasi_soalpksoal){
              for(let k = 0; k < arrayktKunci[j].kata_kunci_soal.length; k++){
                const kata_kunci = arrayktKunci[j].kata_kunci_soal[k].kata_kunci.toLowerCase();              
                if(jawaban.includes(kata_kunci)){
                  totalNilai += arrayktKunci[j].kata_kunci_soal[k].bobot_kata;
                }
              }
            } else {
              continue;
            }
          }
          return {
            id_jawaban: i.id_jawaban,
            nilai_jawaban: totalNilai
          }
        });
        await Jawaban_mahasiswa.bulkCreate(nilaiJawaban, {
          updateOnDuplicate: ['id_jawaban', 'nilai_jawaban']
        });
        arrId = arrId.concat(arrIdauto);
      }
      const final = await Jawaban_mahasiswa.findAll({
        attributes: ['id_mhs', [fn('sum', col('nilai_jawaban')), 'nilai_total']],
        where: {id_relasi_soalpksoal: {[Op.in]: arrId}},
        group: ['id_mhs'],
        include: {model: Rel_paketsoal_soal, as: 'RelPaketSoal', attributes: ['id'], 
          include:{model: Paket_soal, as: 'PaketSoal', attributes: ['id_paket']}},
        raw: true, nest: true
      });
      const data = final.map((i) => {        
        return {
          id_mhs: i.id_mhs,
          id_paket: i.RelPaketSoal.PaketSoal.id_paket,
          nilai_total: parseInt(i.nilai_total),
        }
      });
      await Rel_mahasiswa_paketsoal.bulkCreate(data, {
        updateOnDuplicate: ['id_mhs', 'id_paket', 'nilai_total']
      });
      CacheControl.postNewNilaiUjian;
      res.status(200).json({
        success: true,
        msg: `Nilai akhir ujian ${idUjian} untuk ${data.length} mahasiswa berhasil ditambahkan.`
      });
    } catch (error) {
      next(error);
    }
  },

}