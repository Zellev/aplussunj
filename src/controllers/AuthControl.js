'use strict';
const models = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const bcrypt = require('bcrypt');
const helpers = require('../helpers/global');
const nodemailer = require('nodemailer');
const CacheControl = require('../controllers/CacheControl');
const Sniffr = require("sniffr");
const { Op, fn, literal } = require('sequelize');
const hbs = require('nodemailer-express-handlebars');
const config = require('../config/dbconfig');

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
        const auth = await models.Client.findOne({ where: { id_jenis_client: split }, raw: true });
        if (auth) {
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
        const auth = await helpers.auther({req, res, next, auth_name: 'userAuthStrategy'});
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
      const auth = await helpers.auther({req, res, next, auth_name: 'userAuthStrategy'});
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
      const auth = await helpers.auther({req, res, next, auth_name: 'userAuthStrategy'});
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
      const auth = await helpers.auther({req, res, next, auth_name: 'userAuthStrategy'});
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
      const count = await models.Captcha.count();
      const random = Math.floor(Math.random() * count)+1;
      const getCaptcha = await models.Captcha.findOne({
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
      const auth = await helpers.auther({req, res, next, auth_name: 'refreshTokenAuthStrategy'}); 
      if(auth instanceof createError) throw auth;
      const newAccessToken = helpers.generateAccessToken(auth);
      const newRefreshToken = helpers.generateRefreshToken(auth);      
      await models.Token_history.create({
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
      const userSession = await models.Token_history.findOne({
        where: {id_user: id}
      });
      if (!userSession) {
        throw createError.Forbidden('User tidak mempunyai history token.');
      }
      await models.Token_history.destroy({
        where: {[Op.and]: [
          {id_user: id}, 
          {created_at: 
            literal(`DATEDIFF(NOW(), token_histories.created_at) > ${config.auth.tokenHistoryexpiry}`)
          }
        ]}
      });
      await models.Token_history.update({ isValid: false }, {
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
        const accessToken = helpers.generateAccessToken(userJson);
        const refreshToken = helpers.generateRefreshToken(userJson);        
        const tokenExist = await models.Token_history.findOne({ 
          where: {[Op.and]: [{ id_user: userJson.id } , { isValid: true }]}
        });
        if(tokenExist){ // invalidate all old tokens of this user          
          await models.Token_history.update({ isValid: false }, {
            where: {[Op.and]: [{ id_user: userJson.id } , { isValid: true }]}
          });
        }
        if (passwordUser) {
          await models.Token_history.create({
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
      const user = await models.User.findOne({
        attributes: ['id'],
        where: {email: email} 
      });
      if(!user) {throw createError.BadRequest('email user tidak ditemukan!');}
      await models.Lupa_pw.create({
        id_user: user.id,
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
      const user = await models.User.findOne({
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
            browser: sniffer.browser.name,
            email: email
          }
      };
      let err;
      transporter.sendMail(mailOptions, (error, info) => {
        if (error){
          console.log(error);
          err = createError.internal('server error');
        }else{
          console.log('email ubah password terkirim: ' + info.response);
          res.status(200).json({
            success: true,
            msg: 'Permintaan ubah password berhasil terikirim ke email anda.'
          })
        }
      })
      if(err) throw err
    } catch (error) {
      next(error);
    }
  },

  async ubahPassNoauth(req, res, next) {
    try {
        const {new_password, confirm_password} = req.body;
        const { email } = req.params;
        const userFound = await models.User.findOne({ where: {email: email} });
        if(!userFound) throw createError.NotFound('email user tidak ditemukan!');
        if(new_password == confirm_password){
          const hashed = await bcrypt.hash(new_password, 10)
          await models.User.update({ 
                  password: hashed,
                  updated_at: fn('NOW')
              }, { 
                  where: { email: email }
          });
          res.status(200).json({
              success: true,
              msg: 'password berhasil diubah.'
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
      const client = await models.Client.create({
        client_name: client_name,
        client_url: client_url,
        api_key: hashed,
        id_jenis_client: id_jenis_client,
        created_at: fn('NOW')
      });
      CacheControl.postClient();
      res.status(201).json({
        success: true,
        msg: 'Client berhasil ditambahkan!',
        apiKey: apiKey,
        data: client
      });
    } catch (error) {
      next(error);
    }
  },

  async getAllClient(req, res, next) {
    try {
      const client = await models.Client.findAll({
        include: {
          model: models.Ref_jenis_client,  as: 'Jenis_client'
        },
        raw: true, nest: true
      });
      const data = client.map((i) => {
        return {
          id_client: i.id_client,
          client_name: i.client_name,
          client_url: i.client_url,
          api_key: i.api_key,
          jenis_client: i.Jenis_client.jenis_client,
          created_at: i.created_at,
          updated_at: i.updated_at,
          deleted_at: i.deleted_at
        }
      })
      CacheControl.getAllClient(req);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }  
  },

  async putClient(req, res, next) {
    try {
      const id_client = req.params.id_client;
      const { client_name, client_url, id_jenis_client } = req.body;
      await models.Client.update({
        client_name: client_name,
        client_url: client_url,
        jenis_client: id_jenis_client,
        updated_at: fn('NOW')
      }, {
        where: { id_client: id_client }
      });
      const data = await models.Client.findOne({
        where: { id_client: id_client }
      });
      CacheControl.putClient();
      res.status(200).json({
        success: true,
        msg: 'data Client berhasil diubah!',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteClient(req, res, next) {
    try {
      const id_client = req.params.id_client;
      await models.Client.destroy({
        where: { id_client: id_client }
      });
      CacheControl.deleteClient();
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
      const client = await models.Client.findOne({ where: { id_client: id_client }});
      const sama = await bcrypt.compare(current_api_key, client.api_key);
      if(sama){
        const apiKey = getNewApiKey(client.jenis_client);
        const hashed = await bcrypt.hash(apiKey, 10); 
        await models.Client.update({
          api_key: hashed,
          updated_at: fn('NOW')
        }, {
          where: { id_client: id_client }
        });
        res.status(200).json({
          success: true,
          msg: 'api-key Client berhasil diubah!',
          apiKey_baru: apiKey
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
        const user = await models.User.create({
          username: username,
          email: email,
          password: await helpers.hashed(),
          status_civitas: 'aktif',
          id_role: '1',
          foto_profil: config.auth.defaultProfilePic,
          keterangan: null,
          created_at: fn('NOW')
        });
        CacheControl.postNewAdmin();
        res.status(201).json({
          success: true,
          msg: 'admin berhasil ditambahkan',
          data: user
        });
    } catch (error) {
        next(error);
    }
  },
}