require('dotenv').config({path:__dirname+'/./../../.env'});

module.exports = {
    port: process.env.PORT, // parseInt()
    db: {
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        options: {
            dialect: process.env.DIALECT,
            host: process.env.DB_HOST,
            timestamps: false,
            logging: false,
            // dialectOptions: { not supported for mysql dialect :(
            //     useUTC: false
            // },
            timezone: process.env.TIMEZONE // for writing to database
            // alter: true
        }
    },
    auth: {
        issuer: process.env.TOKEN_ISSUER,
        audience: process.env.TOKEN_AUDIENCE,
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        apikeySecret: process.env.APIKEY_SECRET,
        defaultPass: process.env.DEFAULT_PASS,
        linkubahpw: process.env.LINK_UBAH_PW,
        tokenHistoryexpiry: process.env.TOKEN_HISTORY_EXPIRY,
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
        panjang_kode_paket: parseInt(process.env.PANJANG_KODE_PAKET),
        char: process.env.KARAKTER_KODE_PAKET 
    },

    jmlpkmax: parseInt(process.env.JML_PAKET_MAX),

    reqSlowdown: {
        windowMs: parseInt(process.env.MENIT_PER_REQ) * 60 * 1000, // 10 minutes
        delayAfter: parseInt(process.env.REQUEST_MAX), // allow 50 requests per 10 minutes per IP, then...
        delayMs: parseInt(process.env.DELAY_INCREMENT) // begin adding 500ms of delay per request above 50!
    },

    reqLimit: {
        windowMs: parseInt(process.env.MENIT_PER_REQ_LIM) * 60 * 1000, // 10 minutes
        max: parseInt(process.env.REQUEST_MAX_LIM), // Limit each IP to 100 requests per `window` (here, per 10 minutes)
    },

    cacheTime: {
        time: parseInt(process.env.CACHE_TIME)
    }
}