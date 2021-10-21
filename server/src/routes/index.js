const AdminRoute = require('./adminroute')//rute admin

const AuthControl = require('../controllers/AuthControl');// controller all role not loggedin
const AlluserControl = require('../controllers/AlluserControl');// controller all role logged in

const uploadPic = require('../middlewares/fileuploadpic');//middleware
const Validator = require('../validator/Controlvalidator');//validator
const createError = require('../errorHandlers/ApiErrors');// buat 404


module.exports = (app) => { // console.log(Object.keys(PutInstanceHere.__proto__)); => magic logger!

    /*--RUTE ADMIN--*/
    app.use('/admin/:id', AuthControl.jwtauthAdmin, AdminRoute)

    /*--RUTE DOSEN--*/
    // app.use('/dosen', AuthControl.JwtauthDosen, DosenRoute)

    /*--RUTE MAHASISWA--*/
    // app.use('/mahasiswa', AuthControl.JwtauthMhs, MhsRoute)

    /*--RUTE ALL USER NOT LOGGED IN--*/
    app.get('/get-captcha', AuthControl.captcha);
    app.post('/login', Validator.formchecklogin, Validator.logincheck, AuthControl.login);
    app.post('/lupa-pw', AuthControl.lupapw);

    /*--RUTE ALL USER LOGGEDIN--*/
    app.patch('/:id/ubah-pw', AuthControl.jwtauthAll, Validator.ubahpassword, AlluserControl.ubahPass);
    app.post('/:id/avatar/input', AuthControl.jwtauthAll, uploadPic.single('foto_profil'), AlluserControl.postAvatar);
    app.get('/:id/semester/:kode_semester', AuthControl.jwtauthAll, AlluserControl.cariperSemester);
    app.get('/:id/kelas', AuthControl.jwtauthAll, AlluserControl.getallKelas);
    app.get('/:id/kelas/:kode_seksi', AuthControl.jwtauthAll, AlluserControl.getKelas);
    app.get('/:id/pengumuman', AuthControl.jwtauthAll, AlluserControl.getPengumumn);
    

    /*--404--*/
    app.get('*',(req, res, next) => {next(createError.NotFound('404, resource tidak ditemukan...'))});
}
