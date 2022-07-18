"use strict";
const models = require('../models');
const config = require('../config/dbconfig');
const path = require('path');
const ExcelJS = require('exceljs');
const sharp = require('sharp');
const CacheControl = require('../controllers/CacheControl');
const pdf = require('html-pdf');
const fs = require('fs');
const createError = require('../errorHandlers/ApiErrors');
const helpers = require('../helpers/global');
const searchsValid = require('../validator/SearchValidator');
const utility = require('util');
const unlinkAsync = utility.promisify(fs.unlink);
const { Op, fn } = require('sequelize');

const dosen = (model, noreg) => {
  return model.findOne({
    attributes:['id_dosen'],
    where:{[Op.or]:[
      {NIDN: noreg},
      {NIDK: noreg}
    ]},
    raw: true
  })
}

const getStatus = async () => {
  const users = await models.User.count();
  const userAdmin = await models.User.count({
    where: {id_role: '1'}
  });
  const userDosen = await models.User.count({
    where: {id_role: '2'}
  });
  const userMahasiswa = await models.User.count({
    where: {id_role: '3'}
  });
  const matakuliah = await models.Matakuliah.count();
  const kelas = await models.Kelas.count();
  const ujian = await models.Ujian.count();
  const online = await models.Token_history.count({
    where: {isValid: true},
    group: 'id_user'
  });
  return [{
    total_users: users,
    total_online_users: online.length,
    jumlah_admin: userAdmin,
    jumlah_dosen: userDosen,
    jumlah_mhs: userMahasiswa,
    total_matakuliah: matakuliah,
    total_kelas: kelas,
    total_ujian: ujian   
  }]
}

