const { Dosen } = require('../models')
// const createError = require('../errorHandlers/ApiErrors');
// const { paginator } = require('../helpers/global');

module.exports = {
    async getProfil(req, res, next) {
        try {
          const { kode_dosen } = req.params;
          let dosen, dosenUser;
            dosen = await Dosen.findByPk(kode_dosen)
            dosenUser = await dosen.getUser()                    
          res.send({
              dosen: dosen,
              user: dosenUser
          })
        } catch (error) {
          next(error);
        }
    },
}