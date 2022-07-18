"use strict";
const models = require('../models');
const helpers = require('../helpers/global');
const searchsValid = require('../validator/SearchValidator');
const { Op, fn, col } = require('sequelize');
const ExcelJS = require('exceljs');
const sharp = require('sharp');
const CacheControl = require('../controllers/CacheControl');
const jp = require('jsonpath');
const fs = require('fs');
const createError = require('../errorHandlers/ApiErrors');
const pdf = require('html-pdf');
const utility = require('util');
const unlinkAsync = utility.promisify(fs.unlink);
const path = require('path');
const config = require('../config/dbconfig');

const getKelas = async (options) => {
  const user = options.req;
  const kelas = await user.getDosen({
    attributes: ['id_dosen'],
    include: {
      model: models.Kelas, as: 'Kelases',
      attributes: ['id_kelas', 'id_matkul'],
      through: { attributes: [] }
    }
  });
  const kelasJson = kelas.toJSON();
  if('id_kelas' in options){
    if(Array.isArray(options.id_kelas)){
      return kelasJson.Kelases.some((i) => {
        return options.id_kelas.includes(parseInt(i.id_kelas))
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
  let obj, data, key, soals, no = 1;
  if(include === 'ujian'){
    obj = {
      model: models.Kelas, as: 'Kelases',
      include: {
        model: models.Ujian, as: 'Ujians',
        attributes: {
          exclude: ['durasi_per_soal', 'bobot_per_soal', 'status_ujian', 
          'aktif', 'created_at', 'updated_at']
        },
        include: [        
          {model: models.Ref_jenis_ujian, as: 'RefJenis', attributes: ['jenis_ujian']},
          {model: models.Paket_soal, as: 'PaketSoals', attributes: ['id_paket'], 
            include: {model: models.Soal_essay, as: 'Soals', attributes: ['id_soal'], 
            through: {attributes: []}}
          },
        ]
      }
    }
  } else {
    const dosen = await user.getDosen({ attributes: ['id_dosen'] }); 
    obj = {model: models.Soal_essay, as: 'Soals', attributes: ['id_soal']}
    soals = await models.Soal_essay.findAll({
      where: { id_dosen: dosen.id_dosen},
      include: [
        // {model: Paket_soal, as: 'Paketsoals', attributes: ['id_paket']},
        {model: models.Matakuliah, as: 'Matkul', attributes: ['id_matkul', 'nama_matkul']},
      ]
    });
  }
  const dosen = await user.getDosen({ include: [ obj ] });
  const dosenJson = dosen.toJSON();
  const nama = dosenJson.nama_lengkap.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
  const dataDosen = {
    username: user.username,
    nip: dosenJson.NIP,
    nidn: dosenJson.NIDN,
    nidk: dosenJson.NIDK,
    nama_lengkap: nama,
  }
  if(include === 'ujian'){
    const dataJson = jp.query(dosenJson, '$.Kelases[*].Ujians[*]');
    data = dataJson.map((i) => {
      return {
        no_ujian: no++,
        jenis_ujian: i.RefJenis.jenis_ujian,
        judul_ujian: i.judul_ujian,        
        tanggal_mulai: i.tanggal_mulai,
        waktu_mulai: i.waktu_mulai,
        durasi_ujian: i.durasi_ujian,
        bobot_total: i.bobot_total,
        deskripsi: i.deskripsi,
        jml_paket: i.PaketSoals.length,
        jml_soal: i.PaketSoals[0]?.Soals.length || 0,
      }
    }); key = 'ujian';
  } else {     
    data = soals.map((i) => {
      return {
        no_soal: no++,
        matakuliah: i.Matkul.nama_matkul,
        soal: i.soal,
        gambar_soal: i.gambar_soal.lengths,
        audio_soal: i.audio_soal? 1: 0,
        video_soal: i.video_soal? 1: 0,
        status: i.status
      }
    }); key = 'soal';
  }
  return {
    dosen: dataDosen,
    [key]: data
  }
}

const getHasilUjian = async (user, idUjian) => {
  const obj = {
    model: models.Kelas, as: 'Kelases',
    include: {
      model: models.Ujian, as: 'Ujians',
      where: {id_ujian: idUjian},
      attributes: {
        exclude: ['durasi_per_soal', 'bobot_per_soal', 'status_ujian', 
        'aktif', 'created_at', 'updated_at']
      },
      include: [        
        {model: models.Ref_jenis_ujian, as: 'RefJenis', attributes: ['jenis_ujian']},
        {model: models.Paket_soal, as: 'PaketSoals', attributes: ['id_paket', 'kode_paket'], 
          include: [
            {model: models.Mahasiswa, as: 'Mahasiswas', attributes: ['id_mhs', 'nama_lengkap']},
            {model: models.Soal_essay, as: 'Soals', attributes: ['id_soal'], 
            through: {attributes: []}}
          ]
        },
      ]
    }
  }
  const dosen = await user.getDosen({ include: [ obj ] });
  if(!dosen) return createError.NotFound('data ujian tidak ditemukan.'); 
  const dosenJson = dosen.toJSON();
  const paketSoal = jp.query(dosenJson, '$.Kelases[*].Ujians[*].PaketSoals[*]');
  if(!paketSoal.length) return createError.NotFound('ujian ini tidak memiliki paket-soal.');
  const nama = dosenJson.nama_lengkap.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
  const dataDosen = {
    username: user.username,
    nip: dosenJson.NIP,
    nidn: dosenJson.NIDN,
    nidk: dosenJson.NIDK,
    nama_lengkap: nama,
  }
  const dataJson = jp.query(dosenJson, '$.Kelases[*].Ujians[*]');
  const dataUjian = dataJson.map((i) => {
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
      jml_soal: i.PaketSoals[0].Soals.length
    }
  });
  let dataHasil = [], no = 1;
  for(let i of dataJson[0].PaketSoals){
    if(i.Mahasiswas.length){
      for(let j of i.Mahasiswas) {
        dataHasil.push({
          no_ujian: no++,
          nama_mhs: j.nama_lengkap,
          kode_paket: i.kode_paket,
          nilai_total: j.Rel_mahasiswa_paketsoal.nilai_total ?? 'null',
          waktu_mulai_pengerjaan: j.Rel_mahasiswa_paketsoal.waktu_mulai || 'null',
          waktu_selesai_pengerjaan: j.Rel_mahasiswa_paketsoal.waktu_selesai || 'null',
          lama_pengerjaan: j.Rel_mahasiswa_paketsoal.lama_pengerjaan || 'null',
        });
      }
    }
  }
  return {
    dataDosen: dataDosen,
    dataUjian: dataUjian[0],
    dataHasilUjian: dataHasil
  }
}

const patchPenilaianUjian = async (id_paket1, tipe_penilaian_ujian, id_ujian) => {
  const paket = await models.Rel_paketsoal_soal.findAll({
    attributes: ['id_soal', 'kata_kunci_soal'],
    where: { id_paket: id_paket1},
  }).then((i) => {
    const id_soal = i.map(({id_soal}) => { return id_soal });
    const kata_kunci = i.map(({kata_kunci_soal}) => { return kata_kunci_soal });
    return { id_soal, kata_kunci };
  });
  const tipe_penilaian = helpers.tipePenilaian(paket.kata_kunci, paket.id_soal);
  if(tipe_penilaian instanceof createError) throw tipe_penilaian;
  if(tipe_penilaian !== tipe_penilaian_ujian){
    await models.Ujian.update({
      tipe_penilaian: tipe_penilaian,
      updated_at: fn('NOW')
    }, {        
      where: {id_ujian: id_ujian} 
    });
  }
  return;
}

module.exports = {

  async getStatus(req, res, next){
    try {
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: [
          {
            model: models.Kelas, as: 'Kelases', attributes: ['id_kelas'],
            include: {model: models.Ujian, as: 'Ujians', attributes: ['id_ujian']}
          },
          {model: models.Soal_essay, as: 'Soals', attributes: ['id_soal']}
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
          model: models.Kelas, as: 'Kelases',
          through: {attributes:[]},
          include: {
            model: models.Ujian, as: 'Ujians', where: {status_ujian:'draft'}, required: false,
            include: {
              model: models.Paket_soal, as: 'PaketSoals'
            },                       
            through: {attributes:[]}
          },
          order: [
            [{ model: models.Ujian, as: 'Ujians' }, 'created_at', 'ASC']
          ]
        }
      });
      const kelasJson = dosen.toJSON();
      const kelasDosen = await Promise.all(kelasJson.Kelases.map(async (i) => {        
        const matkul = await models.Matakuliah.findOne({
          attributes:['id_matkul','nama_matkul'],
          where:{id_matkul: i.id_matkul}
        });
        return {
          id_kelas: i.id_kelas,
          thumbnail_kelas: i.illustrasi_kelas,
          kode_seksi: i.kode_seksi,
          matakuliah: matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          deskripsi: i.deskripsi,
        }
      }));
      const ujian = jp.query(kelasJson, '$.Kelases[*].Ujians[*]');
      const soal = await models.Soal_essay.findAll({
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
          model: models.Kelas, as: 'Kelases',
          attributes: ['id_kelas','id_matkul'],
          through: {attributes:[]},
          include: {
            model: models.Matakuliah, as: 'Matkul'
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
      const val = await models.Matakuliah.findOne({
        where: {id_matkul: id_matkul},
        include: [
          {model: models.Ref_kel_matkul, as: 'KelMk', attributes: ['id_kel_mk','kelompok_matakuliah']},
          {model: models.Ref_peminatan, as: 'RefPemin', attributes: ['id_peminatan','peminatan']}
        ]
      });
      if (!val) { throw createError.NotFound('data matakuliah tidak ditemukan.')}
      const matkul = {
        id_matkul: val.id_matkul,
        illustrasi_matkul: val.illustrasi_matkul,
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
          model: models.Kelas, as: 'Kelases',
          through: {attributes:[]},
          include: {
            model: models.Matakuliah, as: 'Matkul', attributes: ['nama_matkul']
          }
        }
      });
      const kelasJson = dosen.toJSON();
      const kelasDosen = kelasJson.Kelases.map((i) => {
        return {
          id_kelas: i.id_kelas,
          thumbnail_kelas: i.illustrasi_kelas,
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
        dosen = await models.Dosen.findOne({
            where: {id_dosen: id_dosen}
        });        
        if(!dosen){throw createError.NotFound('user tidak ditemukan.')}
        dosenUser = await dosen.getUser({
          attributes: {exclude: ['password','id_role']}
        });
        CacheControl.getProfilDosen(req);        
      } else {
        dosen = await models.Dosen.findOne({
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

  async putProfil(req, res, next){
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
      await models.User.update(updateVal1, {
        where: { id: user.id }
      });
      await models.Dosen.update(updateVal2, {
        where: { id_user: user.id }
      });
      const {password, ...dataUser} = req.user.dataValues; // eslint-disable-line
      const dataDosen = await req.user.getDosen();
      CacheControl.putProfilDosen();
      res.status(200).json({
        success: true,
        msg: `profil anda berhasil diubah`,
        data: {
          dataUser: dataUser,
          dataDosen: dataDosen
        }
      });
    } catch (error) {
      next(error);
    }
  },
  // Paket soal operation
  async setUjian(req, res, next){
    try {
      const idKelas = req.body.id_kelas;
      const { illustrasi_ujian, judul_ujian, jenis_ujian, tanggal_mulai, 
              waktu_mulai, durasi_ujian, durasi_per_soal, bobot_per_soal, 
              bobot_total, deskripsi } = req.body;
      const refJenis = await models.Ref_jenis_ujian.findOne({
        attributes:['id_jenis_ujian','jenis_ujian'],
        where: {jenis_ujian: jenis_ujian}
      });
      // pkCheck(idKelas, date, waktu_mulai);
      const ujian = await models.Ujian.create({
        illustrasi_ujian: illustrasi_ujian || config.auth.defaultBannerPic,
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
      });
      ujian.addKelases(idKelas);
      const data = ujian.toJSON();
      CacheControl.postNewUjianDraft();
      res.status(201).json({
        success: true,
        msg: 'Ujian berhasil dibuat',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },
  
  // async setUjiandanRelasi(req, res, next){
  //   try {
  //     const kdPaket = createKode(config.codegen.panjang_kode_paket);
  //     const idKelas = req.body.id_kelas;
  //     let idPaket;        
  //     const { illustrasi_ujian, judul_ujian, jenis_ujian, tanggal_mulai, 
  //             waktu_mulai, durasi_ujian, durasi_per_soal, bobot_per_soal, 
  //             bobot_total, status_ujian, deskripsi, id_soal, bobot_soal, 
  //             kata_kunci_soal, tipe_penilaian } = req.body;
  //     const refJenis = await Ref_jenis_ujian.findOne({
  //       attributes:['id_jenis_ujian','jenis_ujian'],
  //       where:{jenis_ujian:jenis_ujian}
  //     });
  //     // await pkCheck(idKelas, date, waktu_mulai);      
  //     const ujian = await Ujian.create({
  //       illustrasi_ujian: illustrasi_ujian || config.auth.defaultBannerPic,
  //       judul_ujian: judul_ujian,
  //       id_jenis_ujian: refJenis.id_jenis_ujian,
  //       tanggal_mulai: tanggal_mulai,
  //       waktu_mulai: waktu_mulai,
  //       durasi_ujian: durasi_ujian,
  //       durasi_per_soal: durasi_per_soal,
  //       bobot_per_soal: bobot_per_soal,
  //       bobot_total: bobot_total,
  //       deskripsi: deskripsi,
  //       status_ujian: status_ujian,
  //       tipe_penilaian: tipe_penilaian,
  //       aktif: 1,
  //       created_at: fn('NOW')
  //     }).then(async (o) => {
  //       const json = o.toJSON();
  //       idPaket = await Paket_soal.create({
  //         kode_paket: kdPaket,
  //         id_ujian: json.id_ujian,          
  //         aktif: 1
  //       }).then((o) => {
  //         return o.get({plain:true})
  //       });
  //       o.addKelase(idKelas);
  //     });
  //     const soal = id_soal.map((i, j) => {
  //       let k = j + 1;
  //       if(!k) k = id_soal.indexOf(i)+1;      
  //       return {
  //         id_paket: idPaket.id_paket,
  //         id_soal: i,
  //         no_urut_soal: k,
  //         bobot_soal: bobot_soal[j],
  //         kata_kunci_soal: kata_kunci_soal[j] || null
  //       }        
  //     });
  //     await Rel_paketsoal_soal.bulkCreate(soal);
  //     CacheControl.postNewUjianAktif();
  //     res.status(201).json({
  //       success: true,
  //       msg: `Ujian dengan kode paket ${kdPaket} berhasil dibuat, dengan soal sebanyak ${id_soal.length} butir`,
  //       data: ujian
  //     }) 
  //   } catch (error) {
  //     next(error)
  //   }
  // },

  async setUjianandPaketSoal(req, res, next){
    try {      
      const idKelas = req.body.id_kelas;
      const { jml_paket, illustrasi_ujian, judul_ujian, jenis_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, 
              durasi_per_soal, bobot_per_soal, bobot_total, deskripsi, id_soal, bobot_soal, 
              kata_kunci_soal, tipe_penilaian } = req.body;      
      let soal = [], i, arrIdPaket = [];
      const refJenis = await models.Ref_jenis_ujian.findOne({
        attributes:['id_jenis_ujian','jenis_ujian'],
        where: {jenis_ujian: jenis_ujian}
      });
      // await pkCheck(idKelas, date, waktu_mulai);      
      const ujian = await models.Ujian.create({
          illustrasi_ujian: illustrasi_ujian || config.auth.defaultBannerPic,
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
        const kdPaket = await helpers.createKode(config.codegen.panjang_kode_paket);        
        const idPaket = await models.Paket_soal.create({
          id_ujian: json.id_ujian,
          kode_paket: kdPaket,
          aktif: 1
        }).then((o) => {
          return o.get({plain:true})
        });
        if(i > 0){
          helpers.shuffleArray(id_soal, kata_kunci_soal, bobot_soal);
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
        arrIdPaket.push(idPaket.id_paket);
      }
      await models.Rel_paketsoal_soal.bulkCreate(soal.flat());
      if(config.autoRelatePaketSoal){
        const mhs = await models.Rel_mahasiswa_kelas.findAll({
          where: {id_kelas: idKelas},
          raw: true
        }).then((o) => { return o.map(({id_mhs}) => { return id_mhs})});
        if(mhs.length){
          helpers.shuffleArray(mhs);
          const mapped = mhs.map((i) => {
            const randomPaket = Math.floor(Math.random() * arrIdPaket.length);
            const idPaket = arrIdPaket[randomPaket]
            return {
              id_paket: idPaket,
              id_mhs: i
            }
          });
          await models.Rel_mahasiswa_paketsoal.bulkCreate(mapped);
        }
      }
      CacheControl.postNewUjianAktif();
      res.status(201).json({
        success: true,
        msg: `Ujian dengan ${jml_paket} paket soal berhasil dibuat, dengan soal sebanyak ${id_soal.length}
              butir per paket`,
        data: ujian
      });
    } catch (error) {
      next(error);
    }
  },

  // async generatePaketSoal(req, res, next){
  //   try {
  //     const { id_ujian } = req.params;
  //     const { jml_paket, quota_soal } = req.body;
  //     const ujian = await Ujian.findOne({
  //       where: {id_ujian: id_ujian},
  //       include: {
  //         model: Kelas, as: 'Kelases', attributes: ['id_matkul'],
  //         through: {attributes:[]}
  //       }
  //     });
  //     const idMatkul = ujian.Kelases[0].id_matkul;
  //     let opt = {
  //       req: req.user,
  //       id_matkul: idMatkul
  //     }
  //     const matkulExist = await getKelas(opt);
  //     if(matkulExist){
  //       const dosen = await opt.req.getDosen({attributes:['id_dosen']});

  //       let soals = await Soal_essay.findAll({ attributes: ['id_soal'], // returns array of id_soal
  //       where: { [Op.and]: [{id_matkul: idMatkul}, {id_dosen: dosen.id_dosen}]} 
  //       }).then((o) => { return o.map(({id_soal}) => { return id_soal})}); // [ 1, 2, 3, 4, 5,...]

  //       if (!soals) throw createError.NotFound(`tidak ada soal pada matakuliah ${idMatkul}.`);
  //       if(!quota_soal) {
  //         throw createError.BadRequest('quota soal tidak boleh kosong!');
  //       } else if (typeof quota_soal !== 'number') {
  //         throw createError.BadRequest('quota soal berupa angka!')
  //       }
  //       let soal = [], i, arr = [];
  //       for(i = 0; i < jml_paket; i++){
  //         const kdPaket = await createKode(config.codegen.panjang_kode_paket); // PkSoal
  //         const idPaket = await Paket_soal.create({
  //           id_ujian: id_ujian,
  //           kode_paket: kdPaket,
  //           aktif: 1
  //         });
  //         // if(i > 0){  // Soal
  //           shuffleArray(soals);
  //           if(soals.length > quota_soal){
  //             soals.splice(quota_soal);
  //           }
  //           soal.push(soals.map((i, j) => {
  //             let k = j + 1;
  //             if(!k) k = soals.indexOf(i)+1;
  //             return {
  //               id_paket: idPaket.id,
  //               id_soal: i,
  //               no_urut_soal: k,
  //               bobot_soal: 0
  //             }        
  //           }));
  //         // } else {
  //         //   if(soals.length > quota_soal){
  //         //     soals.splice(quota_soal);
  //         //   }
  //         //   soal = soals.map((i, j) => {        
  //         //     return {
  //         //       id_paket: idPaket.id,
  //         //       id_soal: i,
  //         //       no_urut_soal: j + 1,
  //         //       bobot_soal: 0
  //         //     }        
  //         //   });
  //         // }
  //         arr.push(kdPaket);
  //       }
  //       await Rel_paketsoal_soal.bulkCreate(soal.flat());
  //       res.status(201).json({
  //         success: true,
  //         msg: `${jml_paket} paket soal berhasil dibuat untuk ujian ${ujian.judul_ujian},
  //               dengan ${quota_soal} butir soal per paket.`
  //       })
  //     } else {
  //       throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah data ujian ini...');
  //     }
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  async generatePaketSoalstrict(req, res, next){
    try {
      const { id_ujian } = req.params;
      const { jml_paket, id_soal, bobot_soal, kata_kunci_soal, tipe_penilaian } = req.body;
      const ujian = await models.Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: [
          {
            model: models.Kelas, as: 'Kelases', attributes: ['id_kelas', 'id_matkul'],
            through: {attributes:[]},
            include: {
              model: models.Mahasiswa, as: 'Mahasiswas', attributes: ['id_mhs']
            }
          },
          {
            model: models.Paket_soal, as: 'PaketSoals', attributes: ['id_paket']
          }
        ]
      });
      const idMatkul = ujian.Kelases[0].id_matkul;
      let opt = {
        req: req.user,
        id_matkul: idMatkul
      }
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        let soal = [], i, mhs = [], arrIdPaket = [];
        for(let i of ujian.Kelases){
          if(i.Mahasiswas.length){
            for(let j of i.Mahasiswas){
              const ujianExist = await models.Rel_mahasiswa_paketsoal.findOne({
                where: {[Op.and]: [{id_mhs: j.id_mhs}, {'$PaketSoal.Ujian.id_ujian$': id_ujian}]},
                subQuery: false,
                include: {
                  model: models.Paket_soal, as: 'PaketSoal', attributes: ['id_paket'], 
                  include: {
                    model: models.Ujian, as: 'Ujian', attributes: ['id_ujian']
                  }
                },
              });
              if(ujianExist) {
                throw createError.Conflict(`mahasiswa dengan id ${j} sudah memiliki paket-soal untuk ujian ini.`);
              }
              mhs.push(j.id_mhs);
            }
          }
        }
        for(i = 0; i < jml_paket; i++){
          const kdPaket = await helpers.createKode(config.codegen.panjang_kode_paket);
          const idPaket = await models.Paket_soal.create({
            id_ujian: id_ujian,
            kode_paket: kdPaket,
            aktif: 1
          }).then((o) => { return o.get({plain:true}) });
          if(i > 0){
            helpers.shuffleArray(id_soal, kata_kunci_soal, bobot_soal);
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
          arrIdPaket.push(idPaket.id_paket);
        }
        await models.Ujian.update({
          tipe_penilaian: tipe_penilaian,
          status_ujian: 'akan dimulai',
          aktif: 1,
          updated_at: fn('NOW')
        }, {
          where: {id_ujian: id_ujian}
        });
        await models.Rel_paketsoal_soal.bulkCreate(soal.flat());
        if(config.autoRelatePaketSoal){// relasikan tiap paket ke mhs yg ada di kelas ujian
          if(mhs.length){
            helpers.shuffleArray(mhs);
            const mapped = mhs.map((i) => {
              const randomPaket = Math.floor(Math.random() * arrIdPaket.length);
              const idPaket = arrIdPaket[randomPaket]
              return {
                id_paket: idPaket,
                id_mhs: i
              }
            });
            await models.Rel_mahasiswa_paketsoal.bulkCreate(mapped); 
          }           
        }
        CacheControl.postNewPaketSoal();
        res.status(201).json({
          success: true,
          msg: `${jml_paket} paket soal berhasil dibuat untuk ujian ${ujian.judul_ujian},
                dengan total ${id_soal.length} butir soal per paket.`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}`
          }
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah data ujian ini...');
      }
    } catch (error) {
      next(error);
    }
  },

  async getUjian(req, res, next){
    try {
      if(req.url == '/ujian/pdf' || req.url == '/ujian/xlsx') return next();
      const { id_ujian } = req.params;
      const ujian = await models.Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: [
          {model: models.Paket_soal, as: 'PaketSoals'},
          {model: models.Ref_jenis_ujian, as: 'RefJenis'},
          {
            model: models.Kelas, as: 'Kelases', attributes: ['id_kelas'],
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
          illustrasi_ujian: ujian.illustrasi_ujian,
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
      const soalPenilaian = parseInt(req.query.forPenilaian) || false;
      const { id_ujian } = req.params;
      const opt = {
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: id_ujian},
        include:{ model: models.Soal_essay, as:'Soals', through: {
            attributes: ['bobot_soal']
          } 
        },
        order: [
          [{model: models.Soal_essay, as:'Soals'}, 'id_soal', 'ASC']
        ]
      }
      if(soalPenilaian) opt.include.through.where = {kata_kunci_soal: null};
      const pkSoal = await models.Paket_soal.findOne(opt);
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
      CacheControl.getAllSoal(req);
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
      const tanggal = helpers.dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(helpers.pathAll('ujian_dosen.hbs', 'pdf'), {
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
              'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-daftar_ujian.pdf"`
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
      const newWS = newWB.addWorksheet('Detail_ujian');      
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
        {header:'Jumlah Soal per-Paket', key:'jml_soal', style:{font:{name: 'Times New Roman'}}},
      ];
      newWS.columns = reColumns;
      newWS.addRows(ujian.ujian);
      newWS.getCell('L1').value = 'Nama Lengkap :';
      newWS.getCell('L2').value = 'NIP :';
      newWS.getCell('L3').value = 'NIDN :';
      newWS.getCell('L4').value = 'NIDK :';
      newWS.getCell('L5').value = 'Username :';
      newWS.mergeCells('M1:R1');
      newWS.getCell('M1').value = ujian.dosen.nama_lengkap;
      newWS.getCell('M1').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M2:R2');
      newWS.getCell('M2').value = ujian.dosen.nip;
      newWS.getCell('M2').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M3:R3');
      newWS.getCell('M3').value = ujian.dosen.nidn;
      newWS.getCell('M3').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M4:R4');
      newWS.getCell('M4').value = ujian.dosen.nidk;
      newWS.getCell('M4').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M5:R5');
      newWS.getCell('M5').value = ujian.dosen.username;
      newWS.getCell('M5').alignment = { horizontal:'left'} ;
      newWS.mergeCells('L6:R6');
      newWS.getCell('L6').value = 'tertanggal, ' + helpers.dateFull();
      newWS.getCell('L6').alignment = { horizontal:'center'} ;
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-daftar_ujian.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error);
    }
  },

  async getorsearchUjian(req, res, next) {
    try {
      let { find, page, limit } = req.query;
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      const user = req.user
      const dosen = await user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: models.Kelas, as: 'Kelases',
          through: {attributes:[]}
        }
      });
      let finderOpt = {
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [
          {model: models.Paket_soal, as: 'PaketSoals', attributes: ['kode_paket']},
          {model: models.Ref_jenis_ujian, as: 'RefJenis'}
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      if(find){
        const validator = searchsValid.ujianValidator(find, 'dosen');
        if (validator instanceof createError) throw validator;
        finderOpt.where = { [Op.or]: validator }
      }
      const ujian = [];
      for(let i of dosen.Kelases){
        ujian.push(await i.getUjians(finderOpt))
      }
      let opt = {
        finder: ujian.flat(),
        model: models.Ujian
      };
      const result = await helpers.paginatorMN(opt, pages, limits);
      const vals = result.results.map((i) => {
        return {
          id_ujian: i.id_ujian,
          thumbnail_ujian: i.illustrasi_ujian,
          jenis_ujian: i.RefJenis.jenis_ujian,
          judul_ujian: i.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.waktu_mulai,
          status_ujian: i.status_ujian,
          aktif: i.aktif,
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getAllUjian(req)
      res.status(200).json({
          next: result.next,
          previous: result.previous,
          ujian: vals
      });
    } catch (error) {
      next(error)
    }
  },

  async putUjian(req, res, next){
    try {
      const { illustrasi_ujian, jenis_ujian, judul_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, 
              durasi_per_soal, bobot_per_soal, bobot_total, status_ujian, aktif, deskripsi } = req.body;
      const { id_ujian } = req.params;
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: models.Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: models.Ujian, as: 'Ujians', attributes: ['id_ujian', 
            'tipe_penilaian', 'durasi_per_soal'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        const tipePenilaian = dosen.Kelases[0].Ujians[0].tipe_penilaian;
        const durasiSoal = dosen.Kelases[0].Ujians[0].durasi_per_soal;
        if(tipePenilaian) {          
          if(durasi_per_soal !== durasiSoal) {
            throw createError.BadRequest('ujian sudah memiliki paket(/paket-paket)-soal dan durasi per-soalnya tidak bisa dirubah.')
          }
        }
        const jenisUjian = await models.Ref_jenis_ujian.findOne({
          attributes:['id_jenis_ujian','jenis_ujian'],
          where: {jenis_ujian: jenis_ujian}
        });
        let updateVal = {
          illustrasi_ujian: illustrasi_ujian || config.auth.defaultBannerPic,
          judul_ujian: judul_ujian,
          id_jenis_ujian: jenisUjian.id_jenis_ujian,
          tanggal_mulai: tanggal_mulai,
          waktu_mulai: waktu_mulai,
          durasi_ujian: durasi_ujian,
          durasi_per_soal: durasi_per_soal,
          bobot_per_soal: bobot_per_soal,
          bobot_total: bobot_total,
          status_ujian: status_ujian,
          aktif: aktif,
          deskripsi: deskripsi,
          updated_at: fn('NOW')
        };
        await models.Ujian.update(updateVal, {
          where: { id_ujian: id_ujian }
        });
        const data = await models.Ujian.findOne({
          where: { id_ujian: id_ujian }
        });
        CacheControl.putUjian();
        res.status(200).json({
          success: true,
          msg: `data ujian berhasil diubah`,
          data: data
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
      if(req.url == '/ujian/bulk') return next();
      const { id_ujian } = req.params;
      const ujian = await models.Ujian.findOne({
        where: {id_ujian: id_ujian}
      });
      if (!ujian) { throw createError.NotFound('data ujian tidak ditemukan.')}
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: models.Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: models.Ujian, as: 'Ujians', attributes: ['id_ujian'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        await models.Ujian.destroy({
          where:{
            id_ujian: ujian.id_ujian
          }
        });
        CacheControl.deleteUjian();
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

  async deleteUjianBulk(req, res, next) {
    try {
      const { id_ujian } = req.body;      
      await models.Ujian.destroy({
        where:{
          id_ujian: {[Op.in]: id_ujian}
        }
      });
      CacheControl.deleteUjian();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_ujian.length} data berhasil dihapus`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian`
        }
      });
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
          model: models.Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: models.Ujian, as: 'Ujians', attributes: ['id_ujian'],
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
        await models.Ujian.update(updateVal, {
          where: { id_ujian: id_ujian }
        });
        const data = await models.Ujian.findOne({
          attributes: ['id_ujian', 'status_ujian', 'updated_at'],
          where: { id_ujian: id_ujian }
        })
        CacheControl.patchStatusUjian;
        res.status(200).json({
          success: true,
          msg: 'status ujian berhasil diubah',
          data: data
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
          model: models.Kelas, as: 'Kelases', 
          through: {attributes:[]}, attributes: ['id_kelas'],
          include: {
            model: models.Ujian, as: 'Ujians', attributes: ['id_ujian'],
            where: {id_ujian: id_ujian}, through: {attributes:[]}
          }
        }
      });
      if(dosen){
        const aktivasi = await models.Ujian.findOne({
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
        await models.Ujian.update(updateVal, {
          where: { id_ujian: id_ujian }
        });
        await models.Paket_soal.update(updateVal, {
          where: { id_ujian: id_ujian}
        });
        const data = await models.Ujian.findOne({
          attributes: ['id_ujian', 'aktif', 'updated_at'],
          where: { id_ujian: id_ujian }
        })
        CacheControl.patchKeaktifanUjian;
        res.status(200).json({
          success: true,
          msg: `ujian berhasil ${keaktifan}`,
          data: data
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mempunyai akses untuk mengubah data ujian ini!');
      } 
    } catch (error) {
      next(error);
    }
  },

  async printHasilUjianPdf(req, res, next){
    try {
      const idUjian = req.params.id_ujian;
      const ujian = await getHasilUjian(req.user, idUjian);
      if(ujian instanceof createError) throw ujian;
      const options = {format: 'A4'};
      const tanggal = helpers.dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(helpers.pathAll('hasil_ujian_dosen.hbs', 'pdf'), {
        kop_surat: img,
        data_dosen: ujian.dataDosen,
        data_ujian: ujian.dataUjian,
        data_hasilUjian: ujian.dataHasilUjian,
        tanggal: tanggal,
        // helpers: {
        //   incremented(index) {
        //     index++;
        //     return index;
        //   }
        // }
      }, function (err, HTML) {
        if(err) return createError.internal('Error while reading Handlebars: '+ err);
        pdf.create(HTML, options).toBuffer(function (err, buffer) {
          if (err) {
            return createError.BadRequest('Error while generating PDF: '+ err);
          }
          const output = ((val) => {
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-hasil_ujian.pdf"`
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

  async printHasilUjianXcel(req, res, next){
    try {
      const idUjian = req.params.id_ujian;
      const ujian = await getHasilUjian(req.user, idUjian);
      if(ujian instanceof createError) throw ujian;
      const newWB = new ExcelJS.Workbook();
      const newWS = newWB.addWorksheet('Hasil_ujian'); 
      var reColumns = [
        {header:'No.', key:'no_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Nama Mahasiswa', key:'nama_mhs', style:{font:{name: 'Times New Roman'}}},
        {header:'Kode Paket', key:'kode_paket', style:{font:{name: 'Times New Roman'}}},        
        {header:'Waktu Mulai Pengerjaan', key:'waktu_mulai_pengerjaan', style:{font:{name: 'Times New Roman'}}},
        {header:'Waktu Selesai Pengerjaan', key:'waktu_selesai_pengerjaan', style:{font:{name: 'Times New Roman'}}},
        {header:'Lama Pengerjaan', key:'lama_pengerjaan', style:{font:{name: 'Times New Roman'}}},
        {header:'Nilai Total', key:'nilai_total', style:{font:{name: 'Times New Roman'}}}
      ];
      newWS.columns = reColumns;
      newWS.addRows(ujian.dataHasilUjian);
      newWS.getCell('L1').value = 'Nama Lengkap :';
      newWS.getCell('L2').value = 'NIP :';
      newWS.getCell('L3').value = 'NIDN :';
      newWS.getCell('L4').value = 'NIDK :';
      newWS.getCell('L5').value = 'Username :';
      newWS.mergeCells('M1:R1');
      newWS.getCell('M1').value = ujian.dataDosen.nama_lengkap;
      newWS.getCell('M1').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M2:R2');
      newWS.getCell('M2').value = ujian.dataDosen.nip;
      newWS.getCell('M2').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M3:R3');
      newWS.getCell('M3').value = ujian.dataDosen.nidn;
      newWS.getCell('M3').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M4:R4');
      newWS.getCell('M4').value = ujian.dataDosen.nidk;
      newWS.getCell('M4').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M5:R5');
      newWS.getCell('M5').value = ujian.dataDosen.username;
      newWS.getCell('M5').alignment = { horizontal:'left'} ;
      newWS.getCell('L7').value = 'Judul Ujian :';
      newWS.getCell('L8').value = 'Jenis Ujian :';
      newWS.getCell('L9').value = 'Tanggal Mulai :';
      newWS.getCell('L10').value = 'Waktu Mulai :';
      newWS.getCell('L11').value = 'Jumlah Paket :';
      newWS.getCell('L12').value = 'Jumlah Soal per Paket :';
      newWS.mergeCells('M7:R7');
      newWS.getCell('M7').value = ujian.dataUjian.judul_ujian;
      newWS.getCell('M7').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M8:R8');
      newWS.getCell('M8').value = ujian.dataUjian.jenis_ujian;
      newWS.getCell('M8').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M9:R9');
      newWS.getCell('M9').value = ujian.dataUjian.tanggal_mulai;
      newWS.getCell('M9').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M10:R10');
      newWS.getCell('M10').value = ujian.dataUjian.waktu_mulai;
      newWS.getCell('M10').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M11:R11');
      newWS.getCell('M11').value = ujian.dataUjian.jml_paket;
      newWS.getCell('M11').alignment = { horizontal:'left'} ;
      newWS.mergeCells('M12:R12');
      newWS.getCell('M12').value = ujian.dataUjian.jml_soal;
      newWS.getCell('M12').alignment = { horizontal:'left'} ;
      newWS.mergeCells('L13:R13');
      newWS.getCell('L13').value = 'tertanggal, ' + helpers.dateFull();
      newWS.getCell('L13').alignment = { horizontal:'center'} ;
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-hasil_ujian.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error);
    }
  },
  // PaketSoal operation
  async getPaketSoal(req, res, next){
    try {
      const idPaket = req.params.id_paket;
      const paket = await models.Paket_soal.findOne({
        where: {id_paket: idPaket},
        include: [
          {model: models.Soal_essay, as: 'Soals', attributes: ['id_soal'], through: {attributes:[]}}
        ]
      });
      if(!paket) throw createError.NotFound('data paket soal tidak ditemukan');
      const json = paket.toJSON();
      const data = {
        id_paket: json.id_paket,
        kode_paket: json.kode_paket,
        id_ujian: json.id_ujian,
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
      const paket = await models.Rel_mahasiswa_paketsoal.findAll({
        where: {id_paket: idPaket},
        include: [
          {model: models.Mahasiswa, as: 'Mahasiswa', attributes: ['id_mhs','NIM','nama_lengkap']},
          {model: models.Paket_soal, as: 'PaketSoal'}
        ]
      });
      if(!paket) throw createError.NotFound('data paket-soal tidak ditemukan');
      CacheControl.getPaketSoalMhs(req);    
      const data = paket.map((i) => { 
        return {
          id_relasi_pksoalmhs: i.id,
          id_mhs: i.id_mhs,
          id_paket: i.id_paket,
          nilai_total: i.nilai_total,
          waktu_mulai_pengerjaan: i.waktu_mulai,
          waktu_selesai_pengerjaan: i.waktu_selesai,
          lama_pengerjaan: i.lama_pengerjaan,
          paket_soal: i.PaketSoal,
          mahasiswa: i.Mahasiswa
        }
      })
      res.status(200).json({
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async getNilaiTotalMhs(req, res, next){
    try {
      const { id_paket, id_mhs } = req.params;
      const paket = await models.Rel_mahasiswa_paketsoal.findOne({
        where: {[Op.and]: [{id_paket: id_paket}, {id_mhs: id_mhs}]},
        include: [
          {model: models.Mahasiswa, as: 'Mahasiswa', attributes: ['id_mhs','NIM','nama_lengkap']},
          {model: models.Paket_soal, as: 'PaketSoal', include: {
            model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal', attributes: ['id'],
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
      const aktivasi = await models.Paket_soal.findOne({
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
      await models.Paket_soal.update(updateVal, {
        where: { id_paket: id_paket }
      });
      const data = await models.Paket_soal.findOne({
        attributes: ['id_paket', 'aktif', 'updated_at'],
        where: { id_paket: id_paket }
      })
      CacheControl.patchKeaktifanPkSoal;
      res.status(200).json({
        success: true,
        msg: `paket soal ${id_paket} berhasil ${keaktifan}`,
        data: data
      })
    } catch (error) {
      next(error);
    }
  },

  async deletePaketSoal(req, res, next){
    try {
      if(req.url === '/paket-soal/bulk') return next();
      const { id_paket } = req.params;
      const paketExist = await models.Paket_soal.findOne({where: {id_paket: id_paket}});
      if (!paketExist) { throw createError.NotFound('data paket-soal tidak ditemukan.')}
      const dosen = await req.user.getDosen({
        attributes: ['id_dosen'],
        include: {
          model: models.Kelas, as: 'Kelases', attributes: ['id_kelas'], 
          through: {attributes:[]},
          include: {model: models.Ujian, as:'Ujians', attributes: ['id_ujian'], 
            through: {attributes:[]},
              include: {model: models.Paket_soal, as: 'PaketSoals', attributes: ['id_paket'],
              where: { id_paket: id_paket }}}}
      });
      if(dosen){
        await models.Paket_soal.destroy({
          where:{
            id_paket: id_paket
        }});
        CacheControl.deletePaketSoal();
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

  async deletePaketSoalBulk(req, res, next) {
    try {
      const { id_paket } = req.body;
      const paketSoal = await models.Paket_soal.findOne({where: {id_paket: id_paket[0]}});
      await models.Paket_soal.destroy({
        where:{
          id_paket: {[Op.in]: id_paket}
        }
      });
      CacheControl.deletePaketSoal();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_paket.length} data berhasil dihapus`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${paketSoal.id_ujian}`
        }
      });
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
        const kelas = await models.Kelas.findByPk(id_kelas);
        kelas.addUjians(id_ujian);
        CacheControl.postNewUjianKelas();
        res.status(200).json({
          success: true,
          msg: `kelas berhasil direlasikan dengan ujian id ${id_ujian}`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}/v1/kelas/${id_kelas}`
          }
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
        const kelas = await models.Kelas.findByPk(id_kelas);
        kelas.setUjians(id_ujian);
        CacheControl.putUjianKelas();
        res.status(200).json({
          success: true,
          msg: `relasi ujian pada kode seksi ${kelas.kode_seksi} berhasil diubah ke ujian id ${id_ujian}`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}/v1/kelas/${id_kelas}`
          }
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
        const kelas = await models.Kelas.findByPk(id_kelas);
        // kelas.removeUjians(id_ujian);
        CacheControl.deleteUjianKelas();
        res.status(200).json({
          success: true,
          msg: `relasi ujian dengan id ${id_ujian} pada kode seksi ${kelas.kode_seksi} berhasil dihapus`
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
        const ujian = await models.Ujian.findByPk(id_ujian);
        if(!ujian) { throw createError.NotFound('ujian tidak terdaftar.'); }
        ujian.addKelases(id_kelas);
        CacheControl.postNewUjianKelas();
        res.status(200).json({
          success: true,
          msg: `ujian berhasil direlasikan dengan kelas id ${id_kelas}`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}`
          }
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
        const ujian = await models.Ujian.findByPk(id_ujian);
        if(!ujian) { throw createError.NotFound('ujian tidak terdaftar.'); }
        ujian.setKelases(id_kelas);
        CacheControl.putUjianKelas();
        res.status(200).json({
          success: true,
          msg: `ujian pada kelas ${id_kelas}, berhasil diubah`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}`
          }
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
        const ujian = await models.Ujian.findByPk(id_ujian);
        if(!ujian) { throw createError.NotFound('ujian tidak terdaftar.'); }
        ujian.removeKelases(id_kelas);
        CacheControl.deleteUjianKelas();
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
      const { id_matkul, soal, kata_kunci_soal, status } = req.body;
      let { gambar_soal_1, gambar_soal_2, gambar_soal_3, audio_soal, video_soal } = req.files;
      if(!id_matkul) throw createError.BadRequest('id matkul tidak boleh kosong!');
      let opt = {
        req: req.user,
        id_matkul: id_matkul
      }, vals = [];
      const matkulExist = await getKelas(opt);
      if(matkulExist){
        const dosen = await opt.req.getDosen({attributes:['id_dosen']});
        const soalExist = await models.Soal_essay.findOne({
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
        const idSoal = await models.Soal_essay.create({
          id_matkul: id_matkul,
          id_dosen: dosen.id_dosen,          
          soal: soal,
          status: status,
          gambar_soal: vals,
          audio_soal: audio_soal,
          video_soal: video_soal,
          kata_kunci_soal: kata_kunci_soal,
          created_at: fn('NOW')
        });
        CacheControl.postNewSoal();
        res.status(201).json({
          success: true,
          msg: `soal berhasil ditambahkan ke bank soal matakuliah ${id_matkul}`,
          data: idSoal
        })
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah berserta kelas ini...');
      }     
    } catch (error) {
      if(req.files){
        for(let i in req.files){
          for(let j of req.files[i]) await unlinkAsync(j.path);
        }
      }
      next(error);
    }
  },

  async setSoalBulk(req, res, next){
    let picPatharr = [];
    try {      
      const id_matkul = req.body.id_matkul;
      if (req.files.soal_bulk[0].originalname !== 'soal_bulk_adder.xlsx') {
        throw createError.BadRequest('File bukan file soal_bulk_adder.');
      }
      if(!id_matkul) throw createError.BadRequest('id matkul tidak boleh kosong!');     
      const excelFile = helpers.pathAll(req.files.soal_bulk[0].filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Soal_adder');
      let data = [], imgArray = [];
      if(ws.getImages().length) {
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const name = helpers.randomName(7);
          const picPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-soal');
          const scaleBy2 = await sharp(img.buffer).metadata()
          .then(({ width, height }) => sharp(img.buffer)
            .resize(Math.round(width * 2), Math.round(height * 2))
            .sharpen()
            .toFile(picPath)
          );
          if(scaleBy2 instanceof Error) {
            console.error(scaleBy2);
            throw createError.internal(`upload gambar row: ${row}, col: ${col} gagal`);
          }
          imgArray.push({[row]:`${row}.${col}.${name}.${img.extension}`});
          picPatharr.push(picPath);
        }
        imgArray = imgArray.reduce((acc, element) => { // groupBy key
          const [key, val] = Object.entries(element)[0];
          (acc[key] || (acc[key] = [])).push(val);
          return acc;
        }, []);
      }      
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
          if(!img) img = [];
            data.push({
              id_matkul: id_matkul,
              id_dosen: dosen.id_dosen,
              soal: row[1],
              gambar_soal: img,
              audio_soal: row[5],
              video_soal: row[6],
              kata_kunci_soal: row[7]? row[7].split(','): null,
              status: 'terbit',
              created_at: fn('NOW')
            });
          }
        }
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah ini');
      }      
      await models.Soal_essay.bulkCreate(data);
      CacheControl.postNewSoal();
      res.status(200).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.files.soal_bulk[0].originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/matakuliah/${id_matkul}/soal-essay`
        }
      });
    } catch (error) {
      if(req.files){
        for(let i in req.files){
          for(let j of req.files[i]) await unlinkAsync(j.path);
        }
      }
      next(error);
    }
  },

  // async setSoaldanRelasi(req, res, next){
  //   try {
  //     const { id_ujian, soal } = req.body;
  //     let { gambar_soal_1, gambar_soal_2, gambar_soal_3, audio_soal, video_soal } = req.files;
  //     const ujian = await Ujian.findOne({ 
  //       where: {id_ujian: id_ujian},
  //       attributes: ['id_ujian', 'judul_ujian'],
  //       include: {model: Kelas, as: 'Kelases', attributes: ['id_kelas', 'id_matkul']}
  //     });
  //     const idMatkul = ujian.Kelases[0].id_matkul
  //     let opt = {
  //       req: req.user,
  //       id_matkul: idMatkul
  //     }, vals = [];
  //     const matkulExist = await getKelas(opt);
  //     if(matkulExist){
  //       const dosen = await opt.req.getDosen({attributes:['id_dosen']});
  //       if(gambar_soal_1){vals.push(gambar_soal_1[0].filename)}
  //       if(gambar_soal_2){vals.push(gambar_soal_2[0].filename)}
  //       if(gambar_soal_3){vals.push(gambar_soal_3[0].filename)}
  //       if(req.body.audio_soal) {
  //         audio_soal = req.body.audio_soal;
  //       } else if(audio_soal) {
  //         audio_soal = audio_soal[0].filename;
  //       } else {
  //         audio_soal = null;
  //       }
  //       if(req.body.video_soal) {
  //         video_soal = req.body.video_soal;
  //       } else if(video_soal) {
  //         video_soal = video_soal[0].filename;
  //       } else {
  //         video_soal = null;
  //       }
  //       const data = await Soal_essay.create({
  //         id_matkul: idMatkul,
  //         id_dosen: dosen.id_dosen,          
  //         soal: soal,
  //         status: 'terbit',
  //         gambar_soal: vals,
  //         audio_soal: audio_soal,
  //         video_soal: video_soal,
  //         created_at: fn('NOW')
  //       });
  //       CacheControl.postNewSoal();
  //       res.status(200).json({
  //         success: true,
  //         msg: `soal berhasil ditambahkan ke bank soal matakuliah ${idMatkul}`,
  //         data: data
  //       })
  //     } else {
  //       throw createError.Forbidden('maaf, anda tidak mengampu matakuliah berserta kelas ini...');
  //     }     
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  async getSoal(req, res, next){
    try {
      if(req.url == '/soal-essay/pdf' || req.url == '/soal-essay/xlsx') return next();
      const { id_soal } = req.params;
      const dosen = await req.user.getDosen({attributes: ['id_dosen']});
      const soal = await models.Soal_essay.findOne({
        where: {[Op.and]: [{id_dosen: dosen.id_dosen}, {id_soal: id_soal}]}, 
        include: [
          {model: models.Matakuliah, as: 'Matkul', attributes: ['id_matkul', 'nama_matkul']},
          {model: models.Paket_soal, as: 'PaketSoals', required: false, 
            through: {attributes: ['no_urut_soal', 'bobot_soal', 'kata_kunci_soal']},
            include: {model: models.Ujian, as: 'Ujian', attributes: ['id_ujian', 'judul_ujian']}
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
          kata_kunci_soal: soalJson.kata_kunci_soal,
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
      const tanggal = helpers.dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(helpers.pathAll('soal_dosen.hbs', 'pdf'), {
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
              'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-soal.pdf"`
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
      const soal = await getHistory(req.user, 'soal');
      const newWB = new ExcelJS.Workbook();
      const newWS = newWB.addWorksheet('Status_app');      
      var reColumns = [
        {header:'No. Soal', key:'no_soal', style:{font:{name: 'Times New Roman'}}},
        {header:'Matakuliah', key:'matakuliah', style:{font:{name: 'Times New Roman'}}},
        {header:'Soal', key:'soal', style:{font:{name: 'Times New Roman'}}},        
        {header:'Gambar Soal', key:'gambar_soal', style:{font:{name: 'Times New Roman'}}},
        {header:'Audio Soal', key:'audio_soal', style:{font:{name: 'Times New Roman'}}},
        {header:'Video Soal', key:'video_soal', style:{font:{name: 'Times New Roman'}}},
        {header:'Status Soal', key:'status', style:{font:{name: 'Times New Roman'}}},
      ];
      newWS.columns = reColumns;
      newWS.addRows(soal.soal);
      newWS.getCell('I1').value = 'Nama Lengkap :';
      newWS.getCell('I2').value = 'NIP :';
      newWS.getCell('I3').value = 'NIDN :';
      newWS.getCell('I4').value = 'NIDK :';
      newWS.getCell('I5').value = 'Username :';
      newWS.mergeCells('J1:O1');
      newWS.getCell('J1').value = soal.dosen.nama_lengkap;
      newWS.getCell('J1').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J2:O2');
      newWS.getCell('J2').value = soal.dosen.nip;
      newWS.getCell('J2').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J3:O3');
      newWS.getCell('J3').value = soal.dosen.nidn;
      newWS.getCell('J3').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J4:O4');
      newWS.getCell('J4').value = soal.dosen.nidk;
      newWS.getCell('J4').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J5:O5');
      newWS.getCell('J5').value = soal.dosen.username;
      newWS.getCell('J5').alignment = { horizontal:'left'} ;
      newWS.mergeCells('I6:O6');
      newWS.getCell('I6').value = 'tertanggal, ' + helpers.dateFull();
      newWS.getCell('I6').alignment = { horizontal:'center'} ;
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-soal.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error);
    }
  },

  async getAllSoalMatkul(req, res, next){
    try {
      const idMatkul = req.params.id_matkul;
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      const dosen = await req.user.getDosen({attributes:['id_dosen']});
      let opt = {
        where: {[Op.and]: [
          {id_matkul: idMatkul}, {id_dosen: dosen.id_dosen}
        ]},
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_soal', 'ASC']] // status terbit asc
      }, vals = [];
      const soal = await helpers.paginator(models.Soal_essay, pages, limits, opt);
      for (let i of soal.results){
        vals.push({
          id_soal: i.id_soal,
          soal: i.soal,
          gambar_soal: i.gambar_soal,
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

  async getorsearchSoal(req, res, next){
    try {
      let { find, page, limit } = req.query;      
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      const user = req.user;
      const dosen = await user.getDosen({attributes:['id_dosen']});
      let opt = {
        where: {id_dosen: dosen.id_dosen},
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [{model: models.Matakuliah, as: 'Matkul'}],
        order: [['id_soal', 'ASC']]
      }, vals = [];
      if(find){
        const validator = searchsValid.soalValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = {[Op.and]: [{id_dosen: dosen.id_dosen}, {
            [Op.or]: validator
          }]
        }
      }
      const soal = await helpers.paginator(models.Soal_essay, pages, limits, opt);
      if (soal.results.length === 0) {vals.push('No record...')}
      for (let i of soal.results){
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
      const dosen = await req.user.getDosen({attributes:['id_dosen']});
      const soal = await models.Soal_essay.findOne({
        where: { [Op.and]: [{id_soal: id_soal}, {id_dosen: dosen.id_dosen}] }
      });
      if(soal){
        let { soal, array_gambar_soal, kata_kunci_soal, status } = req.body;
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
        if(typeof array_gambar_soal == 'string') {
          array_gambar_soal = JSON.parse(array_gambar_soal)
        }
        let updateVal = {
          soal: soal,
          gambar_soal: array_gambar_soal,
          audio_soal: audio_soal,
          video_soal: video_soal,
          kata_kunci_soal: kata_kunci_soal,
          status: status,
          updated_at: fn('NOW')
        };
        await models.Soal_essay.update(updateVal, {
          where: { id_soal: id_soal }
        });
        const data = await models.Soal_essay.findOne({
          where: { id_soal: id_soal }
        });
        CacheControl.putSoal();
        res.status(200).json({
          success: true,
          msg: 'soal berhasil diedit',
          data: data
        });
      } else{
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah soal ini!')
      }      
    } catch (error) {
      if(req.files){
        for(let i in req.files){
          for(let j of req.files[i]) await unlinkAsync(j.path);
        }
      }
      next(error);
    }
  },

  async putSoalBulk(req, res, next){
    let picPatharr = [];
    try {
      const id_matkul = req.body.id_matkul;
      if (req.files.soal_bulk[0].originalname !== 'soal_bulk_updater.xlsx') {
        throw createError.BadRequest('File bukan file soal_bulk_updater.');
      }
      if(!id_matkul) throw createError.BadRequest('id matkul tidak boleh kosong!');
      const excelFile = helpers.pathAll(req.files.soal_bulk[0].filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Soal_updater');
      let data = [], imgArray = [];
      if(ws.getImages().length) {
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const name = helpers.randomName(7);
          const picPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-soal');
          const scaleBy2 = await sharp(img.buffer).metadata()
          .then(({ width, height }) => sharp(img.buffer)
            .resize(Math.round(width * 2), Math.round(height * 2))
            .sharpen()
            .toFile(picPath)
          );
          if(scaleBy2 instanceof Error) {
            console.error(scaleBy2);
            throw createError.internal(`upload gambar row: ${row}, col: ${col} gagal`);
          }
          imgArray.push({[row]:`${row}.${col}.${name}.${img.extension}`});
          picPatharr.push(picPath);
        }
        imgArray = imgArray.reduce((acc, element) => { // groupBy key
          const [key, val] = Object.entries(element)[0];
          (acc[key] || (acc[key] = [])).push(val);
          return acc;
        }, []);
      }      
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
            const obj = {
              id_soal: row[1],
              id_matkul: id_matkul,
              id_dosen: dosen.id_dosen,
              soal: row[2],
              gambar_soal: img,
              audio_soal: row[6] ?? null,
              video_soal: row[7] ?? null,
              kata_kunci_soal: row[8].split(','),
              status: row[9],
              updated_at: fn('NOW')
            }
            if(!img) delete obj.gambar_soal
            if(!row[8]) delete obj.kata_kunci_soal
            data.push(obj);
          }
        }
      } else {
        throw createError.Forbidden('maaf, anda tidak mengampu matakuliah ini');
      }
      await models.Soal_essay.bulkCreate(data, {
        updateOnDuplicate: ['id_soal', 'id_matkul', 'id_dosen', 'soal', 'gambar_soal', 'audio_soal', 
        'video_soal', 'status', 'kata_kunci_soal', 'updated_at']
      });
      CacheControl.putSoal();
      res.status(200).json({
        success: true,
        msg: `DB soal matakuliah ${id_matkul} berhasil diubah sesuai: ${req.files.soal_bulk[0].originalname}`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/matakuliah/${id_matkul}/soal-essay`
        }
      });
    } catch (error) {
      if(req.files){
        for(let i in req.files){
          for(let j of req.files[i]) await unlinkAsync(j.path);
        }
      }
      next(error);
    }
  },

  async patchGambarSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      let { array_gambar_soal } = req.body;
      const { gambar_soal_1, gambar_soal_2, gambar_soal_3 } = req.files;
      if(typeof array_gambar_soal == 'string') {
        array_gambar_soal = JSON.parse(array_gambar_soal)
      }
      if(gambar_soal_1){array_gambar_soal[0] = gambar_soal_1[0].filename}
      if(gambar_soal_2){array_gambar_soal[1] = gambar_soal_2[0].filename}
      if(gambar_soal_3){array_gambar_soal[2] = gambar_soal_3[0].filename}
      let updateVal = {
        gambar_soal: array_gambar_soal,
        updated_at: fn('NOW')
      };
      await models.Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      const data = await models.Soal_essay.findOne({
        attributes: ['id_soal', 'gambar_soal', 'updated_at'],
        where: { id_soal: id_soal }
      })
      CacheControl.patchGambarSoal();
      res.status(200).json({
        success: true,
        msg: 'gambar soal berhasil diubah',
        data: data
      });
    } catch (error) {
      if(req.files){
        for(let i in req.files){
          for(let j of req.files[i]) await unlinkAsync(j.path);
        }
      }
      next(error);
    }
  },

  async patchAudioSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      let audio_soal = req.file;
      if(req.body.audio_soal) {
        audio_soal = req.body.audio_soal;
      } else if(audio_soal) {
        audio_soal = audio_soal.filename;
      } else {
        audio_soal = null;
      }      
      let updateVal = {
        audio_soal: audio_soal,
        updated_at: fn('NOW')
      };
      await models.Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      const data = await models.Soal_essay.findOne({
        attributes: ['id_soal', 'audio_soal', 'updated_at'],
        where: { id_soal: id_soal }
      })
      CacheControl.patchAudioSoal();
      res.status(200).json({
        success: true,
        msg: 'audio soal berhasil diubah',
        data: data
      });
    } catch (error) {
      if(req.file){
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async patchVideoSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      let video_soal = req.file;
      if(req.body.video_soal) {
        video_soal = req.body.video_soal;
      } else if(video_soal) {
        video_soal = video_soal.filename;
      } else {
        video_soal = null;
      }
      let updateVal = {
        video_soal: video_soal,
        updated_at: fn('NOW')
      };
      await models.Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      const data = await models.Soal_essay.findOne({
        attributes: ['id_soal', 'video_soal', 'updated_at'],
        where: { id_soal: id_soal }
      })
      CacheControl.patchVideoSoal();
      res.status(200).json({
        success: true,
        msg: 'video soal berhasil diubah',
        data: data
      });
    } catch (error) {
      if(req.file){
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async patchStatusSoal(req, res, next){
    try {
      const { id_soal } = req.params;
      const status = await models.Soal_essay.findOne({
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
      await models.Soal_essay.update(updateVal, {
        where: { id_soal: id_soal }
      });
      const data = await models.Soal_essay.findOne({
        attributes: ['id_soal', 'status', 'updated_at'],
        where: { id_soal: id_soal }
      })
      CacheControl.patchStatusSoal;
      res.status(200).json({
        success: true,
        msg: `soal ${id_soal} berhasil ${statusSoal}`,
        data: data
      })
    } catch (error) {
      next(error);
    }
  },

  async deleteSoal(req, res, next){
    try {
      if(req.url == '/soal-essay/bulk') return next();
      const { id_soal } = req.params;
      const getSoal = await models.Soal_essay.findOne({
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
        await models.Soal_essay.destroy({
          where:{
            id_soal: getSoal.id_soal
          }
        });
        CacheControl.deleteSoal();
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

  async deleteSoalBulk(req, res, next) {
    try {
      const { id_soal } = req.body;      
      await models.Soal_essay.destroy({
        where:{
          id_soal: {[Op.in]: id_soal}
        }
      });
      CacheControl.deleteSoal();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} data berhasil dihapus`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/soal-essay`
        }
      });
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
  async UjiansetSoal(req, res, next){
    try {
      const id_ujian = req.params.id_ujian;
      const { id_soal, bobot_soal, kata_kunci_soal } = req.body;
      let soal = [];
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket', [fn('sum', col('PaketSoal_Soal_auto.bobot_soal')), 'bobot_total']],
        where: { id_ujian: id_ujian },
        group: ['id_paket'],
        include: [
          {
            model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
          },
          {
            model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto',
            attributes: []
          }
        ],
        raw: true, nest: true
      });
      if(!paketUjian.length) throw createError.BadRequest('maaf, ujian ini belum memiliki paket-soal.');
      for(let l of paketUjian){
        if(parseInt(l.bobot_total) === 100){
          throw createError.BadRequest(`bobot total seluruh soal paket-soal dengan id ${l.id_paket} 
          pada ujian ini sudah mencapai 100, dan tidak dapat ditambahkan lagi. { bobot = ${l.bobot_total} }`);
        }
        const countSoal = await models.Rel_paketsoal_soal.count({
          where:{ id_paket: l.id_paket }
        });
        if(countSoal){
          helpers.shuffleArray(id_soal, kata_kunci_soal, bobot_soal);
          soal.push(id_soal.map((i, j) => {
            return {
              id_paket: l.id_paket,
              id_soal: i,
              no_urut_soal: countSoal + j + 1,
              bobot_soal: bobot_soal[j],
              kata_kunci_soal: kata_kunci_soal[j] || null
            }
          }));
        } else {
          soal.push(id_soal.map((i, j) => {
            let k = j + 1;
            if(!k) k = id_soal.indexOf(i)+1;      
            return {
              id_paket: l.id_paket,
              id_soal: i,
              no_urut_soal: k,
              bobot_soal: bobot_soal[j],
              kata_kunci_soal: kata_kunci_soal[j] || null
            }
          }));
        }
      }
      await models.Rel_paketsoal_soal.bulkCreate(soal.flat());
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.postNewSoalUjian();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} soal berhasil ditambahkan ke ${paketUjian.length} paket-soal`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}/soal-essay`
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async UjianputSoal(req, res, next){
    try {
      const id_ujian = req.params.id_ujian;
      const { id_soal, bobot_soal, kata_kunci_soal } = req.body;
      let updateSoal = [];      
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket'],
        where: { id_ujian: id_ujian },
        include: {
          model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
        },
        raw: true, nest: true
      });
      if(!paketUjian.length) throw createError.BadRequest('maaf, ujian ini belum memiliki paket-soal.');
      for(let l of paketUjian){
        const soalPaket = await models.Rel_paketsoal_soal.findAll({
          attributes: [[fn('sum', col('bobot_soal')), 'bobot_total']],
          where: {[Op.and]: [
            { id_paket: l.id_paket }, { id_soal: { [Op.notIn]: id_soal } }
          ]},
          raw: true
        });
        if(soalPaket.length){
          const totalBobotSoal = bobot_soal.reduce((a, b) => { return a + b }, 0);
          const bobotNow = totalBobotSoal + parseInt(soalPaket[0].bobot_total);
          if(bobotNow > 100){
            throw createError.BadRequest(`bobot total seluruh soal paket-soal dengan id ${l.id_paket} 
            melebihi 100, { bobot = ${bobotNow} }`);
          }
        }
        helpers.shuffleArray(id_soal, kata_kunci_soal, bobot_soal);
        updateSoal.push(id_soal.map((i, j) => {
          let k = j + 1;
          if(!k) k = id_soal.indexOf(i)+1;
          return {
            id_paket: l.id_paket,
            id_soal: i,
            no_urut_soal: k,
            bobot_soal: bobot_soal[j],
            kata_kunci_soal: kata_kunci_soal[j] || null
          }
        }));
      }
      await models.Rel_paketsoal_soal.bulkCreate(updateSoal.flat(), {
        updateOnDuplicate: ['id_paket', 'id_soal', 'no_urut_soal', 'bobot_soal', 'kata_kunci_soal']
      });
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.putSoalUjian();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} soal berhasil diupdate pada ${paketUjian.length} paket-soal`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}/soal-essay`
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async UjiandelSoal(req, res, next){
    try {
      const id_ujian = req.params.id_ujian;
      const id_soal = req.body.id_soal;
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket'],
        where: { id_ujian: id_ujian },
        include: {
          model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
        },
        raw: true, nest: true
      });
      if(!paketUjian.length) throw createError.BadRequest('maaf, ujian ini belum memiliki paket-soal.');
      for(let i of paketUjian){
        const pkSoal = await models.Paket_soal.findByPk(i.id_paket);
        pkSoal.removeSoals(id_soal);
      }
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.deleteSoalUjian();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${id_soal.length} soal berhasil dihapus dari ${paketUjian.length} paket-soal`
      })
    } catch (error) {
      next(error);
    }
  },

  async patchBobotSoal(req, res, next){
    try {
      if(req.url == `/ujian/${req.params.id_ujian}/bobot-soal/bulk`) return next();
      const { id_ujian, id_soal } = req.params;
      const bobotSoal = req.body.bobot_soal;
      let updateSoal = [];
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket'],
        where: { id_ujian: id_ujian },
        include: {
          model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
        },
        raw: true, nest: true
      });     
      for(let l of paketUjian){
        const soalPaket = await models.Rel_paketsoal_soal.findAll({
          attributes: [[fn('sum', col('bobot_soal')), 'bobot_total']],
          where: {[Op.and]: [
            { id_paket: l.id_paket }, { id_soal: {[Op.ne]: id_soal} }
          ]},
          raw: true
        });
        if(soalPaket.length){
          const bobotNow = bobotSoal + parseInt(soalPaket[0].bobot_total);
          if(bobotNow > 100){
            throw createError.BadRequest(`bobot total seluruh soal paket-soal dengan id ${l.id_paket} 
            melebihi 100, { bobot = ${bobotNow} }`);
          }
        }
        updateSoal.push({
          id_paket: l.id_paket,
          id_soal: parseInt(id_soal),
          bobot_soal: bobotSoal      
        });
      }      
      await models.Rel_paketsoal_soal.bulkCreate(updateSoal.flat(), {
        updateOnDuplicate: ['id_paket', 'id_soal', 'bobot_soal']
      });
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.patchBobotSoal();
      res.status(200).json({
        success: true,
        msg: `bobot-soal untuk soal dengan id ${id_soal} pada ${updateSoal.length} paket-soal berhasil diubah`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}/soal-essay`
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async patchBobotSoalBulk(req, res, next){
    try {
      const { id_ujian } = req.params;
      const { id_soal, bobot_soal } = req.body;
      let updateSoal = [];      
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket'],
        where: { id_ujian: id_ujian },
        include: {
          model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
        },
        raw: true, nest: true
      });     
      for(let l of paketUjian){
        const soalPaket = await models.Rel_paketsoal_soal.findAll({
          attributes: [[fn('sum', col('bobot_soal')), 'bobot_total']],
          where: {[Op.and]: [
            { id_paket: l.id_paket }, { id_soal: { [Op.notIn]: id_soal } }
          ]},
          raw: true
        });
        if(soalPaket.length){
          const totalBobotSoal = bobot_soal.reduce((a, b) => { return a + b }, 0);
          const bobotNow = totalBobotSoal + parseInt(soalPaket[0].bobot_total);
          if(bobotNow > 100){
            throw createError.BadRequest(`bobot total seluruh soal paket-soal dengan id ${l.id_paket} 
            melebihi 100, { bobot = ${bobotNow} }`);
          }
        }
        updateSoal.push(id_soal.map((i, j) => {
          return {
            id_paket: l.id_paket,
            id_soal: i,
            bobot_soal: bobot_soal[j]
          }        
        }));
      }
      await models.Rel_paketsoal_soal.bulkCreate(updateSoal.flat(), {
        updateOnDuplicate: ['id_paket', 'id_soal', 'bobot_soal']
      });
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.patchBobotSoal();
      res.status(200).json({
        success: true,
        msg: `bobot-soal untuk soal dengan id ${id_soal} pada ${updateSoal.length} paket-soal berhasil diubah`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}/soal-essay`
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async patchKunciSoal(req, res, next){
    try {
      if(req.url == `/ujian/${req.params.id_ujian}/kunci-soal/bulk`) return next();
      const { id_ujian, id_soal} = req.params;
      const kunciSoal = req.body.kata_kunci_soal;
      let updateSoal = [];
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket'],
        where: { id_ujian: id_ujian },
        include: {
          model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
        },
        raw: true, nest: true
      });     
      for(let l of paketUjian){
        updateSoal.push({
          id_paket: l.id_paket,
          id_soal: parseInt(id_soal),
          kata_kunci_soal: kunciSoal || null
        });
      }
      for(let i = 0; i < kunciSoal.length; i++){
        if(i === kunciSoal.length - 1 && !kunciSoal[i].bobot_kata){
          await models.Soal_essay.update({
            kata_kunci_soal: kunciSoal
          }, {
            where: {id_soal: parseInt(id_soal)}
          });
          break;
        }
      }
      await models.Rel_paketsoal_soal.bulkCreate(updateSoal.flat(), {
        updateOnDuplicate: ['id_paket', 'id_soal', 'kata_kunci_soal']
      });
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.patchKunciSoal;
      res.status(200).json({
        success: true,
        msg: `kata_kunci-soal untuk soal dengan id ${id_soal} pada ${updateSoal.length} paket-soal berhasil diubah`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}/soal-essay`
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async patchKunciSoalBulk(req, res, next){
    try {
      const { id_ujian } = req.params;
      const { id_soal, kata_kunci_soal } = req.body;
      let updateSoal = [], kunciSoal = [];
      const paketUjian = await models.Paket_soal.findAll({
        attributes: ['id_paket'],
        where: { id_ujian: id_ujian },
        include: {
          model: models.Ujian, as: 'Ujian', attributes: ['tipe_penilaian']
        },
        raw: true, nest: true
      });     
      for(let l of paketUjian){
        updateSoal.push(id_soal.map((i, j) => {
          return {
            id_paket: l.id_paket,
            id_soal: i,
            kata_kunci_soal: kata_kunci_soal[j] || null
          }
        }));
      }
      for(let i = 0; i < updateSoal[0].length; i++){
        for(let j = 0; j < updateSoal[0][i].kata_kunci_soal.length; j++){
          for(let k = 0; k < kata_kunci_soal[j].length; k++){
            if(k === kata_kunci_soal[j].length - 1 && !kata_kunci_soal[j][k].bobot_kata){
              kunciSoal.push({
                id_soal: updateSoal[0][i].id_soal,
                kata_kunci_soal: kata_kunci_soal[i]
              })
            }
          }
        }
      }
      if(kunciSoal.length){
        const updateKunciSoal = kunciSoal.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.id_soal === value.id_soal && t.kata_kunci_soal === value.kata_kunci_soal
          ))
        )
        await models.Soal_essay.bulkCreate(updateKunciSoal, { 
          updateOnDuplicate: ['id_soal', 'kata_kunci_soal']
        });
      }
      await models.Rel_paketsoal_soal.bulkCreate(updateSoal.flat(), { 
        updateOnDuplicate: ['id_paket', 'id_soal', 'kata_kunci_soal']
      });
      await patchPenilaianUjian(paketUjian[0].id_paket, paketUjian[0].Ujian.tipe_penilaian, id_ujian);
      CacheControl.patchKunciSoal;
      res.status(200).json({
        success: true,
        msg: `kata_kunci-soal untuk soal dengan id ${id_soal} pada ${updateSoal.length} paket-soal berhasil diubah`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}/soal-essay`
        }
      })
    } catch (error) {
      next(error);
    }
  },
  // Jawaban Operation
  // async getSoalPenilaian(req, res, next){    
  //   try {
  //     const { id_ujian } = req.params;
  //     const pkSoal = await models.Paket_soal.findOne({
  //       attributes: ['id_paket', 'id_ujian'],
  //       where: {id_ujian: id_ujian},
  //       include: [
  //         { model: models.Soal_essay, as: 'Soals', through: {
  //           where: {kata_kunci_soal: null},
  //           attributes: ['bobot_soal', 'kata_kunci_soal']
  //         }}
  //       ],
  //       order: [
  //         [{model: models.Soal_essay, as:'Soals'}, 'id_soal', 'ASC']
  //       ]
  //     });
  //     const soal = pkSoal.Soals.map((i) => {
  //       return {
  //         id_soal: i.id_soal,
  //         soal: i.soal,
  //         bobot_soal: i.Rel_paketsoal_soal.bobot_soal,
  //         gambar_soal: i.gambar_soal,
  //         audio_soal: i.audio_soal,
  //         video_soal: i.video_soal,
  //         status: i.status,
  //         created_at: i.created_at,
  //         updated_at: i.updated_at
  //       }
  //     });
  //     CacheControl.getSoalPenilaian(req);
  //     res.status(200).json({
  //       soal: soal
  //     })
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  async getAllJawabanSoalAnon(req, res, next){
    try {
      const idSoal = req.params.id_soal;
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit; 
      const relasi = await models.Rel_paketsoal_soal.findAll({
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
      const jawaban = await helpers.paginator(models.Jawaban_mahasiswa, pages, limits, opt);
      const jwb = jawaban.results.map((i) => {
        return {
          id_jawaban: i.id_jawaban,
          jawaban: i.jawaban,
          gambar_jawaban: i.gambar_jawaban,
          audio_jawaban: i.audio_jawaban,
          video_jawaban: i.video_jawaban,
          nilai_jawaban: i.nilai_jawaban,
          created_at: i.created_at,
          updated_at: i.updated_at
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
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      const relasi = await models.Rel_paketsoal_soal.findAll({
        where: {id_soal: idSoal}, 
        attributes: ['id'],
        raw: true
      }).then((i) => { return i.map(({id}) => id)});
      let opt = {        
        where: {id_relasi_soalpksoal: {[Op.in]: relasi}},
        offset: (pages - 1) * limits,
        limit: limits,
        include: {
          model: models.Mahasiswa, as: 'Mahasiswa', attributes: ['id_mhs','NIM','nama_lengkap']
        },
        order: [['id_jawaban', 'ASC']]
      }
      const jawaban = await helpers.paginator(models.Jawaban_mahasiswa, pages, limits, opt);
      const jwb = jawaban.results.map((i) => {
        return {
          id_jawaban: i.id_jawaban,
          jawaban: i.jawaban,
          gambar_jawaban: i.gambar_jawaban,
          audio_jawaban: i.audio_jawaban,
          video_jawaban: i.video_jawaban,
          nilai_jawaban: i.nilai_jawaban,
          created_at: i.created_at,
          updated_at: i.updated_at,
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

  // async getJawaban(req, res, next){
  //   try {
  //     const idJawaban = req.params.id_jawaban;
  //       const jawaban = await models.Jawaban_mahasiswa.findOne({
  //         where: {id_jawaban: idJawaban}
  //       });
  //       if(!jawaban) throw createError.NotFound('data jawaban tidak ditemukan.')
  //       const jwb = {
  //         id_jawaban: jawaban.id_jawaban,
  //         id_relasi_soalpksoal: jawaban.id_relasi_soalpksoal,
  //         jawaban: jawaban.jawaban,
  //         gambar_jawaban: jawaban.gambar_jawaban,
  //         nilai_jawaban: jawaban.nilai_jawaban,
  //         created_at: jawaban.created_at,
  //         updated_at: jawaban.updated_at
  //       }
  //       CacheControl.getJawaban(req);
  //       res.status(200).json(jwb);
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  async setNilaiJawaban(req, res, next){
    try {
      if(req.url == '/nilai/:id_ujian') return next();
      const idJawaban = req.params.id_jawaban;
      const nilai = req.body.nilai;
      const jawaban = await models.Jawaban_mahasiswa.findOne({
        where: {id_jawaban: idJawaban},
        include: {
          model: models.Rel_paketsoal_soal, as: 'RelPaketSoal', attributes: ['bobot_soal']
        }
      });
      if(!jawaban) throw createError.NotFound('data jawaban tidak ditemukan.');
      const bobot_soal = jawaban.RelPaketSoal.bobot_soal
      if(nilai > bobot_soal) {
        throw createError.BadRequest(`nilai tidak boleh lebih besar dari bobot soal: ${bobot_soal}`);        
      }
      let val, status, obj;
      if(req.method === 'POST') {
        val = { nilai_jawaban: nilai }
        status = 'ditambahkan'
        obj = { where: { id_jawaban: idJawaban } }
      } else {
        val = { nilai_jawaban: nilai, updated_at: fn('NOW') }
        status = 'diubah'
        obj = {
          attributes: ['id_jawaban', 'nilai_jawaban', 'updated_at'],
          where: { id_jawaban: idJawaban }
        } 
      }
      await models.Jawaban_mahasiswa.update(val, {
        where: { id_jawaban: idJawaban }
      });
      const data = await models.Jawaban_mahasiswa.findOne( obj );    
      CacheControl.postputNilaiJawaban();
      res.status(200).json({
        success: true,
        msg: `nilai jawaban berhasil ${status}`,
        data: data
      })
    } catch (error) {
      next(error);
    }
  },

  async setNilaiTotal(req, res, next){
    try {
      const id = req.params.id_relasi_pksoalmhs;
      const nilai = req.body.nilai_akhir;
      const nilaiTotal = await models.Rel_mahasiswa_paketsoal.findOne({
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
      await models.Rel_mahasiswa_paketsoal.update(val, {
        where: {id: id}
      });
      const paket = await models.Rel_mahasiswa_paketsoal.findOne({
        where: {id: id}
      });
      CacheControl.postNewNilaiTotal();
      res.status(200).json({
        success: true,
        msg: `nilai total berhasil ${status}`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/paket-soal/${paket.id_paket}/mahasiswa`
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async setNilaiUjian(req, res, next){
    try {
      const idUjian = req.params.id_ujian;
      const paket_soal = await models.Paket_soal.findAll({ 
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: idUjian},
        include: [
          {
            model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto',
            attributes: ['id', 'kata_kunci_soal'],
            where: {kata_kunci_soal: {[Op.ne]: null}},
            required: false
          }, {
            model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal_manual',
            attributes: ['id'],
            where: {kata_kunci_soal: null}
          }
        ],
        order: [
          [{model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto'}, 'id', 'ASC']
        ]
      });
      let arrId = jp.query(paket_soal, '$[*].PaketSoal_Soal_manual[*].id');
      if(!arrId.length) {
        throw createError.NotFound('data ujian tidak ditemukan atau penilaian ujian berupa automatis.');
      }
      const arrIdauto = jp.query(paket_soal, '$[*].PaketSoal_Soal_auto[*].id');
      if(arrIdauto.length) {
        const jawaban = await models.Jawaban_mahasiswa.findAll({
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
        await models.Jawaban_mahasiswa.bulkCreate(nilaiJawaban, {
          updateOnDuplicate: ['id_jawaban', 'nilai_jawaban']
        });
        arrId = arrId.concat(arrIdauto);
      }
      const final = await models.Jawaban_mahasiswa.findAll({
        attributes: ['id_mhs', [fn('sum', col('nilai_jawaban')), 'nilai_total']],
        where: {id_relasi_soalpksoal: {[Op.in]: arrId}},
        group: ['id_mhs'],
        include: {model: models.Rel_paketsoal_soal, as: 'RelPaketSoal', attributes: ['id'], 
          include:{model: models.Paket_soal, as: 'PaketSoal', attributes: ['id_paket']}},
        raw: true, nest: true
      });
      const data = final.map((i) => {        
        return {
          id_mhs: i.id_mhs,
          id_paket: i.RelPaketSoal.PaketSoal.id_paket,
          nilai_total: parseInt(i.nilai_total),
        }
      });
      await models.Rel_mahasiswa_paketsoal.bulkCreate(data, {
        updateOnDuplicate: ['id_mhs', 'id_paket', 'nilai_total']
      });
      CacheControl.postNewNilaiUjian();
      res.status(200).json({
        success: true,
        msg: `Nilai akhir ujian ${idUjian} untuk ${data.length} mahasiswa berhasil ditambahkan.`,
        data: {
          method: 'GET',
          href1: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${idUjian}`,
          href2: `${req.protocol}://${req.get('host')}${req.baseUrl}/paket-soal/:id_paket/mahasiswa`
        }
      });
    } catch (error) {
      next(error);
    }
  },

}