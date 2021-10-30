const { Captcha, User, Lupa_pw } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/dbconfig');
const TIME = 60 * 60 * 24 * 7; // per-1 minggu, ganti angka paling blkng
const { auther } = require('../helpers/global')

function jwtSignuser (user) {   
  return jwt.sign(user, config.auth.secretKey, {
    expiresIn: TIME
  });
}

const getUser = async obj => {
  return await User.findOne({
      where: obj
  });
}

module.exports = {

  async jwtauthAll(req, res, next) {
    try {
        const auth = await auther(req, res, next);
        if (auth.kode_role){
            req.user = auth
            return next()
        } else {
           throw createError.Unauthorized('Bukan user!')
        }
    } catch (error) {
        next(error);
    }
  },

  async jwtauthAdmin(req, res, next) {   
    try {
      const auth = await auther(req, res, next)
      if (auth.kode_role === 1) {
          req.user = auth
          return next()
      } else {
          throw createError.Unauthorized('Bukan admin!')
      }
    } catch (error) {
        next(error)
    }      
  },

  async jwtauthDosen(req, res, next) {   
    try {
      const auth = await auther(req, res, next)
      if (auth.kode_role === 1 || auth.kode_role === 2) {
          req.user = auth
          return next()
      } else {
          throw createError.Unauthorized('Bukan dosen atau admin!')
      }
    } catch (error) {
        next(error)
    }      
  },

  async jwtauthMhs(req, res, next) {   
    try {
      const auth = await auther(req, res, next)
      if (auth.kode_role === 1 || auth.kode_role === 3) {
          req.user = auth
          return next()
      } else {
          throw createError.Unauthorized('Bukan mahasiswa atau admin!')
      }
    } catch (error) {
        next(error)
    }      
  },

  async captcha (req, res, next){
    try {
      const random = Math.floor(Math.random() * 5) + 1;
      const getCaptcha = await Captcha.findOne({
        where: { kode_captcha : random }
      });

      res.json(getCaptcha);
    } catch (error) {
      next(error);
    }
  },

  async login (req, res, next) {
    try {
        let user = req.user;
        const { password } = req.body;
        const passwordUser = await bcrypt.compareSync(password, user.password);
        const userJson = user.toJSON();
        // const isAdmin =  userJson.kode_role === 1 ? true : false;        
        if (passwordUser) {
              res.status(200).json({
                success: true,
                msg: 'Login Berhasil',
                user_id: userJson.id,
                username: userJson.username,
                email: userJson.email,
                // isAdmin: isAdmin,
                token: jwtSignuser(userJson),// dengan string: Bearer
                expiredIn: (TIME/86400) + ' Hari'
              });
          //     if (auth user == admin, dosen, mhs)
          // res.redirect('/')
        } else {
          throw next(createError.BadRequest('password salah!'));
        }            
    } catch (error) {      
      next(error);
    }
  },

  async lupapw(req, res, next){
    try {      
      const { email } = req.body;
      const user = await getUser({email:email});
      if(!user) {throw createError.Forbidden('user tidak ditemukan!');}
      const data = await Lupa_pw.create({
        username: user.username,
        email: user.email,
        status: 'belum'
      })
      res.status(200).json({
        success: true,
        msg: 'Permintaan telah terkirim', 
        data: data
      });
    } catch (error) {
      next(error);
    }
  },
  
}