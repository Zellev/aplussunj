/* eslint-disable no-useless-escape */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./models');
const passport = require('passport')
const config = require('./config/dbconfig');
const ErrorHandler = require('./errorhandlers/ErrorHandler');
const AuthControl = require('./controllers/AuthControl');
const { engine } = require('express-handlebars');
const compression = require('compression');
const https = require('https');
const path = require('path');
const fs = require('fs');


const app = express();
require('./config/passport')(passport);
/**
 *  only if you're behind a reverse proxy,
 *  (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc);
 *  see https://expressjs.com/en/guide/behind-proxies.html
 * 
 *  app.set('trust proxy', 1);
 */
app.engine('.hbs', engine({
    defaultLayout: false,
    extname: '.hbs',
    layoutsDir: path.join(__dirname, '../public/pdftemplate'),
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, '../public/pdftemplate'));
app.use(express.static('../public'));
app.use(morgan('combined'));/* dev */
app.use(express.json({limit: '10mb', extended: true}));
app.use(express.urlencoded({limit: '10mb', extended: false}));// true
app.use(passport.initialize());
app.use(cors({}))//origin: 'http://host', client origins
app.use(compression());
app.use(AuthControl.jwtauthSistem);

require('./routes')(app);
app.use(ErrorHandler);

const sslServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname,'../cert','key.pem')), // self-signed certificate, for placeholder
    cert: fs.readFileSync(path.join(__dirname,'../cert','cert.pem')),  // self-signed certificate, for placeholder
    // passphrase: config.ssl.passphrase
}, app);

sequelize.sync({}).then(() => {// ({force: true})
    sslServer.listen(config.port);
    console.log(`
    #  ┌─┐┌─┐┬    ╔═╗┌─┐┬─┐┬  ┬┌─┐┬─┐  ╔═╗┌┬┐┌─┐┬─┐┌┬┐┌─┐┌┬┐  #
    #  └─┐└─┐│    ╚═╗├┤ ├┬┘└┐┌┘├┤ ├┬┘  ╚═╗ │ ├─┤├┬┘ │ ├┤  ││  #
    #  └─┘└─┘┴─┘  ╚═╝└─┘┴└─ └┘ └─┘┴└─  ╚═╝ ┴ ┴ ┴┴└─ ┴ └─┘─┴┘  #
    `);
    console.log(`Secure server berjalan pada port:${config.port}`);
});
