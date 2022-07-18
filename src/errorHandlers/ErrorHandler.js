"use strict";
const ApiError = require('../errorHandlers/ApiErrors');

module.exports = function errorHandler (error, req, res, next) {
    if ( error instanceof ApiError ){
        return res.status(error.code).send({
            success: false,
            msg: error.message
        });
    } else {
        // console.error(error.message) prod
        console.error(error);
        res.status(500).json({
            success: false, 
            msg: 'something went wrong on our side...',
            details: error.message
        });
    }
}