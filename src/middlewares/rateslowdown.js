const slowDown = require("express-slow-down");
const config = require('../config/dbconfig');

const rateSlowdown = slowDown({
	windowMs: config.reqSlowdown.windowMs, // 10 minutes
	delayAfter: config.reqSlowdown.delayAfter, // allow 50 requests per 10 minutes per IP, then...
	delayMs: config.reqSlowdown.delayMs, // begin adding 500ms of delay per request above 50!
	skip: (req, res) => { //eslint-disable-line
		return req.method === 'GET'
	}
  });

module.exports = { rateSlowdown };