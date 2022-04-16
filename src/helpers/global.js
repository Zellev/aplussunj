/* eslint-disable */
const createError = require('../errorHandlers/ApiErrors')
const Passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config/dbconfig');
const bcrypt = require('bcrypt');
const path = require('path');
const { Paket_soal, Ref_illustrasi } = require('../models');

const payload = (user) => {  
  return {
    id: user.id,
    username: user.username, 
    email: user.email
  }  
}

module.exports = {  

  /** 
   * @param {object} user
   * @returns 
   */

  generateAccessToken(user) {    
    const time = '10m'
    const signed = jwt.sign( payload(user), config.auth.accessTokenSecret, {
      expiresIn: time
    });
    return {
      token: signed,
      expiration: time
    }
  },

  /** 
   * @param {object} user
   * @returns 
   */

  generateRefreshToken(user) {
    // dconst time = '7d'
    const signed = jwt.sign( payload(user), config.auth.refreshTokenSecret);    
    return {
      token: signed
    }
  },

  /** 
   * @param {Number} pages
   * @param {Number} limits
   * @param {Object} options
   * @returns {Object}
   */
  
  async paginator(model, pages, limits, options) {       
    const page = pages
    const limit = limits
    const startIndex = (page - 1) * limit
    const endIndex = page * limit

    const results = {}

    if (endIndex < await model.count()) {
        results.next = {
            page: page + 1,
            limit: limit
        }
    }    
    if (startIndex > 0) {
        results.previous = {
            page: page - 1,
            limit: limit
        }
    }
    if(options){
      if( 'countModel' in options){
        if (endIndex < await options.countModel.count()) {
          results.next = {
              page: page + 1,
              limit: limit
          }
        }        
        delete options.countModel
        results.results = await model.findAll(options)
      } else {
        results.results = await model.findAll(options)
      }          
    } else {
      results.results = await model.findAll({
          offset:startIndex,
          limit:limit
      })
    }        
    return results
  },

  /** 
   * @param {Object} opt
   * @param {Number} pages
   * @param {Number} limits
   * @returns {Object}
   */

  async paginatorMN(opt, pages, limits){
    const page = pages
    const limit = limits
    const startIndex = (page - 1) * limit
    const endIndex = page * limit

    const results = {}

    if (endIndex < await opt.model.count()) {
        results.next = {
            page: page + 1,
            limit: limit
        }
    }    
    if (startIndex > 0) {
        results.previous = {
            page: page - 1,
            limit: limit
        }
    }
    results.results = opt.finder
    return results
  },

  async auther(opt) {    
    return new Promise((resolve, reject) => {
      let x = opt.auth_name;
      Passport.authenticate(x, { session: false }, (err, user) => {
        if (err) {
          reject(err)
        } else if (!user) {         
          reject(createError.Unauthorized('Not Authorized!'))
        }
        resolve(user)
      })(opt.req, opt.res, opt.next);
    })
  },

  todaysdate() {
    let today = new Date();
    let date = today.getDate()+'-'+(today.getMonth()+1)+'-'+today.getFullYear();
    let time = today.getHours() + '.' + today.getMinutes();
    let dateTime = date+'_'+time;
    return dateTime
  },

  dateFull() {
    var today = new Date();
    const monthNames = ["Januari", "Februari", "Maret", "April", "May", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    var dd = String(today.getDate());
    var mm = monthNames[today.getMonth()];
    var yyyy = today.getFullYear();
    today = dd + ' ' + mm + ' ' + yyyy;
    return today
  },

  /** 
   * @param {Object} obj
   * @param {Function} functn
   * @returns {Object} 
   */

  objectMap(obj, functn) {
    return Object.fromEntries(
      Object.entries(obj).map(
        ([k, v], i) => [k, functn(v, k, i)]
      )
    )
  },

  /** 
   * @param {Number} length
   * @returns {String} 
   */

  async createKode(length) {
    let kdPaket = '', paketExist;
    var characters       = config.codegen.char;
    var charactersLength = characters.length;
    function shuffle(char){
      var a = char.split(""), n = a.length;  
      for(var i = n - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = a[i];
          a[i] = a[j];
          a[j] = tmp;
      }
      return a.join("");
    }   
    do {
      for ( var i = 0; i < length; i++ ) {
        kdPaket += characters.charAt(Math.floor(Math.random() * charactersLength));
      }  
      paketExist = await Paket_soal.findOne({  //paketExist = null
        attributes:['kode_paket'],
        where: {kode_paket: kdPaket}
      });
      characters = shuffle(characters);
    } while(paketExist) // false
    return kdPaket;
  },

  shuffleArray() {
    var arrLength = 0;
    var argsLength = arguments.length;
    var rnd, tmp;
    var isArray = Array.isArray || function (value) {
      return {}.toString.call(value) !== "[object Array]"
    };
  
    for (var index = 0; index < argsLength; index += 1) {
      if (!isArray(arguments[index])) {
        throw new TypeError("Argument is not an array.");
      }
  
      if (index === 0) {
        arrLength = arguments[0].length;
      }
  
      if (arrLength !== arguments[index].length) {
        throw new RangeError("Array lengths do not match.");
      }
    }
  
    while (arrLength) {
      rnd = Math.floor(Math.random() * arrLength);
      arrLength -= 1;
      for (argsIndex = 0; argsIndex < argsLength; argsIndex += 1) {
        tmp = arguments[argsIndex][arrLength];
        arguments[argsIndex][arrLength] = arguments[argsIndex][rnd];
        arguments[argsIndex][rnd] = tmp;
      }
    }
  },

  /**
   * @param {String} start 
   * @param {String} end 
   * @returns {String} 
   */
  
  timeDiff(start, end) {
    function hmsToSeconds(s) {
      var b = s.split(':');
      return b[0] * 3600 + b[1] * 60 + (+b[2] || 0);
    }
    
    function secondsToHMS(secs) {
      function z(n) { return (n < 10 ? '0' : '') + n; }
      var sign = secs < 0 ? '-' : '';
      secs = Math.abs(secs);
      return sign + z(secs / 3600 | 0) + ':' + z((secs % 3600) / 60 | 0) + ':' + z(secs % 60);
    }
    
    var startTime = hmsToSeconds(start);
    var endTime = hmsToSeconds(end);
    
    var diff = secondsToHMS(endTime - startTime);
    
    var r = Number(diff.split(':')[0]) * 60 * 60 * 1000 + Number(diff.split(':')[1]) * 60 * 1000;
    
    var diffHrs = Math.floor((r % 86400000) / 3600000);
    var diffMins = Math.round(((r % 86400000) % 3600000) / 60000);
    
    let durasi;
    if(diffHrs){
      durasi = `${diffHrs} jam ${diffMins} menit`
    } else {
      durasi = `${diffMins} menit`
    }
    return durasi;
  },

  /**
   * @param {String} filename
   * @param {String} filetype available filetype: 'xlsx', 'pdf', 'img-banner', 'img-matkul', 
   * 'img-soal', 'img-thumbnail', defaults to '/public'
   * @returns {String} returns combined filename and path.
  */
  pathAll(filename, filetype) {
    let combined;
    switch(filetype){
      case 'xlsx':
        combined = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + filename);
      break;
      case 'pdf':
        combined = path.join(__dirname,'../../public/pdftemplate/' + filename);
      break;
      case 'img-soal': 
        combined = path.join(__dirname,'../../public/fileuploads/picInput/gambar_soal/' + filename);
      break;
      case 'img-banner':
        combined = path.join(__dirname,'../../public/default-images/banner/' + filename);
      break;
      case 'img-matkul':
        combined = path.join(__dirname,'../../public/default-images/thumbnail/' + filename);
      break;
      case 'img-thumbnail':
        combined = path.join(__dirname,'../../public/default-images/thumbnail/' + filename);
      break;
      default:
        combined = path.join(__dirname,'../../public/' + filename);
    }
    return combined;
  },

  async hashed() {
    return new Promise((resolve, reject) => {
      bcrypt.hash(config.auth.defaultPass, 10, (err, hash) => {
        if (err) {
          reject(err);
        } else {
          resolve(hash);
        }
      })
    })
  },// hash default password, ada di .env

  async randomPic() {
    const count = await Ref_illustrasi.count();
    const random = Math.floor(Math.random() * count)+1;
    const getIllustrasi = await Ref_illustrasi.findOne({
      where: { id_illuatrasi : random },
      raw: true
    });
    return getIllustrasi.nama_illustrasi;
  }

}