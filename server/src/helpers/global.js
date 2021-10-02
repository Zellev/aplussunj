const createError = require('../errorHandlers/ApiErrors')
const Passport = require('passport');

module.exports = {
    async paginator(model, pages, limits) {       
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
        results.results = await model.findAll({
                offset:startIndex,
                limit:limit
            })
        return results
    },

    async auther(req, res ,next) {       
        return new Promise((resolve, reject) => {           
            Passport.authenticate('jwt',{ session: false }, (err, user) => {
                if (err) {
                  reject(new Error(err))
                } else if (!user) { 
                  reject(createError.BadRequest('Server error!'))
                }
                resolve(user)
              })(req, res, next);
            })
    },

    todaysdate() {
        let today = new Date();
        let date = today.getDate()+'-'+(today.getMonth()+1)+'-'+today.getFullYear();
        let time = today.getHours() + '-' + today.getMinutes() + '-' + today.getSeconds();
        let dateTime = date+'_'+time;
        return dateTime
    }

}