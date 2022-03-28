const ApiError = require('../errorHandlers/ApiErrors');

module.exports = function errorHandler (err, req, res, next) {
    if ( err instanceof ApiError){
        return res.status(err.code)
        .send({
            success: false,
            msg:err.message
        });
    } else {
        // console.log(err.message) prod
       console.error(err);
       res.status(500).json({success: false, msg: 'something went wrong on our side...'})       
    }
}