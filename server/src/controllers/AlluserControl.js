const bcrypt = require('bcrypt');
const sequelize = require('sequelize');
const jp = require('jsonpath');
const { User, Dosen, Matakuliah, Kelas, 
        Pengumuman, Ref_semester, Ref_jenis_ujian,
        Paket_soal } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const { paginator } = require('../helpers/global');
const { Op } = require('sequelize');

const getUser = async obj => {
    return await User.findOne({
        where: obj
    });
}

module.exports = {

  async getProfilUser(req, res, next){
    try {
      const logged = req.user
      res.send({
        user: {
          id: logged.id,
          username: logged.username,
          email: logged.email,
          foto_profil: logged.foto_profil
        }
      })
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
        const passwordUser = await bcrypt.compareSync(password, user.password);
  
        if (passwordUser) {
          if(new_password == confirm_password){
            const hashed = await bcrypt.hash(new_password, 10)
            await User.update({ 
                    password: hashed,
                    updated_at: sequelize.fn('NOW')
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
        const { id } = req.params;
        let updateVal = { foto_profil: file, updated_at: sequelize.fn('NOW')};
        await User.update(updateVal,{
            where: { id: id }
        });
        res.status(200).json({
            success: true,
            msg: 'Foto berhasil diubah!'
        });
    } catch (error) {
        next(error);
    }
  },

  async getperSemester(req, res, next) {
    try {
      let { kode_semester } = req.params;
      let vals = [];
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        where: { kode_semester: kode_semester },
        include: {         
          model: Matakuliah, as: 'Matkul',
          offset: (pages - 1) * limits,
          limit: limits,                 
          include: {            
            model: Kelas, as: 'Kelas',
            attributes: ['kode_seksi', 'kode_matkul', 'hari', 'jam'],
            include: {model: Dosen, as: 'Dosens', attributes: ['nama_lengkap'],
            through: {attributes:[]} }            
          },
        },
        countModel: Kelas
      }
      const sms = await paginator(Ref_semester, pages, limits, opt);
      const kelas = jp.query(sms.results[0], '$.Matkul[*].Kelas');      
      for (let i of kelas.flat()){
        let matkul = await i.getMatkul()
        vals.push({
          kode_seksi: i.kode_seksi,
          matkul: matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          dosen_pengampu: i.Dosens
        })
      }
      if (vals.length === 0) {vals.push('No Record...')}
      res.send({
        next: sms.next,
        previous: sms.previous,
        kelas: vals
      })
    } catch (error) {
      next(error)
    }
  },
  /* PaketSoal Methods */
  async getPaketsoal(req, res, next){
    try {
      const { kode_paket } = req.params
      const pkSoal = await Paket_soal.findOne({
        where:{kode_paket:kode_paket},
        include:{model:Ref_jenis_ujian, as:'RefJenis'}
      });
      let status;
      if(req.user.kode_role === 1 || req.user.kode_role === 2){
        if(pkSoal.status === 'draft'){
          status = 'DRAFT'
        } else {
          status = 'TERBIT'
        }
      } else {
        status = 'TERBIT'
      }
      res.send({
        kode_paket: pkSoal.kode_paket,
        jenis_ujian: pkSoal.RefJenis.jenis_ujian,
        judul_ujian: pkSoal.judul_ujian,
        tanggal_mulai: pkSoal.tanggal_mulai,
        waktu_mulai: pkSoal.waktu_mulai,
        durasi_ujian: pkSoal.durasi_ujian,
        bobot_total: pkSoal.bobot_total,
        status: status
      })
    } catch (error) {
      next(error)
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
            let dosen = await i.getDosens({
              attributes: ['nama_lengkap'],
              joinTableAttributes: [] // Remove join table attribute!
            })
            vals.push({
              kode_seksi: i.kode_seksi,
              nama_matkul: matkul.nama_matkul,
              hari: i.hari,
              jam: i.jam,
              dosen_pengampu: dosen
            })
          }
        } else {
          vals.push('no record...')
        }
        const kelas = await Promise.all(vals);
        res.send({
            next:val.next,
            previous:val.previous,
            kelas: kelas
        });
    } catch (error) {
      next(error);
    }
  },

  async cariKelas(req, res, next) {
    try {
      let { find } = req.query;
      find = find.toLowerCase();
      let kelas = [], temp = [];
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        order: [['kode_seksi', 'ASC']],
        attributes: ['kode_seksi', 'hari', 'jam'],
        where: {
          [Op.or]: [
            {kode_seksi: {[Op.like]:'%' + find + '%'}},
            {'$Matkul.nama_matkul$': {[Op.like]:'%' + find + '%'}},
            {'$Dosens.nama_lengkap$': {[Op.like]:'%' + find + '%'}} 
          ]
        },
        offset: (pages - 1) * limits,
        limit: limits, // m-m array search not working with limit on
        subQuery: false, // nested  m-m + limit search only works with this on; bc of subquery querying?/not on top level.
        include: [
          { model: Matakuliah, as: 'Matkul', required: true,
            attributes: ['nama_matkul'] },
          { model: Dosen, as: 'Dosens',
            attributes: ['nama_lengkap'], through: {attributes:[]} }
        ]
      }
      kelas = await paginator(Kelas, pages, limits, opt);
      if (kelas.results.length === 0) {temp.push('No record...')}   
      for (let i of kelas.results){          
        temp.push({
          kode_seksi: i.kode_seksi,
          nama_matkul: i.Matkul.nama_matkul,
          hari: i.hari,
          jam: i.jam,
          dosen_pengampu: i.Dosens
        })
      }
      res.send({
        next: kelas.next,
        previous: kelas.previous,
        kelas: temp
      })
    } catch (error) {
      next(error)
    }
  },

  async getKelas(req, res, next) {
      try {
        const { kode_seksi } = req.params;
        let status
        if(req.user.kode_role === 1|| req.user.kode_role === 2){
          status = {[Op.or]: ['draft','terbit'] }
        } else {
          status = 'terbit'
        }
        const val = await Kelas.findOne({
          where: {kode_seksi:kode_seksi},
          include: [
            {model: Matakuliah, as: 'Matkul', attributes: ['nama_matkul'], required: true},
            {model: Dosen, as: 'Dosens', 
            attributes: {
              exclude:['NIP','id_user','alamat','nomor_telp','created_at','updated_at']
            }, through: {attributes:[]}},
            {model: Paket_soal, as: 'PaketSoals', required: false, attributes:{
              exclude:['durasi_ujian','status','deskripsi','created_at','updated_at']
            }, through: {attributes:[]}, where: {status: status}}
          ]
        })
        if (!val) { throw createError.BadRequest('kelas tidak terdaftar!')}
        const kelas = {
          kode_seksi: val.kode_seksi,
          nama_matkul: val.Matkul.nama_matkul,
          hari: val.hari,
          jam: val.jam,
          desktripsi: val.deskripsi,
          dosen_pengampu: val.Dosens,
          paket_soal: val.PaketSoals
        };
        res.send(kelas);
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
        res.send(getPengumuman);
    } catch (error) {
      next(error);
    }
  },

}