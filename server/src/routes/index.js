const AdminRoute = require('./adminroute')//rute admin

const AuthControl = require('../controllers/AuthControl');// controller all role not loggedin
const AlluserControl = require('../controllers/AlluserControl');// controller all role logged in

const uploadPic = require('../middlewares/fileuploadpic');//middleware
const Validator = require('../validator/Controlvalidator');//validator
const createError = require('../errorHandlers/ApiErrors');// buat 404


module.exports = (app) => { //TODO: make main route with 1 auth control middleware and nested it!

    /*--RUTE ADMIN--*/
    app.use('/admin', AuthControl.JwtauthAdmin, AdminRoute)

    /*--RUTE DOSEN--*/
    // app.use('/dosen', AuthControl.JwtauthAdmin, AdminRoute)

    /*--RUTE MAHASISWA--*/
    // app.use('/mahasiswa', AuthControl.JwtauthAdmin, AdminRoute)

    /*--RUTE ALL USER NOT LOGGED IN--*/
    app.get('/get-captcha', AuthControl.captcha);
    app.post('/login', Validator.formchecklogin, Validator.logincheck, AuthControl.login);
    app.post('/lupa-pw', AuthControl.lupapw);

    /*--RUTE ALL USER LOGGEDIN--*/
    app.get('/getMatakuliah/all', AlluserControl.JwtauthAll, AlluserControl.getmatkul);
    app.patch('/user/:id/ubah-pw', AlluserControl.JwtauthAll, Validator.ubahpassword, AlluserControl.ubahpass);
    app.post('/profil/avatar-upload', AlluserControl.JwtauthAll, uploadPic.single('foto_profil'), AlluserControl.postavatar);

    /*--404--*/
    app.get('*',(req, res, next) => {next(createError.NotFound('404, resource tidak ditemukan...'))});
}
