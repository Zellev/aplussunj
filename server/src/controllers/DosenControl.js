const { Dosen, Kelas, Paket_soal, Ref_jenis_ujian, 
        Rel_kelas_paketsoal } = require('../models')
const sequelize = require('sequelize')
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
      const kdSeksi = req.body.kode_seksi
      const { judul_ujian, jenis_ujian, tanggal_mulai, waktu_mulai, durasi_ujian, bobot_total, deskripsi } = req.body     
      const refJenis = await Ref_jenis_ujian.findOne({where:{jenis_ujian:jenis_ujian}})
      const date = format(new Date(String(tanggal_mulai)), 'yyyy-MM-dd')
      const pkCheck = await Paket_soal.findAll({
        where:{waktu_mulai:waktu_mulai},
        include:{model:Kelas,as:'Kelases',where:{kode_seksi:kdSeksi}}
      })
      if(pkCheck.length !== 0){
        const filterProc = ({kode_seksi}) => kode_seksi !== kdSeksi;
        let kosek = pkCheck.flatMap(el => el.Kelases).filter(filterProc);
        kosek = kosek.map(({kode_seksi}) => kode_seksi)
        throw createError.Conflict(`waktu mulai ujian ${waktu_mulai} pada kelas ini
              bentrok dengan kelas ${kosek}`)
      }      
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
  
  async getAllPaketsoal(req, res, next){
    try {
      //TODO: get all paket soal of a dosen regardless of class
      //      like an archive feature for paket soals
      // const pages = parseInt(req.query.page);
      // const limits = parseInt(req.query.limit);
      // const user = req.user
      // let opt = {
      //   where: {id_user: user.id},
      //   offset: (pages - 1) * limits,
      //   limit: limits,
      //   include: {
      //     model: Kelas, as: 'Kelases',
      //     include: {
      //       model: Paket_soal, as: 'PaketSoals'
      //     }
      //   }
      // }
      // let pkSoal = await paginator(Dosen, pages, limits, opt);
      // if (pkSoal.results.length === 0) {temp.push('No Record...')}
      // res.send({
      //     next: val.next,
      //     previous: val.previous,
      //     kelas: kelas
      // });
    } catch (error) {
      next(error)
    }
  }

}