const { User, Dosen, Mahasiswa,
  Captcha, Lupa_pw, Matakuliah, 
  Ref_kel_matkul, Ref_peminatan, 
  Ref_semester, Kelas } = require('../models');
const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
const config = require('../config/dbconfig');
const sequelize = require('sequelize');
const path = require('path')
const readXlsxFile = require('read-excel-file/node')
const { paginator } = require('../helpers/global')
const createError = require('../errorHandlers/ApiErrors');

// function jwtSignuser (user) {
//   const TIME = 60 * 60 * 24 * 1 // per-1 hari
//   return jwt.sign(user, config.auth.secretKey, {
//     expiresIn: TIME
//   });
// }
const getUser = async obj => {
  return await User.findOne({
      where: obj
  });
}

// const getDosen = async obj => {
//   return await Dosen.findOne({
//       where: obj
//   });
// }

// const getMhs = async obj => {
//   return await Mahasiswa.findOne({
//       where: obj
//   });
// }

const getUserid = async () => {
  return await (User.max('id')).then((val) => {
    return Promise.resolve(parseInt(val))
  });
}

const hashed = async () => {  
  return await new Promise((resolve, reject) => {
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

  
  async getProfil(req, res, next) {
    try {
      const { id } = req.params
      // if (id != req.user.id) { throw createError.Unauthorized('') }
      const admin = await getUser({id:id})
      res.send(admin)
    } catch (error) {
      next(error)
    }
  },

  async editProfil(req, res, next) {
    try {
      const { username, email, status_civitas, keterangan } = req.body
      const { id } = req.params
      // if (id != req.user.id) { throw createError.Unauthorized('') }      
      const user = await getUser({id:id})
      if ( user.kode_role !== 1) { throw createError.Unauthorized('tidak bisa diedit disini!') }
      let updateVal = { 
        username: username,
        email: email,
        status_civitas: status_civitas,
        keterangan: keterangan,
        updated_at: sequelize.fn('NOW')
      };

      await User.update(updateVal, { 
        where: { id: user.id } 
      });

      res.status(200).json({
        success: true,
        msg: 'profil '+ user.username +' berhasil diedit'
      })/*.then(() => {
        res.redirect('/')
      })*/
    } catch (error) {
      next(error)
    }
  },

  async daftarDosenbulk (req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
  
      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path)
        // skip header
        rows.shift();
        
        for(let row of rows) {
          let userId = await getUserid()+1;
          let pass = await hashed();
          await User.create({
            username: 'User'+' '+ userId,
            email: row[4],
            status_civitas: 'aktif',
            password: pass,
            kode_role: '2',
            created_at: sequelize.fn('NOW'),
            Dosen: {
                NIP: row[0],
                NIDN: row[1],
                NIDK: row[2],
                nama_lengkap: row[3],
                nomor_telp: '0'+row[5],
                created_at: sequelize.fn('NOW')
              }
          }, {
            include: {
              model: Dosen,
              association: User.associations.Dosen
            }
          });
        }
          
        res.status(200).send({
          msg: 'data berhasil diimport ke DB: ' + req.file.originalname
        })
    } catch (error) {
      console.log('periksa excelnya')
      next(error)
    }     
  },

  async daftarMhsbulk (req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
  
      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path)
        // skip header
        rows.shift();
        
        for(let row of rows) {
          let userId = await getUserid()+1;
          let pass = await hashed();
          await User.create({
            username: 'User'+' '+ userId,
            email: row[2],
            status_civitas: 'aktif',
            password: pass,
            kode_role: '3',
            created_at: sequelize.fn('NOW'),
            Mahasiswa: {
                NIM: row[0],                
                nama_lengkap: row[1],
                nomor_telp: '0'+row[3],
                created_at: sequelize.fn('NOW')
              }
          }, {
            include: {
              model: Mahasiswa,
              association: User.associations.Mahasiswa
            }              
          });
        }
          
        res.status(200).send({
          msg: 'data berhasil diimport ke DB: ' + req.file.originalname
        })
    } catch (error) {
      console.log('periksa excelnya')
      next(error)
    }     
  },

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
            created_at: sequelize.fn('NOW')
        });
        const userJson = user.toJSON();
        res.status(200).json({
          success: true,
          msg: 'new Admin berhasil ditambah',
          user_id: userJson.id,
          username: userJson.username,
          email: userJson.email,
          created_at: userJson.created_at
        });
    } catch (error) {
        next(error);
    }
  },

  async daftar (req, res, next) {
    try {
        const { role, NIP, NIDN, NIDK, NIM, email, nama_lengkap, nomor_telp} = req.body;
        var data;
        var username = await getUserid()+1;

        if ( role === 'Dosen' ) {
          data = async () => {
            return await User.create({   
              username: 'User'+' '+ username,
              email: email,
              status_civitas: 'aktif',
              password: await hashed(),
              kode_role: '2',
              foto_profil: null,
              keterangan: null,
              created_at: sequelize.fn('NOW'),
              Dosen: {
                  NIP: NIP,
                  NIDN: NIDN,
                  NIDK: NIDK,
                  nama_lengkap: nama_lengkap,
                  nomor_telp: nomor_telp,
                  created_at: sequelize.fn('NOW')
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
            username: 'User'+' '+ username,
            email: email,
            status_civitas: 'aktif',
            password: await hashed(),
            kode_role: '3',
            foto_profil: null,
            keterangan: null,
            created_at: sequelize.fn('NOW'),
            Mahasiswa: {
                NIM: NIM,
                nama_lengkap: nama_lengkap,
                nomor_telp: nomor_telp,
                created_at: sequelize.fn('NOW')
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

  async getusers(req, res, next) {
    try {
      const pages = parseInt(req.query.page)
      const limits = parseInt(req.query.limit)               
      res.send(await paginator(User, pages, limits))
    } catch (error) {
      next(error)
    }
  },

  async tambahCaptcha (req, res, next) {
    try {
      const { pertanyaan, jawaban } = req.body;
      const getCaptcha = await Captcha.findOne({where:{pertanyaan:pertanyaan}});
      const getCaptcha2 = await Captcha.findOne({where:{jawaban:jawaban}});
      if (getCaptcha&&getCaptcha2) {
        throw createError.Conflict('Pertanyaan dan jawaban sudah terdaftar');
      } else if (!pertanyaan&&!jawaban) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        const captcha = await Captcha.create({
          pertanyaan: pertanyaan,
          jawaban: jawaban
        });
        res.status(200).json({
          success: true,
          msg: 'captcha berhasil ditambahkan',
          captcha: captcha
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async tambahSemester (req, res, next) {
    try {
      const { semester } = req.body;
      const getSemester = await Ref_semester.findOne({where:{semester:semester}});
      if (getSemester) {
        throw createError.Conflict('Semester sudah terdaftar');     
      } else {
        const smstr = await Ref_semester.create({
          semester:semester
        });
        res.status(200).json({
          success: true,
          msg: 'semester berhasil ditambahkan',
          semester: smstr
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async getLupapw(req, res, next) {
    try {
      const pages = parseInt(req.query.page)
      const limits = parseInt(req.query.limit)               
      res.send(await paginator(Lupa_pw, pages, limits))
    } catch (error) {
      next(error)
    }
  },

  async resetPw(req, res, next) {
    try {
        const { kode_reset } = req.params;
        const getlupapw = await Lupa_pw.findOne({where:{kode_reset_pw: kode_reset}});    
        const getUserdata = await getUser({username:getlupapw.username});
        
        let updateVal = { password: await hashed(), updated_at: sequelize.fn('NOW')};

        await User.update(updateVal, { 
          where: { id: getUserdata.id } 
        });
        await Lupa_pw.update({status: 'sudah'}, { 
          where:{
            kode_reset_pw: getlupapw.kode_reset_pw
          }
        });

        res.status(204).json({
          success: true,
          msg: 'password '+getUserdata.username+' menjadi default, '
                +config.auth.defaultPass
        });
    } catch (error) {
      next(error)
    }
  },

  async hapusLupapw(req, res, next) {
    try {
        const { kode_reset } = req.params;        
        const getlupapw = await Lupa_pw.findOne({where:{kode_reset_pw: kode_reset}});
        if (!getlupapw) { throw createError.NotFound('data tidak ditemukan')}
        await Lupa_pw.destroy({ 
          where:{
            kode_reset_pw: getlupapw.kode_reset_pw
          }
        });
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error)
    }
  },

  async matakuliahAdd(req, res, next){
    try {
      const { kode_matkul, kelompok_matkul, peminatan, nama_matkul, semester, sks, deskripsi } = req.body
      const getKelmk = await Ref_kel_matkul.findOne({where:{kelompok_matakuliah:kelompok_matkul}})
      const getPemin = await Ref_peminatan.findOne({where:{peminatan:peminatan}})      
      const getSms = await Ref_semester.findOne({where:{semester:semester}})
      await Matakuliah.create({
        kode_matkul: kode_matkul,
        kode_kel_mk: getKelmk.kode_kel_mk,
        kode_peminatan: getPemin.kode_peminatan,
        nama_matkul: nama_matkul,
        semester: getSms.kode_semester,
        sks: sks,
        deskripsi: deskripsi
      })
      res.status(200).json({
        success: true,
        msg: 'matakuliah berhasil ditambahkan',
        kode_matkul: kode_matkul,
        matakuliah: nama_matkul,
        semester: semester,
        sks: sks
      });
    } catch (error) { console.log(error)
      next(error)
    }
  },

  async matakuliahAddbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
  
      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path)
        // skip header
        rows.shift();

        let matkuls = [];
        
        for(let row of rows) {
          let val = {
            getKelmk: await Ref_kel_matkul.findOne({where:{kelompok_matakuliah:row[1]}}),
            getPemin: await Ref_peminatan.findOne({where:{peminatan:row[2]}}),
            getSms: await Ref_semester.findOne({where:{semester:row[4]}})
          }          
          matkuls.push({
            kode_matkul: row[0],
            kode_kel_mk: val.getKelmk.kode_kel_mk,
            kode_peminatan: val.getPemin.kode_peminatan,
            nama_matkul: row[3],
            semester: val.getSms.kode_semester,
            sks: row[5],
            deskripsi: row[6]
          })
        }
        await Matakuliah.bulkCreate(matkuls).then(() => {
          res.status(200).send({
            msg: 'data berhasil diimport ke DB: ' + req.file.originalname
          })
        }) 
    } catch (error) {
      console.log('periksa excelnya')
      next(error)
    }     
  },

  async kelasAdd(req, res, next){
    try {
      const { kode_seksi, nama_matkul, hari, jam, deskripsi } = req.body
      const getKodeMK = await Matakuliah.findOne({where:{nama_matkul:nama_matkul}})
      await Kelas.create({
        kode_seksi: kode_seksi,
        kode_matkul: getKodeMK.kode_matkul,
        hari: hari,
        jam: jam,
        deskripsi: deskripsi
      })
      res.status(200).json({
        success: true,
        msg: 'kelas berhasil ditambahkan',
        kode_seksi: kode_seksi,
        kode_matkul: getKodeMK.kode_matkul,
        matkul: getKodeMK.nama_matkul
      });
    } catch (error) { console.log(error)
      next(error)
    }
  },

  async kelasAddbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }
  
      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path)
        // skip header
        rows.shift();

        let kelass = [];
        
        for(let row of rows) {
          let val = {
            getKodeMK: await Matakuliah.findOne({where:{nama_matkul:row[1]}})
          }          
          kelass.push({
            kode_seksi: row[0],
            kode_matkul: val.getKodeMK.kode_matkul,
            hari: row[2],
            jam: row[3],
            deskripsi: row[4]
          })
        }
        await Kelas.bulkCreate(kelass).then(() => {
          res.status(200).send({
            msg: 'data berhasil diimport ke DB: ' + req.file.originalname
          })
        }) 
    } catch (error) {
      console.log('periksa excelnya')
      next(error)
    }     
  },

  async getallDosen(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Dosen, pages, limits);
        let vals = [];
        for(let dataValues of val.results) {// iterate over array from findall
            vals.push({// push only some wanted values, zellev
                NIDN: dataValues.NIDN,
                NIDK: dataValues.NIDK,
                nama_lengkap: dataValues.nama_lengkap
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

  async getallMhs(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Mahasiswa, pages, limits);
        let vals = [];
        for(let dataValues of val.results) {// iterate over array from findall
            vals.push({// push only some wanted values, zellev
                NIM: dataValues.NIM,
                nama_lengkap: dataValues.nama_lengkap
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
}