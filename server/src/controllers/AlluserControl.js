const bcrypt = require('bcrypt');
const sequelize = require('sequelize')
const { User, Matakuliah, Kelas } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const { auther, paginator } = require('../helpers/global')

const getUser = async obj => {
    return await User.findOne({
        where: obj
    });
}

module.exports = {

    async JwtauthAll(req, res, next) {
        try {
            const auth = await auther(req, res, next) 
            if (auth.kode_role){
                return next()
            } else {
                return next(createError.Unauthorized('Bukan user!'))
            }
        } catch (error) {
            next(error)
        }           
    },

    async ubahPass(req, res, next) {
        try {
            const {current_password, new_password, confirm_password} = req.body;
            const { id } = await req.params
            let user = await getUser({ id: id });
            const { email } = user
            let password = current_password;
            const passwordUser = await bcrypt.compareSync(password, user.password)
      
            if (passwordUser) {
              if(new_password == confirm_password){
                const hashed = await bcrypt.hash(new_password, 10)
                await User.update({ 
                        password: hashed,
                        updated_at: sequelize.fn('NOW')
                    },
                    { 
                        where: { email: email }
                    })
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
            next(error)
        }
               
    },

    async getallMatkul(req, res, next) {
        try {
          const pages = parseInt(req.query.page);
          const limits = parseInt(req.query.limit);
            let val = await paginator(Matakuliah, pages, limits);
            let vals = [];
            for(let dataValues of val.results) {// iterate over array from findall
                vals.push({// push only some wanted values, zellev
                    kode_matkul: dataValues.kode_matkul,
                    nama_matkul: dataValues.nama_matkul,
                    sks: dataValues.sks
                })
            }
            const matkul = await Promise.all(vals)
            res.send({
                next:val.next,
                previous:val.previous,
                matkul
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
            for(let dataValues of val.results) {// iterate over array from findall
            let matkul = await Matakuliah.findOne({where:{kode_matkul:dataValues.kode_matkul}})
                vals.push({// push only some wanted values, zellev
                    kode_seksi: dataValues.kode_seksi,
                    nama_matkul: matkul.nama_matkul,
                    hari: dataValues.hari,
                    jam: dataValues.jam
                })
            }
            const matkul = await Promise.all(vals)
            res.send({
                next:val.next,
                previous:val.previous,
                matkul
            })
        } catch (error) {
          next(error)
        }
    },

    async postAvatar(req, res, next) {
        try {
            const file = req.file.filename
            const { id } = req.params
            let updateVal = { foto_profil: file, updated_at: sequelize.fn('NOW')};
            await User.update(updateVal,{
                where: { id: id }
            })
            res.status(200).json({
                success: true,
                msg: 'Foto berhasil diubah!'
            })
        } catch (error) {
            next(error)
        }
    },
}