const rateLimit = require('express-rate-limit');
const config = require('../config/dbconfig');

// pengaruh ke request GET POST PUT PATCH DELETE
const rateLimiter = rateLimit({
	windowMs: config.reqLimit.windowMs, // 10 minutes
	max: config.reqLimit.max, // Limit each IP to 100 requests per `window` (here, per 10 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
}); 

module.exports = { rateLimiter };