const { Captcha } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/dbconfig');
const Passport = require('passport');
const TIME = 60 * 60 * 24 * 7; // per-1 minggu, ganti angka paling blkng

function jwtSignuser (user) {   
  return jwt.sign(user, config.auth.secretKey, {
    expiresIn: TIME
  });
}

module.exports = {

  async JwtauthAdmin(req, res, next) {   
    req.user = new Promise((resolve, reject) => {
      Passport.authenticate('jwt',{ session: false }, (err, user) => {
          if (err) {
            reject(new Error(err))
          } else if (!user) { 
            reject(createError.BadRequest('Not authenticated'))
          }
          resolve(user)
        })(req, res, next)
      })
      const auth = await req.user
      if (auth.kode_role === 1){
        return next()
      } else {
        return next(createError.Unauthorized('Bukan admin!'))
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
                token: 'Bearer ' + jwtSignuser(userJson),
                expiredIn: (TIME/86400) + ' Hari'
              });
          //     if (auth user == admin, dosen, mhs)
          // res.redirect('/')
        } else {
          next(createError.BadRequest('password salah!'));
        }            
    } catch (error) {
      console.log(error)
      // next(error);
    }
  }
}