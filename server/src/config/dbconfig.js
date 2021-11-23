require('dotenv').config({path:__dirname+'/./../../.env'});

module.exports = {
    port: process.env.PORT,
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
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        defaultPass: process.env.DEFAULT_PASS
    }
}