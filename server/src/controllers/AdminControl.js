const { User, Dosen, Mahasiswa,
  Captcha, Lupa_pw, Matakuliah,
  Ref_kel_matkul, Ref_peminatan,
  Ref_semester, Kelas,
  Pengumuman, Paket_soal,
  Rel_dosen_kelas } = require('../models');
const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
const config = require('../config/dbconfig');
const sequelize = require('sequelize');
const path = require('path');
const readXlsxFile = require('read-excel-file/node');
const { paginator } = require('../helpers/global');
const createError = require('../errorHandlers/ApiErrors');
const { Op } = require('sequelize');

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
  /* Dashboard */
  async getDashboard(req, res, next) {
    try {
      /*
        stuff in dashboard:
        -graph stuff about:
          1.  Number of active users of app, uses session
          2.  Number of total users, update/day
          3.  Number of total users /role, update/day
          4.  Number of accessed kelas and matkul per month
          5.  Number of paket soal created per day
          6.  Number of ujian started and/or completed per day
      */
      // const sessioned = express.session
      const users = await User.count();
      const userAdmin = await User.count({
        where: {kode_role: '1'}
      });
      const userDosen = await User.count({
        where: {kode_role: '2'}
      });
      const userMahasiswa = await User.count({
        where: {kode_role: '3'}
      });
      const paketSoal = await Paket_soal.count();
      res.send({
        total_users: users,
        jumlah_admin: userAdmin,
        jumlah_dosen: userDosen,
        jumlah_mhs: userMahasiswa,
        total_paketSoal: paketSoal
      })
    } catch (error) {
      next(error);
    }
  },
  /* User operation */
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
        const users = await Promise.all(vals)
        res.send({
            next:val.next,
            previous:val.previous,
            users: users
        })
    } catch (error) {
      next(error);
    }
  },

  async getUser(req, res, next) {
    try {
      const { id_user } = req.params;
      const user = await getUser({id:id_user});
      let role;
      if (user.kode_role === 3){
        const mhs =  await user.getMahasiswa();
        role = {
          user_id: user.id,
          username: user.username,
          email: user.email,
          status_civitas: user.aktif,
          role: 'Mahasiswa',
          foto_profil: user.foto_profil,
          keterangan: user.keterangan,
          Mahasiswa: mhs
        };
      } else if (user.kode_role === 2){
        const dosen =  await user.getDosen();
        role = {
          user_id: user.id,
          username: user.username,
          email: user.email,
          status_civitas: user.aktif,
          role: 'Dosen',
          foto_profil: user.foto_profil,
          keterangan: user.keterangan,
          Mahasiswa: dosen
        };
      } else {
        role = user;
      }
      res.send(role);
    } catch (error) {
      next(error);
    }
  },

  async ubahUser(req, res, next) {
    try {
      const { id_user } = req.params;
      const { username, email, status_civitas, keterangan } = req.body;
      if (!email) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            username: username,
            email: email,
            status_civitas: status_civitas,
            keterangan: keterangan,
            updated_at: sequelize.fn('NOW')
        };
        await User.update(updateVal, {
          where: { id: id_user }
        });

        res.status(200).json({
          success: true,
          msg: 'data user berhasil diubah',
          id_user: id_user
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async ubahUserbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
        // skip header
        rows.shift();

        let updates = [];

      for(let row of rows) {
        updates.push({
          id: row[0],
          username: row[1],
          email: row[2],
          status_civitas: row[3],
          keterangan: row[4],
          updated_at: sequelize.fn('NOW')
        })
      }
      await User.bulkCreate(updates, {
        updateOnDuplicate: [
          'id', 'username','email','status_civitas',
          'keterangan', 'updated_at'
        ]
      });

      res.status(200).json({
        success: true,
        msg: 'data user berhasil diubah sesuai: ' + req.file.originalname
      });
    } catch (error) {
      console.log('periksa excelnya');
      next(error);
    }
  },

  async hapusUser(req, res, next) {
    try {
        const { id_user } = req.params;
        const getuser = await getUser({id:id_user})
        if (!getuser) { throw createError.NotFound('data tidak ditemukan')}
        const delUser = await User.destroy({
          where:{
            id: getuser.id
          }
        })
        if(getuser.kode_role === 3){
          const mhs = getuser.getMahasiswa()
          const delmhs = await Mahasiswa.destroy({
            where:{kode_mhs: mhs.kode_mhs}
          })
          delUser && delmhs
        } else if(getuser.kode_role === 2){
          const dosen = getuser.getDosen()
          const deldosen = await Dosen.destroy({
            where:{kode_dosen: dosen.kode_dosen}
          })
          delUser && deldosen
        } else {
          delUser
        }
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Profil admin operation */
  async getProfil(req, res, next) {
    try {
      const { id } = req.params;
      if (id != req.user.id) { throw createError.Unauthorized('access violation!') }
      const admin = await getUser({id:id});
      res.send(admin)
    } catch (error) {
      next(error);
    }
  },

  async editProfil(req, res, next) {
    try {
      const { username, email, status_civitas, keterangan } = req.body;
      const { id } = req.params;
      // if (id != req.user.id) { throw createError.Unauthorized('') }
      const user = await getUser({id:id});
      if ( user.kode_role !== 1) { throw createError.Forbidden('tidak bisa diedit disini!') }
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

  async daftarAdmin (req, res, next){
    try {
        const { email, username } = req.body
        const user = await User.create({
            username: username,
            email: email,
            password: await hashed(),
            status_civitas: 'aktif',
            kode_role: '1',
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
  /* Daftar operation */
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
  /* Dosen operation */
  async getallDosen(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Dosen, pages, limits);
        let vals = [];
        for(let i of val.results) {// iterate over array from findall
            vals.push({// push only some wanted values, zellev
                kode_dosen: i.kode_dosen,
                NIDN: i.NIDN,
                NIDK: i.NIDK,
                nama_lengkap: i.nama_lengkap
            })
        }
        const dosen = await Promise.all(vals);
        res.send({
            next:val.next,
            previous:val.previous,
            dosen: dosen
        })
    } catch (error) {
      next(error);
    }
  },

  async cariDosen(req, res, next) {
    try {
      let { find } = req.query;
      find = find.toLowerCase();
      let params = {
        dosen: [],
        val: null
      };
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        order: [['kode_dosen', 'ASC']],
        attributes: ['kode_dosen', 'NIDN', 'NIDK', 'nama_lengkap'],
        where: {
          [Op.or]: [
            sequelize.where(sequelize.fn('lower', sequelize.col('nama_lengkap')), 'LIKE', '%' + find + '%'),
            sequelize.where(sequelize.fn('lower', sequelize.col('NIDN')), 'LIKE', '%' + find + '%'),
            sequelize.where(sequelize.fn('lower', sequelize.col('NIDK')), 'LIKE', '%' + find + '%')
          ] 
        },
        offset: (pages - 1) * limits,
        limit: limits
      }
      params.dosen = await paginator(Dosen, pages, limits, opt);
      if (params.dosen.results.length === 0) {params.dosen.results.push('No Record...')}
      res.send({
        next: params.dosen.next,
        previous: params.dosen.previous,
        dosen: params.dosen.results
      })
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

      let rows = await readXlsxFile(Path);
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
      console.log('periksa excelnya');
      next(error);
    }
  },

  async ubahDosen(req, res, next) {
    try {
      const { kode_dosen } = req.params;
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
            updated_at: sequelize.fn('NOW')
        };
        await Dosen.update(updateVal, {
          where: { kode_dosen: kode_dosen }
        });

        res.status(200).json({
          success: true,
          msg: 'data dosen berhasil diubah',
          kode_dosen: kode_dosen
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async ubahDosenbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
        // skip header
        rows.shift();

        let updates = [];

      for(let row of rows) {
        updates.push({
          kode_dosen: row[0],
          NIP: row[1],
          NIDN: row[2],
          NIDK: row[3],
          nama_lengkap: row[4],
          alamat: row[5],
          nomor_telp: '0'+row[6],
          updated_at: sequelize.fn('NOW')
        })
      }
      await Dosen.bulkCreate(updates, {
        updateOnDuplicate: [
          'NIP','NIDN','NIDK','nama_lengkap',
          'alamat','nomor_telp', 'updated_at'
        ]
      });

      res.status(200).json({
        success: true,
        msg: 'data dosen berhasil diubah sesuai: ' + req.file.originalname
      });
    } catch (error) {
      console.log('periksa excelnya');
      next(error);
    }
  },

  async hapusDosen(req, res, next) {
    try {
        const { kode_dosen } = req.params;
        const getdosen = await Dosen.findOne({
          where: {kode_dosen: kode_dosen},
          include: {model: User, as: 'User'}
        });
        if (!getdosen) { throw createError.NotFound('data tidak ditemukan')}
        await Dosen.destroy({
          where:{
            kode_dosen: getdosen.kode_dosen
        }});
        await User.destroy({
          where:{
            id: getdosen.User.id
        }});
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Mahasiswa opearation */
  async getallMhs(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
        let val = await paginator(Mahasiswa, pages, limits);
        let vals = [];
        for(let i of val.results) {// iterate over array from findall
            vals.push({// push only some wanted values, zellev
                kode_mhs: i.kode_mhs,
                NIM: i.NIM,
                nama_lengkap: i.nama_lengkap
            })
        }
        const mhs = await Promise.all(vals);
        res.send({
            next:val.next,
            previous:val.previous,
            mhs: mhs
        })
    } catch (error) {
      next(error);
    }
  },

  async cariMhs(req, res, next) {
    try {
      let { find } = req.query;
      find = find.toLowerCase();
      let params = {
        mhs: [],
        val: null
      };
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        order: [['kode_mhs', 'ASC']],
        attributes: ['kode_mhs', 'NIM', 'nama_lengkap'],
        where: {
          [Op.or]: [
            sequelize.where(sequelize.fn('lower', sequelize.col('nama_lengkap')), 'LIKE', '%' + find + '%'),
            sequelize.where(sequelize.fn('lower', sequelize.col('NIM')), 'LIKE', '%' + find + '%')
          ] 
        },
        offset: (pages - 1) * limits,
        limit: limits
      }
      params.dosen = await paginator(Mahasiswa, pages, limits, opt);
      if (params.mhs.results.length === 0) {params.mhs.results.push('No Record...')}
      res.send({
        next: params.mhs.next,
        previous: params.mhs.previous,
        mhs: params.mhs.results
      })
    } catch (error) {
      next(error)
    }
  },

  async daftarMhsbulk (req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
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
      console.log('periksa excelnya');
      next(error);
    }
  },

  async ubahMhs(req, res, next) {
    try {
      const { kode_mhs } = req.params;
      const { NIM, nama_lengkap, alamat, nomor_telp } = req.body;
      if (!NIM) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            NIM: NIM,
            nama_lengkap: nama_lengkap,
            alamat: alamat,
            nomor_telp: nomor_telp,
            updated_at: sequelize.fn('NOW')
        };
        await Mahasiswa.update(updateVal, {
          where: { kode_mhs: kode_mhs }
        });

        res.status(200).json({
          success: true,
          msg: 'data mahasiswa berhasil diubah',
          kode_mhs: kode_mhs
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async ubahMhsbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
        // skip header
        rows.shift();

        let updates = [];

      for(let row of rows) {
        updates.push({
          kode_mhs: row[0],
          NIM: row[1],
          nama_lengkap: row[2],
          alamat: row[3],
          nomor_telp: '0'+row[4],
          updated_at: sequelize.fn('NOW')
        })
      }
      await Mahasiswa.bulkCreate(updates, {
        updateOnDuplicate: [
          'NIM','nama_lengkap','alamat',
          'nomor_telp', 'updated_at'
        ]
      });

      res.status(200).json({
        success: true,
        msg: 'data mahasiswa berhasil diubah sesuai: ' + req.file.originalname
      });
    } catch (error) {
      console.log('periksa excelnya');
      next(error);
    }
  },

  async hapusMhs(req, res, next) {
    try {
        const { kode_mhs } = req.params;
        const getMhs = await Mahasiswa.findOne({
          where: {kode_mhs: kode_mhs},
          include: {model: User, as: 'User'}
        });
        if (!getMhs) { throw createError.NotFound('data tidak ditemukan')}
        await Mahasiswa.destroy({
          where:{
            kode_mahasiswa: getMhs.kode_mhs
        }});
        await User.destroy({
          where:{
            id: getMhs.User.id
        }});
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Matakuliah operation */
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
            matkul: matkul
        })
    } catch (error) {
      next(error)
    }
  },

  async cariMatkul(req, res, next) {
    try {
      let { find } = req.query;
      find = find.toLowerCase();
      let params = {
        matkul: [],
        val: null
      };
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      let opt = {
        order: [['kode_matkul', 'ASC']],
        attributes: ['kode_matkul', 'nama_matkul', 'sks'],
        where: {
          [Op.or]: [
            sequelize.where(sequelize.fn('lower', sequelize.col('kode_matkul')), 'LIKE', '%' + find + '%'),
            sequelize.where(sequelize.fn('lower', sequelize.col('nama_matkul')), 'LIKE', '%' + find + '%'),
            sequelize.where(sequelize.fn('lower', sequelize.col('sks')), 'LIKE', '%' + find + '%'),
          ] 
        },
        offset: (pages - 1) * limits,
        limit: limits
      }
      params.matkul = await paginator(Matakuliah, pages, limits, opt);
      if (params.matkul.results.length === 0) {params.matkul.results.push('No Record...')}
      res.send({
        next: params.matkul.next,
        previous: params.matkul.previous,
        matkul: params.matkul.results
      })
    } catch (error) {
      next(error)
    }
  },

  async getMatkul(req, res, next) {
    try {
      const { kode_matkul } = req.params;
      const val = await Matakuliah.findOne({where:{kode_matkul:kode_matkul}});
      if (!val) { throw createError.BadRequest('matakuliah tidak terdaftar!')}
      // console.log(Object.keys(val.__proto__)); => magic logger!
      const kelMk = await val.getKelMk({where:{kode_kel_mk:val.kode_kel_mk}});
      const pemin = await val.getRefPemin({where:{kode_peminatan:val.kode_peminatan}});
      const matkul = {
        kode_matkul: val.kode_matkul,
        kelompok_Mk: kelMk.kelompok_matakuliah,
        Peminatan: pemin.peminatan,
        nama_matkul: val.nama_matkul,
        semester: val.semester,
        sks: val.sks,
        desktripsi: val.desktripsi
      };
      res.send(matkul);
    } catch (error) {
      next(error);
    }
  },

  async matakuliahAdd(req, res, next){
    try {
      const { kode_matkul, kelompok_matkul, peminatan, nama_matkul, semester, sks, deskripsi } = req.body;
      const getKelmk = await Ref_kel_matkul.findOne({where:{kelompok_matakuliah:kelompok_matkul}});
      const getPemin = await Ref_peminatan.findOne({where:{peminatan:peminatan}});
      const getSms = await Ref_semester.findOne({where:{semester:semester}});
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
    } catch (error) {
      next(error);
    }
  },

  async matakuliahAddbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
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
      console.log('periksa excelnya');
      next(error);
    }
  },

  async matkulEdit(req, res, next) {
    try {
      const { kode_matkul } = req.params;
      const { kode_mk, kelompok_mk, peminatan,
        nama_matkul, semester, sks, deskripsi } = req.body;
      if (!kode_mk) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        const mk = await Matakuliah.findByPk(kode_matkul);
        if (!mk){throw createError.BadRequest('matkul tidak terdaftar!')}
        const kel_mk = await mk.getKelMk({
          where:{kelompok_matakuliah:kelompok_mk}
        });
        const pemin = await mk.getRefPemin({
          where:{peminatan:peminatan}
        })
        let updateVal = {
            kode_matkul: kode_mk,
            kode_kel_mk: kel_mk.kode_kel_mk,
            kode_peminatan: pemin.kode_peminatan,
            nama_matkul: nama_matkul,
            semester: semester,
            sks: sks,
            deskripsi: deskripsi,
            updated_at: sequelize.fn('NOW')
        };
        await Matakuliah.update(updateVal, {
          where: { kode_matkul: kode_matkul }
        });

        res.status(200).json({
          success: true,
          msg: 'data matakuliah berhasil diubah',
          kode_matkul: kode_matkul
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async matkulEditbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
        // skip header
        rows.shift();

        let updates = [];

      for(let row of rows) {
        let val = {
          getKelmk: await Ref_kel_matkul.findOne({where:{kelompok_matakuliah:row[1]}}),
          getPemin: await Ref_peminatan.findOne({where:{peminatan:row[2]}}),
          getSms: await Ref_semester.findOne({where:{semester:row[4]}})
        }
        updates.push({
          kode_matkul: row[0],
          kode_kel_mk: val.getKelmk.kode_kel_mk,
          kode_peminatan: val.getPemin.kode_peminatan,
          nama_matkul: row[3],
          semester: val.getSms.kode_semester,
          sks: row[5],
          deskripsi: row[6],
          updated_at: sequelize.fn('NOW')
        })
      }
      await Matakuliah.bulkCreate(updates, {
        updateOnDuplicate: [
          'kode_matkul','kode_kel_mk','kode_peminatan',
          'nama_matkul','semester','sks','deskripsi','updated_at',
        ]
      });

      res.status(200).json({
        success: true,
        msg: 'data matakuliah berhasil diubah sesuai: ' + req.file.originalname
      });
    } catch (error) {
      console.log('periksa excelnya');
      next(error);
    }
  },

  async matkulDelete(req, res, next) {
    try {
        const { kode_matkul } = req.params;
        const getMatkul = await Matakuliah.findOne({
          where: {kode_matkul: kode_matkul},
          include: {model: Kelas, as: 'Kelas'}
        });
        if (!getMatkul) { throw createError.NotFound('data tidak ditemukan')}
        await Matakuliah.destroy({
          where:{
            kode_matkul: getMatkul.kode_matkul
          }});
        await Kelas.destroy({
          where:{
            kode_seksi:getMatkul.Kelas.kode_seksi
          }});
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Kelas operation*/
  async kelasAddDosen(req, res, next) {
    try {
      const { kode_seksi } = req.params
      const { pengampu } = req.body
      let val = [], nidk = [];
      const kls = await Kelas.findByPk(kode_seksi)
      const dosen = (model, noreg) => {
        return model.findOne({
          where:{[Op.or]:[
            {NIDN:noreg},
            {NIDK:noreg}
          ]}
        })
      }
      if(!pengampu.noreg_dosen1){
        throw createError.BadRequest('dosen 1 tidak boleh kosong!')
      } else {
        val[0] = await dosen(Dosen, pengampu.noreg_dosen1)
        val[1] = await dosen(Dosen, pengampu.noreg_dosen2)
        val[2] = await dosen(Dosen, pengampu.noreg_dosen3)
        for(let i of val){
          if(i != null){
            nidk.push(i.NIDK)
            kls.addDosen(i)
          }
        }
        res.status(200).json({
          success: true,
          msg: `dosen pengampu ${nidk}, berhasil ditambahkan ke kode seksi ${kode_seksi}`
        })
      }
    } catch (error) {
      next(error)
    }
  },

  async kelasChangeDosen(req, res, next) {
    try {
      const { kode_seksi } = req.params
      const { pengampu } = req.body
      let val = [], nidk = [], temp= [];
      const kls = await Kelas.findByPk(kode_seksi)
      const dosen = (model, noreg) => {
        return model.findOne({
          where:{[Op.or]:[
            {NIDN:noreg},
            {NIDK:noreg}
          ]}
        })
      }
      if(!pengampu.noreg_dosen1){
        throw createError.BadRequest('dosen 1 tidak boleh kosong!')
      } else {
        val[0] = await dosen(Dosen, pengampu.noreg_dosen1)
        val[1] = await dosen(Dosen, pengampu.noreg_dosen2)
        val[2] = await dosen(Dosen, pengampu.noreg_dosen3)
        for(let i of val){
          if(i != null){
            nidk.push(i.NIDK)
            temp.push(i)            
          }
        }
        kls.setDosens(temp)
        // console.log(Object.keys(kls.__proto__))
        res.status(200).json({
          success: true,
          msg: `dosen pengampu kode seksi ${kode_seksi}, berhasil diubah ke ${nidk}`
        })
      }
    } catch (error) {
      next(error)
    }
  },

  async kelasRemoveDosen(req, res, next) {
    try {
      const { kode_seksi } = req.params
      const kls = await Kelas.findByPk(kode_seksi)      
      kls.setDosens([])
      // console.log(Object.keys(kls.__proto__))
      res.status(200).json({
        success: true,
        msg: `semua dosen pengampu kode seksi ${kode_seksi}, berhasil dihapus`
      })      
    } catch (error) {
      next(error)
    }
  },

  async kelasAdd(req, res, next){
    try {
      const { kode_seksi, noreg_dosen, nama_matkul, hari, jam, deskripsi } = req.body;
      const getKodeMK = await Matakuliah.findOne({where:{nama_matkul:nama_matkul}});
      const getDosen = await Dosen.findOne({
        where:{[Op.or]:[
          {NIDN:noreg_dosen},
          {NIDK:noreg_dosen}
        ]}
      })
      if(!getKodeMK||!getDosen) {throw createError.BadRequest('nama matakuliah atau dosen tidak terdaftar!')}
      const kelas = await Kelas.create({
        kode_seksi: kode_seksi,
        kode_matkul: getKodeMK.kode_matkul,
        hari: hari,
        jam: jam,
        deskripsi: deskripsi
      })
      getDosen.addKelas(kelas)
      res.status(200).json({
        success: true,
        msg: 'kelas berhasil ditambahkan',
        kode_seksi: kode_seksi,        
        matkul: getKodeMK.nama_matkul,
        pengampu: getDosen.nama_lengkap
      });
    } catch (error) {
      next(error);
    }
  },

  async kelasAddbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
        // skip header
        rows.shift();

        let kelass = [];

        for(let row of rows) {
          let val = {
            getKodeMK: await Matakuliah.findOne({where:{nama_matkul:row[1]}}),
            getDosen: await Dosen.findOne({
                where:{[Op.or]:[
                {NIDN:row[5]},
                {NIDK:row[5]}
              ]}
            })
          }
          kelass.push({
            kode_seksi: row[0],
            kode_matkul: val.getKodeMK.kode_matkul,
            hari: row[2],
            jam: row[3],
            deskripsi: row[4]
          })
          await Rel_dosen_kelas.create({ 
            kode_dosen: val.getDosen.kode_dosen,
            kode_seksi: row[0]
          })
        }
        await Kelas.bulkCreate(kelass).then(() => {
          res.status(200).send({
            msg: 'data berhasil diimport ke DB: ' + req.file.originalname
          })
        })
    } catch (error) {
      console.log('periksa excelnya');
      next(error);
    }
  },

  async kelasEdit(req, res, next) {
    try {
      const { kode_seksi } = req.params;
      const { kode_sksi, noreg_dosen, matakuliah, hari, jam, deskripsi } = req.body;
      if (!kode_sksi) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        const getKelas = await Kelas.findByPk(kode_seksi);
        const getDosen = await Dosen.findOne({
          where:{[Op.or]:[
            {NIDN:noreg_dosen},
            {NIDK:noreg_dosen}
          ]}
        })
        if (!getKelas){throw createError.BadRequest('kelas tidak terdaftar!')}
        const mk = await getKelas.getMatkul({
          where:{nama_matkul: matakuliah}
        });
        let updateVal = {
            kode_seksi: kode_sksi,
            kode_matkul: mk.kode_matkul,
            hari: hari,
            jam: jam,
            deskripsi: deskripsi,
            updated_at: sequelize.fn('NOW')
        };
        await Kelas.update(updateVal, {
          where: { kode_seksi: kode_seksi }
        });
        getKelas.setDosen(getDosen)

        res.status(200).json({
          success: true,
          msg: 'data kelas berhasil diubah',
          kode_seksi: kode_seksi
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async kelasEditbulk(req, res, next) {
    try {
      if (req.file == undefined) {
        throw createError.BadRequest('File harus berupa excel/.xlsx!');
      }

      let Path = path.join(__dirname,'../../public/fileuploads/xlsxInput/' + req.file.filename);

      let rows = await readXlsxFile(Path);
        // skip header
        rows.shift();

        let updates = [];

      for(let row of rows) {
        let val = {
          getMatkul: await Matakuliah.findOne({where:{nama_matkul:row[1]}}),
          getDosen: await Dosen.findOne({
            where:{[Op.or]:[
            {NIDN:row[5]},
            {NIDK:row[5]}
          ]}
        })
        }
        updates.push({
          kode_seksi: row[0],
          kode_matkul: val.getMatkul.kode_matkul,
          hari: row[2],
          jam: row[3],
          deskripsi: row[4],
          updated_at: sequelize.fn('NOW')
        })
        if(val.getDosen != null){
          await Rel_dosen_kelas.update({ 
            kode_dosen: val.getDosen.kode_dosen,
            kode_seksi: row[0]
          })
        }        
      }
      await Kelas.bulkCreate(updates, {
        updateOnDuplicate: [
          'kode_seksi','kode_matkul','hari',
          'jam','deskripsi','updated_at',
        ]
      });

      res.status(200).json({
        success: true,
        msg: 'data kelas berhasil diubah sesuai: ' + req.file.originalname
      });
    } catch (error) {
      console.log('periksa excelnya');
      next(error);
    }
  },

  async kelasDelete(req, res, next) {
    try {
        const { kode_seksi } = req.params;
        const getKelas = await Kelas.findOne({
          where: {kode_seksi:kode_seksi},
          include: {model: Dosen, as: 'Dosen'}
        });
        if (!getKelas) { throw createError.NotFound('data tidak ditemukan')}
        await Kelas.destroy({
          where:{
            kode_seksi: getKelas.kode_seksi
          }});
        for (let i of getKelas.Dosen) {
          await Rel_dosen_kelas.destroy({
            where:{[Op.and]:[
              {kode_dosen:i.kode_dosen},
              {kode_seksi:getKelas.kode_seksi}
            ]}
          })
        }
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Lupa Password operation */
  async getLupapw(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const Yee = await paginator(Lupa_pw, pages, limits);
      res.send(Yee);
    } catch (error) {
      next(error);
    }
  },

  async resetPw(req, res, next) {
    try {
        const { kode_reset } = req.params;
        const getlupapw = await Lupa_pw.findByPk(kode_reset);
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
      next(error);
    }
  },

  async hapusLupapw(req, res, next) {
    try {
        const { kode_reset } = req.params;
        const getlupapw = await Lupa_pw.findByPk(kode_reset)
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
      next(error);
    }
  },
  /* Pengumuman operation */
  async getPengumumanAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const Yee = await paginator(Pengumuman, pages, limits);
      res.send(Yee);
    } catch (error) {
      next(error);
    }
  },

  async getPengumuman(req, res, next) {
    try {
      const { kode_pengumuman } = req.params;
      const Yee = await Pengumuman.findByPk(kode_pengumuman);
      res.send(Yee)
    } catch (error) {
      next(error);
    }
  },

  async tambahPengumuman(req, res, next) {
    try {
      const { pengumuman, status } = req.body;
      const getPengummn = await Pengumuman.findOne({where:{pengumuman:pengumuman}});
      if (getPengummn) {
        throw createError.Conflict('Pengumuman sudah terdaftar');
      } else if (!pengumuman) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        const pengummn = await Pengumuman.create({
          pengumuman: pengumuman,
          status: status
        });
        res.status(200).json({
          success: true,
          msg: 'pengumuman berhasil ditambahkan',
          status: pengummn.status
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async ubahPengumuman(req, res, next) {
    try {
      const { kode_pengumuman } = req.params;
      const { pengumuman, status } = req.body;
      if (!pengumuman) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            pengumuman: pengumuman,
            status: status
        };
        await Pengumuman.update(updateVal, {
          where: { kode_pengumuman: kode_pengumuman }
        });

        res.status(200).json({
          success: true,
          msg: 'pengumuman berhasil diubah',
          kode_pengumuman: kode_pengumuman
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async hapusPengumuman(req, res, next) {
    try {
        const { kode_pengumuman } = req.params;
        const getpengumuman = await Pengumuman.findByPk(kode_pengumuman);
        if (!getpengumuman) { throw createError.NotFound('data tidak ditemukan')}
        await Pengumuman.destroy({
          where:{
            kode_pengumuman: getpengumuman.kode_pengumuman
          }
        });
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Captcha operation */
  async getCaptchaAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const Yee = await paginator(Captcha, pages, limits);
      res.send(Yee);
    } catch (error) {
      next(error);
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

  async hapusCaptcha(req, res, next) {
    try {
        const { kode_captcha } = req.params;
        const getCpt = await Captcha.findByPk(kode_captcha);
        if (!getCpt) { throw createError.NotFound('data tidak ditemukan')}
        await Captcha.destroy({
          where:{
            kode_captcha: getCpt.kode_captcha
        }});
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
  /* Semester operation */
  async getSmstrAll(req, res, next) {
    try {
      const pages = parseInt(req.query.page);
      const limits = parseInt(req.query.limit);
      const Yee = await paginator(Ref_semester, pages, limits);
      res.send(Yee);
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

  async ubahSemester(req, res, next) {
    try {
      const { kode_semester } = req.params;
      const { semester } = req.body;
      if (!semester) {
        throw createError.BadRequest('tolong diisi!');
      } else {
        let updateVal = {
            semester: semester,
        };
        await Ref_semester.update(updateVal, {
          where: { kode_semester: kode_semester }
        });

        res.status(200).json({
          success: true,
          msg: 'semester berhasil diubah',
          kode_semester: kode_semester
        });
      }
    } catch (error) {
      next(error);
    }
  },

  async hapusSemester(req, res, next) {
    try {
        const { kode_semester } = req.params;
        const getSms = await Ref_semester.findOne({
          where: {kode_semester: kode_semester},
          include: {
            model: Matakuliah, as: 'Matkul',
            include: { 
              model: Kelas, as: 'Kelas'             
            }
          }
        });
        let temp = [];
        if (!getSms) { throw createError.NotFound('data tidak ditemukan')}
        await Ref_semester.destroy({
          where:{
            kode_semester: getSms.kode_semester
          }
        });
        for(let i of getSms.Matkul){
          temp.push(i.Kelas)
          await Matakuliah.destroy({
            where:{
              kode_matkul: i.kode_matkul
            }
          });
        }
        for (let j of temp.flat()){
          await Kelas.destroy({
            where:{
              kode_seksi: j.kode_seksi
            }
          });
        }
        res.status(200).json({
          success: true,
          msg: 'data berhasil dihapus'
        });
    } catch (error) {
      next(error);
    }
  },
}