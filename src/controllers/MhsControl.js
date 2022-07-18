'use strict';
const models = require('../models');
const helpers = require('../helpers/global');
const searchsValid = require('../validator/SearchValidator');
const { Op, fn, col } = require('sequelize');
const jp = require('jsonpath');
const createError = require('../errorHandlers/ApiErrors');
const CacheControl = require('../controllers/CacheControl');
const pdf = require('html-pdf');
const ExcelJS = require('exceljs');
const path = require('path');
const config = require('../config/dbconfig')

const getJwbn = async (options) => {
  let obj;
  if('id_jawaban' in options){
    obj = {
      model: models.Jawaban_mahasiswa, as: 'Jawabans', attributes: ['id_jawaban']
    }
  } else {
    obj = {
      model: models.Paket_soal, as: 'PaketSoals', attributes: ['id_paket', 'id_ujian'],
      through: { attributes: [] }
    }
  }
  const mhs = await options.req.getMahasiswa({
    attributes: ['id_mhs'],
    include: obj
  });
  const mhsJson = mhs.toJSON();
  if('id_jawaban' in options){
    return mhsJson.Jawabans.map(i => i.id_jawaban).includes(parseInt(options.id_jawaban));
  } else {
    if('id_paket' in options){
      return mhsJson.PaketSoals.map(i => i.id_paket).includes(parseInt(options.id_paket));
    } else if('id_ujian' in options){
      return mhsJson.PaketSoals.map(i => i.id_ujian).includes(parseInt(options.id_ujian));
    }    
  }
}

const getPkSoalHistory = async (user) => {
  const mhs = await user.getMahasiswa({
    attributes: ['id_mhs', 'id_user', 'NIM', 'nama_lengkap'],
    include: [
      {model: models.Paket_soal, as: 'PaketSoals',
        through: {attributes: ['nilai_total'], where: {nilai_total: {[Op.ne]: null}}},
        include: [
          {model: models.Ujian, as: 'Ujian',
            attributes: [ 'id_ujian', 'id_jenis_ujian', 'judul_ujian', 'tanggal_mulai', 'durasi_ujian'],
            include: {model: models.Ref_jenis_ujian, as: 'RefJenis'}
          },
          {model: models.Soal_essay, as: 'Soals', 
            attributes: ['id_soal'], through: {attributes: []}
          }
        ]
      }
    ],
    order: [
      [ { model: models.Paket_soal, as: 'PaketSoals' }, 
        { model: models.Ujian, as: 'Ujian' }, 'created_at','ASC'] 
    ]
  });
  if(!mhs) return null;
  let no = 1;
  const mhsJson = mhs.toJSON();
  const data = mhsJson.PaketSoals.map((i) => {
    return {
      no_paket: no++,
      kode_paket: i.kode_paket,
      nilai_akhir: i.Rel_mahasiswa_paketsoal.nilai_total,
      jenis_ujian: i.Ujian.RefJenis.jenis_ujian,
      judul_ujian: i.Ujian.judul_ujian,
      jml_soal: i.Soals.length,
      tanggal_mulai: i.Ujian.tanggal_mulai,
      durasi_ujian: i.Ujian.durasi_ujian
    }
  });
  const nama = mhsJson.nama_lengkap.toUpperCase();
  const dataMhs = {
    username: user.username,
    nim: mhsJson.NIM,
    nama_lengkap: nama,
  }
  return {
    mhs: dataMhs,
    pksoal: data,
  }
}

