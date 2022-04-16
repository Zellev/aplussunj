const { User, Dosen, Mahasiswa, Captcha, Lupa_pw, Matakuliah, Kelas, 
        Paket_soal, Token_history, Ujian, Notifikasi, Pengumuman, 
        Ref_kel_matkul, Ref_peminatan, Ref_semester, Ref_illustrasi, 
        Ref_role, Ref_jenis_ujian, Rel_mahasiswa_paketsoal } = require('../models');
const config = require('../config/dbconfig');
const path = require('path');
const ExcelJS = require('exceljs');
const sharp = require('sharp');
const CacheControl = require('../controllers/CacheControl');
const pdf = require('html-pdf');
const fs = require('fs');
const createError = require('../errorHandlers/ApiErrors');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const { paginator, shuffleArray, todaysdate, 
        dateFull, hashed, randomPic, pathAll } = require('../helpers/global');
const { userValidator, dosenValidator, mhsValidator, 
        ujianValidator, matkulValidator } = require('../validator/SearchValidator');
const { Op, fn } = require('sequelize');

const getUser = async obj => {
  return User.findOne({
      where: obj
  });
}

const getUserid = async () => {
  return User.max('id').then((val) => {
    return val + 1;
  });
}

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
  const users = await User.count();
  const userAdmin = await User.count({
    where: {id_role: '1'}
  });
  const userDosen = await User.count({
    where: {id_role: '2'}
  });
  const userMahasiswa = await User.count({
    where: {id_role: '3'}
  });
  const matakuliah = await Matakuliah.count();
  const kelas = await Kelas.count();
  const ujian = await Ujian.count();
  const today = new Date();
  const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  const online = await Token_history.count({
    where: {created_at: date},
    group: 'id_user'
  });
  return [{
    total_users: users,
    total_online_users: online,
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
      const tanggal = dateFull();
      const img = 'data:image/png;base64,' + fs
          .readFileSync(path.resolve(__dirname,'../../public/pdftemplate','kop_surat.png'))
          .toString('base64');
      res.render(pathAll('status.hbs', 'pdf'), {
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
              'Content-Disposition': `attachment;filename="${req.user.id}_${todaysdate()}-status_app.pdf"`
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
      newWS.getCell('A3').value = 'tertanggal, ' + dateFull();
      newWS.getCell('A3').alignment = { horizontal:'center'} ;      
      const output = ((val)=>{
        res.writeHead(200,{       
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment;filename="${req.user.id}_${todaysdate()}-status_app.xlsx"`
        })
        const download = Buffer.from(val);
        res.end(download);
      })
      output(await newWB.xlsx.writeBuffer());
    } catch (error) {
      next(error)
    }
  },
  /* User operation methods */
  async getallUser(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(User, pages, limits);
        let vals = [];
        for(let i of val.results) {// iterate over array from findall
            let role = await i.getRole()
            vals.push({// push only some wanted values, zellev
                id: i.id,
                username: i.username,
                email: i.email,
                status_civitas: i.status_civitas,
                role: role.role
            })
        }
        const users = await Promise.all(vals);
        CacheControl.getAllUser(req);
        res.status(200).json({
            next:val.next,
            previous:val.previous,
            users: users
        })
    } catch (error) {
      next(error);
    }
  },

  async searchUser(req, res, next) {
    try {
      let { find } = req.query;
      const validator = userValidator(find);
      if (validator instanceof createError) throw validator;
      let user = [], temp = [];
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {        
        attributes: ['id', 'username', 'email', 'status_civitas', 'id_role'],
        where: { [Op.or]: validator },
        offset: (pages - 1) * limits,
        limit: limits,
        include: {
          model: Ref_role, as: 'Role', attributes: ['role']
        },
        order: [['id', 'ASC']]
      }
      user = await paginator(User, pages, limits, opt);
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

  async getUser(req, res, next) {
    try {
      const { id_user } = req.params;
      const user = await getUser({id:id_user});
      let role;
      if (user.id_role === 3){
        const mhs =  await user.getMahasiswa();
        role = {
          user_id: user.id,
          username: user.username,
          email: user.email,
          status_civitas: user.aktif,
          role: 'Mahasiswa',
          foto_profil: user.foto_profil,
          keterangan: user.keterangan,
          created_at: user.created_at,
          updated_at: user.updated_at,
          data_mahasiswa: mhs
        };
      } else if (user.id_role === 2){
        const dosen =  await user.getDosen();
        role = {
          user_id: user.id,
          username: user.username,
          email: user.email,
          status_civitas: user.aktif,
          role: 'Dosen',
          foto_profil: user.foto_profil,
          keterangan: user.keterangan,
          created_at: user.created_at,
          updated_at: user.updated_at,
          data_dosen: dosen
        };
      } else {
        role = user;
      }
      CacheControl.getUser(req);
      res.status(200).json(role);
    } catch (error) {
      next(error);
    }
  },

  async putUser(req, res, next) {
    try {
      const { id_user } = req.params;console.log('here')
      const { username, email, status_civitas, keterangan } = req.body;
      if (!email) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            username: username,
            email: email,
            status_civitas: status_civitas,
            keterangan: keterangan,
            updated_at: fn('NOW')
        };
        await User.update(updateVal, {
          where: { id: id_user }
        });
        CacheControl.putUser();
        res.status(200).json({
          success: true,
          msg: `data user ${id_user} berhasil diubah`
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putUserbulk(req, res, next) {
    try {console.log('here')
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let updateVal = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');
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
      await User.bulkCreate(updateVal, {
        updateOnDuplicate: [
          'id', 'username','email','status_civitas',
          'keterangan', 'updated_at'
        ]
      });
      CacheControl.putUser();
      res.status(200).json({
        success: true,
        msg: 'data user berhasil diubah sesuai: ' + req.file.originalname
      });
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
      }
      next(error);
    }
  },

  async patchUserPw(req, res, next) {
    try {
      const idUser = req.params.id_user;
      await User.update({
        password: await hashed(),
        updated_at: fn('NOW')
      }, {
        where: { id: idUser }
      });
      res.status(200).json({
        success: true,
        msg: `password user ${idUser} berhasil direset`
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteUser(req, res, next) {
    try {
        const { id_user } = req.params;
        const getuser = await getUser({id:id_user})
        const currentAdm = req.user.id;
        if (!getuser) { throw createError.NotFound('data user tidak ditemukan.')}
        if (id_user === currentAdm) {
          throw createError.BadRequest('tidak bisa menghapus diri sendiri.')
        }
        await User.destroy({
          where: {
            id: getuser.id
          }
        });
        CacheControl.deleteUser();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Profil admin operation methods*/
  async getProfile(req, res, next) {
    try {
      const id = req.user.id;      
      const admin = await getUser({id: id});
      const json = admin.toJSON();      
      delete json.password, delete json.id_role;
      CacheControl.getmyProfileAdmin(req);
      res.status(200).json(json);
    } catch (error) {
      next(error);
    }
  },

  async putProfile(req, res, next) {
    try {
      const user = req.user;
      const { username, email, status_civitas, keterangan } = req.body;
      let updateVal = {
        username: username,
        email: email,
        status_civitas: status_civitas,
        keterangan: keterangan,
        updated_at: fn('NOW')
      };
      await User.update(updateVal, {
        where: { id: user.id }
      });
      CacheControl.putmyProfileAdmin();
      res.status(200).json({
        success: true,
        msg: `profil anda berhasil diubah`
      });
    } catch (error) {
      next(error);
    }
  },
  /* Daftar operation methods*/
  async daftar (req, res, next) {
    try {
        const { NIP, NIDN, NIDK, NIM, email, nama_lengkap, nomor_telp} = req.body;
        let Role, username = await getUserid();
        let path = req.baseUrl + req.path;
        if ( path === '/admin/dosen' ) {
          await User.create({
            username: 'User'+' '+ username,
            email: email,
            status_civitas: 'aktif',
            password: await hashed(),
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
              include: {model: Dosen, as: 'Dosen'}
          });          
          Role = 'dosen';
        } else if ( path === '/admin/mahasiswa' ) {
          await User.create({
            username: 'User'+' '+ username,
            email: email,
            status_civitas: 'aktif',
            password: await hashed(),
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
              include: {model: Mahasiswa, as: 'Mahasiswa'}
          });
        Role = 'Mahasiswa';
      }
      CacheControl.postNewUser();
      res.status(200).json({
        success: true,
        msg: `${Role} berhasil ditambahkan`
      });
    } catch (error) {
        next(error);
    }
  },
  /* Dosen operation methods*/
  async getallDosen(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Dosen, pages, limits);
        let vals = [];
        if(val.results.length !== 0){
          for(let i of val.results) {         
            vals.push({
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

  async searchDosen(req, res, next) {
    try {
      let { find } = req.query;
      const validator = dosenValidator(find);
      if (validator instanceof createError) throw validator;
      let dosen = [];
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {        
        attributes: ['id_dosen', 'NIDN', 'NIDK', 'nama_lengkap'],
        where: { [Op.or]: validator },
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_dosen', 'ASC']]
      }
      dosen = await paginator(Dosen, pages, limits, opt);
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

  async daftarDosenbulk (req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      const excelFile = pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('User_dosen');
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          await User.create({
            username: 'User'+' '+ await getUserid(),
            email: row[5],
            status_civitas: 'aktif',
            password: await hashed(),
            id_role: '2',
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
            include: { model: Dosen, as: 'Dosen'}
          })
        }
      }
      CacheControl.postNewUser();
      res.status(200).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname
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
        throw createError.BadRequest('tolong diisi!');
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
        await Dosen.update(updateVal, {
          where: { id_dosen: id_dosen }
        });
        CacheControl.putDosen();
        res.status(200).json({
          success: true,
          msg: 'data dosen berhasil diubah'
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putDosenbulk(req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let updateVal = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');
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
      await Dosen.bulkCreate(updateVal, {
        updateOnDuplicate: [
          'id_dosen','NIP','NIDN','NIDK','nama_lengkap',
          'alamat','nomor_telp', 'updated_at'
        ]
      });
      CacheControl.putDosen();
      res.status(200).json({
        success: true,
        msg: 'data dosen berhasil diubah sesuai: ' + req.file.originalname
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
        const { id_dosen } = req.params;
        const getdosen = await Dosen.findOne({
          attributes:['id_dosen'],
          where: {id_dosen: id_dosen},
          include: {model: User, as: 'User', attributes: ['id']}
        });
        if (!getdosen) { throw createError.NotFound('data dosen tidak ditemukan.')}
        await Dosen.destroy({
          where: {
            id_dosen: getdosen.id_dosen
          }
        });
        await User.destroy({
          where: {
            id: getdosen.User.id
          }
        });
        CacheControl.deleteDosen();
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Mahasiswa opearation methods*/
  async getallMhs(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Mahasiswa, pages, limits);
        let vals = [];
        if(val.results.length !== 0){
          for(let i of val.results) {// iterate over array from findall          
            vals.push({// push only some wanted values, zellev
              id_mhs: i.id_mhs,
              NIM: i.NIM,
              nama_lengkap: i.nama_lengkap
            })
          }
        } else {
          vals.push('No record...')
        }
        const mhs = await Promise.all(vals);
        CacheControl.getAllMhs(req);
        res.status(200).json({
            next:val.next,
            previous:val.previous,
            mhs: mhs
        })
    } catch (error) {
      next(error);
    }
  },

  async searchMhs(req, res, next) {
    try {
      let { find } = req.query;
      const validator = mhsValidator(find);
      if (validator instanceof createError) throw validator;
      let mhs = [];
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {        
        attributes: ['id_mhs', 'NIM', 'nama_lengkap'],
        where: { [Op.or]: validator },
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_mhs', 'ASC']]
      }
      mhs = await paginator(Mahasiswa, pages, limits, opt);
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

  async daftarMhsbulk (req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      const excelFile = pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('User_mahasiswa');
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          await User.create({
            username: 'User'+' '+  await getUserid(),
            email: row[3],
            status_civitas: 'aktif',
            password: await hashed(),
            id_role: '3',
            created_at: fn('NOW'),
            Mahasiswa: {
                NIM: row[1],
                nama_lengkap: row[2],
                nomor_telp: row[4],
                created_at: fn('NOW')
              }
          }, {
            include: {model: Mahasiswa, as: 'Mahasiswa'}
          });
        }
      }
      CacheControl.postNewUser();
      res.status(200).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname
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
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            NIM: NIM,
            nama_lengkap: nama_lengkap,
            alamat: alamat,
            nomor_telp: nomor_telp,
            updated_at: fn('NOW')
        };
        await Mahasiswa.update(updateVal, {
          where: { id_mhs: id_mhs }
        });
        CacheControl.putMhs();
        res.status(200).json({
          success: true,
          msg: 'data mahasiswa berhasil diubah'
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async putMhsbulk(req, res, next) {
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let updateVal = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');
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
      await Mahasiswa.bulkCreate(updateVal, {
        updateOnDuplicate: [
          'id_mhs','NIM','nama_lengkap','alamat',
          'nomor_telp', 'updated_at'
        ]
      });
      CacheControl.putMhs();
      res.status(200).json({
        success: true,
        msg: 'data mahasiswa berhasil diubah sesuai: ' + req.file.originalname
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
        const { id_mhs } = req.params;
        const getMhs = await Mahasiswa.findOne({
          attributes:['id_mhs'],
          where: {id_mhs: id_mhs},
          include: {model: User, as: 'User', attributes: ['id']}
        });
        if (!getMhs) { throw createError.NotFound('data mahasiswa tidak ditemukan.')}
        await Mahasiswa.destroy({
          where:{
            id_mhs: getMhs.id_mhs
          }
        });
        await User.destroy({
          where: {
            id: getMhs.User.id
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
  /* Matakuliah operation methods*/
  async getallMatkul(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Matakuliah, pages, limits);
        let vals = [];
        if(val.results.length !== 0){
          for(let i of val.results) {
            vals.push({
              id_matkul: i.id_matkul,
              kode_matkul: i.kode_matkul,
              nama_matkul: i.nama_matkul,
              sks: i.sks
            })
          }
        } else {
          vals.push('No record...')
        }
        const matkul = await Promise.all(vals)
        CacheControl.getAllMatkul(req);
        res.status(200).json({
            next:val.next,
            previous:val.previous,
            matkul: matkul
        })
    } catch (error) {
      next(error)
    }
  },

  async searchMatkul(req, res, next) {
    try {
      let { find } = req.query;
      const validator = matkulValidator(find);
      if (validator instanceof createError) throw validator;
      let matkul = [], temp = [];
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {        
        attributes: ['id_matkul','kode_matkul', 'nama_matkul', 'sks'],
        where: { [Op.or]: validator },
        offset: (pages - 1) * limits,
        limit: limits,
        order: [['id_matkul', 'ASC']]
      }
      matkul = await paginator(Matakuliah, pages, limits, opt);
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
      const val = await Matakuliah.findOne({
        where: {id_matkul: id_matkul},
        include: [
          {model: Ref_kel_matkul, as: 'KelMk', attributes: ['kode_kel_mk','kelompok_matakuliah']},
          {model: Ref_peminatan, as: 'RefPemin', attributes: ['kode_peminatan','peminatan']}
        ]
      });
      if (!val) { throw createError.NotFound('data matakuliah tidak ditemukan.')}
      const matkul = {
        id_matkul: val.id_matkul,
        kode_matkul: val.kode_matkul,
        kelompok_Mk: val.KelMk.kelompok_matakuliah,
        Peminatan: val.RefPemin.peminatan,
        nama_matkul: val.nama_matkul,
        sks: val.sks,
        desktripsi: val.desktripsi,
        created_at: val.created_at,
        updated_at: val.updated_at
      };
      CacheControl.getMatkul(req);
      res.status(200).json(matkul);
    } catch (error) {
      next(error);
    }
  },

  async setMatkul(req, res, next){
    try {
      const { kode_matkul, id_kel_mk, id_peminatan, nama_matkul, sks, deskripsi } = req.body;
      const illustrasi_matkul = req.file.filename || config.auth.defaultGlobalPic;
      const matkul = await Matakuliah.findOne({
        where: {kode_matkul: kode_matkul}, 
        attributes: ['id_matkul']
      });
      if(matkul) throw createError.Conflict('kode matkul sudah terdaftar!');
      await Matakuliah.create({
        illustrasi_matkul: illustrasi_matkul,
        kode_matkul: kode_matkul,
        id_kel_mk: id_kel_mk,
        id_peminatan: id_peminatan,
        nama_matkul: nama_matkul,
        sks: sks,
        deskripsi: deskripsi
      });
      CacheControl.postNewMatkul();
      res.status(200).json({
        success: true,
        msg: 'matakuliah berhasil ditambahkan'
      });
    } catch (error) {
      next(error);
    }
  },

  async setMatkulbulk(req, res, next) {
    let picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let data = [], imgArray = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Matakuliah');
      if(ws.getImages().length) {
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const picPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-matkul');
          const thumbPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-thumbnail');
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
          imgArray.push(`${row}.${col}.${img.name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }      
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          let img = imgArray[rowNum-1];
          if(!img) img = config.auth.defaultGlobalPic;
          row[4] = row[4] ?? null;
          row[7] = row[7] ?? null;
          let val = {
            getKelmk: await Ref_kel_matkul.findOne({
              attributes: ['id_kel_mk','kelompok_matakuliah'],
              where: {kelompok_matakuliah: row[3]}
            }),
            getPemin: await Ref_peminatan.findOne({
              attributes: ['id_peminatan','peminatan'],
              where: {peminatan: row[4]}
            }),
          }
          if(!val.getKelmk) throw createError.NotFound(`kelompok matakuliah untuk data ${row[3]} tidak ditemukan.`)
          if(!val.getPemin) throw createError.NotFound(`peminatan untuk data ${row[4]} tidak ditemukan.`)
          data.push({
            illustrasi_matkul: img,
            kode_matkul: row[2],
            id_kel_mk: val.getKelmk.id_kel_mk,
            id_peminatan: val.getPemin.id_peminatan,
            nama_matkul: row[5],
            sks: row[6],
            deskripsi: row[7]
          })
        }
      }
      await Matakuliah.bulkCreate(data);
      CacheControl.postNewMatkul();
      res.status(200).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname
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
      const mk = await Matakuliah.findByPk(id_matkul);
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
      await Matakuliah.update(updateVal, {
        where: { id_matkul: id_matkul }
      });
      CacheControl.putMatkul();
      res.status(200).json({
        success: true,
        msg: 'data matakuliah berhasil diubah'
      });
    } catch (error) {
      next(error);
    }
  },

  async putMatkulbulk(req, res, next) {
    let picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let updateVal = [], imgArray = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Matakuliah_updater');
      if(ws.getImages().length) {
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const picPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-matkul');
          const thumbPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-thumbnail');
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
          imgArray.push(`${row}.${col}.${img.name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values
          let img = imgArray[rowNum-1];
          row[5] = row[5] ?? null;
          row[8] = row[8] ?? null;
          let val = {
            getKelmk: await Ref_kel_matkul.findOne({
              attributes: ['id_kel_mk','kelompok_matakuliah'],
              where: {kelompok_matakuliah: row[4]}
            }),
            getPemin: await Ref_peminatan.findOne({
              attributes: ['id_peminatan','peminatan'],
              where: {peminatan: row[5]}
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
            deskripsi: row[8],
            updated_at: fn('NOW')
          }
          if(!img) delete data.illustrasi_matkul;
          updateVal.push(data)
        }
      }
      await Matakuliah.bulkCreate(updateVal, {
        updateOnDuplicate: [ 'id_matkul', 'illustrasi_matkul', 'kode_matkul', 'id_kel_mk',
          'id_peminatan','nama_matkul', 'sks','deskripsi','updated_at' ]
      });
      CacheControl.putMatkul();
      res.status(200).json({
        success: true,
        msg: 'data matakuliah berhasil diubah sesuai: ' + req.file.originalname
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
        const { id_matkul } = req.params;
        const getMatkul = await Matakuliah.findOne({
          attributes: ['id_matkul'],
          where: {id_matkul: id_matkul}
        });
        if (!getMatkul) { throw createError.NotFound('data matakuliah tidak ditemukan.')}
        await Matakuliah.destroy({
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
  /* Kelas operation methods*/
  async kelasGetMhs(req, res, next){
    try {
      const idKelas = req.params.id_kelas;
      const kelas = await Kelas.findOne({
        attributes: ['id_kelas'],
        where: {id_kelas: idKelas},
        include: {model: Mahasiswa, as: 'Mahasiswas', through: {attributes:[]}}
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
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let data = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');      
      const kelas = await Kelas.findByPk(req.params.id_kelas);
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas_mahasiswa');
      ws.eachRow(function(row, rowNumber) {
        if(rowNumber > 1){
          data.push(row.values[1])
        }
      });
      kelas.addMahasiswas(data);
      CacheControl.postNewMhsKelas();
      res.status(200).json({
        success: true,
        msg: `relasi mahasiswa-kelas berhasil di tambah sesuai ${req.file.originalname}`
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
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let updateVal = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');   
      const kelas = await Kelas.findByPk(req.params.id_kelas);
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas_mahasiswa');
      ws.eachRow(function(row, rowNumber) {
        if(rowNumber > 1){
          updateVal.push(row.values[1])
        }
      });
      kelas.setMahasiswas(updateVal);
      CacheControl.putMhsKelas();
      res.status(200).json({
        success: true,
        msg: `relasi mahasiswa-kelas berhasil di ubah sesuai ${req.file.originalname}`
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
      const nim = req.body.nim;
      const kelas = await Kelas.findByPk(req.params.id_kelas);      
      kelas.removeMahasiswas(nim);
      CacheControl.deleteMhsKelas();
      res.status(200).json({
        success: true,
        msg: `relasi mahasiswa ${nim}, dengan kelas ini berhasil dihapus`
      })
    } catch (error) {
      next(error);
    }
  },

  async kelasGetDosen(req, res, next){
    try {
      const idKelas = req.params.id_kelas;
      const kelas = await Kelas.findOne({
        attributes: ['id_kelas'],
        where: {id_kelas: idKelas},
        include: {model: Dosen, as: 'Dosens', through: {attributes:[]}}
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
      const kls = await Kelas.findByPk(id_kelas)
      if(!pengampu.id_dosen1){
        throw createError.BadRequest('dosen 1 tidak boleh kosong!')
      } else {
        val[0] = await Dosen.findByPk(pengampu.id_dosen1);
        !pengampu.id_dosen2 ? val[1] = null : val[1] = await Dosen.findByPk(pengampu.id_dosen2);
        !pengampu.id_dosen3 ? val[2] = null : val[2] = await Dosen.findByPk(pengampu.id_dosen3);
        for(let i of val){
          if(i !== null){
            nidk.push(i.NIDK)
            kls.addDosen(i)
          }
        }
        CacheControl.postNewDosenKelas();
        res.status(200).json({
          success: true,
          msg: `dosen pengampu ${nidk}, berhasil ditambahkan ke kode seksi ${kls.kode_seksi}`
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
      const kls = await Kelas.findByPk(id_kelas)      
      if(!pengampu.noreg_dosen1){
        throw createError.BadRequest('dosen 1 tidak boleh kosong!')
      } else {
        val[0] = await Dosen.findByPk(pengampu.id_dosen1);
        !pengampu.id_dosen2 ? val[1] = null : val[1] = await Dosen.findByPk(pengampu.id_dosen2);
        !pengampu.id_dosen3 ? val[2] = null : val[2] = await Dosen.findByPk(pengampu.id_dosen3);
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
          msg: `dosen pengampu kode seksi ${kls.kode_seksi}, berhasil diubah ke ${nidk}`
        })
      }
    } catch (error) {
      next(error)
    }
  },

  async kelasRemoveDosen(req, res, next) {
    try {
      const kelas = await Kelas.findByPk(req.params.id_kelas);
      const noregDosens = req.body.id_dosen;
      kelas.removeDosens(noregDosens);
      CacheControl.deleteDosenKelas();
      res.status(200).json({
        success: true,
        msg: `dosen pengampu ${noregDosens}, untuk kode seksi ini berhasil dihapus`
      })
    } catch (error) {
      next(error)
    }
  },

  async setKelas(req, res, next){
    try {
      let val = [], nidk = [], desc;
      const { illustrasi_kelas, kode_seksi, id_dosen1, id_dosen2, id_dosen3, id_matkul, 
              id_semester, hari, jam, deskripsi } = req.body;
      const objKelas = await Kelas.findOne({
        where: {kode_seksi: kode_seksi}, 
        attributes: ['id_kelas']
      });
      if(objKelas) throw createError.Conflict('kode seksi sudah terdaftar!');
      val[0] = await Dosen.findByPk(id_dosen1);
      !id_dosen2 ? val[1] = null : val[1] = await Dosen.findByPk(id_dosen2);
      !id_dosen3 ? val[2] = null : val[2] = await Dosen.findByPk(id_dosen3);
      deskripsi === "" ? desc = null : desc = deskripsi;
      const img = illustrasi_kelas || await randomPic() || config.auth.defaultBannerPic;
      const kelas = await Kelas.create({
        illustrasi_kelas: img,
        kode_seksi: kode_seksi,
        id_matkul: id_matkul,
        id_semester: id_semester,
        hari: hari,
        jam: jam,
        deskripsi: desc
      })
      if(val.length === 0) {throw createError.BadRequest('dosen 1 tidak boleh kosong!')}
      for(let i of val){
        if(i){
          nidk.push({noreg_dosen: i.NIDK})
          kelas.addDosen(i)
        }
      }
      CacheControl.postNewKelas();
      res.status(200).json({
        success: true,
        msg: 'kelas berhasil ditambahkan'
      });
    } catch (error) {
      next(error);
    }
  },

  async setKelasbulk(req, res, next) {
    let kdSeksi = [], picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      const excelFile = pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas');
      let imgArray = [];
      if(ws.getImages().length){
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const picPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-banner');
          const thumbPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-thumbnail');
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
          imgArray.push(`${row}.${col}.${img.name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values;
          let img = imgArray[rowNum-1];
          if(!img) img = await randomPic() || config.auth.defaultBannerPic;
          row[4] = row[4] ?? null;
          row[7] = row[7] ?? null;
          let getMk = await Matakuliah.findOne({
            attributes: ['id_matkul','nama_matkul'],
            where: {nama_matkul: row[3]}
          });
          let getSemester = await Ref_semester.findOne({
            attributes: ['id_semester','semester'],
            where: {semester: row[4]}
          });
          if(!getMk) throw createError.NotFound(`matakuliah untuk data ${row[3]} tidak ditemukan.`)
          if(!getSemester) throw createError.NotFound(`semester untuk data ${row[4]} tidak ditemukan.`)                   
          let kelas = await Kelas.create({
            illustrasi_kelas: img,
            kode_seksi: row[2],
            id_matkul: getMk.id_matkul,
            id_semester: getSemester.id_semester,
            hari: row[5],
            jam: row[6],
            deskripsi: row[7]
          });
          if(!row[8]) {
            kdSeksi.push(row[2]);
            throw createError.BadRequest(`dosen 1 pada kelas ${row[2]} tidak boleh kosong!`);            
          }
          for(let i = 0; i < 3; i++){
            if(row[8+i]){
              let idDosen = await dosen(Dosen, row[8+i]);
              kelas.addDosen(idDosen.id_dosen)
            }
          }
        }
      }
      CacheControl.postNewKelas();
      res.status(200).json({
        success: true,
        msg: 'data berhasil diimport ke DB sesuai: ' + req.file.originalname
      })             
    } catch (error) {
      if(req.file) {
        await unlinkAsync(req.file.path);
        if(kdSeksi.length > 0) {
          await Kelas.destroy({where: {kode_seksi: kdSeksi}});
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
      const { id_kelas } = req.params;
      const { illustrasi_kelas, kode_seksi, id_dosen1, id_dosen2, id_dosen3, 
              id_matkul, id_semester, hari, jam, deskripsi } = req.body;
      let val = [], temp = [];
      const getKelas = await Kelas.findByPk(id_kelas)
      if (!getKelas){
        throw createError.NotFound('data kelas tidak ditemukan.')
      }
      val[0] = await Dosen.findByPk(id_dosen1);
      !id_dosen2 ? val[1] = null : val[1] = await Dosen.findByPk(id_dosen2);
      !id_dosen3 ? val[2] = null : val[2] = await Dosen.findByPk(id_dosen3);
      const img = illustrasi_kelas || await randomPic() || config.auth.defaultBannerPic;
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
      await Kelas.update(updateVal, {
        where: { id_kelas: id_kelas }
      });
      for(let i of val){
        if(i) {
          temp.push(i)
        }
      }
      getKelas.setDosens(temp);
      CacheControl.putKelas();
      res.status(200).json({
        success: true,
        msg: 'data kelas berhasil diubah'
      });      
    } catch (error) {
      next(error);
    }
  },

  async putKelasbulk(req, res, next) {
    let picPatharr = [];
    try {
      if (!req.file) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
      let updateVal = [], imgArray = [];
      const excelFile = pathAll(req.file.filename, 'xlsx');
      const workbook = new ExcelJS.Workbook();
      const wb = await workbook.xlsx.readFile(excelFile);
      const ws = wb.getWorksheet('Kelas_updater');
      if(ws.getImages().length){
        for (const image of ws.getImages()) {            
          const img = workbook.model.media.find(m => m.index === image.imageId);
          const row = image.range.tl.nativeRow, col = image.range.tl.nativeCol;
          const picPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-banner');
          const thumbPath = pathAll(`${row}.${col}.${img.name}.${img.extension}`, 'img-thumbnail');
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
          imgArray.push(`${row}.${col}.${img.name}.${img.extension}`);
          picPatharr.push(picPath);
        }
      }
      for(let rowNum = 0; rowNum <= ws.actualRowCount; rowNum++){
        if(rowNum > 1){
          let row = ws.getRow(rowNum).values;
          let img = imgArray[rowNum-1];
          row[5] = row[5] ?? null;
          row[8] = row[8] ?? null;
          let getMk = await Matakuliah.findOne({
            attributes:['id_matkul','nama_matkul'],
            where: {nama_matkul: row[4]}
          });                  
          let getSemester = await Ref_semester.findOne({
            attributes:['id_semester','semester'],
            where: {semester: row[5]}
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
            deskripsi: row[8],
            updated_at: fn('NOW')
          }
          if(!img) delete data.illustrasi_kelas;
          updateVal.push(data);
          if(row[9]||row[10]||row[11]) {
            const kelas = await Kelas.findOne({where: {id_kelas: row[1]}});
            for(let i = 0; i < 3; i++){
              if(row[9+i]) {
                let idDosen = await dosen(Dosen, row[9+i]);
                kelas.setDosens(idDosen.id_dosen);
              } continue;
            }
          }           
        }
      }
      await Kelas.bulkCreate(updateVal, {
        updateOnDuplicate: [ 'id_kelas','kode_seksi','id_matkul','id_semester', 
          'hari','jam','deskripsi','updated_at' ]
      });
      CacheControl.putKelas();  
      res.status(200).json({
        success: true,
        msg: 'data kelas berhasil diubah sesuai: ' + req.file.originalname
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
      const { id_kelas } = req.params;
      const getKelas = await Kelas.findByPk(id_kelas);
      if (!getKelas) { throw createError.NotFound('data kelas tidak ditemukan.')}
      //console.log(Object.keys(getKelas.__proto__))
      await Kelas.destroy({
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
  /* Kelas-ujian operation method */
  async kelasGetAllUjian(req, res, next){
    try {
      const idKelas = req.params.id_kelas;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        where: {'$Kelases.id_kelas$': idKelas},
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {
            model: Kelas, as: 'Kelases', required: true, attributes: ['id_kelas'],
            through: { attributes: [] },
          },
          {model: Ref_jenis_ujian, as: 'RefJenis'},
          {model: Paket_soal, as: 'PaketSoals'},
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      const ujian = await paginator(Ujian, pages, limits, opt);
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

  async kelasSearchUjian(req, res, next){
    try {
      let { find } = req.query;
      const validator = ujianValidator(find);
      const idKelas = req.params.id_kelas;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        where: { [Op.and]: [{'$Kelases.id_kelas$': idKelas}, {
          [Op.or]: validator}]
        },
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {
            model: Kelas, as: 'Kelases', required: true, attributes: ['id_kelas'],
            through: { attributes: [] },
          },
          {model: Ref_jenis_ujian, as: 'RefJenis'},
          {model: Paket_soal, as: 'PaketSoals', attributes: ['kode_paket']},
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      const ujian = await paginator(Ujian, pages, limits, opt);
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
      const kelas = await Kelas.findByPk(id_kelas);
      kelas.addUjians(id_ujian);
      CacheControl.postNewUjianKelas();
      res.status(200).json({
        success: true,
        msg: `kelas berhasil direlasikan dengan ujian, ${id_ujian}`
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
      const kelas = await Kelas.findByPk(id_kelas);
      kelas.setUjians(id_ujian);
      CacheControl.putUjianKelas();
      res.status(200).json({
        success: true,
        msg: `relasi ujian pada kelas ${kelas.kode_seksi}, berhasil diubah`
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
      const kelas = await Kelas.findByPk(id_kelas);
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
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {model: Ref_jenis_ujian, as: 'RefJenis'}
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      const ujian = await paginator(Ujian, pages, limits, opt);
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

  async searchUjian(req, res, next){
    try {
      let { find } = req.query;
      const validator = ujianValidator(find);
      if (validator instanceof createError) throw validator;
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        where: {[Op.or]: validator},
        offset: (pages - 1) * limits,
        limit: limits,
        include: [
          {model: Ref_jenis_ujian, as: 'RefJenis'},
          {model: Paket_soal, as: 'PaketSoals', attributes: ['kode_paket']},
        ],
        order: [
          ['created_at', 'DESC']
        ]
      }
      const ujian = await paginator(Ujian, pages, limits, opt);
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
      const ujian = await Ujian.findOne({
        where: {id_ujian: id_ujian},
        include: [
          {model: Paket_soal, as: 'PaketSoals'},
          {model: Ref_jenis_ujian, as: 'RefJenis'},
          {
            model: Kelas, as: 'Kelases', attributes: ['id_kelas', 'kode_seksi'],
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
      const { tanggal_mulai, waktu_mulai, status, aktif, deskripsi } = req.body;
      const { id_ujian } = req.params;
      let updateVal = {
        tanggal_mulai: tanggal_mulai,
        waktu_mulai: waktu_mulai,
        status: status,
        aktif: aktif,
        deskripsi: deskripsi,
        updated_at: fn('NOW')
      };
      await Ujian.update(updateVal, {
        where: { id_ujian: id_ujian }
      });
      CacheControl.putUjian();
      res.status(200).json({
        success: true,
        msg: `data ujian ${id_ujian} berhasil diubah`
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
      await Ujian.update(updateVal, {
        where: { id_ujian: id_ujian }
      });
      CacheControl.patchStatusUjian;
      res.status(200).json({
        success: true,
        msg: `status ujian berhasil diubah`
      })
    } catch (error) {
      next(error);
    }
  },

  async patchKeaktifanUjian(req, res, next){
    try {
      const { id_ujian } = req.params;      
      const aktivasi = await Ujian.findOne({
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
      await Ujian.update(updateVal, {
        where: { id_ujian: id_ujian }
      });
      CacheControl.patchKeaktifanUjian;
      res.status(200).json({
        success: true,
        msg: `ujian berhasil ${keaktifan}`
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteUjian(req, res, next){
    try {
      const { id_ujian } = req.params;
      const ujian = await Ujian.findOne({
        where: {id_ujian: id_ujian}
      });
      if (!ujian) { throw createError.NotFound('data ujian tidak ditemukan.')}
      await Ujian.destroy({
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
  // paket-soal_mhs operation
  async randomizePkSoal(req, res, next){
    try {
      const { id_kelas, id_paket } = req.body;
      const kelasMhs = await Kelas.findOne({ 
        where: {id_kelas: id_kelas}, include: {
          model: Mahasiswa, as: 'Mahasiswas', attributes: ['id_mhs']
        }
      }).then((i) => { 
        return i.Mahasiswas.map(({id_mhs}) => {return id_mhs})
      });
      shuffleArray(kelasMhs);
      const mapped = kelasMhs.map((i) => {    
        const randomPaket = Math.floor(Math.random() * id_paket.length);
        const kdPaket = id_paket[randomPaket]
        return {
          id_paket: kdPaket,
          id_mhs: i
        }
      });
      await Rel_mahasiswa_paketsoal.bulkCreate(mapped);
      CacheControl.postNewMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `paket-soal berhasil direlasikan dengan mahasiswa pada kelas ${kelasMhs.kode_seksi}`
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
      await Rel_mahasiswa_paketsoal.bulkCreate(paketMhs);
      CacheControl.postNewMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `paket-soal berhasil direlasikan dengan mahasiswa, ${id_mhs}`
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
      await Rel_mahasiswa_paketsoal.bulkCreate(paketMhs, {
        updateOnDuplicate: ['id_paket', 'id_mhs']
      });
      CacheControl.putMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `relasi paket-soal mahasiswa berhasil diubah`
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
      await Rel_mahasiswa_paketsoal.destroy({ where:{[Op.and]: [
        {id_paket: id_paket}, {id_mhs: id_mhs}]
      }});
      CacheControl.deleteMhsPkSoal();
      res.status(200).json({
        success: true,
        msg: `relasi paket-soal mahasiswa berhasil diubah`
      });
    } catch (error) {
      next(error);
    }
  },

  async deletePaketSoal(req, res, next){
    try {
      const { id_paket } = req.params;
      const paketExist = await Paket_soal.findOne({where: {id_paket: id_paket}});
      if (!paketExist) throw createError.NotFound('data paket-soal tidak ditemukan.')    
      paketExist.setSoals([]);
      paketExist.setMahasiswas([]);
      await Paket_soal.destroy({
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
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const vals = await paginator(Lupa_pw, pages, limits);
      if(vals.results.length === 0) vals.results.push('No record...');
      CacheControl.getLupapw(req);
      res.status(200).json(vals);
    } catch (error) {
      next(error);
    }
  },

  async resetPw(req, res, next) {
    try {
        const { id_reset } = req.params;
        const getlupapw = await Lupa_pw.findByPk(id_reset);
        const getUserdata = await getUser({username:getlupapw.username});
        let updateVal = { password: await hashed(), updated_at: fn('NOW')};
        await User.update(updateVal, {
          where: { id: getUserdata.id }
        });
        await Lupa_pw.update({status: 'sudah'}, {
          where:{
            id_reset_pw: getlupapw.id_reset_pw
          }
        });
        CacheControl.resetPw;
        res.status(204).json({
          success: true,
          msg: 'password '+getUserdata.username+' menjadi default, '
                +config.auth.defaultPass
        });
    } catch (error) {
      next(error);
    }
  },

  async deleteLupapw(req, res, next) {
    try {
      const { id_reset } = req.params;
      const getlupapw = await Lupa_pw.findByPk(id_reset)
      if (!getlupapw) { throw createError.NotFound('data lupa-pass tidak ditemukan.')}
      await Lupa_pw.destroy({
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
  /* Pengumuman operation methods*/
  async getPengumumanAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const vals = await paginator(Pengumuman, pages, limits);
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
      const val = await Pengumuman.findByPk(id_pengumuman);
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
      const getPengummn = await Pengumuman.findOne({
        attributes:['pengumuman'],
        where:{pengumuman:pengumuman}
      });
      if (getPengummn) {
        throw createError.Conflict('Pengumuman sudah terdaftar');
      } else if (!pengumuman) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        await Pengumuman.create({
          pengumuman: pengumuman,
          status: status
        });
        CacheControl.postNewPengumuman();
        res.status(200).json({
          success: true,
          msg: 'pengumuman berhasil ditambahkan'
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
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            pengumuman: pengumuman,
            status: status
        };
        await Pengumuman.update(updateVal, {
          where: { id_pengumuman: id_pengumuman }
        });
        CacheControl.putPengumuman();
        res.status(200).json({
          success: true,
          msg: 'data pengumuman berhasil diubah'
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async deletePengumuman(req, res, next) {
    try {
        const { id_pengumuman } = req.params;
        const getpengumuman = await Pengumuman.findByPk(id_pengumuman);
        if (!getpengumuman) { throw createError.NotFound('data pengumuman tidak ditemukan.')}
        await Pengumuman.destroy({
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
  /* Captcha operation methods*/
  async getCaptchaAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const vals = await paginator(Captcha, pages, limits);
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
      const captcha = await Captcha.findByPk(idCaptcha);
      CacheControl.getCaptcha;
      res.status(200).json(captcha);
    } catch (error) {
      next(error);
    }
  },

  async setCaptcha (req, res, next) {
    try {
      const { pertanyaan, jawaban } = req.body;
      const getCaptcha = await Captcha.findOne({where:{[Op.or]: [
        {pertanyaan:pertanyaan}, {jawaban:jawaban}]
      }});
      if (getCaptcha) {
        throw createError.Conflict('Pertanyaan dan/atau jawaban sudah terdaftar');
      } else if (!pertanyaan&&!jawaban) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        await Captcha.create({
          pertanyaan: pertanyaan,
          jawaban: jawaban
        });
        CacheControl.postNewCaptcha();
        res.status(200).json({
          success: true,
          msg: 'captcha berhasil ditambahkan'
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
        throw createError.BadRequest('tolong diisi!');
      } else {
        await Captcha.update({
          pertanyaan: pertanyaan,
          jawaban: jawaban
        }, {
          where: { id_captcha: idCaptcha }
        });
        CacheControl.putCaptcha();
        res.status(200).json({
          success: true,
          msg: 'captcha berhasil diubah'
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async deleteCaptcha(req, res, next) {
    try {
      const { id_captcha } = req.params;
      const getCpt = await Captcha.findByPk(id_captcha);
      if (!getCpt) { throw createError.NotFound('data captcha tidak ditemukan.')}
      await Captcha.destroy({
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
  /* Semester operation methods*/
  async getSmstrAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const vals = await paginator(Ref_semester, pages, limits);
      CacheControl.getAllSemester(req);
      res.status(200).json(vals);
    } catch (error) {
      next(error);
    }
  },

  async setSemester (req, res, next) {
    try {
      const { semester } = req.body;
      const getSemester = await Ref_semester.findOne({where:{semester:semester}});
      if (getSemester) {
        throw createError.Conflict('Semester sudah terdaftar');
      } else {
        await Ref_semester.create({
          semester:semester
        });
        CacheControl.postNewSemester();
        res.status(200).json({
          success: true,
          msg: 'semester berhasil ditambahkan'
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
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            semester: semester,
        };
        await Ref_semester.update(updateVal, {
          where: { id_semester: id_semester }
        });
        CacheControl.putSemester();
        res.status(200).json({
          success: true,
          msg: 'data semester berhasil diubah'
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async deleteSemester(req, res, next) {
    try {
        const { id_semester } = req.params;
        const getSms = await Ref_semester.findOne({
          where: {id_semester: id_semester}
        });
        if (!getSms) { throw createError.NotFound('data semester tidak ditemukan.')}
        await Ref_semester.destroy({
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
  /* Notifikasi operation methods*/
  async getNotifikasiAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const vals = await paginator(Notifikasi, pages, limits);
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
      const val = await Notifikasi.findByPk(id_notif);
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
      const userPenerima = await User.findOne({
        attributes: ['id'],
        where: { id: id_penerima }
      });
      if(!userPenerima) throw createError.NotFound('user tidak ditemukan.');
      const admin = await req.user;
      await Notifikasi.create({
        id_pengirim: admin.id,
        id_penerima: userPenerima.id,
        notifikasi: pesan,
        created_at: fn('NOW')
      });
      CacheControl.postNewNotifikasi();
      res.status(200).json({
        success: true,
        msg: 'notifikasi berhasil dikirim.'
      });
    } catch (error) {
      next(error);
    }
  },

  async putNotifikasi(req, res, next) {
    try {
      const { id_penerima, pesan } = req.body;
      const idNotif = req.params.id_notif;
      const userPenerima = await User.findOne({
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
      await Notifikasi.update( updateVal, {
        where: {id_notif: idNotif}
      });
      CacheControl.putNotifikasi();
      res.status(200).json({
        success: true,
        msg: 'notifikasi berhasil diubah'
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteNotifikasi(req, res, next) {
    try {
      const idNotif = req.params.id_notif;
      const getNotif = await Notifikasi.findByPk(idNotif);
      if (!getNotif) { throw createError.NotFound('data notifikasi tidak ditemukan.')}
      await Notifikasi.destroy({
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

  async setIllustrasi(req, res, next) {
    try {      
      const nama_illustrasi = req.file.filename;
      await Ref_illustrasi.create({
        nama_illustrasi: nama_illustrasi
      });
      const img = await sharp(fs.readFileSync(pathAll(nama_illustrasi, 'img-banner')))
      .resize(150, 100)
      .toFile(pathAll(nama_illustrasi, 'img-thumbnail'))
      if(img instanceof Error) {
        console.error(img);
        throw createError.internal('gagal mengupload gambar');
      }
      CacheControl.postNewIllustrasi();
      res.status(200).json({
        success: true,
        msg: 'banner dan thumbnail berhasil ditambahkan'
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
      const idIllustrasi = req.params.id_illustrasi;
      const getIllustrasi = await Ref_illustrasi.findByPk(idIllustrasi);
      if (!getIllustrasi) { throw createError.NotFound('data banner tidak ditemukan.')}
      await Ref_illustrasi.destroy({
        where: {id_illustrasi: idIllustrasi}
      });
      await unlinkAsync(pathAll(getIllustrasi.nama_illustrasi, 'img-banner'));
      await unlinkAsync(pathAll(getIllustrasi.nama_illustrasi, 'img-thumbnail'));
      CacheControl.deleteIllustrasi();
      res.status(200).json({
        success: true,
        msg: 'banner dan thumbnail berhasil dihapus'
      });
    } catch (error) {
      next(error);
    }
  }
}