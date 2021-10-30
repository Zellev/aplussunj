const { Mahasiswa } = require('../models')
const createError = require('../errorHandlers/ApiErrors');
// const { paginator } = require('../helpers/global');

module.exports = {
  async getProfil(req, res, next) {
    try {
      const { kode_mhs } = req.params;
      const mhs = await Mahasiswa.findOne({ 
        attributes: {exclude: ['created_at','updated_at']},
        where: {kode_mhs:kode_mhs}
      });
      if(!mhs){throw createError.BadRequest('user tidak ditemukan')}
      const mhsUser = await mhs.getUser({
        attributes: {exclude: ['password','kode_role','created_at','updated_at']}
      });
      res.send({
          mhs: mhs,
          user: mhsUser
      });
    } catch (error) {
      next(error);
    }
  },
}