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

    /* Contoh penggunaan Route nested:
    *  admin/1/profil , admin/1/tambah/admin , dst
    *  dosen/116/kelas/1912600000/paket_soal/tambah , dst
    *  bisa disesuaikan dengan kebutuhan masing-masing element frontend
    */

    /*--RUTE ADMIN--*/
    app.use('/admin', AuthControl.jwtauthAdmin, AdminRoute)

    /*--RUTE DOSEN--*/
    app.use('/dosen', AuthControl.jwtauthDosen, DosenRoute)

    /*--RUTE MAHASISWA--*/
    // app.use('/mahasiswa', AuthControl.jwtauthMhs, MhsRoute)

    /*--RUTE ALL USER NOT LOGGED IN--*/
    app.get('/captcha', AuthControl.captcha);
    app.post('/login', Validator.formLoginCheck, Validator.loginCheck, AuthControl.login);
    app.post('/lupa-pw', AuthControl.lupapw); // ke admin
    app.post('/lupa-pw/email', AuthControl.lupapwStmp); // ke email
    app.patch('/ubah-pw', Validator.ubahPwCheck, AuthControl.ubahPassNoauth); // no auth

    /*--RUTE ALL USER LOGGEDIN--*/
    app.post('/refresh-token', AlluserControl.getRefreshToken);// perbarui access token dan refresh token
    app.delete('/logout', AuthControl.jwtauthAll, AlluserControl.deleteTokenSession);
    app.patch('/ubah-pw', AuthControl.jwtauthAll, Validator.ubahPwCheck, AlluserControl.ubahPass); // dengan auth
    app.post('/avatar', AuthControl.jwtauthAll, uploadPic.single('foto_profil'), AlluserControl.setAvatar);// tambah baru, atau rubah
    app.get('/profil', AuthControl.jwtauthAll, AlluserControl.getProfilUser);// profil singkat u/ disidebar
    app.get('/semester/:kode_semester', AuthControl.jwtauthAll, AlluserControl.getperSemester);
    app.get('/kelas', AuthControl.jwtauthAll, AlluserControl.getAllKelas);
    app.get('/kelas/search',  AuthControl.jwtauthAll, AlluserControl.cariKelas);
    app.get('/kelas/:kode_seksi', AuthControl.jwtauthAll, AlluserControl.getKelas);
    app.get('/paket-soal/:kode_paket', AuthControl.jwtauthAll, AlluserControl.getPaketsoal);
    app.get('/paket_soal/search', AuthControl.jwtauthAll, AlluserControl.cariPaketsoal); 
    app.get('/dosen/:kode_dosen', AuthControl.jwtauthAll, DosenControl.getProfil);
    app.get('/mahasiswa/:kode_mhs', AuthControl.jwtauthAll, MhsControl.getProfil);
    app.get('/pengumuman', AuthControl.jwtauthAll, AlluserControl.getPengumumn);
    

    /*--404--*/
    app.get('*',(req, res, next) => {next(createError.NotFound('404, resource tidak ditemukan...'))});
}
