require('dotenv').config({path:__dirname+'/./../../dbsettings.env'});

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
        secretKey: process.env.SECRET_KEY,
        defaultPass: process.env.DEFAULT_PASS
    }
}