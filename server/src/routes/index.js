const AdminRoute = require('./adminroute')//rute admin
const DosenRoute = require('./dosenroute')//rute dosen
// const MhsRoute = require('./mhsroute')//rute mahasiswa

const AuthControl = require('../controllers/AuthControl');// controller all role not loggedin
const DosenControl = require('../controllers/DosenControl');// controller dosen, buat get profil
const MhsControl = require('../controllers/MhsControl');// controller dosen, buat get profil
const AlluserControl = require('../controllers/AlluserControl');// controller all role logged in

const uploadPic = require('../middlewares/fileuploadpic');//middleware
const Validator = require('../validator/Controlvalidator');//validator
const createError = require('../errorHandlers/ApiErrors');// buat 404


module.exports = (app) => { // console.log(Object.keys(PutInstanceHere.__proto__)); => magic logger!

    /*--RUTE ADMIN--*/
    app.use('/admin/:id', AuthControl.jwtauthAdmin, AdminRoute)

    /*--RUTE DOSEN--*/
    app.use('/dosen/:id', AuthControl.jwtauthDosen, DosenRoute) // dengan id user

    /*--RUTE MAHASISWA--*/
    // app.use('/mahasiswa/:id', AuthControl.jwtauthMhs, MhsRoute) // dengan id user

    /*--RUTE ALL USER NOT LOGGED IN--*/
    app.get('/get-captcha', AuthControl.captcha);
    app.post('/login', Validator.formLoginCheck, Validator.loginCheck, AuthControl.login);
    app.post('/lupa-pw', AuthControl.lupapw);

    /*--RUTE ALL USER LOGGEDIN--*/
    app.get('/:id/', AuthControl.jwtauthAll, AlluserControl.getProfilUser);// profil singkat u/ disidebar
    app.patch('/:id/ubah-pw', AuthControl.jwtauthAll, Validator.ubahPwCheck, AlluserControl.ubahPass);
    app.post('/:id/avatar/input', AuthControl.jwtauthAll, uploadPic.single('foto_profil'), AlluserControl.setAvatar);// tambah baru, atau rubah
    app.get('/:id/semester/:kode_semester', AuthControl.jwtauthAll, AlluserControl.cariperSemester);
    app.get('/:id/kelas', AuthControl.jwtauthAll, AlluserControl.getallKelas);
    app.get('/:id/kelas/cari',  AuthControl.jwtauthAll, AlluserControl.cariKelas);
    app.get('/:id/kelas/:kode_seksi', AuthControl.jwtauthAll, AlluserControl.getKelas);
    // app.get('/:id/paket_soal/:kode_paket', AuthControl.jwtauthAll, AlluserControl.getPaketsoal); TODO: DIS!, & NODEMAILER FOR LUPAPW
    app.get('/:id/pengumuman', AuthControl.jwtauthAll, AlluserControl.getPengumumn);
    app.get('/:id/dosen/:kode_dosen/profil', AuthControl.jwtauthAll, DosenControl.getProfil);// karna hak akses GET profil dosen = (admin,dosen,mhs)
    app.get('/:id/mahasiswa/:kode_mhs/profil', AuthControl.jwtauthAll, MhsControl.getProfil);// sama, hak akses GET profil mhs = (admin,dosen,mhs)

    /*--404--*/
    app.get('*',(req, res, next) => {next(createError.NotFound('404, resource tidak ditemukan...'))});
}
