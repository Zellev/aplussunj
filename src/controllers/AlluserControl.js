const bcrypt = require('bcrypt');
const { User, Dosen, Matakuliah, Kelas, Soal_essay, 
        Jawaban_mahasiswa, Pengumuman, Ujian, Paket_soal, Rel_paketsoal_soal, 
        Rel_mahasiswa_paketsoal, Notifikasi, Ref_jenis_ujian, Ref_kel_matkul, 
        Ref_peminatan, Ref_semester, Ref_illustrasi } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const { paginator } = require('../helpers/global');
const { kelasValidator } = require('../validator/SearchValidator');
const { Op, fn, col } = require('sequelize');
const CacheControl = require('./CacheControl');
const jp = require('jsonpath');

const getUser = async obj => {
    return User.findOne({
        where: obj
    });
}

module.exports = {

  async getProfilUser(req, res, next){
    try {
      const logged = req.user
      CacheControl.getProfilSingkat(req);
      res.status(200).json({
        user: {
          id: logged.id,
          username: logged.username,
          email: logged.email,
          foto_profil: logged.foto_profil
        }
      });
    } catch (error) {
      next(error)
    }
  },
  
  async ubahPass(req, res, next) {
    try {
        const {current_password, new_password, confirm_password} = req.body;
        const { id } = await req.params;
        let user = await getUser({ id: id });
        const { email } = user;
        let password = current_password;
        const passwordUser = await bcrypt.compare(password, user.password);  
        if (passwordUser) {
          if(new_password == confirm_password){
            const hashed = await bcrypt.hash(new_password, 10)
            await User.update({ 
                    password: hashed,
                    updated_at: fn('NOW')
                }, { 
                    where: { email: email }
            });
            res.status(200).json({
                success: true,
                msg: 'Password Berhasil Diubah!'
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
        const file = req.file.filename;
        const { id } = req.user;
        let updateVal = { foto_profil: file, updated_at: fn('NOW')};
        await User.update(updateVal,{
            where: { id: id }
        });
        CacheControl.postProfilePic();
        res.status(200).json({
            success: true,
            msg: 'Foto berhasil diubah.'
        });
    } catch (error) {
        next(error);
    }
  },

  async getperSemester(req, res, next) {
    try {
      const { id_semester } = req.params;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        attributes: ['id_kelas', 'kode_seksi', 'id_matkul', 'semester', 'hari', 'jam'],        
        where: {[Op.or]:[
          { '$RefSem.id_semester$': {[Op.eq]: id_semester}},
          { '$RefSem.semester$': {[Op.like]:'%' + id_semester + '%'}}
        ]},        
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {model: Ref_semester, as: 'RefSem', required: true},
          {model: Dosen, as: 'Dosens', attributes: ['nama_lengkap'], 
            through: {attributes:[]}},
          {model: Matakuliah, as: 'Matkul', attributes: ['nama_matkul']},          
        ],
        order: [['id_seksi', 'ASC']]
      }
      const sms = await paginator(Kelas, pages, limits, opt);
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
        return Paket_soal.findOne({
          attributes: ['id_paket', 'aktif'],
          where: obj,
          include: [
            {model:Soal_essay, as:'Soals', attributes: ['id_soal', 'soal'], 
            through: {attributes: ['id','no_urut_soal','bobot_soal']}}
          ],
          order: [
            [{model:Soal_essay, as:'Soals'}, Rel_paketsoal_soal, 'no_urut_soal', 'ASC']
          ]
        });
      }
      let pkSoal;
      if(req.user.id_role === 1 || req.user.id_role === 2){
        pkSoal = await finder({id_paket: id_paket});
        if(!pkSoal){
          throw createError.BadRequest('paket soal tidak terdaftar...')
        }
      } else {
        pkSoal = await finder({[Op.and]:[{id_paket: id_paket}, {aktif:1}]});
        if(!pkSoal){
          throw createError.BadRequest('paket soal tidak terdaftar atau tidak aktif.')
        }
      }
      const soal = pkSoal.Soals.map((i) => {
        return {
          id_relasi_soalpksoal: i.Rel_paketsoal_soal.id,
          no_urut_soal: i.Rel_paketsoal_soal.no_urut_soal,
          id_soal: i.id_soal,
          soal: i.soal,
          bobot_soal: i.Rel_paketsoal_soal.bobot_soal,
          // gambar_soal: i.gambar_soal,
          // audio_soal: i.audio_soal,
          // video_soal: i.video_soal,
          // created_at: i.created_at,
          // updated_at: i.updated_at
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
  async getAllKelas(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Kelas, pages, limits);
        let vals = [];
        if(val.results.length !== 0){
          for(let i of val.results) {
            let matkul = await i.getMatkul()
            let sems = await i.getRefSem()
            let dosen = await i.getDosens({
              attributes: ['nama_lengkap'],
              joinTableAttributes: []
            })            
            vals.push({
              id_kelas: i.id_kelas,
              thumbnail_kelas: i.illustrasi_kelas,
              kode_seksi: i.kode_seksi,
              nama_matkul: matkul.nama_matkul,
              semester: sems.semester,
              hari: i.hari,
              jam: i.jam,
              dosen_pengampu: dosen
            })
          }
        } else {
          vals.push('no record...')
        }
        const kelas = await Promise.all(vals);
        CacheControl.getAllKelas(req);
        res.status(200).json({
            next:val.next,
            previous:val.previous,
            kelas: kelas
        });
    } catch (error) {
      next(error);
    }
  },

  async searchKelas(req, res, next) {
    try {
      let { find } = req.query;
      const validator = kelasValidator(find);
      if (validator instanceof createError) throw validator;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {        
        attributes: ['id_kelas', 'kode_seksi', 'id_matkul', 'id_semester', 'hari', 'jam'],
        where: { [Op.or]: validator },
        offset: (pages - 1) * limits,
        limit: limits, 
        subQuery: false,
        include: [
          { model: Matakuliah, as: 'Matkul', attributes: ['nama_matkul'] },
          { model: Ref_semester, as: 'RefSem', attributes: ['semester'] },
          { model: Dosen, as: 'Dosens',
            attributes: ['nama_lengkap'], through: {attributes:[]} }
        ],
        order: [['id_kelas', 'ASC']]
      }      
      const kelas = await paginator(Kelas, pages, limits, opt);
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
        const val = await Kelas.findOne({
          where: {id_kelas: id_kelas},
          include: [
            {model: Matakuliah, as: 'Matkul', attributes: ['nama_matkul']},
            {model: Dosen, as: 'Dosens', attributes: {
              exclude:[ 'id_user','alamat','nomor_telp','created_at','updated_at']
            }, through: {attributes:[]}},
            {model: Ujian, as: 'Ujians', required: false, where: {status_ujian: status},
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
        const getPengumuman = await Pengumuman.findAll({
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
      const notifikasi = await Notifikasi.findOne({
        attributes: ['id_pengirim', 'notifikasi', 'created_at', 'updated_at'],
        where: {id_penerima: user.id}
      });
      if(!notifikasi) {
        res.status(200).json({
          success: true,
          msg: 'tidak ada notifikasi baru.'
        })
      }
      let pengirim;
      if(notifikasi.id_pengirim){
        pengirim = await User.findOne({
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
      pengirim.username ? pengirim.username : pengirim.username = 'sistem'
      const notif = {
        data_pengirim: {
          username: pengirim.username,
          role: role()
        },
        notifikasi: notifikasi.notifikasi,
        created_at: notifikasi.created_at,
        updated_at: notifikasi.updated_at
      }
      CacheControl.getNotifikasi(req);
      res.status(200).json(notif);
    } catch (error) {
      next(error);
    }
  },

  async getIllustrasi(req, res, next) {
    try {
      const illustrasi = await Ref_illustrasi.findAll({
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
      const jenis_ujian = await Ref_jenis_ujian.findAll({
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
      const kel_mk = await Ref_kel_matkul.findAll({
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
      const peminatan = await Ref_peminatan.findAll({
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
      const semester = await Ref_semester.findAll({
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
  async getTipePenilaian(req, res, next) {
    try {
      const idUjian = req.params.id_ujian;
      const tipe_penilaian = await Ujian.findOne({
        attributes: ['id_ujian', 'tipe_penilaian'],
        where: {id_ujian: idUjian}
      });
      res.status(200).json(tipe_penilaian);
    } catch (error) {
      next(error);
    }
  },

  async setNotifikasi(req, res, next) {
    try {
      const { id_penerima, pesan } = req.body;
      const userPenerima = await User.findOne({
        attributes: ['id'],
        where: { id: id_penerima }
      });
      if(!userPenerima) {
        console.error(`user ${id_penerima} tidak ditemukan.`);
        throw createError.NotFound(`user ${id_penerima} tidak ditemukan.`);
      }
      await Notifikasi.create({
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
  
  async setNilaiAuto(req, res, next) {
    try {
      const idUjian = req.params.id_ujian;
      const paket_soal = await Paket_soal.findAll({ 
        attributes: ['id_paket', 'id_ujian'],
        where: {id_ujian: idUjian},
        include: {
          model: Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto',
          attributes: ['id', 'kata_kunci_soal'],
          where: {kata_kunci_soal: {[Op.ne]: null}},         
        },
        order: [
          [{model: Rel_paketsoal_soal, as: 'PaketSoal_Soal_auto'}, 'id', 'ASC']
        ]
      });
      if(!paket_soal) {
        console.error('data ujian tidak ditemukan atau penilaian ujian berupa manual/campuran.');
        throw createError.NotFound('data ujian tidak ditemukan atau penilaian ujian berupa manual/campuran.');
      }
      const arrayId = jp.query(paket_soal, '$[*].PaketSoal_Soal_auto[*].id');
      const jawaban = await Jawaban_mahasiswa.findAll({
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
      await Jawaban_mahasiswa.bulkCreate(nilaiJawaban, {
        updateOnDuplicate: ['id_jawaban', 'nilai_jawaban']
      });
      const final = await Jawaban_mahasiswa.findAll({
        attributes: ['id_mhs', [fn('sum', col('nilai_jawaban')), 'nilai_total']],
        where: {id_relasi_soalpksoal: {[Op.in]: arrayId}},
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