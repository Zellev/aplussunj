const { User, Dosen, Mahasiswa, Captcha } = require('../models');
// const { Arsip } = require('../models')
const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
const config = require('../config/dbconfig');

// function jwtSignuser (user) {
//   const TIME = 60 * 60 * 24 * 1 // per-1 hari
//   return jwt.sign(user, config.auth.secretKey, {
//     expiresIn: TIME
//   });
// }

const getUserid = () => {
  return (User.max('id')).then((val) => {
    return Promise.resolve(parseInt(val)+1)
  });
}

const hashed = () => {  
  return new Promise((resolve, reject) => {
    bcrypt.hash(config.auth.defaultPass, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    })
  })
}// hash default password, ada di .env

module.exports = {
  // add passport auth middleware
  async daftarAdmin (req, res, next){
    try {
        const { email, username } = req.body
        const user = await User.create({
            username: username,
            email: email,
            password: await hashed(),
            status_civitas: 'aktif',
            kode_role: '1',
            foto_profil: null,
            keterangan: null,
        });
        const userJson = user.toJSON();
        res.status(200).json({
          success: true,
          msg: 'new Admin berhasil ditambah',
          user_id: userJson.id,
          username: userJson.username,
          email: userJson.email
        });
    } catch (error) {
        next(error);
    }
  },

  async daftar (req, res, next) {
    try {
        const { role, NIDN, NIDK, NIM, email, nama_lengkap, nomor_telp} = req.body;
        var data;

        if ( role === 'Dosen' ) {
          data = async () => {
            return await User.create({   
              username: 'User'+' '+ await getUserid(),
              email: email,
              status_civitas: 'aktif',
              password: await hashed(),
              kode_role: '2',
              foto_profil: null,
              keterangan: null,
              Dosen: {
                  NIDN: NIDN,
                  NIDK: NIDK,
                  nama_lengkap: nama_lengkap,
                  nomor_telp: nomor_telp
                }
              }, {
                include: {
                    model: Dosen,
                    association: User.associations.Dosen
              }              
            });
          } 
        } else if ( role === 'Mahasiswa' ) {
          data = async () => {
          return await User.create({   
            username: 'User'+' '+ await getUserid(),
            email: email,
            status_civitas: 'aktif',
            password: await hashed(),
            kode_role: '3',
            foto_profil: null,
            keterangan: null,
            Mahasiswa: {
                NIM: NIM,
                nama_lengkap: nama_lengkap,
                nomor_telp: nomor_telp
              }
            }, {
              include: {
                  model: Mahasiswa,
                  association: User.associations.Mahasiswa
            }              
          });
        } 
      }
        const Data = await data()
        const user = Data.toJSON()
        res.status(200).json({
          success: true,
          msg: 'user berhasil ditambahkan!',
          user_id: user.id,
          username: user.username,
          email: user.email,
          kode_role: user.kode_role     
        });
    } catch (error) {   
        next(error);
    }
  },

  async tambahcaptcha (req, res, next) {
    try {
      const { pertanyaan, jawaban } = req.body;
      const captcha = await Captcha.create({
        pertanyaan: pertanyaan,
        jawaban: jawaban
      })
      res.status(200).json({
        success: true,
        msg: 'captcha berhasil ditambahkan',
        captcha: captcha
      });
    } catch (error) {
      next(error);
    }
  }

}