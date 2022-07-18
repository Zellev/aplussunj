"use strict";
const models = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const helpers = require('../helpers/global');
const searchsValid = require('../validator/SearchValidator');
const { Op, fn, col, literal } = require('sequelize');
const CacheControl = require('./CacheControl');
const config = require('../config/dbconfig');
const bcrypt = require('bcrypt');
const jp = require('jsonpath');
const { format } = require('date-fns') 

const getUser = async obj => {
    return models.User.findOne({
        where: obj
    });
}

module.exports = {

  async getProfilSidebar(req, res, next) {
    try {
      const user = req.user
      const data = {
        id: user.id,
        username: user.username,
        email: user.email,
        foto_profil: user.foto_profil,
      }
      CacheControl.getProfilSidebar(req)
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async getProfilUser(req, res, next){
    try {
      const { id_user } = req.params;
      const user = await getUser({id: id_user});
      let role;
      if (user.id_role === 3){
        const mhs =  await user.getMahasiswa();
        role = {
          id: user.id,
          username: user.username,
          email: user.email,
          status_civitas: user.status_civitas,
          id_role: user.id_role,
          role: 'Mahasiswa',
          foto_profil: user.foto_profil,
          keterangan: user.keterangan,
          created_at: user.created_at,
          updated_at: user.updated_at,
          data_mahasiswa: mhs
        };
      } else if (user.id_role === 2){
        const dosen =  await user.getDosen();
        role = {
          id: user.id,
          username: user.username,
          email: user.email,
          status_civitas: user.status_civitas,
          id_role: user.id_role,
          role: 'Dosen',
          foto_profil: user.foto_profil,
          keterangan: user.keterangan,
          created_at: user.created_at,
          updated_at: user.updated_at,
          data_dosen: dosen
        };
      } else if(user.id_role === 1 && req.user.id_role === 3){
        throw createError.Forbidden('Access denied.');
      } else {
        role = user;
      }
      CacheControl.getProfil(req);
      res.status(200).json(role);
    } catch (error) {
      next(error);
    }
  },
  
  async ubahPass(req, res, next) {
    try {
        const {current_password, new_password, confirm_password} = req.body;
        const passwordUser = await bcrypt.compare(current_password, req.user.password);  
        if (passwordUser) {
          if(new_password == confirm_password){
            const hashed = await bcrypt.hash(new_password, 10)
            await models.User.update({ 
                    password: hashed,
                    updated_at: fn('NOW')
                }, { 
                    where: { id: req.user.id }
            });
            res.status(200).json({
                success: true,
                msg: 'password berhasil diubah.'
            })
          }else {
            throw createError.BadRequest('password tidak sama!')
          }
        } else {
          throw createError.BadRequest('password lama salah!')
        }
    } catch(error) {
        next(error);
    }               
  },
  
  async setAvatar(req, res, next) {
    try {
      if(!req.file) throw createError.BadRequest('tidak ada gambar yang diupload.');
        const file = req.file.filename;
        const { id } = req.user;
        let updateVal = { foto_profil: file, updated_at: fn('NOW')};
        await models.User.update(updateVal,{
          where: { id: id }
        });
        const data = await models.User.findOne({
          attributes: ['id', 'foto_profil', 'created_at', 'updated_at'],
          where: { id: id }
        });
        CacheControl.postProfilePic();
        res.status(200).json({
          success: true,
          msg: 'Foto berhasil diubah.',
          data: data
        });
    } catch (error) {
        next(error);
    }
  },

  async getperSemester(req, res, next) {
    try {
      const { id_semester } = req.params;
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      let opt = {
        attributes: ['id_kelas', 'kode_seksi', 'id_matkul', 'id_semester', 'hari', 'jam'],        
        where: {[Op.or]:[
          { '$RefSem.id_semester$': {[Op.eq]: id_semester}},
          { '$RefSem.semester$': {[Op.like]:'%' + id_semester + '%'}}
        ]},        
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {model: models.Ref_semester, as: 'RefSem', required: true},
          {model: models.Dosen, as: 'Dosens', attributes: ['nama_lengkap'], 
            through: {attributes:[]}},
          {model: models.Matakuliah, as: 'Matkul', attributes: ['nama_matkul']},          
        ],
        order: [['id_kelas', 'ASC']]
      }
      const sms = await helpers.paginator(models.Kelas, pages, limits, opt);
      const kelas = sms.results.map((i) => {
        return {
          id_kelas: i.id_kelas,
          thumbnail_kelas: i.illustrasi_kelas,
          kode_seksi: i.kode_seksi,
          matkul: i.Matkul.nama_matkul,
          semester: i.RefSem.semester,
          hari: i.hari,
          jam: i.jam,
          dosen_pengampu: i.Dosens
        }
      });
      if (kelas.length === 0) {kelas.push('No Record...')}
      CacheControl.getAllKelas(req);
      res.status(200).json({
        next: sms.next,
        previous: sms.previous,
        kelas: kelas
      })
    } catch (error) {
      next(error)
    }
  },

  async getSoalPaket(req, res, next){
    try {
      const { id_paket } = req.params
      const finder = (obj) => {
        return models.Paket_soal.findOne({
          attributes: ['id_paket', 'aktif'],
          where: obj,
          include: {
            model: models.Soal_essay, as:'Soals', through: {attributes: ['id','no_urut_soal','bobot_soal']}
          },
          order: [
            [{model: models.Soal_essay, as:'Soals'}, models.Rel_paketsoal_soal, 'no_urut_soal', 'ASC']
          ]
        });
      }
      let pkSoal, no = 1;
      if(req.user.id_role === 1 || req.user.id_role === 2){
        pkSoal = await finder({id_paket: id_paket});
        if(!pkSoal){
          throw createError.BadRequest('paket soal tidak terdaftar...')
        }
      } else {
        pkSoal = await finder({[Op.and]:[{id_paket: id_paket}, {aktif: 1}]});
        if(!pkSoal){
          throw createError.BadRequest('paket soal tidak terdaftar atau tidak aktif.')
        }
      }
      const soal = pkSoal.Soals.map((i) => {       
        return {
          no_urut_soal: no++,
          id_relasi_soalpksoal: i.Rel_paketsoal_soal.id,          
          id_soal: i.id_soal,
          soal: i.soal,
          bobot_soal: i.Rel_paketsoal_soal.bobot_soal,
          gambar_soal: i.gambar_soal,
          audio_soal: i.audio_soal,
          video_soal: i.video_soal,
          created_at: i.created_at,
          updated_at: i.updated_at
        }
      });
      CacheControl.getSoalPaketSoal(req);
      res.status(200).json({
        paket_soal: {
          id_paket: pkSoal.id_paket,
          kode_paket: pkSoal.kode_paket
        },
        soal: soal
      })
    } catch (error) {
      next(error);
    }
  },
  /* Kelas Methods*/
  async getorsearchKelas(req, res, next) {
    try {
      let { find, page, limit } = req.query;
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {        
        attributes: ['id_kelas', 'kode_seksi', 'id_matkul', 'id_semester', 'hari', 'jam'],
        offset: (pages - 1) * limits,
        limit: limits, 
        subQuery: false,
        include: [
          { model: models.Matakuliah, as: 'Matkul', attributes: ['nama_matkul'] },
          { model: models.Ref_semester, as: 'RefSem', attributes: ['semester'] },
          { model: models.Dosen, as: 'Dosens',
            attributes: ['nama_lengkap'], through: {attributes:[]} }
        ],
        order: [['id_kelas', 'ASC']]
      }
      if(find) {
        const validator = searchsValid.kelasValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = { [Op.or]: validator }
      }
      const kelas = await helpers.paginator(models.Kelas, pages, limits, opt);
      const result = kelas.results.map((i) => {
        return {
          id_kelas: i.id_kelas,
          thumbnail_kelas: i.illustrasi_kelas,
          kode_seksi: i.kode_seksi,
          nama_matkul: i.Matkul.nama_matkul,
          semester: i.RefSem.semester,
          hari: i.hari,
          jam: i.jam,
          dosen_pengampu: i.Dosens
        }
      })
      if (result.length === 0) {result.push('No record...')}
      CacheControl.getAllKelas(req);      
      res.status(200).json({
        next: kelas.next,
        previous: kelas.previous,
        kelas: result
      })
    } catch (error) {
      next(error)
    }
  },

  async getKelas(req, res, next) {
      try {
        const { id_kelas } = req.params;
        let status;
        if(req.user.id_role === 1|| req.user.id_role === 2){
          status = {[Op.or]: ['draft','akan dimulai','sedang berlangsung','selesai']}
        } else {
          status = {[Op.or]: ['akan dimulai','sedang berlangsung','selesai']}
        }
        const val = await models.Kelas.findOne({
          where: {id_kelas: id_kelas},
          include: [
            {model: models.Matakuliah, as: 'Matkul', attributes: ['nama_matkul']},
            {model: models.Dosen, as: 'Dosens', attributes: {
              exclude:[ 'id_user','alamat','nomor_telp','created_at','updated_at']
            }, through: {attributes:[]}},
            {model: models.Ujian, as: 'Ujians', required: false, where: {status_ujian: status},
              attributes: { exclude:['durasi_ujian','tipe_penilaian','deskripsi','created_at','updated_at']
            }, through: {attributes:[]}}
          ]
        })
        if (!val) { throw createError.NotFound('data kelas tidak ditemukan.')}
        const kelas = {
          id_kelas: val.id_kelas,
          banner_kelas: val.illustrasi_kelas,
          kode_seksi: val.kode_seksi,
          nama_matkul: val.Matkul.nama_matkul,
          semester: val.semester,
          hari: val.hari,
          jam: val.jam,
          desktripsi: val.deskripsi,
          created_at: val.created_at,
          updated_at: val.updated_at,
          dosen_pengampu: val.Dosens,
          ujian: val.Ujians
        };
        CacheControl.getKelas(req);   
        res.status(200).json(kelas);
      } catch (error) {
        next(error);
      }
  },
  /* end Kelas Methods*/    
  async getPengumumn(req, res, next) {
    try {
        const getPengumuman = await models.Pengumuman.findAll({
          where: {status : 'tampil'}
        });
        CacheControl.getPengumuman(req);
        res.status(200).json(getPengumuman);
    } catch (error) {
      next(error);
    }
  },

  async getNotifikasi(req, res, next) {
    try {
      const user = await req.user
      const notifikasi = await models.Notifikasi.findOne({
        attributes: ['id_pengirim', 'notifikasi', 'created_at', 'updated_at'],
        where: {id_penerima: user.id}
      });
      if(!notifikasi) {
        res.status(200).json({
          success: true,
          msg: 'tidak ada notifikasi baru.'
        })
      }
      if(notifikasi){
        let pengirim;
        if(notifikasi.id_pengirim){
          pengirim = await models.User.findOne({
            attributes: ['username', 'id_role'],
            where: {id: notifikasi.id_pengirim} 
          });
        }      
        const role = () => {
          let role;
          switch(pengirim.id_role){
            case 1:
              role = 'admin'
            break;
            case 2:
              role = 'dosen'
            break;
            case 3:
              role = 'mahasiswa'
            break;
            default: 
              role = 'sistem'
          }
          return role;
        }
        const notif = {
          data_pengirim: {
            username: pengirim.username || 'sistem',
            role: role()
          },
          notifikasi: notifikasi.notifikasi,
          created_at: notifikasi.created_at,
          updated_at: notifikasi.updated_at
        }
        CacheControl.getNotifikasi(req);
        res.status(200).json(notif);
      }
    } catch (error) {
      next(error);
    }
  },

  async getIllustrasi(req, res, next) {
    try {
      const illustrasi = await models.Ref_illustrasi.findAll({
        order: [['id_illustrasi', 'ASC']]
      });
      CacheControl.getIllustrasi(req);
      res.status(200).json(illustrasi);
    } catch (error) {
      next(error);
    }
  },

  async getJenisUjian(req, res, next) {
    try {
      const jenis_ujian = await models.Ref_jenis_ujian.findAll({
        where: {jenis_ujian: {[Op.ne]: null}},
        order: [['id_jenis_ujian', 'ASC']]
      });
      CacheControl.getJenisUjian(req);
      res.status(200).json(jenis_ujian);
    } catch (error) {
      next(error);
    }
  }, 

  async getKelompokMatakuliah(req, res, next) {
    try {
      const kel_mk = await models.Ref_kel_matkul.findAll({
        order: [['id_kel_mk', 'ASC']]
      });
      CacheControl.getKelompokMatakuliah(req);
      res.status(200).json(kel_mk);
    } catch (error) {
      next(error);
    }
  },

  async getPeminatan(req, res, next) {
    try {
      const peminatan = await models.Ref_peminatan.findAll({
        where: {peminatan: {[Op.ne]: null}},
        order: [['id_peminatan', 'ASC']]
      });
      CacheControl.getPeminatan(req);
      res.status(200).json(peminatan);
    } catch (error) {
      next(error);
    }
  },

  async getSemester(req, res, next) {
    try {
      const semester = await models.Ref_semester.findAll({
        where: {semester: {[Op.ne]: null}},
        order: [['id_semester', 'ASC']]
      });
      CacheControl.getSemester(req);
      res.status(200).json(semester);
    } catch (error) {
      next(error);
    }
  },


  // SISTEM
  async getUjianToday(req, res, next){
    try {
      const tanggal_mulai = format(Date.now(), 'yyyy-MM-dd');
      const ujian = await models.Ujian.findAll({
        where: {
          [Op.and]: [
            {tanggal_mulai: tanggal_mulai},
            {status_ujian: 'akan dimulai'},
            {aktif: true}
          ]
        }
      });
      res.json(ujian);
    } catch (error) {
      throw next(error);
    }
  },

  async setNotifikasi(req, res, next) {
    try {
      const { id_penerima, pesan } = req.body;
      const userPenerima = await models.User.findOne({
        attributes: ['id'],
        where: { id: id_penerima }
      });
      if(!userPenerima) {
        console.error(`user ${id_penerima} tidak ditemukan.`);
        throw createError.NotFound(`user ${id_penerima} tidak ditemukan.`);
      }
      await models.Notifikasi.create({
        id_penerima: userPenerima.id,
        notifikasi: pesan,
        created_at: fn('NOW')
      });
      CacheControl.postNotifikasi();
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },

  // async autoDelete(req, res, next) {
  //   try {
  //     const models = require('../models');
  //     const { nama_model, hari } = req.params;
  //     await models[nama_model].destroy({
  //       where: {created_at: 
  //         literal(`DATEDIFF(NOW(), ujian.created_at) > ${hari}`)
  //       }
  //     })
  //     res.sendStatus(204);
  //   } catch(error) {
  //     next(error);
  //   }
  // },

  async patchKeaktifanUjian(req, res, next) {
    try {
      await models.Ujian.update({aktif: 0}, {
        where: {created_at: 
          literal(`DATEDIFF(NOW(), ujian.created_at) > ${config.ujianexpiry}`)
        }
      })
      CacheControl.patchKeaktifanUjian();
      res.sendStatus(204);
    } catch(error) {
      next(error);
    }
  },

  async setNilaiAuto(req, res, next) {
    try {
      const idUjian = req.params.id_ujian;
      const paket_soal = await models.Paket_soal.findAll({ 
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: idUjian},
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
        console.error('data ujian tidak ditemukan atau penilaian ujian berupa manual/campuran.');
        throw createError.NotFound('data ujian tidak ditemukan atau penilaian ujian berupa manual/campuran.');
      }
      const arrayId = jp.query(paket_soal, '$[*].PaketSoal_Soal_auto[*].id');
      const jawaban = await models.Jawaban_mahasiswa.findAll({
        attributes: ['id_jawaban', 'id_relasi_soalpksoal', 'jawaban'],
        where: {[Op.and]: [
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
        where: {id_relasi_soalpksoal: {[Op.in]: arrayId}},
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
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },

  async uploadFile(req, res, next) {
    try {
      res.send(req.files);
    } catch (error) {
      next(error);
    }
  }

}