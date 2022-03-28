const apicache = require('apicache');
const config = require('../config/dbconfig');

const cache = apicache.options({
    debug: false,
    defaultDuration: `${config.cacheTime.time} minutes`,
    enabled: true,
    statusCodes: {
        exclude: [400, 401, 403, 404, 409, 415, 422, 429, 500],             
        include: [200, 201, 204, 206, 301, 302, 303, 304, 307, 308],
    },
}).middleware();

module.exports = { apicache: apicache, cacheWare: cache };