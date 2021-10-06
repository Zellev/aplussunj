const AdminRoute = require('./adminroute')//rute admin

const AuthControl = require('../controllers/AuthControl');// controller all role not loggedin
const AlluserControl = require('../controllers/AlluserControl');// controller all role logged in

const uploadPic = require('../middlewares/fileuploadpic');//middleware
const Validator = require('../validator/Controlvalidator');//validator
const createError = require('../errorHandlers/ApiErrors');// buat 404


module.exports = (app) => { //TODO: make main route with 1 auth control middleware and nested it!

    /*--RUTE ADMIN--*/
    app.use('/admin/:id', AuthControl.JwtauthAdmin, AdminRoute)

    /*--RUTE DOSEN--*/
    // app.use('/dosen', AuthControl.JwtauthDosen, DosenRoute)

    /*--RUTE MAHASISWA--*/
    // app.use('/mahasiswa', AuthControl.JwtauthMhs, MhsRoute)

    /*--RUTE ALL USER NOT LOGGED IN--*/
    app.get('/get-captcha', AuthControl.captcha);
    app.post('/login', Validator.formchecklogin, Validator.logincheck, AuthControl.login);
    app.post('/lupa-pw', AuthControl.lupapw);

    /*--RUTE ALL USER LOGGEDIN--*/
    app.get('/:id/getMatakuliah/all', AlluserControl.JwtauthAll, AlluserControl.getallMatkul);
    app.get('/:id/getKelas/all', AlluserControl.JwtauthAll, AlluserControl.getallKelas);
    app.patch('/:id/ubah-pw', AlluserControl.JwtauthAll, Validator.ubahpassword, AlluserControl.ubahPass);
    app.post('/:id/avatar-upload', AlluserControl.JwtauthAll, uploadPic.single('foto_profil'), AlluserControl.postAvatar);

    /*--404--*/
    app.get('*',(req, res, next) => {next(createError.NotFound('404, resource tidak ditemukan...'))});
}
