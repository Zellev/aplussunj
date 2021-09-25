const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { sequelize } = require('./models');
const passport = require('passport')
const config = require('./config/dbconfig');
const ErrorHandler = require('./errorhandlers/ErrorHandler');

const app = express();
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(morgan('combined'));// dev
app.use(express.json({limit: '10mb', extended: true}));
app.use(express.urlencoded({limit: '10mb', extended: false}));// true
app.use(cors())

require('./routes')(app);
app.use(ErrorHandler);

sequelize.sync({}).then(() => {// ({force: true})
    app.listen(config.port);
    console.log(`server running at port:${config.port}`);    
});
