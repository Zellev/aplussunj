const ApiError = require('../errorHandlers/ApiErrors');

module.exports = function errorHandler (err, req, res, next) {
    if ( err instanceof ApiError){
        return res.status(err.code)
        .send({
            success: false,
            msg:err.message
        });
    } else {
        console.log(err) // dev
        // console.log(err.message) prod
       res.status(500).json({error: 'something went wrong on our side...'});
    }
}