const { Dosen, Kelas, Paket_soal, 
        Ref_jenis_ujian, Rel_kelas_paketsoal, 
        sequelize } = require('../models')
// const sequelize = require('sequelize')
const createError = require('../errorHandlers/ApiErrors');
const { createKode } = require('../helpers/global');
const { format } = require('date-fns');

module.exports = {

  async getDashboard(req, res, next){
    try {
      /*
      * 1. Tampilkan daftar kelas yang diampu
      * 2. Tampilkan Paket Soal yang didraft
      * 3. Tampilkan ...etc
      * 
      */
      const user = req.user;
      if(user.kode_role === 1) {
        console.log(`admin ${user.username} testing endpoint`)
        throw createError.BadRequest('ganti dengan akun dosen-test untuk testing!')
      }
      const kelas = await user.getDosen({
        include: [
          { model: Kelas, as: 'Kelases', required: true,
          through: {attributes:[]}, 
          include: {
            model: Paket_soal, as: 'PaketSoals',
            where: {status:'draft'}, attributes:{
              exclude:['durasi_ujian','status','deskripsi','created_at','updated_at']
            },
            through: {attributes:[]}
          } }
        ]
      });
      res.send({        
        kelas: kelas.Kelases,
        paket_soal: kelas.PaketSoals
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfil(req, res, next) {
      try {
        const { kode_dosen } = req.params;        
        const dosen = await Dosen.findOne({
            attributes: {exclude: ['created_at','updated_at']},
            where: {kode_dosen:kode_dosen}
        });
        if(!dosen){throw createError.BadRequest('user tidak ditemukan')}
        const dosenUser = await dosen.getUser({
          attributes: {exclude: ['password','kode_role','created_at','updated_at']}
        });
        res.send({
            dosen: dosen,
            user: dosenUser
        });
      } catch (error) {
        next(error);
      }
  },
  // Paket soal operation
  async setPaketsoal(req, res, next){
    try {
      const kdPaket = createKode(5)
      const kdSeksi = parseInt(req.params.kode_seksi)
      const { judul_ujian, jenis_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, bobot_total, deskripsi } = req.body     
      const refJenis = await Ref_jenis_ujian.findOne({where:{jenis_ujian:jenis_ujian}})
      const date = format(new Date(String(tanggal_mulai)), 'yyyy-MM-dd')
      await Paket_soal.create({
        kode_paket: kdPaket,
        judul_ujian: judul_ujian,
        kode_jenis_ujian: refJenis.kode_jenis_ujian,
        tanggal_mulai: date,
        waktu_mulai: waktu_mulai,
        durasi_ujian: durasi_ujian,
        bobot_total: bobot_total,
        deskripsi: deskripsi,
        status: 'draft',
        created_at: sequelize.fn('NOW'),
        PaketOccurance: { 
          kode_seksi: kdSeksi,
          kode_paket: kdPaket,
          jenis_ujian: refJenis.kode_jenis_ujian
        }
      }, {
        include: {model: Rel_kelas_paketsoal, as: 'PaketOccurance'}
      })
      res.status(200).json({
        success: true,
        msg: `Paket soal dengan kode ${kdPaket} berhasil dibuat`,
        kode_paket: kdPaket
      }) 
      //.redirect(/toPaketSoalgetter)
    } catch (error) {
      next(error)
    }
  },
  
  async getPaketsoal(req, res, next){
    try {
      // test
    } catch (error) {
      next(error)
    }
  }

}