module.exports = {

  async getDashboard(req, res, next) {
    try {      
      const status = await getStatus()
      CacheControl.getDashboardAdmin(req);
      res.status(200).json({
        statusApp: status
      })
    } catch (error) {
      next(error);
    }
  },

  async printStatusPdf(req, res, next) {
    try {
      const arrObj = await getStatus();
      const options = {format: 'A4'};
      const tanggal = helpers.dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(helpers.pathAll('status.hbs', 'pdf'), {
        kop_surat: img,
        data: arrObj,
        tanggal: tanggal
      }, function (err, HTML) {
        if(err) return createError.internal('Error while reading Handlebars: '+ err);
        pdf.create(HTML, options).toBuffer(function (err, buffer) {
          if (err) {
            return createError.BadRequest('Error while generating PDF: '+ err);
          }
          const output = ((val) => {
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-status_app.pdf"`
            })
            const download = Buffer.from(val);
            res.end(download);
          });
          output(buffer);
        })
      });
    } catch (error) {
      next(error)
    }
  },

  async printStatusXcel(req, res, next) {
    try {
      const arrObj = await getStatus();
      const newWB = new ExcelJS.Workbook();
      const newWS = newWB.addWorksheet('Status_app');
      var reColumns = [
        {header:'Total User', key:'total_users', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Admin', key:'jumlah_admin', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Dosen', key:'jumlah_dosen', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Mahasiswa', key:'jumlah_mhs', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Ujian', key:'total_ujian', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah User Online', key:'total_online_users', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Matakuliah', key:'total_matakuliah', style:{font:{name: 'Times New Roman'}}},
        {header:'Jumlah Kelas', key:'total_kelas', style:{font:{name: 'Times New Roman'}}}
      ];
      newWS.columns = reColumns;
      newWS.addRows(arrObj);
      newWS.mergeCells('A3:H3');
      newWS.getCell('A3').value = 'tertanggal, ' + helpers.dateFull();
      newWS.getCell('A3').alignment = { horizontal:'center'} ;      
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${helpers.todaysdate()}-status_app.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error)
    }
  },

  async putProfil(req, res, next) {
    try {
      const id_user = req.user.id;
      const { username, email, status_civitas, keterangan } = req.body;
      if (!email) {
        throw createError.BadRequest('email tolong diisi!');
      } else {
        let updateVal = {
          username: username,
          email: email,
          status_civitas: status_civitas,
          keterangan: keterangan,
          updated_at: fn('NOW')
        };
        await models.User.update(updateVal, {
          where: { id: id_user }
        });
        const data = await models.User.findOne({
          attributes: {exclude: ['password']},
          where: { id: id_user }
        })
        CacheControl.putUser();
        res.status(200).json({
          success: true,
          msg: 'data anda berhasil diubah',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },
  /* User operation methods */
  async getorsearchUser(req, res, next) {
    try {
      let { find, page, limit } = req.query;     
      let user = [], temp = [];
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {        
        attributes: ['id', 'username', 'email', 'status_civitas', 'id_role'],
        offset: (pages - 1) * limits,
        limit: limits,
        include: {
          model: models.Ref_role, as: 'Role', attributes: ['role']
        },
        order: [['id', 'ASC']]
      }
      if(find){
        const validator = searchsValid.userValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = { [Op.or]: validator }
      }
      user = await helpers.paginator(models.User, pages, limits, opt);
      if (user.results.length === 0) {temp.push('No record...')}
      for (let i of user.results){          
        temp.push({
          id: i.id,
          username: i.username,
          email: i.email,
          status_civitas: i.status_civitas,
          role: i.Role.role
        })
      }
      CacheControl.getAllUser(req);
      res.status(200).json({
        next: user.next,
        previous: user.previous,
        user: temp
      })
    } catch (error) {
      next(error)
    }
  },

  async putUser(req, res, next) {
    try {
      const { id_user } = req.params;
      const { username, email, status_civitas, keterangan } = req.body;
      if (!email) {
        throw createError.BadRequest('email tolong diisi!');
      } else {
        let updateVal = {
          username: username,
          email: email,
          status_civitas: status_civitas,
          keterangan: keterangan,
          updated_at: fn('NOW')
        };
        await models.User.update(updateVal, {
          where: { id: id_user }
        });
        const data = await models.User.findOne({
          attributes: {exclude: ['password']},
          where: { id: id_user }
        })
        CacheControl.putUser();
        res.status(200).json({
          success: true,
          msg: `data user ${id_user} berhasil diubah`,
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putUserbulk(req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Updater.xlsx'){
        throw createError.BadRequest('File bukan file updater.');
      }
      let updateVal = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('User_updater');
      ws.eachRow(function (row, rowNumber) {
        if(rowNumber > 1){
          updateVal.push({
            id: row.values[1],
            username: row.values[2],
            email: row.values[3],
            status_civitas: row.values[4],
            keterangan: row.values[5],
            updated_at: fn('NOW')
          })
        }
      });
      await models.User.bulkCreate(updateVal, {
        updateOnDuplicate: [
          'id', 'username','email','status_civitas',
          'keterangan', 'updated_at'
        ]
      });
      CacheControl.putUser();
      res.status(200).json({
        success: true,
        msg: 'data user berhasil diubah sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/users`
        }
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async deleteUser(req, res, next) {
    try {
        const { id_user } = req.params;
        const getuser = await models.User.findOne({ 
          where: { id: id_user  }
        });
        const currentAdm = req.user.id;
        if (!getuser) { throw createError.NotFound('data user tidak ditemukan.')}
        if (id_user === currentAdm) {
          throw createError.BadRequest('tidak bisa menghapus diri sendiri.')
        }
        await models.User.destroy({
          where: {
            id: getuser.id
          }
        });
        CacheControl.deleteUser();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus',
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/users`
          }
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteUserBulk(req, res, next) {
    try {
        const { id_user } = req.body;
        const currentAdm = req.user.id;
        if (id_user.find(v => v === currentAdm)) {
          throw createError.BadRequest(`id ${currentAdm} adalah id anda, tidak bisa menghapus diri sendiri.`)
        }
        await models.User.destroy({
          where: {
            id: { [Op.in]: id_user }
          }
        });
        CacheControl.deleteUser();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_user.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/users`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Dosen operation methods*/
  async setDosen (req, res, next) {
    try {
        const { NIP, NIDN, NIDK, email, nama_lengkap, nomor_telp} = req.body;
        const user = await models.User.create({
          username: await helpers.getUsername(),
          email: email,
          status_civitas: 'aktif',
          password: await helpers.hashed(),
          id_role: '2',
          foto_profil: config.auth.defaultProfilePic,
          keterangan: null,
          created_at: fn('NOW'),
          Dosen: {
              NIP: NIP,
              NIDN: NIDN,
              NIDK: NIDK,
              nama_lengkap: nama_lengkap,
              nomor_telp: nomor_telp,
              created_at: fn('NOW')
            }
          }, {
            include: {model: models.Dosen, as: 'Dosen'}
        });
      CacheControl.postNewUser();
      res.status(201).json({
        success: true,
        msg: 'dosen berhasil ditambahkan',
        data: user
      });
    } catch (error) {
      next(error);
    }
  },

  async getallDosen(req, res, next) {
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
        let val = await helpers.paginator(models.Dosen, pages, limits);
        let vals = [];
        if(val.results.length !== 0){
          for(let i of val.results) {         
            vals.push({
              id_user: i.id_user,
              id_dosen: i.id_dosen,
              NIDN: i.NIDN,
              NIDK: i.NIDK,
              nama_lengkap: i.nama_lengkap
            })    
          }
        } else {
          vals.push('No record...')
        }       
        const dosen = await Promise.all(vals);
        CacheControl.getAllDosen(req);
        res.status(200).json({
            next:val.next,
            previous:val.previous,
            dosen: dosen
        })
    } catch (error) {
      next(error);
    }
  },

  async getorsearchDosen(req, res, next) {
    try {
      let { find, page, limit } = req.query;      
      let dosen = [];
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {        
        attributes: ['id_dosen', 'NIDN', 'NIDK', 'nama_lengkap'],
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_dosen', 'ASC']]
      }
      if(find) {
        const validator = searchsValid.dosenValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = { [Op.or]: validator };
      }
      dosen = await helpers.paginator(models.Dosen, pages, limits, opt);
      if (dosen.results.length === 0) {dosen.results.push('No record...')}
      CacheControl.getAllDosen(req);
      res.status(200).json({
        next: dosen.next,
        previous: dosen.previous,
        dosen: dosen.results
      })
    } catch (error) {
      next(error)
    }
  },

  async setDosenbulk (req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Adder.xlsx'){
        throw createError.BadRequest('File bukan file adder.');
      }
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('User_dosen');
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          const dataDosenExist = await models.Dosen.findOne({ where: { 
              [Op.or]: [
                {NIP: row[1]}, {NIDN: row[2]}, {NIDK: row[3]},
                {'$User.email$': row[5]}
              ] 
            },
            include: {model: models.User, as: 'User'}
          });
          if(dataDosenExist){
            let err;
            if(dataDosenExist.NIP === row[1]) err = `NIP ${row[1]}`
            if(dataDosenExist.NIDN === row[2]) err = `NIDN ${row[2]}`
            if(dataDosenExist.NIDK === row[3]) err = `NIDK ${row[3]}`
            if(dataDosenExist.User.email === row[5]) err = `Email ${row[5]}`
            throw createError.Conflict(`Data dosen dengan ${err} sudah terdaftar.`);
          }
          await models.User.create({
            username: await helpers.getUsername(),
            email: row[5],
            status_civitas: 'aktif',
            password: await helpers.hashed(),
            id_role: '2',
            foto_profil: config.auth.defaultProfilePic,
            created_at: fn('NOW'),
            Dosen: {
                NIP: row[1],
                NIDN: row[2],
                NIDK: row[3],
                nama_lengkap: row[4],
                nomor_telp: row[6],
                created_at: fn('NOW')
              }
          }, {
            include: { model: models.Dosen, as: 'Dosen'}
          })
        }
      }
      CacheControl.postNewUser();
      res.status(201).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/dosen`
        }
      })
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async putDosen(req, res, next) {
    try {      
      const { id_dosen } = req.params;
      const { NIP, NIDN, NIDK, nama_lengkap, alamat, nomor_telp } = req.body;
      if (!NIDK) {
        throw createError.BadRequest('NIDK tolong diisi!');
      } else {
        let updateVal = {
            NIP: NIP,
            NIDN: NIDN,
            NIDK: NIDK,
            nama_lengkap: nama_lengkap,
            alamat: alamat,
            nomor_telp: nomor_telp,
            updated_at: fn('NOW')
        };
        await models.Dosen.update(updateVal, {
          where: { id_dosen: id_dosen }
        });
        const data = await models.Dosen.findOne({
          where: { id_dosen: id_dosen }
        })
        CacheControl.putDosen();
        res.status(200).json({
          success: true,
          msg: 'data dosen berhasil diubah',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putDosenbulk(req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Updater.xlsx'){
        throw createError.BadRequest('File bukan file updater.');
      }
      let updateVal = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Dosen_updater');
      ws.eachRow(function(row, rowNumber) {
        if(rowNumber > 1){
          updateVal.push({
            id_dosen: row.values[1],
            NIP: row.values[2],
            NIDN: row.values[3],
            NIDK: row.values[4],
            nama_lengkap: row.values[5],
            alamat: row.values[6],
            nomor_telp: row.values[7],
            updated_at: fn('NOW')
          })
        }
      });
      await models.Dosen.bulkCreate(updateVal, {
        updateOnDuplicate: [
          'id_dosen','NIP','NIDN','NIDK','nama_lengkap',
          'alamat','nomor_telp', 'updated_at'
        ]
      });
      CacheControl.putDosen();
      res.status(200).json({
        success: true,
        msg: 'data dosen berhasil diubah sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/dosen`
        }
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async deleteDosen(req, res, next) {
    try {
        if(req.url == '/dosen/bulk') return next();
        const { id_dosen } = req.params;
        const getdosen = await models.Dosen.findOne({
          attributes:['id_dosen'],
          where: {id_dosen: id_dosen}
        });
        if (!getdosen) { throw createError.NotFound('data dosen tidak ditemukan.')}
        await models.Dosen.destroy({
          where: {
            id_dosen: getdosen.id_dosen
          }
        });
        CacheControl.deleteDosen();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus',
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/dosen`
          }
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteDosenBulk(req, res, next) {
    try {
        const { id_dosen } = req.body;
        await models.Dosen.destroy({
          where: {
            id_dosen: { [Op.in]: id_dosen }
          }
        });
        CacheControl.deleteDosen();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_dosen.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/dosen`
          }
        });
    } catch (error) {
      next(error);
    }
  },
  /* Mahasiswa opearation methods*/
  async setMhs (req, res, next) {
    try {
        const { NIM, email, nama_lengkap, nomor_telp} = req.body;
        const user = await models.User.create({
          username: await helpers.getUsername(),
          email: email,
          status_civitas: 'aktif',
          password: await helpers.hashed(),
          id_role: '3',
          foto_profil: config.auth.defaultProfilePic,
          keterangan: null,
          created_at: fn('NOW'),
          Mahasiswa: {
              NIM: NIM,
              nama_lengkap: nama_lengkap,
              nomor_telp: nomor_telp,
              created_at: fn('NOW')
            }
          }, {
            include: {model: models.Mahasiswa, as: 'Mahasiswa'}
        });
      CacheControl.postNewUser();
      res.status(201).json({
        success: true,
        msg: 'mahasiswa berhasil ditambahkan',
        data: user
      });
    } catch (error) {
      next(error);
    }
  },

  async getorsearchMhs(req, res, next) {
    try {
      let { find, page, limit } = req.query;      
      let mhs = [];
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {        
        attributes: ['id_mhs', 'NIM', 'nama_lengkap'],
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_mhs', 'ASC']]
      }
      if(find) {
        const validator = searchsValid.mhsValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = { [Op.or]: validator };
      }
      mhs = await helpers.paginator(models.Mahasiswa, pages, limits, opt);
      if (mhs.results.length === 0) {mhs.results.push('No record...')}
      CacheControl.getAllMhs(req);
      res.status(200).json({
        next: mhs.next,
        previous: mhs.previous,
        mhs: mhs.results
      })
    } catch (error) {
      next(error)
    }
  },

  async setMhsbulk (req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Adder.xlsx'){
        throw createError.BadRequest('File bukan file adder.');
      }
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('User_mahasiswa');
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          const dataMahasiswaExist = await models.Mahasiswa.findOne({ where: { 
              [Op.or]: [
                {NIM: row[1]}, {'$User.email$': row[3]}
              ] 
            },
            include: {model: models.User, as: 'User'}
          });
          if(dataMahasiswaExist){
            let err;
            if(dataMahasiswaExist.NIM === row[1]) err = `NIM ${row[1]}`
            if(dataMahasiswaExist.User.email === row[5]) err = `Email ${row[5]}`
            throw createError.Conflict(`Data mahasiswa dengan ${err} sudah terdaftar.`);
          }
          await models.User.create({
            username: await helpers.getUsername(),
            email: row[3],
            status_civitas: 'aktif',
            password: await helpers.hashed(),
            id_role: '3',
            foto_profil: config.auth.defaultProfilePic,
            created_at: fn('NOW'),
            Mahasiswa: {
                NIM: row[1],
                nama_lengkap: row[2],
                nomor_telp: row[4],
                created_at: fn('NOW')
              }
          }, {
            include: {model: models.Mahasiswa, as: 'Mahasiswa'}
          });
        }
      }
      CacheControl.postNewUser();
      res.status(201).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/mahasiswa`
        }
      })
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async putMhs(req, res, next) {
    try {      
      const { id_mhs } = req.params;
      const { NIM, nama_lengkap, alamat, nomor_telp } = req.body;
      if (!NIM) {
        throw createError.BadRequest('NIM tolong diisi!');
      } else {
        let updateVal = {
            NIM: NIM,
            nama_lengkap: nama_lengkap,
            alamat: alamat,
            nomor_telp: nomor_telp,
            updated_at: fn('NOW')
        };
        await models.Mahasiswa.update(updateVal, {
          where: { id_mhs: id_mhs }
        });
        const data = await models.Mahasiswa.findOne({
          where: { id_mhs: id_mhs }
        })
        CacheControl.putMhs();
        res.status(200).json({
          success: true,
          msg: 'data mahasiswa berhasil diubah',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putMhsbulk(req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Updater.xlsx'){
        throw createError.BadRequest('File bukan file updater.');
      }
      let updateVal = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Mahasiswa_updater');
      ws.eachRow(function(row, rowNumber) {
        if(rowNumber > 1){
          updateVal.push({
            id_mhs: row.values[1],
            NIM: row.values[2],
            nama_lengkap: row.values[3],
            alamat: row.values[4],
            nomor_telp: row.values[5],
            updated_at: fn('NOW')
          })
        }
      });
      await models.Mahasiswa.bulkCreate(updateVal, {
        updateOnDuplicate: [
          'id_mhs','NIM','nama_lengkap','alamat',
          'nomor_telp', 'updated_at'
        ]
      });
      CacheControl.putMhs();
      res.status(200).json({
        success: true,
        msg: 'data mahasiswa berhasil diubah sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/mahasiswa`
        }
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }      
      next(error);
    }
  },

  async deleteMhs(req, res, next) {
    try {
      if(req.url == '/mahasiswa/bulk') return next();
        const { id_mhs } = req.params;
        const getMhs = await models.Mahasiswa.findOne({
          attributes:['id_mhs'],
          where: {id_mhs: id_mhs}
        });
        if (!getMhs) { throw createError.NotFound('data mahasiswa tidak ditemukan.')}
        await models.Mahasiswa.destroy({
          where:{
            id_mhs: getMhs.id_mhs
          }
        });
        CacheControl.deleteMhs();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteMhsBulk(req, res, next) {
    try {
        const { id_mhs } = req.body; 
        await models.Mahasiswa.destroy({
          where: {
            id_mhs: { [Op.in]: id_mhs }
          }
        });
        CacheControl.deleteMhs();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_mhs.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/mahasiswa`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Matakuliah operation methods*/  
  async getorsearchMatkul(req, res, next) {
    try {
      let { find, page, limit } = req.query;      
      let matkul = [], temp = [];
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {        
        attributes: ['id_matkul','kode_matkul', 'nama_matkul', 'sks'],        
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_matkul', 'ASC']]
      }
      if(find){
        const validator = searchsValid.matkulValidator(find);
        if (validator instanceof createError) throw validator;
        opt.where = { [Op.or]: validator }
      }
      matkul = await helpers.paginator(models.Matakuliah, pages, limits, opt);
      if (matkul.results.length === 0) {temp.push('No record...')}
      for (let i of matkul.results){          
        temp.push({
          id_matkul: i.id_matkul,
          kode_matkul: i.kode_matkul,
          nama_matkul: i.nama_matkul,
          sks: i.sks
        })
      }
      CacheControl.getAllMatkul(req);
      res.status(200).json({
        next: matkul.next,
        previous: matkul.previous,
        matkul: temp
      })
    } catch (error) {
      next(error)
    }
  },

  async getMatkul(req, res, next) {
    try {
      const { id_matkul } = req.params;
      const val = await models.Matakuliah.findOne({
        where: {id_matkul: id_matkul},
        include: [
          {model: models.Ref_kel_matkul, as: 'KelMk', attributes: ['id_kel_mk','kelompok_matakuliah']},
          {model: models.Ref_peminatan, as: 'RefPemin', attributes: ['id_peminatan','peminatan']}
        ]
      });
      if (!val) { throw createError.NotFound('data matakuliah tidak ditemukan.')}
      const matkul = {
        id_matkul: val.id_matkul,
        illustrasi_matkul: val.illustrasi_matkul,
        kode_matkul: val.kode_matkul,
        kelompok_matakuliah: val.KelMk.kelompok_matakuliah,
        Peminatan: val.RefPemin.peminatan,
        nama_matkul: val.nama_matkul,
        sks: val.sks,
        desktripsi: val.desktripsi,
        created_at: val.created_at,
        updated_at: val.updated_at
      }
      CacheControl.getMatkul(req);
      res.status(200).json(matkul);
    } catch (error) {
      next(error);
    }
  },

  async setMatkul(req, res, next){
    try {
      const { kode_matkul, id_kel_mk, id_peminatan, nama_matkul, sks, deskripsi } = req.body;
      const illustrasi_matkul = req.file?.filename || config.auth.defaultGlobalPic;
      const matkul = await models.Matakuliah.findOne({
        where: {kode_matkul: kode_matkul}, 
        attributes: ['id_matkul']
      });
      if(matkul) throw createError.Conflict('kode matkul sudah terdaftar!');
      const data = await models.Matakuliah.create({
        illustrasi_matkul: illustrasi_matkul,
        kode_matkul: kode_matkul,
        id_kel_mk: id_kel_mk,
        id_peminatan: id_peminatan,
        nama_matkul: nama_matkul,
        sks: sks,
        deskripsi: deskripsi
      });
      CacheControl.postNewMatkul();
      res.status(201).json({
        success: true,
        msg: 'matakuliah berhasil ditambahkan',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async setMatkulbulk(req, res, next) {
    let picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Adder.xlsx'){
        throw createError.BadRequest('File bukan file Adder.');
      }
      let data = [], imgArray = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Matakuliah');
      if(ws.getImages().length) {
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const name = helpers.randomName(7);
          const picPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-matkul');
          const thumbPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-thumbnail');
          const scaleBy2 = await sharp(img.buffer).metadata()
          .then(({ width, height }) => sharp(img.buffer)
            .resize(Math.round(width * 2), Math.round(height * 2))
            .sharpen()
            .toFile(picPath)
          );
          if(scaleBy2 instanceof Error) {
            console.error(scaleBy2);
            throw createError.internal(`upload gambar row: ${row}, col: ${col} gagal`);
          }
          fs.appendFileSync(thumbPath, img.buffer);
          imgArray.push(`${row}.${col}.${name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }      
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          let img = imgArray[rowNum-2];
          if(!img) img = config.auth.defaultGlobalPic;
          let val = {
            getMatkul: await models.Matakuliah.findOne({ where: {kode_matkul: row[2]} }),
            getKelmk: await models.Ref_kel_matkul.findOne({
              attributes: ['id_kel_mk','kelompok_matakuliah'],
              where: {kelompok_matakuliah: row[3]}
            }),
            getPemin: await models.Ref_peminatan.findOne({
              attributes: ['id_peminatan','peminatan'],
              where: {peminatan: row[4] ?? null}
            }),
          }
          if(val.getMatkul) throw createError.Conflict(`matakuliah berkode ${row[2]} sudah terdaftar.`)
          if(!val.getKelmk) throw createError.NotFound(`kelompok matakuliah untuk data ${row[3]} tidak ditemukan.`)
          if(!val.getPemin) throw createError.NotFound(`peminatan untuk data ${row[4]} tidak ditemukan.`)
          data.push({
            illustrasi_matkul: img,
            kode_matkul: row[2],
            id_kel_mk: val.getKelmk.id_kel_mk,
            id_peminatan: val.getPemin.id_peminatan,
            nama_matkul: row[5],
            sks: row[6],
            deskripsi: row[7] ?? null
          })
        }
      }     
      await models.Matakuliah.bulkCreate(data);
      CacheControl.postNewMatkul();
      res.status(201).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/matakuliah`
        }
      })
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      if(picPatharr.length){
        for(let i of picPatharr){
          await unlinkAsync(i);
        }
      }
      next(error);
    }
  },

  async putMatkul(req, res, next) {
    try {
      const { id_matkul } = req.params;
      const { kode_matkul, id_kel_mk, id_peminatan, nama_matkul, sks, deskripsi } = req.body;
      const mk = await models.Matakuliah.findByPk(id_matkul);
      const illustrasi_matkul = req.file.filename || mk.illustrasi_matkul;     
      if (!mk){throw createError.NotFound('data matakuliah tidak ditemukan.')}
      let updateVal = {
          illustrasi_matkul: illustrasi_matkul,
          kode_matkul: kode_matkul,
          id_kel_mk: id_kel_mk,
          id_peminatan: id_peminatan,
          nama_matkul: nama_matkul,
          sks: sks,
          deskripsi: deskripsi
      };
      await models.Matakuliah.update(updateVal, {
        where: { id_matkul: id_matkul }
      });
      const data = await models.Matakuliah.findOne({
        where: { id_matkul: id_matkul }
      })
      CacheControl.putMatkul();
      res.status(200).json({
        success: true,
        msg: 'data matakuliah berhasil diubah',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async putMatkulbulk(req, res, next) {
    let picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Updater.xlsx'){
        throw createError.BadRequest('File bukan file updater.');
      }
      let updateVal = [], imgArray = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Matakuliah_updater');
      if(ws.getImages().length) {
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const name = helpers.randomName(7);
          const picPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-matkul');
          const thumbPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-thumbnail');
          const scaleBy2 = await sharp(img.buffer).metadata()
          .then(({ width, height }) => sharp(img.buffer)
            .resize(Math.round(width * 2), Math.round(height * 2))
            .sharpen()
            .toFile(picPath)
          );
          if(scaleBy2 instanceof Error) {
            console.error(scaleBy2);
            throw createError.internal(`upload gambar row: ${row}, col: ${col} gagal`);
          }
          fs.appendFileSync(thumbPath, img.buffer);
          imgArray.push(`${row}.${col}.${name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          let img = imgArray[rowNum-2];
          let val = {
            getKelmk: await models.Ref_kel_matkul.findOne({
              attributes: ['id_kel_mk','kelompok_matakuliah'],
              where: {kelompok_matakuliah: row[4]}
            }),
            getPemin: await models.Ref_peminatan.findOne({
              attributes: ['id_peminatan','peminatan'],
              where: {peminatan: row[5] ?? null}
            }),
          }
          if(!val.getKelmk) throw createError.NotFound(`kelompok matakuliah untuk data ${row[4]} tidak ditemukan.`)
          if(!val.getPemin) throw createError.NotFound(`peminatan untuk data ${row[5]} tidak ditemukan.`)
          const data = {
            id_matkul: row[1],
            illustrasi_matkul: img,
            kode_matkul: row[3],
            id_kel_mk: val.getKelmk.id_kel_mk,
            id_peminatan: val.getPemin.id_peminatan,
            nama_matkul: row[6],
            sks: row[7],
            deskripsi: row[8] ?? null,
            updated_at: fn('NOW')
          }
          if(!img) delete data.illustrasi_matkul;
          updateVal.push(data)
        }
      }
      await models.Matakuliah.bulkCreate(updateVal, {
        updateOnDuplicate: [ 'id_matkul', 'illustrasi_matkul', 'kode_matkul', 'id_kel_mk',
          'id_peminatan','nama_matkul', 'sks','deskripsi','updated_at' ]
      });
      CacheControl.putMatkul();
      res.status(200).json({
        success: true,
        msg: 'data matakuliah berhasil diubah sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/matakuliah`
        }
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      if(picPatharr.length){
        for(let i of picPatharr){
          await unlinkAsync(i);
        }
      }
      next(error);
    }
  },

  async deleteMatkul(req, res, next) {
    try {
      if(req.url == '/matakuliah/bulk') return next();
        const { id_matkul } = req.params;
        const getMatkul = await models.Matakuliah.findOne({
          attributes: ['id_matkul'],
          where: {id_matkul: id_matkul}
        });
        if (!getMatkul) { throw createError.NotFound('data matakuliah tidak ditemukan.')}
        await models.Matakuliah.destroy({
          where:{
            id_matkul: getMatkul.id_matkul
          }
        });
        CacheControl.deleteMatkul();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteMatkulBulk(req, res, next) {
    try {
        const { id_matkul } = req.body; 
        await models.Matakuliah.destroy({
          where: {
            id_matkul: { [Op.in]: id_matkul }
          }
        });
        CacheControl.deleteMatkul();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_matkul.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/matakuliah`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Kelas operation methods*/
  async kelasGetMhs(req, res, next){
    try {
      const idKelas = req.params.id_kelas;
      const kelas = await models.Kelas.findOne({
        attributes: ['id_kelas'],
        where: {id_kelas: idKelas},
        include: {model: models.Mahasiswa, as: 'Mahasiswas', through: {attributes:[]}}
      });
      const kelasMhs = kelas.Mahasiswas.map((i) => {        
        return {
          id_mhs: i.id_mhs,
          NIM: i.NIM,
          nama_lengkap: i.nama_lengkap,
          nomor_telp: i.nomor_telp       
        }
      });
      CacheControl.getMhsKelas(req);
      res.status(200).json({
        mahasiswa: kelasMhs
      });
    } catch (error) {
      next(error);
    }
  },

  async kelasSetMhs(req, res, next){
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Adder.xlsx'){
        throw createError.BadRequest('File bukan file adder.');
      }
      let data = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');      
      const kelas = await models.Kelas.findByPk(req.params.id_kelas);
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas_mahasiswa');
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          const row = ws.getRow(rowNum).values;
          const mhs = await models.Mahasiswa.findOne({ where: {NIM: row[1]}, attributes: ['id_mhs'] })
          if(!mhs) throw createError.NotFound(`Mahasiswa dengan NIM ${row[1]} tidak ditemukan.`)
          data.push(mhs.id_mhs)
        }
      }
      kelas.addMahasiswas(data);
      CacheControl.postNewMhsKelas();
      res.status(200).json({
        success: true,
        msg: `relasi mahasiswa-kelas berhasil di tambah sesuai ${req.file.originalname}`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas/${req.params.id_kelas}/mahasiswa`
        }
      })
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async kelasUpdateMhs(req, res, next){
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Updater.xlsx'){
        throw createError.BadRequest('File bukan file updater.');
      }
      let updateVal = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');   
      const kelas = await models.Kelas.findByPk(req.params.id_kelas);
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas_mahasiswa');
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          const row = ws.getRow(rowNum).values;
          const mhs = await models.Mahasiswa.findOne({ where: {NIM: row[1]}, attributes: ['id_mhs'] })
          if(!mhs) throw createError.NotFound(`Mahasiswa dengan NIM ${row[1]} tidak ditemukan.`)
          updateVal.push(mhs.id_mhs)
        }
      }
      kelas.setMahasiswas(updateVal);
      CacheControl.putMhsKelas();
      res.status(200).json({
        success: true,
        msg: `relasi mahasiswa-kelas berhasil di ubah sesuai ${req.file.originalname}`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas/${req.params.id_kelas}/mahasiswa`
        }
      })
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async kelasRemoveMhs(req, res, next){
    try {
      const id_mhs = req.body.id_mhs;
      const kelas = await models.Kelas.findByPk(req.params.id_kelas);      
      kelas.removeMahasiswas(id_mhs);
      CacheControl.deleteMhsKelas();
      res.status(200).json({
        success: true,
        msg: `relasi mahasiswa ${id_mhs}, dengan kelas ini berhasil dihapus`
      })
    } catch (error) {
      next(error);
    }
  },

  async kelasGetDosen(req, res, next){
    try {
      const idKelas = req.params.id_kelas;
      const kelas = await models.Kelas.findOne({
        attributes: ['id_kelas'],
        where: {id_kelas: idKelas},
        include: {model: models.Dosen, as: 'Dosens', through: {attributes:[]}}
      });
      const kelasDosens = kelas.Dosens.map((i) => {        
        return {
          id_dosen: i.id_dosen,
          NIP: i.NIP,
          NIDN: i.NIDN,
          NIDK: i.NIDK,
          nama_lengkap: i.nama_lengkap,
          nomor_telp: i.nomor_telp
        }
      });
      CacheControl.getDosenKelas(req);
      res.status(200).json({
        dosen_pengampu: kelasDosens
      });
    } catch (error) {
      next(error);
    }
  },

  async kelasSetDosen(req, res, next) {
    try {
      const { id_kelas } = req.params
      const { pengampu } = req.body
      let val = [], nidk = [];
      const kls = await models.Kelas.findByPk(id_kelas)
      if(!pengampu.id_dosen1){
        throw createError.BadRequest('dosen 1 tidak boleh kosong!')
      } else {
        val[0] = await models.Dosen.findByPk(pengampu.id_dosen1);
        !pengampu.id_dosen2 ? val[1] = null : val[1] = await models.Dosen.findByPk(pengampu.id_dosen2);
        !pengampu.id_dosen3 ? val[2] = null : val[2] = await models.Dosen.findByPk(pengampu.id_dosen3);
        for(let i of val){
          if(i !== null){
            nidk.push(i.NIDK)
            kls.addDosen(i)
          }
        }
        CacheControl.postNewDosenKelas();
        res.status(200).json({
          success: true,
          msg: `dosen pengampu ${nidk}, berhasil ditambahkan ke kode seksi ${kls.kode_seksi}`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas/${id_kelas}/dosen`
          }
        })
      }
    } catch (error) {
      next(error)
    }
  },

  async kelasUpdateDosen(req, res, next) {
    try {
      const { id_kelas } = req.params
      const { pengampu } = req.body
      let val = [], nidk = [], temp= [];
      const kls = await models.Kelas.findByPk(id_kelas)      
      if(!pengampu.id_dosen1){
        throw createError.BadRequest('dosen 1 tidak boleh kosong!')
      } else {
        val[0] = await models.Dosen.findByPk(pengampu.id_dosen1);
        !pengampu.id_dosen2 ? val[1] = null : val[1] = await models.Dosen.findByPk(pengampu.id_dosen2);
        !pengampu.id_dosen3 ? val[2] = null : val[2] = await models.Dosen.findByPk(pengampu.id_dosen3);
        for(let i of val){
          if(i !== null){
            nidk.push(i.NIDK)
            temp.push(i)            
          }
        }
        kls.setDosens(temp);
        CacheControl.putDosenKelas();
        res.status(200).json({
          success: true,
          msg: `dosen pengampu kode seksi ${kls.kode_seksi}, berhasil diubah ke ${nidk}`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas/${id_kelas}/dosen`
          }
        })
      }
    } catch (error) {
      next(error)
    }
  },

  async kelasRemoveDosen(req, res, next) {
    try {
      const kelas = await models.Kelas.findByPk(req.params.id_kelas);
      const idDosens = req.body.id_dosen;
      kelas.removeDosens(idDosens);
      CacheControl.deleteDosenKelas();
      res.status(200).json({
        success: true,
        msg: `dosen pengampu dengan id ${idDosens}, untuk kode seksi ini berhasil dihapus`
      })
    } catch (error) {
      next(error)
    }
  },

  async setKelas(req, res, next){
    try {
      let val = [], nidk = [];
      const { illustrasi_kelas, kode_seksi, id_dosen1, id_dosen2, id_dosen3, id_matkul, 
              id_semester, hari, jam, deskripsi } = req.body;
      const objKelas = await models.Kelas.findOne({
        where: {kode_seksi: kode_seksi}, 
        attributes: ['id_kelas']
      });
      if(objKelas) throw createError.Conflict('kode seksi sudah terdaftar!');
      val[0] = await models.Dosen.findByPk(id_dosen1);
      !id_dosen2 ? val[1] = null : val[1] = await models.Dosen.findByPk(id_dosen2);
      !id_dosen3 ? val[2] = null : val[2] = await models.Dosen.findByPk(id_dosen3);
      const img = illustrasi_kelas || await helpers.randomPic() || config.auth.defaultBannerPic;
      const kelas = await models.Kelas.create({
        illustrasi_kelas: img,
        kode_seksi: kode_seksi,
        id_matkul: id_matkul,
        id_semester: id_semester,
        hari: hari,
        jam: jam,
        deskripsi: deskripsi ?? null
      })
      if(val.length === 0) {throw createError.BadRequest('dosen 1 tidak boleh kosong!')}
      for(let i of val){
        if(i){
          nidk.push({noreg_dosen: i.NIDK})
          kelas.addDosen(i)
        }
      }
      CacheControl.postNewKelas();
      res.status(201).json({
        success: true,
        msg: 'kelas berhasil ditambahkan',
        data: kelas
      });
    } catch (error) {
      next(error);
    }
  },

  async setKelasbulk(req, res, next) {
    let kdSeksi = [], picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Adder.xlsx'){
        throw createError.BadRequest('File bukan file adder.');
      }
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas');
      let imgArray = [];
      if(ws.getImages().length){
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const name = helpers.randomName(7)
          const picPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-banner');
          const thumbPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-thumbnail');
          const scaleBy2 = await sharp(img.buffer).metadata()
          .then(({ width, height }) => sharp(img.buffer)
            .resize(Math.round(width * 2), Math.round(height * 2))
            .sharpen()
            .toFile(picPath)
          );
          if(scaleBy2 instanceof Error) {
            console.error(scaleBy2);
            throw createError.internal(`upload gambar row: ${row}, col: ${col} gagal`);
          }
          fs.appendFileSync(thumbPath, img.buffer);
          imgArray.push(`${row}.${col}.${name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values;
          let img = imgArray[rowNum-2];
          if(!img) img = await helpers.randomPic() || config.auth.defaultBannerPic;
          let getKosek = await models.Kelas.findOne({ where: { kode_seksi: row[2] } });
          let getMk = await models.Matakuliah.findOne({
            attributes: ['id_matkul','nama_matkul'],
            where: {nama_matkul: row[3]}
          });
          let getSemester = await models.Ref_semester.findOne({
            attributes: ['id_semester','semester'],
            where: {semester: row[4] ?? null}
          });
          if(getKosek) throw createError.Conflict(`kelas berkode ${row[2]} sudah terdaftar.`);
          if(!getMk) throw createError.NotFound(`matakuliah untuk data ${row[3]} tidak ditemukan.`)
          if(!getSemester) throw createError.NotFound(`semester untuk data ${row[4]} tidak ditemukan.`)                   
          let kelas = await models.Kelas.create({
            illustrasi_kelas: img,
            kode_seksi: row[2],
            id_matkul: getMk.id_matkul,
            id_semester: getSemester.id_semester,
            hari: row[5],
            jam: row[6],
            deskripsi: row[7] ?? null
          });
          kdSeksi.push(row[2]);
          if(!row[8]) {            
            throw createError.BadRequest(`dosen 1 pada kelas ${row[2]} tidak boleh kosong!`);            
          }
          for(let i = 0; i < 3; i++){
            if(row[8+i]){
              let idDosen = await dosen(models.Dosen, row[8+i]);
              kelas.addDosen(idDosen.id_dosen)
            }
          }
        }
      }
      CacheControl.postNewKelas();
      res.status(201).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}/v1/kelas`
        }
      })             
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
        if(kdSeksi.length > 0) {
          await models.Kelas.destroy({
            where: {kode_seksi: kdSeksi},
            force: true
          });
        }
        if(picPatharr.length){
          for(let i of picPatharr){
            await unlinkAsync(i);
          }
        }
      }
      next(error);
    }
  },

  async putKelas(req, res, next) {
    try {
      if(req.url == '/kelas/bulk') return next();
      const { id_kelas } = req.params;
      const { illustrasi_kelas, kode_seksi, id_dosen1, id_dosen2, id_dosen3, 
              id_matkul, id_semester, hari, jam, deskripsi } = req.body;
      let val = [], temp = [];
      const getKelas = await models.Kelas.findByPk(id_kelas)
      if (!getKelas){
        throw createError.NotFound('data kelas tidak ditemukan.')
      }
      val[0] = await models.Dosen.findByPk(id_dosen1);
      !id_dosen2 ? val[1] = null : val[1] = await models.Dosen.findByPk(id_dosen2);
      !id_dosen3 ? val[2] = null : val[2] = await models.Dosen.findByPk(id_dosen3);
      const img = illustrasi_kelas || await helpers.randomPic() || config.auth.defaultBannerPic;
      let updateVal = {
          illustrasi_kelas: img,
          kode_seksi: kode_seksi,
          id_matkul: id_matkul,
          id_semester: id_semester,
          hari: hari,
          jam: jam,
          deskripsi: deskripsi,
          updated_at: fn('NOW')
      };
      await models.Kelas.update(updateVal, {
        where: { id_kelas: id_kelas }
      });
      for(let i of val){
        if(i) {
          temp.push(i)
        }
      }
      getKelas.setDosens(temp);
      const data = await models.Kelas.findOne({
        where: { id_kelas: id_kelas }
      })
      CacheControl.putKelas();
      res.status(200).json({
        success: true,
        msg: 'data kelas berhasil diubah',
        data: data
      });      
    } catch (error) {
      next(error);
    }
  },

  async putKelasbulk(req, res, next) {
    let picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File tidak boleh kosong, harus berupa excel/.xlsx!');
      }
      if (req.file.originalname !== 'Updater.xlsx'){
        throw createError.BadRequest('File bukan file updater.');
      }
      let updateVal = [], imgArray = [];
      const excelFile = helpers.pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas_updater');
      if(ws.getImages().length){
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const name = helpers.randomName(7)
          const picPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-banner');
          const thumbPath = helpers.pathAll(`${row}.${col}.${name}.${img.extension}`, 'img-thumbnail');
          const scaleBy2 = await sharp(img.buffer).metadata()
          .then(({ width, height }) => sharp(img.buffer)
            .resize(Math.round(width * 2), Math.round(height * 2))
            .sharpen()
            .toFile(picPath)
          );
          if(scaleBy2 instanceof Error) {
            console.error(scaleBy2);
            throw createError.internal(`upload gambar row: ${row}, col: ${col} gagal`);
          }
          fs.appendFileSync(thumbPath, img.buffer);
          imgArray.push(`${row}.${col}.${name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values;
          let img = imgArray[rowNum-2];
          let getMk = await models.Matakuliah.findOne({
            attributes:['id_matkul','nama_matkul'],
            where: {nama_matkul: row[4]}
          });                  
          let getSemester = await models.Ref_semester.findOne({
            attributes:['id_semester','semester'],
            where: {semester: row[5] ?? null}
          });
          if(!getMk) throw createError.NotFound(`matakuliah untuk data ${row[4]} tidak ditemukan.`);
          if(!getSemester) throw createError.NotFound(`semester untuk data ${row[5]} tidak ditemukan.`); 
          const data = {
            id_kelas: row[1],
            illustrasi_kelas: img,
            kode_seksi: row[3],
            id_matkul: getMk.id_matkul,
            id_semester: getSemester.id_semester,
            hari: row[6],
            jam: row[7],
            deskripsi: row[8] ?? null,
            updated_at: fn('NOW')
          }
          if(!img) delete data.illustrasi_kelas;
          updateVal.push(data);
          if(row[9]||row[10]||row[11]) {
            const kelas = await models.Kelas.findOne({where: {id_kelas: row[1]}});
            for(let i = 0; i < 3; i++){
              if(row[9+i]) {
                let idDosen = await dosen(models.Dosen, row[9+i]);
                kelas.setDosens(idDosen.id_dosen);
              } continue;
            }
          }           
        }
      }
      await models.Kelas.bulkCreate(updateVal, {
        updateOnDuplicate: [ 'id_kelas','illustrasi_kelas','kode_seksi','id_matkul','id_semester', 
          'hari','jam','deskripsi','updated_at' ]
      });
      CacheControl.putKelas();  
      res.status(200).json({
        success: true,
        msg: 'data kelas berhasil diubah sesuai: ' + req.file.originalname,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}/v1/kelas`
        }
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
        if(picPatharr.length){
          for(let i of picPatharr){
            await unlinkAsync(i);
          }
        }
      }
      next(error);
    }
  },

  async deleteKelas(req, res, next) {
    try {
      if(req.url == '/kelas/bulk') return next();
      const { id_kelas } = req.params;
      const getKelas = await models.Kelas.findByPk(id_kelas);
      if (!getKelas) { throw createError.NotFound('data kelas tidak ditemukan.')}
      //console.log(Object.keys(getKelas.__proto__))
      await models.Kelas.destroy({
        where:{
          id_kelas: getKelas.id_kelas
        }
      });
      CacheControl.deleteKelas();
      res.status(200).json({
        success: true,
        msg: 'data berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteKelasBulk(req, res, next) {
    try {
        const { id_kelas } = req.body; 
        await models.Kelas.destroy({
          where: {
            id_kelas: { [Op.in]: id_kelas }
          }
        });
        CacheControl.deleteKelas();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_kelas.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}/v1/kelas`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Kelas-ujian operation method */
  async kelasGetorSearchUjian(req, res, next){
    try {
      let { find, page, limit } = req.query;      
      const idKelas = req.params.id_kelas;
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [
          {
            model: models.Kelas, as: 'Kelases', attributes: ['id_kelas'], 
            where: {id_kelas: idKelas}, through: { attributes: [] },
          },
          {model: models.Ref_jenis_ujian, as: 'RefJenis'},
          {model: models.Paket_soal, as: 'PaketSoals', attributes: ['kode_paket']},
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      if(find){
        const validator = searchsValid.ujianValidator(find, 'admin');
        if(validator instanceof createError) throw validator;
        opt.where = { [Op.or]: validator }
      }
      const ujian = await helpers.paginator(models.Ujian, pages, limits, opt);
      const vals = ujian.results.map((i) => {
        return {
          id_ujian: i.id_ujian,
          thumbnail_ujian: i.illustrasi_ujian,
          jenis_ujian: i.RefJenis.jenis_ujian,
          judul_ujian: i.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.waktu_mulai,
          status_ujian: i.status_ujian,
          aktif: i.aktif,
          paket_soal: i.PaketSoals
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getUjianKelas(req);
      res.status(200).json({
          next: ujian.next,
          previous: ujian.previous,
          ujian: vals
      });
    } catch (error) {
      next(error);
    }  
  },

  async kelasSetUjian(req, res, next){
    try {
      const { id_kelas } = req.params;
      const { id_ujian } = req.body;
      if(!id_ujian) throw createError.BadRequest('id ujian tidak boleh kosong!');
      const kelas = await models.Kelas.findByPk(id_kelas);
      kelas.addUjians(id_ujian);
      CacheControl.postNewUjianKelas();
      res.status(200).json({
        success: true,
        msg: `kelas berhasil direlasikan dengan ujian, ${id_ujian}`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas/${id_kelas}/ujian`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async kelasPutUjian(req, res, next){
    try {
      const { id_kelas } = req.params;
      const { id_ujian } = req.body;
      if(!id_ujian) throw createError.BadRequest('id ujian tidak boleh kosong!');
      const kelas = await models.Kelas.findByPk(id_kelas);
      kelas.setUjians(id_ujian);
      CacheControl.putUjianKelas();
      res.status(200).json({
        success: true,
        msg: `relasi ujian pada kelas ${kelas.kode_seksi}, berhasil diubah`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/kelas/${id_kelas}/ujian`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async kelasDelUjian(req, res, next){
    try {
      const { id_kelas } = req.params;
      const { id_ujian } = req.body;
      if(!id_ujian) throw createError.BadRequest('id ujian tidak boleh kosong!');
      const kelas = await models.Kelas.findByPk(id_kelas);
      kelas.removeUjians(id_ujian);
      CacheControl.deleteUjianKelas();
      res.status(200).json({
        success: true,
        msg: `relasi ujian ${id_ujian} pada kelas ${kelas.kode_seksi}, berhasil dihapus`
      });
    } catch (error) {
      next(error);
    }
  },
  // ujian operation
  async getAllUjian(req, res, next){
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      let opt = {
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {model: models.Ref_jenis_ujian, as: 'RefJenis'}
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      const ujian = await helpers.paginator(models.Ujian, pages, limits, opt);
      const vals = ujian.results.map((i) => {
        return {
          id_ujian: i.id_ujian,
          thumbnail_ujian: i.illustrasi_ujian,
          jenis_ujian: i.RefJenis.jenis_ujian,
          judul_ujian: i.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.waktu_mulai,
          status_ujian: i.status_ujian,
          aktif: i.aktif
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getAllUjian(req);
      res.status(200).json({
          next: ujian.next,
          previous: ujian.previous,
          ujian: vals
      });
    } catch (error) {
      next(error);
    }
  },

  async getorsearchUjian(req, res, next){
    try {
      let { find, page, limit } = req.query;     
      const pages = parseInt(page) || 1;
      const limits = parseInt(limit) || config.pagination.pageLimit;
      let opt = {
        offset: (pages - 1) * limits,
        limit: limits,
        subQuery: false,
        include: [
          {model: models.Ref_jenis_ujian, as: 'RefJenis'},
          {model: models.Paket_soal, as: 'PaketSoals', attributes: ['kode_paket']},
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      if(find){
        const validator = searchsValid.ujianValidator(find, 'admin');
        if (validator instanceof createError) throw validator;
        opt.where = {[Op.or]: validator};
      }
      const ujian = await helpers.paginator(models.Ujian, pages, limits, opt);
      const vals = ujian.results.map((i) => {
        return {
          id_ujian: i.id_ujian,
          thumbnail_ujian: i.illustrasi_ujian,
          jenis_ujian: i.RefJenis.jenis_ujian,
          judul_ujian: i.judul_ujian,
          tanggal_mulai: i.tanggal_mulai,
          waktu_mulai: i.waktu_mulai,
          status_ujian: i.status_ujian,
          aktif: i.aktif
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getAllUjian(req);
      res.status(200).json({
          next: ujian.next,
          previous: ujian.previous,
          ujian: vals
      });
    } catch (error) {
      next(error);
    }  
  },

  async getUjian(req, res, next){
    try {
      const { id_ujian } = req.params;
      const ujian = await models.Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: [
          {model: models.Paket_soal, as: 'PaketSoals'},
          {model: models.Ref_jenis_ujian, as: 'RefJenis'},
          {
            model: models.Kelas, as: 'Kelases', attributes: ['id_kelas', 'kode_seksi'],
            through: {attributes: []},
          }
        ]
      });
      if(!ujian) throw createError.NotFound('data ujian tidak ditemukan.');      
      const data = {
        id_ujian: ujian.id_ujian,
        banner_ujian: ujian.illustrasi_ujian,
        jenis_ujian: ujian.RefJenis.jenis_ujian,
        judul_ujian: ujian.judul_ujian,
        tanggal_mulai: ujian.tanggal_mulai,
        waktu_mulai: ujian.waktu_mulai,
        durasi_ujian: ujian.durasi_ujian,
        durasi_per_soal: ujian.durasi_per_soal,
        bobot_total: ujian.bobot_total,
        deskripsi: ujian.deskripsi,
        created_at: ujian.created_at,
        updated_at: ujian.updated_at,
        status: ujian.status,
        aktif: ujian.aktif,
        tipe_penilaian: ujian.tipe_penilaian,
        paket_soal: ujian.PaketSoals,
        relasi_kelas: ujian.Kelases
      }
      CacheControl.getUjian(req);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },  

  async putUjian(req, res, next){
    try {
      const { illustrasi_ujian, tanggal_mulai, waktu_mulai, status, aktif, deskripsi } = req.body;
      const { id_ujian } = req.params;
      let updateVal = {
        illustrasi_ujian: illustrasi_ujian || config.auth.defaultBannerPic,
        tanggal_mulai: tanggal_mulai,
        waktu_mulai: waktu_mulai,
        status: status,
        aktif: aktif,
        deskripsi: deskripsi,
        updated_at: fn('NOW')
      };
      await models.Ujian.update(updateVal, {
        where: { id_ujian: id_ujian }
      });
      const data = await models.Ujian.findOne({
        where: { id_ujian: id_ujian }
      })
      CacheControl.putUjian();
      res.status(200).json({
        success: true,
        msg: `data ujian ${id_ujian} berhasil diubah`,
        data: data
      })
    } catch (error) {
      next(error);
    }
  },

  async patchStatusUjian(req, res, next){
    try {
      const { id_ujian } = req.params;      
      const status = req.body.status_ujian;
      let updateVal = {
        status_ujian: status,
        updated_at: fn('NOW')
      };        
      await models.Ujian.update(updateVal, {
        where: { id_ujian: id_ujian }
      });
      const data = await models.Ujian.findOne({
        attributes: ['id_ujian', 'status_ujian', 'updated_at'],
        where: { id_ujian: id_ujian }
      })
      CacheControl.patchStatusUjian;
      res.status(200).json({
        success: true,
        msg: `status ujian berhasil diubah`,
        data: data
      })
    } catch (error) {
      next(error);
    }
  },

  async patchKeaktifanUjian(req, res, next){
    try {
      const { id_ujian } = req.params;      
      const aktivasi = await models.Ujian.findOne({
        attributes:['id_ujian','aktif'],
        where:{id_ujian:id_ujian}
      });
      var updateVal, keaktifan;
      if(aktivasi.aktif === false){
        updateVal = {
          aktif: 1,
          updated_at: fn('NOW')
        };
        keaktifan = 'di aktifkan';
      } else {
        updateVal = {
          aktif: 0,
          updated_at: fn('NOW')
        };
        keaktifan = 'di non-aktifkan';
      }      
      await models.Ujian.update(updateVal, {
        where: { id_ujian: id_ujian }
      });
      await models.Paket_soal.update(updateVal, {
        where: { id_ujian: id_ujian}
      });
      const data = await models.Ujian.findOne({
        attributes: ['id_ujian', 'aktif', 'updated_at'],
        where: { id_ujian: id_ujian }
      })
      CacheControl.patchKeaktifanUjian;
      res.status(200).json({
        success: true,
        msg: `ujian berhasil ${keaktifan}`,
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteUjian(req, res, next){
    try {
      if(req.url == '/ujian/bulk') return next();
      const { id_ujian } = req.params;
      const ujian = await models.Ujian.findOne({
        where: {id_ujian: id_ujian}
      });
      if (!ujian) { throw createError.NotFound('data ujian tidak ditemukan.')}
      await models.Ujian.destroy({
        where:{
          id_ujian: ujian.id_ujian
        }
      });
      CacheControl.deleteUjian();
      res.status(200).json({
        success: true,
        msg: 'data berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteUjianBulk(req, res, next) {
    try {
        const { id_ujian } = req.body; 
        await models.Ujian.destroy({
          where: {
            id_ujian: { [Op.in]: id_ujian }
          }
        });
        CacheControl.deleteUjian();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_ujian.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/ujian`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  // paket-soal_mhs operation
  async randomizePkSoal(req, res, next){
    try {
      const { id_kelas, id_paket } = req.body;
      const kelasMhs = await models.Kelas.findOne({ 
        where: {id_kelas: id_kelas}, include: {
          model: models.Mahasiswa, as: 'Mahasiswas', attributes: ['id_mhs']
        }
      }).then((i) => { 
        return i.Mahasiswas.map(({id_mhs}) => {return id_mhs})
      });
      for(let i of id_paket){
        const ujianKelas = await models.Paket_soal.findOne({ 
          attributes: ['id_paket'], 
          where: {[Op.and]: [
            {id_paket: i}, {'$Ujian.Kelases.id_kelas$': id_kelas}
          ]},
          subQuery: false,
          include: {
            model: models.Ujian, as: 'Ujian', attributes: ['id_ujian'],
            include: {
              model: models.Kelas, as: 'Kelases', attributes: ['id_kelas']
            }
          },
          raw: true, nest: true
        });
        if(!ujianKelas) throw createError.BadRequest(`ujian untuk paket soal ${i} tidak 
            berelasi dengan kelas ${id_kelas}, atau paket tidak aktif.`);
      }
      helpers.shuffleArray(kelasMhs);
      const mapped = kelasMhs.map((i) => {    
        const randomPaket = Math.floor(Math.random() * id_paket.length);
        const kdPaket = id_paket[randomPaket]
        return {
          id_paket: kdPaket,
          id_mhs: i
        }
      });
      await models.Rel_mahasiswa_paketsoal.bulkCreate(mapped);
      CacheControl.postNewMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `paket-soal berhasil direlasikan dengan mahasiswa pada kelas ${id_kelas}`
      });
    } catch (error) {
      next(error);
    }
  },

  async pkSoalSetMhs(req, res, next){
    try {
      const { id_paket } = req.params;
      const { id_mhs } = req.body;
      if(!id_paket) throw createError.BadRequest('id paket tidak boleh kosong!');
      const paketMhs = id_mhs.map((i) => {
        return {
          id_paket: id_paket,
          id_mhs: i
        }
      });
      await models.Rel_mahasiswa_paketsoal.bulkCreate(paketMhs);
      CacheControl.postNewMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `paket-soal ${id_paket} berhasil direlasikan dengan mahasiswa ${id_mhs}`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/paket-soal/${id_paket}/mahasiswa`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async pkSoalPutMhs(req, res, next){
    try {
      const { id_paket } = req.params;
      const { id_mhs } = req.body;
      if(!id_paket) throw createError.BadRequest('id paket tidak boleh kosong!');      
      const paketMhs = id_mhs.map((i) => {
        return {
          id_paket: id_paket,
          id_mhs: i
        }
      });
      await models.Rel_mahasiswa_paketsoal.destroy({
        where: {id_paket: id_paket}
      });
      await models.Rel_mahasiswa_paketsoal.bulkCreate(paketMhs);
      CacheControl.putMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `relasi paket-soal ${id_paket} dengan mahasiswa berhasil diubah`,
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}${req.baseUrl}/paket-soal/${id_paket}/mahasiswa`
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async pkSoalDelMhs(req, res, next){
    try {
      const { id_paket } = req.params;
      const { id_mhs } = req.body;
      if(!id_paket) throw createError.BadRequest('id paket tidak boleh kosong!');
      await models.Rel_mahasiswa_paketsoal.destroy({ where:{[Op.and]: [
        {id_paket: id_paket}, {id_mhs: id_mhs}]
      }});
      CacheControl.deleteMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `relasi paket-soal ${id_paket} dengan ${id_mhs.length} mahasiswa berhasil dihapus`
      });
    } catch (error) {
      next(error);
    }
  },

  async deletePaketSoal(req, res, next){
    try {
      if(req.url === '/paket-soal/bulk') return next();
      const { id_paket } = req.params;
      const paketExist = await models.Paket_soal.findOne({where: {id_paket: id_paket}});
      if (!paketExist) throw createError.NotFound('data paket-soal tidak ditemukan.')    
      paketExist.setSoals([]);
      paketExist.setMahasiswas([]);
      await models.Paket_soal.destroy({
        where:{
          id_paket: id_paket
      }});
      CacheControl.deletePaketSoal();
      res.status(200).json({
        success: true,
        msg: 'data paket-soal berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },
  /* Lupa Password operation methods*/
  async getLupapw(req, res, next) {
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      let opt = {
        offset: (pages - 1) * limits,
        limit: limits,
        include: { model: models.User, as: 'User' }
      }
      const lupaPw = await helpers.paginator(models.Lupa_pw, pages, limits, opt);
      const vals = lupaPw.results.map((i) => {
        return {
          id_reset: i.id_reset_pw,
          id_user: i.id_user,
          username: i.User.username,
          email: i.User.email,
          status: i.status
        }
      });
      if (vals.length === 0) {vals.push('No Record...')}
      CacheControl.getLupapw(req);
      res.status(200).json({
          next: lupaPw.next,
          previous: lupaPw.previous,
          lupa_pw: vals
      });      
    } catch (error) {
      next(error);
    }
  },

  async resetPw(req, res, next) {
    try {
      if(req.url == `/user/password/bulk`) return next('route');
        const { id_user } = req.params;
        const getlupapw = await models.Lupa_pw.findOne({
          where: {id_user: id_user}
        });
        let updateVal = { password: await helpers.hashed(), updated_at: fn('NOW') };
        await models.User.update(updateVal, {
          where: { id: id_user }
        });
        if(getlupapw){
          await models.Lupa_pw.update({status: 'sudah'}, {
            where:{
              id_reset_pw: getlupapw.id_reset_pw
            }
          });
        }
        CacheControl.resetPw();
        res.status(200).json({
          success: true,
          msg: `password berhasil dereset untuk user dengan id ${id_user}`
        });
    } catch (error) {
      next(error);
    }
  },

  async resetPwBulk(req, res, next) {
    try {
        const { id_user } = req.body;
        let updateVal = [];
        const getlupapw = await models.Lupa_pw.findAll({
          where: {id_user: {[Op.in]: id_user}},
          raw: true
        });
        for(let i of id_user){
          updateVal.push({
            id: i,
            password: await helpers.hashed(), 
            updated_at: fn('NOW')
          })
        }
        await models.User.bulkCreate(updateVal, {
          updateOnDuplicate: ['id', 'password', 'updated_at']
        });
        if(getlupapw.length){
          getlupapw.forEach((i) => {
            models.Lupa_pw.update({status: 'sudah'}, {
              where:{
                id_reset_pw: i.id_reset_pw
              }
            });
          });
        }
        CacheControl.resetPw();
        res.status(200).json({
          success: true,
          msg: `password ${id_user.length} user berhasil direset.`
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteLupapw(req, res, next) {
    try {
      if(req.url == '/lupa-pw/bulk') return next();
      const { id_reset } = req.params;
      const getlupapw = await models.Lupa_pw.findByPk(id_reset)
      if (!getlupapw) throw createError.NotFound('data lupa-pass tidak ditemukan.');
      if(getlupapw.status === 'belum') throw createError.BadRequest('password user belum direset.');
      await models.Lupa_pw.destroy({
        where:{
          id_reset_pw: getlupapw.id_reset_pw
        }
      });
      CacheControl.deleteLupapw();
      res.status(200).json({
        success: true,
        msg: 'data berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteLupaPwBulk(req, res, next) {
    try {
        const { id_reset } = req.body; 
        await models.Lupa_pw.destroy({
          where: {
            id_reset_pw: { [Op.in]: id_reset }
          }
        });
        CacheControl.deleteLupapw();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_reset.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/lupa-pw`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Pengumuman operation methods*/
  async getPengumumanAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      const vals = await helpers.paginator(models.Pengumuman, pages, limits, {});
      if(vals.results.length === 0) vals.results.push('No record...');
      CacheControl.getAllPengumuman(req);
      res.status(200).json({
        next: vals.next,
        previous: vals.previous,
        pengumuman: vals.results
      });
    } catch (error) {
      next(error);
    }
  },

  async getPengumuman(req, res, next) {
    try {
      const { id_pengumuman } = req.params;
      const val = await models.Pengumuman.findByPk(id_pengumuman);
      if(!val) throw createError.NotFound('data pengumuman tidak ditemukan.');
      CacheControl.getPengumuman(req);
      res.status(200).json(val);
    } catch (error) {
      next(error);
    }
  },

  async setPengumuman(req, res, next) {
    try {
      const { pengumuman, status } = req.body;
      const getPengummn = await models.Pengumuman.findOne({
        attributes:['pengumuman'],
        where: {pengumuman: pengumuman}
      });
      if (getPengummn) {
        throw createError.Conflict('Pengumuman sudah terdaftar');
      } else if (!pengumuman) {
        throw createError.BadRequest('isi pengumuman tolong diisi!');
      } else {
        const statusUjian = [ 'tampil', 'tidak_tampil' ]
        if(!statusUjian.some(v => status.includes(v))) {
          throw createError.BadRequest('status pengumuman tidak valid!, harus berupa "tampil" atau "tidak_tampil"');
        }
        const data = await models.Pengumuman.create({
          pengumuman: pengumuman,
          status: status
        });
        CacheControl.postNewPengumuman();
        res.status(201).json({
          success: true,
          msg: 'pengumuman berhasil ditambahkan',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putPengumuman(req, res, next) {
    try {
      const { id_pengumuman } = req.params;
      const { pengumuman, status } = req.body;
      if (!pengumuman) {
        throw createError.BadRequest('isi pengumuman tolong diisi!');
      } else {
        const whitelist = [ 'tampil', 'tidak_tampil' ];
        if(!whitelist.includes(status)) {
          throw createError.BadRequest('status pengumuman tidak valid!, harus berupa "tampil" atau "tidak_tampil"');
        }
        let updateVal = {
          pengumuman: pengumuman,
          status: status,
          updated_at: fn('NOW')
        };
        await models.Pengumuman.update(updateVal, {
          where: { id_pengumuman: id_pengumuman }
        });
        const data = await models.Pengumuman.findOne({
          where: { id_pengumuman: id_pengumuman }
        })
        CacheControl.putPengumuman();
        res.status(200).json({
          success: true,
          msg: 'data pengumuman berhasil diubah',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async deletePengumuman(req, res, next) {
    try {
      if(req.url == '/pengumuman/bulk') return next();
        const { id_pengumuman } = req.params;
        const getpengumuman = await models.Pengumuman.findByPk(id_pengumuman);
        if (!getpengumuman) { throw createError.NotFound('data pengumuman tidak ditemukan.')}
        await models.Pengumuman.destroy({
          where:{
            id_pengumuman: getpengumuman.id_pengumuman
          }
        });
        CacheControl.deletePengumuman();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },

  async deletePengumumanBulk(req, res, next) {
    try {
        const { id_pengumuman } = req.body; 
        await models.Pengumuman.destroy({
          where: {
            id_pengumuman: { [Op.in]: id_pengumuman }
          }
        });
        CacheControl.deletePengumuman();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_pengumuman.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/pengumuman`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Captcha operation methods*/
  async getCaptchaAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      const vals = await helpers.paginator(models.Captcha, pages, limits, {});
      if(vals.results.length === 0) vals.results.push('No record...');
      CacheControl.getAllCaptcha(req);
      res.status(200).json({
        next: vals.next,
        previous: vals.previous,
        captcha: vals.results
      });
    } catch (error) {
      next(error);
    }
  },

  async getCaptcha (req, res, next) {
    try {
      const idCaptcha = req.params.id_captcha;
      const captcha = await models.Captcha.findByPk(idCaptcha);
      CacheControl.getCaptcha;
      res.status(200).json(captcha);
    } catch (error) {
      next(error);
    }
  },

  async setCaptcha (req, res, next) {
    try {
      const { pertanyaan, jawaban } = req.body;
      const getCaptcha = await models.Captcha.findOne({where:{[Op.or]: [
        {pertanyaan:pertanyaan}, {jawaban:jawaban}]
      }});
      if (getCaptcha) {
        throw createError.Conflict('Pertanyaan dan/atau jawaban sudah terdaftar');
      } else if (!pertanyaan&&!jawaban) {
        throw createError.BadRequest('pertanyaan/jawaban tolong diisi!');
      } else {
        const data = await models.Captcha.create({
          pertanyaan: pertanyaan,
          jawaban: jawaban
        });
        CacheControl.postNewCaptcha();
        res.status(201).json({
          success: true,
          msg: 'captcha berhasil ditambahkan',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putCaptcha (req, res, next) {
    try {
      const idCaptcha = req.params.id_captcha;
      const { pertanyaan, jawaban } = req.body;
      if (!pertanyaan&&!jawaban) {
        throw createError.BadRequest('pertanyaan/jawaban tolong diisi!');
      } else {
        await models.Captcha.update({
          pertanyaan: pertanyaan,
          jawaban: jawaban,
          updated_at: fn('NOW')
        }, {
          where: { id_captcha: idCaptcha }
        });
        const data = await models.Captcha.findOne({
          where: { id_captcha: idCaptcha }
        })
        CacheControl.putCaptcha();
        res.status(200).json({
          success: true,
          msg: 'captcha berhasil diubah',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async deleteCaptcha(req, res, next) {
    try {
      if(req.url == '/captcha/bulk') return next();
      const { id_captcha } = req.params;
      const getCpt = await models.Captcha.findByPk(id_captcha);
      if (!getCpt) { throw createError.NotFound('data captcha tidak ditemukan.')}
      await models.Captcha.destroy({
        where:{
          id_captcha: getCpt.id_captcha
      }});
      CacheControl.deleteCaptcha();
      res.status(200).json({
        success: true,
        msg: 'data berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteCaptchaBulk(req, res, next) {
    try {
        const { id_captcha } = req.body; 
        await models.Captcha.destroy({
          where: {
            id_captcha: { [Op.in]: id_captcha }
          }
        });
        CacheControl.deleteCaptcha();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_captcha.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/captcha`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Semester operation methods*/
  async getSmstrAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      const vals = await helpers.paginator(models.Ref_semester, pages, limits, {});
      CacheControl.getAllSemester(req);
      res.status(200).json(vals);
    } catch (error) {
      next(error);
    }
  },

  async setSemester (req, res, next) {
    try {
      const { semester } = req.body;
      const getSemester = await models.Ref_semester.findOne({where:{semester:semester}});
      if (getSemester) {
        throw createError.Conflict('Semester sudah terdaftar');
      } else {
        const data = await models.Ref_semester.create({
          semester:semester
        });
        CacheControl.postNewSemester();
        res.status(201).json({
          success: true,
          msg: 'semester berhasil ditambahkan',
          data: data
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putSemester(req, res, next) {
    try {
      const { id_semester } = req.params;
      const { semester } = req.body;
      if (!semester) {
        throw createError.BadRequest('semestertolong diisi!');
      } else {
        let updateVal = {
          semester: semester,
          updated_at: fn('NOW')
        };
        await models.Ref_semester.update(updateVal, {
          where: { id_semester: id_semester }
        });
        CacheControl.putSemester();
        res.status(200).json({
          success: true,
          msg: 'data semester berhasil diubah',
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/semester`
          }
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async deleteSemester(req, res, next) {
    try {
      if(req.url == '/semester/bulk') return next();
        const { id_semester } = req.params;
        const getSms = await models.Ref_semester.findOne({
          where: {id_semester: id_semester}
        });
        if (!getSms) { throw createError.NotFound('data semester tidak ditemukan.')}
        await models.Ref_semester.destroy({
          where:{
            id_semester: getSms.id_semester
          }
        });
        CacheControl.deleteSemester();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteSemesterBulk(req, res, next) {
    try {
        const { id_semester } = req.body; 
        await models.Ref_semester.destroy({
          where: {
            id_semester: { [Op.in]: id_semester }
          }
        });
        CacheControl.deleteSemester();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_semester.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/pengumuman`
          }
        });
    } catch (error) {
      next(error);
    }
  },  
  /* Notifikasi operation methods*/
  async getNotifikasiAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page) || 1;
      const limits = parseInt(req.query.limit) || config.pagination.pageLimit;
      const vals = await helpers.paginator(models.Notifikasi, pages, limits, {});
      if(vals.results.length === 0) vals.results.push('No record...');
      CacheControl.getAllNotifikasi(req);
      res.status(200).json({
        next: vals.next,
        previous: vals.previous,
        notifikasi: vals.results
      });
    } catch (error) {
      next(error);
    }
  },

  async getNotifikasi(req, res, next) {
    try {
      const { id_notif } = req.params;
      const val = await models.Notifikasi.findByPk(id_notif);
      if(!val) throw createError.NotFound('data notifikasi tidak ditemukan.');
      CacheControl.getNotifikasiAdm(req);
      res.status(200).json(val)
    } catch (error) {
      next(error);
    }
  },

  async setNotifikasi(req, res, next) {
    try {
      const { id_penerima, pesan } = req.body;
      const userPenerima = await models.User.findOne({
        attributes: ['id'],
        where: { id: id_penerima }
      });
      if(!userPenerima) throw createError.NotFound(`user dengan id ${id_penerima} tidak ditemukan.`);
      const admin = await req.user;
      const data = await models.Notifikasi.create({
        id_pengirim: admin.id,
        id_penerima: userPenerima.id,
        notifikasi: pesan,
        created_at: fn('NOW')
      });
      CacheControl.postNewNotifikasi();
      res.status(200).json({
        success: true,
        msg: 'notifikasi berhasil dikirim.',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async putNotifikasi(req, res, next) {
    try {
      const { id_penerima, pesan } = req.body;
      const idNotif = req.params.id_notif;
      const userPenerima = await models.User.findOne({
        attributes: ['id'],
        where: { id: id_penerima }
      });
      if(!userPenerima) throw createError.NotFound('user tidak ditemukan.');
      // const admin = await req.user;
      let updateVal = {
        // pengirim: admin.id,
        penerima: userPenerima.id,
        notifikasi: pesan,
        updated_at: fn('NOW')
      }
      await models.Notifikasi.update( updateVal, {
        where: {id_notif: idNotif}
      });
      const data = await models.Notifikasi.findOne({
        where: { id_notif: idNotif }
      })
      CacheControl.putNotifikasi();
      res.status(200).json({
        success: true,
        msg: 'notifikasi berhasil diubah',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteNotifikasi(req, res, next) {
    try {
      if(req.url == '/notifikasi/bulk') return next();
      const idNotif = req.params.id_notif;
      const getNotif = await models.Notifikasi.findByPk(idNotif);
      if (!getNotif) { throw createError.NotFound('data notifikasi tidak ditemukan.')}
      await models.Notifikasi.destroy({
        where: {id_notif: idNotif}
      });
      CacheControl.deleteNotifikasi();
      res.status(200).json({
        success: true,
        msg: 'data notifikasi berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteNotifikasiBulk(req, res, next) {
    try {
        const { id_notif } = req.body; 
        await models.Notifikasi.destroy({
          where: {
            id_notif: { [Op.in]: id_notif }
          }
        });
        CacheControl.deleteNotifikasi();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_notif.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}${req.baseUrl}/notifikasi`
          }
        });
    } catch (error) {
      next(error);
    }
  },  

  async setIllustrasi(req, res, next) {
    try {      
      const nama_illustrasi = req.file.filename;
      await models.Ref_illustrasi.create({
        nama_illustrasi: nama_illustrasi
      });
      const img = await sharp(fs.readFileSync(helpers.pathAll(nama_illustrasi, 'img-banner')))
      .resize(100, 100)
      .toFile(helpers.pathAll(nama_illustrasi, 'img-thumbnail'))
      if(img instanceof Error) {
        console.error(img);
        throw createError.internal('gagal mengupload gambar');
      }
      CacheControl.postNewIllustrasi();
      res.status(201).json({
        success: true,
        msg: 'banner dan thumbnail berhasil ditambahkan',
        data: {
          method: 'GET',
          href: `${req.protocol}://${req.get('host')}/v1/illustrasi`
        }
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async deleteIllustrasi(req, res, next) {
    try {
      if(req.url == '/illustrasi/bulk') return next();
      const idIllustrasi = req.params.id_illustrasi;
      const getIllustrasi = await models.Ref_illustrasi.findByPk(idIllustrasi);
      if (!getIllustrasi) { throw createError.NotFound('data illustrasi tidak ditemukan.')}
      await models.Ref_illustrasi.destroy({
        where: {id_illustrasi: idIllustrasi}
      });
      CacheControl.deleteIllustrasi();
      res.status(200).json({
        success: true,
        msg: 'banner dan thumbnail berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteIllustrasiBulk(req, res, next) {
    try {
        const { id_illustrasi } = req.body; 
        await models.Ref_illustrasi.destroy({
          where: {
            id_illustrasi: { [Op.in]: id_illustrasi }
          }
        });
        CacheControl.deleteIllustrasi();
        res.status(200).json({
          success: true,
          msg: `sebanyak ${id_illustrasi.length} data berhasil dihapus`,
          data: {
            method: 'GET',
            href: `${req.protocol}://${req.get('host')}/v1/illustrasi`
          }
        });
    } catch (error) {
      next(error);
    }
  },  

  async getAllModelName(req, res, next) {
    try {
      let blacklist = ['sequelize', 'Sequelize', 'Token_history', 
      'Client', 'Ref_client', 'Lupa_pw']
      if(!req.user.id_role){
        blacklist = ['sequelize', 'Sequelize', 'Token_history', 'Lupa_pw']
      }
      const data = Object.keys(models)
      .filter((key) => {
        if(!blacklist.includes(key)){
          if(key.toLowerCase().indexOf('rel')){
            return key;
         }
        }
      });
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async getAllSoftDeleted(req, res, next) {
    try {
      const modelName = req.params.nama_tabel;
      const data = await models[modelName].findAll({ 
        where: { deleted_at: { [Op.ne]: null } },
        paranoid: false
      });
      CacheControl.getAllSoftDeleted(req);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },

  async putSoftDeleted(req, res, next) {
    try {
      const modelName = req.params.nama_tabel;
      let arrId = req.body.id, msg;
      if(arrId){        
        const prop = await helpers.getModelPK(modelName);
        if(prop instanceof createError) throw prop;
        await models[modelName].restore({ 
          where: {[prop]: {[Op.in]: arrId}} 
        });
        msg = `sebanyak ${arrId.length} data berhasil dipulihkan pada tabel ${modelName}`
      } else {
        await models[modelName].restore();
        msg = `semua data soft-deleted berhasil dipulihkan pada tabel ${modelName}`
      }      
      CacheControl.putSoftDeleted();
      res.status(200).json({
        success: true,
        msg: msg
      });
    } catch (error) {
      next(error);
    }
  },

  async permanentDelete(req, res, next) {
    try {
      const modelName = req.params.nama_tabel;
      let arrId = req.body.id, msg;
      if(arrId){
        const prop = await helpers.getModelPK(modelName);
        if(prop instanceof createError) throw prop;
        await models[modelName].destroy({
          where: {
            [Op.and]: [{deleted_at: {[Op.ne]: null}}, {[prop]: {[Op.in]: arrId}}]
          },
          force: true
        });
        if(modelName === 'Ref_illustrasi'){
          for(let i of arrId) {
            const getIllustrasi = await models[modelName].findByPk(i);
            if (!getIllustrasi) { throw createError.NotFound('data illustrasi tidak ditemukan.')}
            await unlinkAsync(helpers.pathAll(getIllustrasi.nama_illustrasi, 'img-banner'));
            await unlinkAsync(helpers.pathAll(getIllustrasi.nama_illustrasi, 'img-thumbnail'));
          }
        }
        msg = `sebanyak ${arrId.length} data berhasil dihapus permanen pada tabel ${modelName}`
      } else {
        if(modelName === 'Ref_illustrasi'){
          const getIllustrasi = await models[modelName].findAll({
            where: {deleted_at: {[Op.ne]: null}},
            raw: true
          }).then((i) => { i.map(({nama_illustrasi}) => { return nama_illustrasi }) });
          for(let i of getIllustrasi){
            await unlinkAsync(helpers.pathAll(i, 'img-banner'));
            await unlinkAsync(helpers.pathAll(i, 'img-thumbnail'));
          }
        }
        await models[modelName].destroy({
          where: {deleted_at: {[Op.ne]: null}},
          force: true
        });
        msg = `semua data soft-deleted berhasil dihapus permanen pada tabel ${modelName}`
      }
      CacheControl.permaDelete();
      res.status(200).json({
        success: true,
        msg: msg
      });
    } catch (error) {
      next(error);
    }
  }
}