const ApiError = require('../errorHandlers/ApiErrors');

module.exports = function errorHandler (err, req, res, next) {
    if ( err instanceof ApiError){
        return res.status(err.code)
        .send({
            error:err.message
        });
    } else {
       res.status(500).json({error: 'something went wrong on our side...'});
    }
}