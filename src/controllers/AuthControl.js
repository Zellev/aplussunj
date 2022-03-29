const { Captcha, User, Lupa_pw, Token_history, Client } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const bcrypt = require('bcrypt');
const { auther, generateAccessToken, generateRefreshToken, hashed } = require('../helpers/global');
const nodemailer = require('nodemailer');
const CacheControl = require('../controllers/CacheControl');
const Sniffr = require("sniffr");
const { Op, fn, literal } = require('sequelize');
const hbs = require('nodemailer-express-handlebars');
const config = require('../config/dbconfig');

const getUser = async obj => {
  return await User.findOne({
      where: obj
  });
}

const getNewApiKey = (id_jenis_client) => {
  let d = new Date().getTime();
  let apiKey = `xxxxx${id_jenis_client}xx-xxxx-4xxxx-yxxxx-xxxxxxxxxxxx`
  .replace(/[xy]/g, function (c) {
    let r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return apiKey;
}

module.exports = {

  async jwtauthSistem(req, res, next) { 
    try {
        const apiKey = req.get('Api-Key');
        if(!apiKey) throw createError.BadRequest('"Api-Key" tidak terdeteksi di request header.');
        const split = apiKey.split('')[5];
        if(apiKey.includes('$')) throw createError.Unauthorized('API key tidak valid!');
        const auth = await Client.findOne({ where: { jenis_client: split }, raw: true });
        let x = auth.jenis_client;
        if (x === 1 || x === 2 || x === 3 || x === 4) {
          const same = await bcrypt.compare(apiKey, auth.api_key);
          if(same){
            return next();
          }
          throw next(createError.Unauthorized('API key tidak valid!'));
        } else {
          throw next(createError.Unauthorized('Client tidak valid!'));
        }
    } catch (error) {
      next(error);
    }
  },

  async jwtauthAll(req, res, next) {
    try {
        const auth = await auther({req, res, next, auth_name: 'userAuthStrategy'});
        if(auth instanceof createError) throw auth;
        if (auth.id_role && auth.status_civitas === 'aktif'){
          req.user = auth;
          return next();
        } else {
          throw createError.Unauthorized('Silahkan login!');
        }
    } catch (error) {
      next(error);
    }
  },

  async jwtauthAdmin(req, res, next) {   
    try {
      const auth = await auther({req, res, next, auth_name: 'userAuthStrategy'});
      if(auth instanceof createError) throw auth;
      if (auth.id_role === 1 && auth.status_civitas === 'aktif') {
        req.user = auth;
        return next();
      } else {
        throw createError.Unauthorized('Bukan admin!');
      }
    } catch (error) {
      next(error)
    }      
  },

  async jwtauthDosen(req, res, next) {   
    try {
      const auth = await auther({req, res, next, auth_name: 'userAuthStrategy'});
      if(auth instanceof createError) throw auth;
      if (auth.id_role === 2 && auth.status_civitas === 'aktif') {
        req.user = auth;
        return next();
      } else {
        throw createError.Unauthorized('Bukan dosen!');
      }
    } catch (error) {
      next(error);
    }      
  },

  async jwtauthMhs(req, res, next) {   
    try {
      const auth = await auther({req, res, next, auth_name: 'userAuthStrategy'});
      if(auth instanceof createError) throw auth;
      if (auth.id_role === 3 && auth.status_civitas === 'aktif') {
        req.user = auth;
        return next();
      } else {
        throw createError.Unauthorized('Bukan mahasiswa!');
      }
    } catch (error) {
      next(error);
    }      
  },

  async captcha (req, res, next){
    try {
      const count = await Captcha.count();
      const random = Math.floor(Math.random() * count)+1;
      const getCaptcha = await Captcha.findOne({
        where: { id_captcha : random }
      });
      CacheControl.getCaptcha(req);
      res.status(200).json(getCaptcha);
    } catch (error) {
      next(error);
    }
  },

  async getAccessToken(req, res, next){
    try {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken) throw createError.Unauthorized('Server error!');
      const auth = await auther({req, res, next, auth_name: 'refreshTokenAuthStrategy'}); 
      if(auth instanceof createError) throw auth;
      const newAccessToken = generateAccessToken(auth);
      const newRefreshToken = generateRefreshToken(auth);      
      await Token_history.create({
        id_user: auth.id,
        refresh_token: newRefreshToken.token,
        isValid: true,
        created_at: fn('NOW')
      });
      res.status(201).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });     
    } catch (error) {
      next(error);
    }
  },

  async deleteTokenHistory(req, res, next){
    try {
      const { id } = req.user;
      const userSession = await Token_history.findOne({
        where: {id_user: id}
      });
      if (!userSession) {
        throw createError.Forbidden('User tidak mempunyai history token.');
      }
      await Token_history.destroy({
        where: {[Op.and]: [
          {id_user: id}, 
          {created_at: 
            literal(`datediff(now(), Token_histories.created_at) > ${config.auth.tokenHistoryexpiry}`)
          }
        ]}
      });
      await Token_history.update({ isValid: false }, {
        where: {[Op.and]: [{ id_user: id } , { isValid: true }]}
      });
      res.sendStatus(204);
    } catch (error) {
      next(error)  
    }
  },

  async login (req, res, next) {
    try {
        let user = req.user;
        const { password } = req.body;
        const passwordUser =  await bcrypt.compare(password, user.password);
        const userJson = user.toJSON();
        // const isAdmin =  userJson.id_role === 1 ? true : false;
        const accessToken = generateAccessToken(userJson);
        const refreshToken = generateRefreshToken(userJson);        
        const tokenExist = await Token_history.findOne({ 
          where: {[Op.and]: [{ id_user: userJson.id } , { isValid: true }]}
        });
        if(tokenExist){ // invalidate all old tokens of this user          
          await Token_history.update({ isValid: false }, {
            where: {[Op.and]: [{ id_user: userJson.id } , { isValid: true }]}
          });
        }
        if (passwordUser) {
          await Token_history.create({
            id_user: userJson.id,
            refresh_token: refreshToken.token,
            isValid: true,
            created_at: fn('NOW')
          });
          res.status(200).json({
            success: true,
            msg: 'Login Berhasil',
            // isAdmin: isAdmin,
            accessToken: accessToken.token,
            refreshToken: refreshToken.token
          });
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
      if(!user) {throw createError.BadRequest('email user tidak ditemukan!');}
      await Lupa_pw.create({
        username: user.username,
        email: user.email,
        status: 'belum'
      });
      res.status(200).json({
        success: true,
        msg: 'Permintaan telah terkirim'
      });
    } catch (error) {
      next(error);
    }
  },

  async lupapwSmtp(req, res, next){
    try {      
      const { email } = req.body;
      const user = await User.findOne({
        where:{email: email}, attributes: ['id', 'username', 'email']
      });
      if(!user){
        throw createError.BadRequest('email user tidak ditemukan!');
      }
      const sniffer = new Sniffr().sniff(req.headers['user-agent']);  
      let transporter = nodemailer.createTransport(config.auth.smtp);
      transporter.use('compile', hbs({
        viewEngine: {
          extname: '.hbs', // handlebars extension
          layoutsDir: './public/pdftemplate/ubahpwtemplate/', // location of handlebars templates
          defaultLayout: false
        },
        viewPath:  './public/pdftemplate/ubahpwtemplate/',
        extName: '.hbs'
      }));
      let mailOptions = {
          from: config.auth.emailOpt.from, // sender address
          to: `${email}`, // list of receivers
          subject: config.auth.emailOpt.subject, // Subject line
          text: ' ', // plain text body
          template: 'index',
          context: {
            name: user.username,
            link_ubah: config.auth.linkubahpw,
            os: sniffer.os.name,
            browser: sniffer.browser.name
          }
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error){
          console.log(error);
          throw createError.internal('server error')
        }else{
          console.log('email ubah password terkirim: ' + info.response);
          res.status(200).json({
            success: true,
            msg: 'Permintaan ubah password berhasil terikirim ke email anda.'
          })
        }
      })
    } catch (error) {
      next(error);
    }
  },

  async ubahPassNoauth(req, res, next) {
    try {
        const {new_password, confirm_password} = req.body;
        const { id } = await req.params;
        let user = await getUser({ id: id });
        const { email } = user;
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
              msg: 'Password berhasil diubah!'
          })
        } else {
          throw createError.BadRequest('password tidak sama!')
        }
    } catch(error) {
        next(error);
    }               
  },

  async setClient(req, res, next) {
    try {
      const { client_name, client_url, id_jenis_client } = req.body;
      const apiKey = getNewApiKey(id_jenis_client);
      const hashed = await bcrypt.hash(apiKey, 10); 
      await Client.create({
        client_name: client_name,
        client_url: client_url,
        api_key: hashed,
        jenis_client: id_jenis_client,
        created_at: fn('NOW')
      });
      CacheControl.postClient;
      res.status(200).json({
        success: true,
        msg: 'Client berhasil ditambahkan!',
        apiKey: apiKey
      });
    } catch (error) {
      next(error);
    }
  },

  async getAllClient(req, res, next) {
    try {
      const client = await Client.findAll({
        attributes: ['id_client', 'client_name', 'client_url', 
        'jenis_client', 'created_at', 'updated_at']
      });
      CacheControl.getAllClient(req);
      res.status(200).json(client);
    } catch (error) {
      next(error);
    }  
  },

  async putClient(req, res, next) {
    try {
      const id_client = req.params.id_client;
      const { client_name, client_url, id_jenis_client } = req.body;
      await Client.update({
        client_name: client_name,
        client_url: client_url,
        jenis_client: id_jenis_client,
        updated_at: fn('NOW')
      }, {
        where: { id_client: id_client }
      });
      CacheControl.putClient;
      res.status(200).json({
        success: true,
        msg: 'data Client berhasil diubah!'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteClient(req, res, next) {
    try {
      const id_client = req.params.id_client;
      await Client.destroy({
        where: { id_client: id_client }
      });
      CacheControl.deleteClient;
      res.status(200).json({
        success: true,
        msg: 'data Client berhasil dihapus!'
      });
    } catch (error) {
      next(error);
    }
  },

  async patchClientKey(req, res, next) {
    try {
      const id_client = req.params.id_client;
      const { current_api_key } = req.body;
      const client = await Client.findOne({ where: { id_client: id_client }});
      const sama = await bcrypt.compare(current_api_key, client.api_key);
      if(sama){
        const apiKey = getNewApiKey(client.jenis_client);
        const hashed = await bcrypt.hash(apiKey, 10); 
        await Client.update({
          api_key: hashed,
          updated_at: fn('NOW')
        }, {
          where: { id_client: id_client }
        });
        res.status(200).json({
          success: true,
          msg: 'api-key Client berhasil diubah!'
        });
      } else {
        throw createError.BadRequest('api key salah!');
      }      
    } catch (error) {
      next(error);
    }
  },

  async setAdmin (req, res, next){
    try {
        const { email, username } = req.body
        await User.create({
          username: username,
          email: email,
          password: await hashed(),
          status_civitas: 'aktif',
          id_role: '1',
          created_at: fn('NOW')
        });
        CacheControl.postNewAdmin;
        res.status(200).json({
          success: true,
          msg: 'admin berhasil ditambahkan'
        });
    } catch (error) {
        next(error);
    }
  },
}