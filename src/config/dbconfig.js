"use strict";
require('dotenv').config({path:__dirname+'/./../../.env'});

module.exports = {
    port: process.env.PORT || 3000, // parseInt()
    db: {
        database: process.env.DB_NAME || 'appujianessay',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: {
            dialect: process.env.DIALECT || 'mysql',
            host: process.env.DB_HOST || '127.0.0.1',
            logging: JSON.parse(process.env.SEQUELIZE_LOGGING.toLowerCase()) ?? true,            
            timezone: process.env.TIMEZONE || '+07:00' // for writing to database
            // dialectOptions: { not supported for mysql dialect :(
            //     useUTC: false
            // },
            // alter: true
        }
    },

    pagination: {
        pageLimit: parseInt(process.env.GLOBAL_PAGE_LIMIT_FALLBACK) || 10,
    },

    auth: {
        issuer: process.env.TOKEN_ISSUER,
        audience: process.env.TOKEN_AUDIENCE,
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        apikeySecret: process.env.APIKEY_SECRET,
        defaultPass: process.env.DEFAULT_PASS,
        defaultProfilePic: process.env.DEFAULT_PROFILE_PIC,
        defaultBannerPic: process.env.DEFAULT_BANNER_PIC,
        defaultGlobalPic: process.env.DEFAULT_GLOBAL_PIC,
        linkubahpw: process.env.LINK_UBAH_PW,
        tokenHistoryexpiry: process.env.TOKEN_HISTORY_EXPIRY || '1',
        autoDeleteTokenHistoryOnRefresh: JSON.parse(process.env.AUTO_DELETE_TOKEN_HISTORY_ON_REFRESH.toLowerCase()) || false,
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: JSON.parse(process.env.SMTP_SECURE.toLowerCase()),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: function () { // do not fail on invalid certs
                    if(module.exports.auth.smtp.secure === true){
                        return false
                    } else {
                        return true
                    }
                }
            }
        },
        emailOpt: {
            from: process.env.EMAIL_FROM,
            subject: process.env.EMAIL_SUBJECT
        }
    },

    codegen: {
        panjang_kode_paket: parseInt(process.env.PANJANG_KODE_PAKET) || 5,
        char1: process.env.KARAKTER_KODE_PAKET,
        char2: process.env.RANDOM_IMAGE_NAME_CHAR
    },

    ujianexpiry: process.env.UJIAN_EXPIRY,
    jmlpkmax: parseInt(process.env.JML_PAKET_MAX) || 10,
    autoRelatePaketSoal: JSON.parse(process.env.AUTO_RELASIKAN_PAKET_SOAL.toLowerCase()) || false,

    reqSlowdown: {
        windowMs: parseInt(process.env.MENIT_PER_REQ) * 60 * 1000, // 10 minutes
        delayAfter: parseInt(process.env.REQUEST_MAX), // allow 50 requests per 10 minutes per IP, then...
        delayMs: parseInt(process.env.DELAY_INCREMENT) // begin adding 500ms of delay per request above 50!
    },

    reqLimit: {
        windowMs: parseInt(process.env.MENIT_PER_REQ_LIM) * 60 * 1000, // 10 minutes
        max: parseInt(process.env.REQUEST_MAX_LIM), // Limit each IP to 100 requests per `window` (here, per 10 minutes)
    },

    caching: {        
        time: parseInt(process.env.CACHE_TIME) || 5, // in minutes
        cachedEndpointsBlacklist: process.env.CACHED_ENDPOINTS_BLACKLIST.split(' ') // list of urls that should not be cached
    }
    
}