module.exports = {

  async getDashboard(req, res, next){
    try {
      const user = req.user;
      const mhs = await user.getMahasiswa({
        attributes: ['id_mhs'],        
        include: [
          {
            model: models.Kelas, as: 'Kelases', through: {attributes:[]}, 
            include: {model: models.Dosen, as: 'Dosens', attributes: {
              exclude:[ 'id_user','alamat','nomor_telp','created_at','updated_at']
            }, through: {attributes:[]}}
          },
          {
            model: models.Paket_soal, as: 'PaketSoals', through: {attributes:[]},
            include: {
                model: models.Ujian, as: 'Ujian', where: {[Op.and]: [
                {status_ujian: {[Op.or]: ['akan dimulai', 'sedang berlangsung']}}, 
                {aktif: true}
              ]},
              include: {model: models.Ref_jenis_ujian, as: 'RefJenis'}
            }
          }
        ]
      });
      const kelasJson = mhs.toJSON();
      const kelasMhs = await Promise.all(kelasJson.Kelases.map(async (i) => {        
        const matkul = await models.Matakuliah.findOne({
          attributes:['id_matkul','nama_matkul'],
          where: {id_matkul: i.id_matkul}
        });
        return {
          id_kelas: i.id_kelas,
          thumbnail_kelas: i.illustrasi_kelas,
          kode_seksi: i.kode_seksi,
          matakuliah: matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          deskripsi: i.deskripsi,
          dosen_pengampu: i.Dosens
        }
      }));
      const ujian = mhs.PaketSoals.map((i) => {
        return {
          id_paket: i.id_paket,
          kode_paket: i.kode_paket,
          thumbnail_ujian: i.Ujian.illustrasi_ujian,
          jenis_ujian: i.Ujian.RefJenis.jenis_ujian,
          judul_ujian: i.Ujian.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.Ujian.waktu_mulai,
          durasi_ujian: i.Ujian.durasi_ujian,          
          status_ujian: i.Ujian.status_ujian
        }
      });
      CacheControl.getDashboardMhs(req);
      res.status(200).json({
        kelas: kelasMhs,
        ujian: ujian
      })
    } catch (error) {
      next(error);
    }
  },

  async getStatus(req, res, next){
    try {
       const mhs = await req.user.getMahasiswa({
        attributes:['id_mhs'],
        include: [
          {
            model: models.Kelas, as: 'Kelases', attributes: ['id_kelas'],
            through: {attributes:[]},
            include: {
              model: models.Ujian, as: 'Ujians', attributes: ['id_ujian'],
              through: {attributes:[]},
            }
          },
          {model: models.Jawaban_mahasiswa, as: 'Jawabans', attributes: ['id_jawaban']}
        ]
      })
      const totalKelas = mhs.Kelases.length
      const totalJawaban = mhs.Jawabans.length
      const totalUjian = jp.query(mhs.toJSON(), '$.Kelases[*].Ujians').length
      const totalPkSoal = await models.Rel_mahasiswa_paketsoal.count({
        where: {id_mhs: mhs.id_mhs}
      });
      res.status(200).json({
        total_kelas: totalKelas,
        total_ujian_diambil: totalUjian,
        total_paket_soal: totalPkSoal,
        total_jawaban: totalJawaban
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      let path = req.route.path;
      let mhs, mhsUser;
      if(path === '/profil-mahasiswa/:id_mhs'){
        const { id_mhs } = req.params;
        mhs = await models.Mahasiswa.findOne({ 
          where: {id_mhs:id_mhs}
        });
        if(!mhs){throw createError.NotFound('user tidak ditemukan.')}
        mhsUser = await mhs.getUser({
          attributes: {exclude: ['password','kode_role']}
        });
        CacheControl.getProfilMhs(req);
      } else {
        mhs = await models.Mahasiswa.findOne({
          where: {id_user: req.user.id}
        });
        mhsUser = await mhs.getUser({
          attributes: {exclude: ['password','kode_role']}
        });
        CacheControl.getmyProfileMhs(req);
      }
      res.status(200).json({
        mhs: mhs,
        user: mhsUser
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
        await models.Mahasiswa.update(updateVal2, {
          where: { id_user: user.id }
        });
        const {password, ...dataUser} = req.user.dataValues; // eslint-disable-line
        const dataMhs = await req.user.getMahasiswa();
        CacheControl.putProfilMhs();
      res.status(200).json({
        success: true,
        msg: `profil anda berhasil diubah`,
        data: {
          dataUser: dataUser,
          dataMahasiswa: dataMhs
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async printUjianPdf(req, res, next){
    try {
      const pkSoal = await getPkSoalHistory(req.user);
      if(!pkSoal){ 
        res.status(200).json({ success: true, msg: 'Belum ada Ujian yang selesai' });
      }
      const options = {format: 'A4'};
      const tanggal = helpers.dateFull();
      const img = 'data:image/png;base64,' + require('fs')
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(helpers.pathAll('ujian_mhs.hbs', 'pdf'), {
        kop_surat: img,
        data_mhs: pkSoal.mhs,
        data: pkSoal.pksoal,
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
              'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-history_ujian.pdf"`
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
      const pkSoal = await getPkSoalHistory(req.user);
      if(!pkSoal){ 
        res.status(200).json({ success: true, msg: 'Belum ada Ujian yang selesai' });
      }
      const newWB = new ExcelJS.Workbook();
      const newWS = newWB.addWorksheet('Status_app');      
      var reColumns = [
        {header:'No.', key:'no_paket', style:{font:{name: 'Times New Roman'}}},
        {header:'Kode Paket', key:'kode_paket', style:{font:{name: 'Times New Roman'}}},
        {header:'Jenis Ujian', key:'jenis_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Judul Ujian', key:'judul_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Soal', key:'jml_soal', style:{font:{name: 'Times New Roman'}}},
        {header:'Tanggal Mulai', key:'tanggal_mulai', style:{font:{name: 'Times New Roman'}}},
        {header:'Durasi Ujian', key:'durasi_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Nilai Akhir', key:'nilai_akhir', style:{font:{name: 'Times New Roman'}}}
      ];
      newWS.columns = reColumns;
      newWS.addRows(pkSoal.pksoal);
      newWS.getCell('I1').value = 'Nama Lengkap :';
      newWS.getCell('I2').value = 'No.Mahasiswa :';
      newWS.getCell('I3').value = 'Username :';
      newWS.mergeCells('J1:O1');
      newWS.getCell('J1').value = pkSoal.mhs.nama_lengkap;
      newWS.getCell('J1').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J2:O2');
      newWS.getCell('J2').value = pkSoal.mhs.nim;
      newWS.getCell('J2').alignment = { horizontal:'left'} ;
      newWS.mergeCells('J3:O3');
      newWS.getCell('J3').value = pkSoal.mhs.username;
      newWS.getCell('J3').alignment = { horizontal:'left'} ;
      newWS.mergeCells('I4:O4');
      newWS.getCell('I4').value = 'tertanggal, ' + helpers.dateFull();
      newWS.getCell('I4').alignment = { horizontal:'center'} ;
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-history_ujian.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error);
    }
  },
  // Relasi Kelas Operation
  async getAllKelas(req, res, next){
    try {
      const user = req.user;
      const mhs = await user.getMahasiswa({
        attributes: ['id_mhs'],
        include: {
          model: models.Kelas, as: 'Kelases',
          through: {attributes:[]},
          include: [
            {
              model: models.Matakuliah, as: 'Matkul', attributes: ['id_matkul','nama_matkul']
            },
            {
              model: models.Dosen, as: 'Dosens', attributes: [ 
                'id_dosen', 'NIP', 'NIDN', 'NIDK', 'nama_lengkap' 
              ], through: {attributes:[]}
            },
            {
              model: models.Ujian, as: 'Ujians', attributes: ['id_ujian'], where: {
              [Op.and]: [
                {status_ujian: {[Op.or]: ['akan dimulai', 'sedang berlangsung']}}, 
                {aktif: 1}
              ]}, required: false
            }
          ]
        }
      });
      const kelasMhs = mhs.Kelases.map((i) => {
        return {
          id_kelas: i.id_kelas,
          thumbnail_kelas: i.illustrasi_kelas,
          kode_seksi: i.kode_seksi,
          matakuliah: i.Matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          deskripsi: i.deskripsi,
          dosen_pengampu: i.Dosens,
          ujian_urgent: i.Ujians.length
        }
      });
      CacheControl.getAllKelasMhs(req);
      res.status(200).json({
        kelas: kelasMhs
      });
    } catch (error) {
      next(error);
    }
  },

  async setKelas(req, res, next){
    try {
      const user = req.user;
      const mhs = await user.getMahasiswa();
      const idKelas = req.body.id_kelas;
      mhs.addKelases(idKelas);
      CacheControl.postKelasMhs();
      res.status(200).json({
        success: true,
        msg: `sebanyak ${idKelas.length} kelas berhasil diikuti`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas`
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  async putKelas(req, res, next){
    try {
      const user = req.user;
      const mhs = await user.getMahasiswa();
      const idKelas = req.body.id_kelas;
      mhs.setKelases(idKelas);
      CacheControl.putKelasMhs();
      res.status(200).json({
        success: true,
        msg: 'kelas yang diikuti berhasil diubah',
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteKelas(req, res, next){
    try {
      const user = req.user;
      const mhs = await user.getMahasiswa();
      const idKelas = req.body.id_kelas;
      mhs.removeKelases(idKelas);
      CacheControl.deleteKelasMhs();
      res.status(200).json({
        success: true,
        msg: `berhasil menghapus relasi ${idKelas.length} kelas`
      });
    } catch (error) {
      next(error);
    }
  },

  async setWaktuMulai(req, res, next){
    try {
      let { id_ujian, id_paket } = req.params;
      const waktu_mulai = req.body.waktu_mulai;
      let obj;
      if(id_ujian){
        obj = {id_ujian: id_ujian}
      } else if(id_paket){
        obj = {id_paket: id_paket }
      }
      const pkSoal = await req.user.getMahasiswa({
        attributes:['id_mhs'],
        include: { model: models.Paket_soal, as: 'PaketSoals', where: obj },
        raw: true, nest: true
      });
      if(!pkSoal) throw createError.NotFound('data ujian/paket-soal tidak ditemukan.');
      const updateVal = {
        waktu_mulai: waktu_mulai
      }
      await models.Rel_mahasiswa_paketsoal.update(updateVal, {
        where: {
          [Op.and]: [{id_mhs: pkSoal.id_mhs}, {id_paket: pkSoal.PaketSoals.id_paket}]
        }
      });
      const data = await models.Rel_mahasiswa_paketsoal.findOne({
        where: {
          [Op.and]: [{id_mhs: pkSoal.id_mhs}, {id_paket: pkSoal.PaketSoals.id_paket}]
        }
      });
      CacheControl.postWaktuMulai();
      res.status(200).json({
        success: true,
        msg: 'waktu mulai berhasil ditambahkan',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async setWaktuSelesai(req, res, next){
    try {
      let { id_ujian, id_paket } = req.params;
      const waktu_selesai = req.body.waktu_selesai;
      let obj;
      if(id_ujian){
        obj = {id_ujian: id_ujian}
      } else if(id_paket){
        obj = {id_paket: id_paket }
      }
      const pkSoal = await req.user.getMahasiswa({
        attributes:['id_mhs'],
        include: { model: models.Paket_soal, as: 'PaketSoals', where: obj },
        raw: true, nest: true
      });
      if(!pkSoal) throw createError.NotFound('data ujian/paket-soal tidak ditemukan.');
      const waktu_mulai = await models.Rel_mahasiswa_paketsoal.findOne({
        attributes: ['waktu_mulai'],
        where: {
          [Op.and]: [{id_mhs: pkSoal.id_mhs}, {id_paket: pkSoal.PaketSoals.id_paket}]
        }
      });
      const startTime = waktu_mulai.waktu_mulai.split(' ')[1];
      const endTime = waktu_selesai.split(' ')[1];
      const durasi = helpers.timeDiff(startTime, endTime);
      const updateVal = {
        waktu_selesai: waktu_selesai,
        lama_pengerjaan: durasi
      }
      await models.Rel_mahasiswa_paketsoal.update(updateVal, {
        where: {
          [Op.and]: [{id_mhs: pkSoal.id_mhs}, {id_paket: pkSoal.PaketSoals.id_paket}]
        }
      });
      const data = await models.Rel_mahasiswa_paketsoal.findOne({
        where: {
          [Op.and]: [{id_mhs: pkSoal.id_mhs}, {id_paket: pkSoal.PaketSoals.id_paket}]
        }
      });
      CacheControl.postWaktuSelesai();
      res.status(200).json({
        success: true,
        msg: 'waktu selesai dan lama pengerjaan berhasil ditambahkan',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },
  // PaketSoal Operation
  async autosetPaketSoal(req, res, next){
    try {
      const user = req.user;
      const idKelas = req.params.id_kelas;
      const mhs = await user.getMahasiswa({
        attributes: ['id_mhs'],
        include: {
          model: models.Kelas, as: 'Kelases', where: {id_kelas: idKelas}, 
          attributes: ['id_kelas'], through: {attributes:[]},
          include: {
            model: models.Ujian, as: 'Ujians', where: { [Op.and]: [
                {[Op.or]: [
                  {status_ujian: 'akan dimulai'}, {status_ujian: 'sedang berlangsung'}
                ]}, {aktif: 1}
              ]
            }, 
            attributes: ['id_ujian'], through: {attributes:[]},
            include: {model: models.Paket_soal, as: 'PaketSoals', where: {aktif: 1},  
              attributes: ['id_paket']}
          }
        }
      });
      if(!mhs) { 
        res.status(200).json({
          success: true,
          msg: 'tidak ada paket yang terdaftar dan aktif pada kelas.'
        }); 
      }
      const mhsJson = mhs.toJSON();
      const kelasPkSoal = jp.query(mhsJson, '$.Kelases[*].Ujians[*].PaketSoals[*]');
      if(!kelasPkSoal){ res.status(200).json(null); }
      const pkSoal = jp.query(kelasPkSoal, '$..id_paket');
      const randomPaket = Math.floor(Math.random() * pkSoal.length);
      const id_paket = pkSoal[randomPaket]
      const data = await models.Rel_mahasiswa_paketsoal.create({
        id_mhs: mhsJson.id_mhs,
        id_paket: id_paket
      });
      CacheControl.postPaketMhs();
      res.status(201).json({
        success: true,
        msg: `mahasiswa dengan id ${mhsJson.id_mhs}, berhasil direlasikan dengan paket ${id_paket}`,
        data: data
      })
    } catch (error) {
      next(error);
    }
  },

  async getUjian(req, res, next){
    try {
      if(req.query) return next('route');
      if(req.url == '/ujian/pdf' || req.url == '/ujian/xlsx') return next('route');
      let { id_ujian, id_paket } = req.params;
      let obj;
      if(id_ujian){
        obj = {id_ujian: id_ujian}
      } else if(id_paket){
        obj = {id_paket: id_paket}
      }
      const pkSoal = await req.user.getMahasiswa({
        attributes:['id_mhs'],
        include: {
          model: models.Paket_soal, as: 'PaketSoals', where: obj,
          include: [
            {model: models.Ujian, as: 'Ujian',
              include: {model: models.Ref_jenis_ujian, as: 'RefJenis'}
            },
            {model: models.Soal_essay, as: 'Soals', 
              attributes: ['id_soal'], through: {attributes: []}
            }
          ]
        }
      });
      if(!pkSoal) throw createError.NotFound('data paket-soal tidak ditemukan.');
      const json = pkSoal.PaketSoals[0].toJSON();
      const data = {
        id_paket: json.id_paket,
        kode_paket: json.kode_paket,
        banner_ujian: json.Ujian.illustrasi_ujian,
        jenis_ujian: json.Ujian.RefJenis.jenis_ujian,
        judul_ujian: json.Ujian.judul_ujian,
        jml_soal: json.Soals.length,
        tanggal_mulai: json.Ujian.tanggal_mulai,
        waktu_mulai: json.Ujian.waktu_mulai,
        durasi_ujian: json.Ujian.durasi_ujian,
        durasi_per_soal: json.Ujian.durasi_per_soal,
        nilai_akhir: json.Rel_mahasiswa_paketsoal.nilai_total,
        waktu_mulai_pengerjaan: json.Rel_mahasiswa_paketsoal.waktu_mulai,
        waktu_selesai_pengerjaan: json.Rel_mahasiswa_paketsoal.waktu_selesai,
        lama_pengerjaan: json.Rel_mahasiswa_paketsoal.lama_pengerjaan,
        bobot_total: json.Ujian.bobot_total,
        deskripsi: json.Ujian.deskripsi,
        created_at: json.Ujian.created_at,
        updated_at: json.Ujian.updated_at,
        status_ujian: json.Ujian.status_ujian,
        tipe_penilaian: json.Ujian.tipe_penilaian,        
        aktif: json.Ujian.aktif
      }
      CacheControl.getUjianMhs(req);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  // async getJawabanUjian(req, res, next){
  //   try {
  //     let { id_ujian, kode_paket } = req.params;
  //     let obj;
  //     if(id_ujian !== undefined){
  //       obj = {id_ujian: id_ujian}
  //     } else if(kode_paket !== undefined){
  //       obj = {kode_paket: {[Op.like]:'%' + kode_paket + '%'}}
  //     }
  //     const jawaban = await req.user.getMahasiswa({
  //       attributes:['id_mhs'],
  //       include: {
  //         model: Paket_soal, as: 'PaketSoals', attributes: ['kode_paket', 'id_ujian'], 
  //           where: obj, include: {
  //             model: Rel_paketsoal_soal, as: 'PaketSoal_Soal', attributes: ['id']
  //           }
  //         }        
  //     }).then(async (val) => {
  //       const json = val.toJSON();
  //       const arrayId = json.PaketSoals[0].PaketSoal_Soal.map(({id}) => id);
  //       return await val.getJawabans({where: {id_jawaban: {[Op.in]: arrayId}}});
  //     })
  //     res.send(jawaban);
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  // async getAllUjianS(req, res, next){
  //   try {
  //     const mhs = await req.user.getMahasiswa({
  //       attributes: ['id_mhs'],
  //       include: [
  //         {model: models.Paket_soal, as: 'PaketSoals', 
  //           attributes: ['id_paket', 'kode_paket', 'id_ujian'],
  //           include: {model: models.Ujian, as: 'Ujian', attributes: ['judul_ujian']}
  //         }
  //       ]
  //     });
  //     const paket = mhs.PaketSoals.map((i) => {
  //       return {
  //         id_paket: i.id_paket,
  //         kode_paket: i.kode_paket,
  //         judul_ujian: i.Ujian.judul_ujian
  //       }
  //     });
  //     if (paket.length === 0) {paket.push('No Record...')}
  //     CacheControl.getAllUjianMhsS(req);
  //     res.status(200).json({
  //       paket_soal: paket
  //     })
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  async getorsearchUjianHistory(req, res, next){
    try {
      let { find, page, limit } = req.query;
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      const mhs = await req.user.getMahasiswa({attributes: ['id_mhs']});
      let finderOpt = {
        where: {[Op.and]: [
            {'$Ujian.status_ujian$': {[Op.ne]: 'draft'}}
          ]
        },
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [{
          model: models.Ujian, as: 'Ujian', 
          include: [{model: models.Ref_jenis_ujian, as: 'RefJenis'}]
        }],
        order: [
          [ { model: models.Ujian, as: 'Ujian' }, 'created_at','ASC'] 
        ]
      }
      if(find){
        if(find == 'draft') throw createError.Forbidden('no access!');
        const validator = searchsValid.ujianValidator(find, 'mhs');
        if (validator instanceof createError) throw validator;
        finderOpt.where = {[Op.and]: [
            {'$Ujian.status_ujian$': {[Op.ne]: 'draft'}}, {[Op.or]: validator}
          ]
        }
      }
      const ujian = await mhs.getPaketSoals(finderOpt)
      let opt = {
        finder: ujian,
        model: models.Paket_soal
      };
      const result = await helpers.paginatorMN(opt, pages, limits);
      const paket = result.results.map((i) => {
        return {
          id_paket: i.id_paket,
          kode_paket: i.kode_paket,
          thumbnail_ujian: i.Ujian.illustrasi_ujian,
          nilai_akhir: i.Rel_mahasiswa_paketsoal.nilai_total,
          lama_pengerjaan: i.Rel_mahasiswa_paketsoal.lama_pengerjaan,
          judul_ujian: i.Ujian.judul_ujian,
          tanggal_mulai: i.Ujian.tanggal_mulai,
          waktu_mulai: i.Ujian.waktu_mulai,
          status_ujian: i.Ujian.status_ujian,
          aktif: i.Ujian.aktif
        }
      });
      if (paket.length === 0) {paket.push('No Record...')}
      CacheControl.getAllUjianMhsL(req);
      res.status(200).json({
        next: result.next,
        previous: result.previous,
        paket_soal: paket
      });
    } catch (error) {
      next(error);
    }
  },

  // async getUjianbyStatus(req, res, next){
  //   try {
  //     const pages = parseInt(req.query.page) || 1;
  //     const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
  //     let status = decodeURIComponent(req.params.status).toLocaleLowerCase();
  //     if(status==='draft') throw createError.Forbidden('no access!');
  //     const mhs = await req.user.getMahasiswa({attributes: ['id_mhs']});
  //     let opt = {
  //       attributes: ['id_mhs'],
  //       where: {[Op.and]: [{id_mhs: mhs.id_mhs},
  //         {'$PaketSoals.Ujian.status_ujian$': {[Op.like]:'%'+ status +'%'}},
  //         {'$PaketSoals.Ujian.aktif$': {[Op.eq]: 1}}
  //       ]},
  //       include: {
  //         model: models.Paket_soal, as: 'PaketSoals', 
  //         through: {attributes: []},
  //         // required: true, 
  //         offset: (pages - 1) * limits, // BIKIN KAYAK DOSEN BUAT M-M
  //         limit: limits,
  //         // subQuery: false,
  //         include: {
  //           model: models.Ujian, as: 'Ujian', include: [
  //             {model: models.Kelas, as: 'Kelases', attributes: ['id_kelas']},
  //             {model: models.Ref_jenis_ujian, as: 'RefJenis'}
  //           ]
  //         }
  //       }
  //     }      
  //     const paket = await helpers.paginator(models.Mahasiswa, pages, limits, opt)
  //     const data = paket.results[0].PaketSoals.map((i) => {
  //       return {
  //         id_paket: i.id_paket,
  //         kode_paket: i.kode_paket,
  //         thumbnail_ujian: i.Ujian.illustrasi_ujian,
  //         jenis_ujian: i.Ujian.RefJenis.jenis_ujian,
  //         judul_ujian: i.Ujian.judul_ujian,
  //         tanggal_mulai: i.Ujian.tanggal_mulai,
  //         waktu_mulai: i.Ujian.waktu_mulai,
  //         status_ujian: i.Ujian.status,
  //         aktif: i.Ujian.aktif,
  //         kelas: i.Ujian.Kelases,
  //       }
  //     });
  //     if (data.length === 0) {data.push('No Record...')}
  //     CacheControl.getAllUjianbyStatus(req);
  //     res.status(200).json({
  //       next: paket.next,
  //       previous: paket.previous,
  //       paket_soal: data
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },
  // Soal Operation
  async getSoal(req, res, next){
    try {
      const id_relasi = req.params.id_relasi_soalpksoal;
      const rel = await models.Rel_paketsoal_soal.findOne({
        attributes: {exclude: ['kata_kunci_soal']},
        where: {id: id_relasi},
        include: [
          {model: models.Soal_essay, as: 'Soal', include: {
            model: models.Matakuliah, as: 'Matkul', attributes: ['nama_matkul']}
          },
        ]
      });
      if(!rel) throw createError.NotFound('data soal tidak ditemukan.');
      const soal = {
        id_relasi_soalpksoal: rel.id,
        no_urut_soal: rel.no_urut_soal,
        id_soal: rel.Soal.id_soal,
        matakuliah: rel.Soal.Matkul.nama_matkul,
        soal: rel.Soal.soal,
        bobot_soal: rel.bobot_soal,
        gambar_soal: rel.Soal.gambar_soal,
        audio_soal: rel.Soal.audio_soal,
        video_soal: rel.Soal.video_soal,
        created_at: rel.Soal.created_at,
        updated_at: rel.Soal.updated_at
      }
      CacheControl.getSoalMhs(req);
      res.status(200).json(soal);
    } catch (error) {
      next(error);
    }
  },
  // Jawaban Operation
  async getAllJawabanUjian(req, res, next){
    try {
      let { id_ujian, id_paket } = req.params;
      let opt; 
      if(id_paket) {
        opt = { req: req.user, id_paket: id_paket }
      } else if(id_ujian) {
        opt = { req: req.user, id_ujian: id_ujian }
      }
      const paket = await getJwbn(opt);
      if(paket){
        const mhs = await req.user.getMahasiswa({attributes:['id_mhs']});
        const pages = parseInt(req.query.page) || 1;
        const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
        let Opt = {
          attributes: ['id_jawaban', 'jawaban', 'nilai_jawaban'],
          where: {[Op.and]: [
            {id_mhs: mhs.id_mhs}, {[Op.or]: [
              {'$RelPaketSoal.PaketSoal.id_paket$': {[Op.eq]: id_paket }},
              {'$RelPaketSoal.PaketSoal.id_ujian$': {[Op.eq]: id_ujian }}
            ]}
          ]},
          offset: (pages - 1) * limits,
          limit: limits,
          subQuery: false,
          include: [{model: models.Rel_paketsoal_soal, as: 'RelPaketSoal',
            include: {
              model: models.Paket_soal, as: 'PaketSoal', required: true, 
              attributes: ['id_paket', 'kode_paket', 'id_ujian']
            }
          }],
          order: [['id_jawaban','ASC']]
        }      
        const vals = await helpers.paginator(models.Jawaban_mahasiswa, pages, limits, Opt);
        const jawaban = vals.results.map((i) => {
          return {
            id_jawaban: i.id_jawaban,
            no_urut_soal: i.RelPaketSoal.no_urut_soal,
            bobot_soal: i.RelPaketSoal.bobot_soal,
            kata_kunci_soal: i.RelPaketSoal.kata_kunci_soal,
            jawaban: i.jawaban,
            nilai_jawaban: i.nilai_jawaban,
            paket_soal: {
              id_paket: i.RelPaketSoal.PaketSoal.id_paket,
              kode_paket: i.RelPaketSoal.PaketSoal.kode_paket
            }
          }
        })
        if (jawaban.length === 0) {jawaban.push('No Record...')}
        CacheControl.getAllJawabanMhs(req);
        res.status(200).json({
            next: vals.next,
            previous: vals.previous,
            jawaban: jawaban
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk melihat jawaban ujian/paket-soal ini!');
      }      
    } catch (error) {
      next(error);
    }
  },

  async getorsearchJawaban(req, res, next){
    try {
      let { find, page, limit } = req.query;      
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      const mhs = await req.user.getMahasiswa({attributes:['id_mhs']});
      let opt = {        
        where: {id_mhs: mhs.id_mhs},
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [{model: models.Rel_paketsoal_soal, as: 'RelPaketSoal',
          include: {model: models.Paket_soal, as: 'PaketSoal', attributes: ['id_paket', 'kode_paket']}
        }],
        order: [['id_jawaban', 'ASC']]
      }
      if(find){
        const validator = searchsValid.jawabanValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = { [Op.and]: [
            {id_mhs: mhs.id_mhs}, {[Op.or]: validator}
          ]
        }
      }
      const vals = await helpers.paginator(models.Jawaban_mahasiswa, pages, limits, opt);      
      const jawaban = vals.results.map((i) => {
        return {
          id_jawaban: i.id_jawaban,
          no_urut_soal: i.RelPaketSoal.no_urut_soal,
          bobot_soal: i.RelPaketSoal.bobot_soal,
          // kata_kunci_soal: i.RelPaketSoal.kata_kunci_soal,
          jawaban: i.jawaban,
          nilai_jawaban: i.nilai_jawaban,
          paket_soal: {
            id_paket: i.RelPaketSoal.PaketSoal.id_paket,
            kode_paket: i.RelPaketSoal.PaketSoal.kode_paket
          }
        }
      });
      CacheControl.getAllJawabanMhs(req);
      res.status(200).json({
        next: vals.next,
        previous: vals.previous,
        jawaban: jawaban
      })
    } catch (error) {
      next(error);
    }
  },

  async getJawaban(req, res, next){
    try {
      const idJawaban = req.params.id_jawaban;      
      let opt = {
        req: req.user,
        id_jawaban: idJawaban
      }
      const jwbExist = await getJwbn(opt)
      if(jwbExist){
        const jawaban = await models.Jawaban_mahasiswa.findOne({
          where: {id_jawaban: idJawaban},
          include: [{model: models.Rel_paketsoal_soal, as: 'RelPaketSoal',
            include: {
              model: models.Paket_soal, as: 'PaketSoal', attributes: ['id_paket', 'kode_paket'],
              include: { model: models.Ujian, as: 'Ujian', attributes: ['id_ujian', 'judul_ujian']}
            }
          }],
        });
        if(!jawaban) throw createError.NotFound('data jawaban tidak ditemukan.')
        const jwb = {
          id_jawaban: jawaban.id_jawaban,
          id_relasi_soalpksoal: jawaban.id_relasi_soalpksoal,
          no_urut_soal: jawaban.RelPaketSoal.no_urut_soal,
          bobot_soal: jawaban.RelPaketSoal.bobot_soal,
          kata_kunci_soal: jawaban.RelPaketSoal.kata_kunci_soal,
          jawaban: jawaban.jawaban,
          gambar_jawaban: jawaban.gambar_jawaban,
          audio_jawaban: jawaban.audio_jawaban,
          video_jawaban: jawaban.video_jawaban,
          nilai_jawaban: jawaban.nilai_jawaban,
          created_at: jawaban.created_at,
          updated_at: jawaban.updated_at,
          ujian: {
            id_ujian: jawaban.RelPaketSoal.PaketSoal.Ujian.id_ujian,
            judul_ujian: jawaban.RelPaketSoal.PaketSoal.Ujian.judul_ujian
          },
          paket_soal: {
            id_paket: jawaban.RelPaketSoal.PaketSoal.id_paket,
            kode_paket: jawaban.RelPaketSoal.PaketSoal.kode_paket            
          }
        }
        CacheControl.getJawaban(req);
        res.status(200).json(jwb);
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk melihat jawaban ini!');
      }
    } catch (error) {
      next(error);
    }
  },

  async setJawaban(req, res, next){
    try {
      const { id_relasi_soalpksoal, jawaban } = req.body;      
      let { audio_jawaban, video_jawaban } = req.files,
      gmbrJawaban = [], audioJawaban, videoJawaban;
      const mhs = await req.user.getMahasiswa({attributes:['id_mhs']});
      const jwbExist = await models.Jawaban_mahasiswa.findOne({
        where:{[Op.and]: [{id_mhs: mhs.id_mhs}, {jawaban: jawaban}]} // spam detection
      })
      if(jwbExist) throw createError.Conflict('data jawaban sudah terdaftar');
      if(req.files['gambar_jawaban[]']) {
        gmbrJawaban = req.files['gambar_jawaban[]'].map(({filename}) => filename);        
      }
      if(req.body.audio_jawaban) {
        audioJawaban = req.body.audio_jawaban;
      } else if(audio_jawaban) {
        audioJawaban = audio_jawaban[0].filename;
      } else {
        audioJawaban = null;
      }
      if(req.body.video_jawaban) {
        videoJawaban = req.body.video_jawaban;
      } else if(video_jawaban) {
        videoJawaban = video_jawaban[0].filename;
      } else {
        videoJawaban = null;
      }
      const data = await models.Jawaban_mahasiswa.create({
        id_relasi_soalpksoal: id_relasi_soalpksoal,
        id_mhs: mhs.id_mhs,
        jawaban: jawaban,
        gambar_jawaban: gmbrJawaban,
        audio_jawaban: audioJawaban,
        video_jawaban: videoJawaban,
        created_at: fn('NOW')
      });
      CacheControl.postNewJawaban();
      res.status(201).json({
        success: true,
        msg: 'jawaban berhasil ditambahkan',
        data: data
      });      
    } catch (error) {
      next(error);
    }
  },

  async setJawabanBulk(req, res, next){
    try {
      let { array_jawaban } = req.body;
      if(typeof array_jawaban === 'string'){
        array_jawaban = JSON.parse(array_jawaban);
      }
      const idMhs = await req.user.getMahasiswa({attributes:['id_mhs']});
      const mapped = array_jawaban.map((i) => {
        return {
          id_relasi_soalpksoal: i.id_relasi_soalpksoal,
          id_mhs: idMhs.id_mhs,
          jawaban: i.jawaban,
          gambar_jawaban: i.gambar_jawaban,
          audio_jawaban: i.audio_jawaban,
          video_jawaban: i.video_jawaban,
          created_at: fn('NOW')
        }
      });
      await models.Jawaban_mahasiswa.bulkCreate(mapped);
      const pksoalId = await models.Rel_paketsoal_soal.findOne({ 
        where: {
          id: array_jawaban[0].id_relasi_soalpksoal
        },
        attributes: ['id_paket']
      });
      CacheControl.postNewJawaban();
      res.status(201).json({
        success: true,
        msg: `sebanyak ${mapped.length} jawaban berhasil ditambahkan`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/paket-soal/${pksoalId.id_paket}`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async putJawaban(req, res, next){
    try {
      const idJawaban = req.params.id_jawaban;
      let gmbrJawaban, audioJawaban, videoJawaban,
      { audio_jawaban, video_jawaban } = req.files,
      opt = {
        req: req.user,
        id_jawaban: idJawaban
      }
      const jwbExist = await getJwbn(opt)
      if(jwbExist){
        const { id_relasi_soalpksoal, jawaban } = req.body;
        if(req.files['gambar_jawaban[]']) {
          gmbrJawaban = req.files['gambar_jawaban[]'].map(({filename}) => filename);        
        } else if(req.body['gambar_jawaban[]']) {
          gmbrJawaban = req.body['gambar_jawaban[]'];
        } else {
          gmbrJawaban = [];
        }
        if(req.body.audio_jawaban) {
          audioJawaban = req.body.audio_jawaban;
        } else if(audio_jawaban) {
          audioJawaban = audio_jawaban[0].filename;
        } else {
          audioJawaban = null;
        }
        if(req.body.video_jawaban) {
          videoJawaban = req.body.video_jawaban;
        } else if(video_jawaban) {
          videoJawaban = video_jawaban[0].filename;
        } else {
          videoJawaban = null;
        }
        let updateVal = {
          id_relasi_soalpksoal: id_relasi_soalpksoal,
          jawaban: jawaban,
          gambar_jawaban: gmbrJawaban,
          audio_jawaban: audioJawaban,
          video_jawaban: videoJawaban,
          updated_at: fn('NOW')
        }
        await models.Jawaban_mahasiswa.update(updateVal, {
          where: { id_jawaban: idJawaban }
        });
        const data = await models.Jawaban_mahasiswa.findOne({
          where: { id_jawaban: idJawaban }
        });
        CacheControl.putJawaban();
        res.status(200).json({
          success: true,
          msg: 'jawaban berhasil diedit',
          data: data
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk mengubah jawaban ini!');
      }      
    } catch (error) {
      next(error);
    }
  },

  async deleteJawaban(req, res, next){
    try {
      const { id_jawaban } = req.params;
      let opt = {
        req: req.user,
        id_jawaban: id_jawaban
      }
      const jwbExist = await getJwbn(opt)
      if(jwbExist){
        const jawaban = await models.Jawaban_mahasiswa.findOne({
          attributes: ['id_jawaban'],
          where:{id_jawaban: id_jawaban}
        });
        if (!jawaban) { throw createError.NotFound('data jawaban tidak ditemukan.')}
        await models.Jawaban_mahasiswa.destroy({
          where:{
            id_jawaban: id_jawaban
          }
        });
        CacheControl.deleteJawaban();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
      } else {
        throw createError.Forbidden('maaf, anda tidak memiliki akses untuk menghapus jawaban ini!');
      }
    } catch (error) {
      next(error);
    }
  },

  async getNilaiAkhir(req, res, next){
    try {
      let { id_ujian, id_paket } = req.params;
      let obj;
      if(id_ujian){
        obj = {id_ujian: id_ujian}
      } else if(id_paket){
        obj = {id_paket: id_paket}
      }
      const nilai = await req.user.getMahasiswa({
        attributes: ['id_mhs'],
        include: [ 
          {model: models.Paket_soal, as: 'PaketSoals', 
          through: {attributes: ['nilai_total']}, where: obj,
          },
        ]
      });
      if(!nilai) throw createError.NotFound('data ujian tidak ditemukan.');
      const nilaiAkhir = nilai.PaketSoals[0].Rel_mahasiswa_paketsoal.nilai_total;
      CacheControl.getNilaiAkhir(req);
      res.status(200).json({
        nilai_akhir: nilaiAkhir
      });
    } catch (error) {
      next(error);
    }
  },

  async setNilaiAuto(req, res, next) {
    try {
      let { id_ujian, id_paket } = req.params;
      let obj;
      if(id_ujian){
        obj = {id_ujian: id_ujian}
      } else if(id_paket){
        obj = {id_paket: id_paket}
      }
      const idMhs = await req.user.getMahasiswa({attributes:['id_mhs']});
      const paket_soal = await models.Paket_soal.findAll({ 
        attributes: ['id_paket', 'id_ujian'],
        where: obj,
        include: {
          model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto',
          attributes: ['id', 'kata_kunci_soal'],
          where: {kata_kunci_soal: {[Op.ne]: null}},         
        },
        order: [
          [{model: models.Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto'}, 'id', 'ASC']
        ]
      });
      if(!paket_soal) {
        throw createError.NotFound('data paket-soal tidak ditemukan atau penilaian ujian berupa manual/campuran.');
      }
      const arrayId = jp.query(paket_soal, '$[*].PaketSoal_Soal_auto[*].id');
      const jawaban = await models.Jawaban_mahasiswa.findAll({
        attributes: ['id_jawaban', 'id_relasi_soalpksoal', 'jawaban'],
        where: {[Op.and]: [
          {id_mhs: idMhs.id_mhs},
          {id_relasi_soalpksoal: {[Op.in]: arrayId}}, 
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
      const final = await models.Jawaban_mahasiswa.findAll({
        attributes: ['id_mhs', [fn('sum', col('nilai_jawaban')), 'nilai_total']],
        where: {[Op.and]: [
          {id_mhs: idMhs.id_mhs}, {id_relasi_soalpksoal: {[Op.in]: arrayId}}
        ]},
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
      CacheControl.postNilaiAuto();
      res.status(200).json({
        success: true,
        msg: 'nilai berhasil disimpan.',
        data: {
          method: 'GET',
          href: (
            id_ujian ? `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian/${id_ujian}`
            : `${req.protocol}://${req.get('host')}${req.baseUrl}/paket-soal/${id_paket}`
          )
        }
      });
    } catch (error) {
      next(error);
    }
  },


  // async setNilaiTotal(req, res, next){
  //   try {
  //     const nilaiJwbn = await Jawaban_mahasiswa.findAll({
  //       attributes: ['id_jawaban', 'nilai_jawaban','id_mhs'],
  //       where: {nilai_jawaban: {[Op.ne]: null}},
  //       include: {
  //         model: Rel_paketsoal_soal, as: 'RelPaketSoal', 
  //         attributes: ['id', 'kode_paket', 'id_soal']
  //       }
  //     });
  //     if(!nilaiJwbn) {
  //       res.status(200).json({
  //         success: true,
  //         msg: 'belum ada nilai jawaban yang terisi'
  //       });
  //     }
  //     let nilaiAkhir = 0;
  //     const mapped = nilaiJwbn.map((i) => {
  //       nilaiAkhir += i.nilai_jawaban;
  //       return {
  //         id_mhs: i.id_mhs,
  //         kode_paket: i.RelPaketSoal.kode_paket,
  //         nilai_total: nilaiAkhir
  //       }
  //     });
  //     await Rel_mahasiswa_paketsoal.bulkCreate(mapped, {
  //       updateOnDuplicate: ['id_mhs', 'kode_paket', 'nilai_total']
  //     });
  //     res.status(200).json({
  //       success: true,
  //       msg: `nilai total ${mapped.length} mahasiswa berhasil diupdate`
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }

}