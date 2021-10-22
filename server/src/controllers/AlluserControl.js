const bcrypt = require('bcrypt');
const sequelize = require('sequelize')
const { User, Dosen, Matakuliah, Kelas, Pengumuman, Ref_semester } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const { paginator } = require('../helpers/global');
const { Op } = require('sequelize');

const getUser = async obj => {
    return await User.findOne({
        where: obj
    });
}

module.exports = {

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
                  msg: 'Password Berhasil Diubah!',
                  password_baru: new_password
              })
            }else {
              throw createError.BadRequest('password tidak sama')
            }
          } else {
            throw createError.BadRequest('password lama salah')
          }
      } catch(error) {
          next(error);
      }               
    },
    
    async postAvatar(req, res, next) {
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

    async cariperSemester(req, res, next) {
      try {
        let { kode_semester } = req.params;
        let vals = [], temp = [];
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
              attributes: ['kode_seksi', 'kode_matkul', 'hari', 'jam']              
            }
          }
        }
        const sms = await paginator(Ref_semester, pages, limits, opt)
        for (let i of sms.results[0].Matkul){          
          temp.push(i.Kelas)
        }
        for (let j of temp.flat()){
          let matkul = await j.getMatkul()
          vals.push({
            kode_seksi: j.kode_seksi,
            matkul: matkul.nama_matkul,
            hari: j.hari,
            jam: j.jam
          })
        }
        
        if (vals.length === 0) {vals.push('No Record...')}
        res.send({
          next: sms.next,
          previous: sms.previous,
          vals
        })
      } catch (error) {
        next(error)
      }
    },

    async getKelas(req, res, next) {
        try {
          const { kode_seksi } = req.params;
          const val = await Kelas.findByPk(kode_seksi);
          let temp = [];
          if (!val) { throw createError.BadRequest('kelas tidak terdaftar!')}          
          const matkul = await val.getMatkul({where:{kode_matkul:val.kode_matkul}});
          const dosen = await val.getDosens()
          for (let i of dosen){
            temp.push({
              kode_dosen: i.kode_dosen,
              NIP: i.NIP,
              NIDN: i.NIDN,
              NIDK: i.NIDK,
              nama_lengkap: i.nama_lengkap
            })
          }
          const kelas = {
            kode_seksi: val.kode_seksi,
            nama_matkul: matkul.nama_matkul,
            hari: val.hari,
            jam: val.jam,
            desktripsi: val.deskripsi,
            dosen_pengampu: temp
          };
          res.send(kelas);
        } catch (error) {
          next(error);
        }
    },

    async cariKelas(req, res, next) {
      try {
        let { find } = req.query;
        find = find.toLowerCase();
        let params = {
          kelas: [],
          temp: []
        };
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
            { model: Dosen, as: 'Dosens', required: true,
              attributes: ['nama_lengkap'], through: {attributes:[]} }
          ]
        }
        params.kelas = await paginator(Kelas, pages, limits, opt);
        if (params.kelas.results.length === 0) {params.temp.push('No record...')}   
        for (let i of params.kelas.results){          
          params.temp.push({
            kode_seksi: i.kode_seksi,
            nama_matkul: i.Matkul.nama_matkul,
            hari: i.hari,
            jam: i.jam,
            dosen_pengampu: i.Dosens
          })
        }
        res.send({
          next: params.kelas.next,
          previous: params.kelas.previous,
          kelas: params.temp
        })
      } catch (error) {
        next(error)
      }
    },

    async getallKelas(req, res, next) {
        try {
          const pages = parseInt(req.query.page);
          const limits = parseInt(req.query.limit);
            let val = await paginator(Kelas, pages, limits);
            let vals = [];
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