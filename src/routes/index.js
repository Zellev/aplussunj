const AdminRoute = require('./adminroute')//rute admin
const DosenRoute = require('./dosenroute')//rute dosen
const MhsRoute = require('./mhsroute')//rute mahasiswa

const AuthControl = require('../controllers/AuthControl');// controller all role not loggedin
const DosenControl = require('../controllers/DosenControl');// controller dosen, buat get profil
const MhsControl = require('../controllers/MhsControl');// controller dosen, buat get profil
const AlluserControl = require('../controllers/AlluserControl');// controller all role logged in

const uploadPic = require('../middlewares/fileuploadall');
const { rateLimiter } = require('../middlewares/ratelimiter');
const { rateSlowdown } = require('../middlewares/rateslowdown');

const Validator = require('../validator/Controlvalidator');//validator
const createError = require('../errorHandlers/ApiErrors');// buat 404
const { cacheWare, apicache } = require('../middlewares/apicache');

module.exports = (app) => { // console.log(Object.keys(PutInstanceHere.__proto__)); => magic logger!

    /* Contoh penggunaan Route nested:
    *  admin/profil , admin/matakuliah , dst
    *  dosen/kelas/1912600000/paket_soal , dst
    *  bisa disesuaikan dengan kebutuhan masing-masing element frontend
    */

    // app.get('/', (req, res, next) => {res.render('../../public/views');});

    /*--RUTE ADMIN--*/
    app.use('/v1/admin', cacheWare, AuthControl.jwtauthAdmin, AdminRoute);

    /*--RUTE DOSEN--*/
    app.use('/v1/dosen', cacheWare, AuthControl.jwtauthDosen, DosenRoute);

    /*--RUTE MAHASISWA--*/
    app.use('/v1/mahasiswa', cacheWare, AuthControl.jwtauthMhs, MhsRoute);

    /*--RUTE ALL USER NOT LOGGED IN--*/
    app.get('/v1/captcha', rateLimiter, AuthControl.captcha);
    app.post('/v1/login', rateSlowdown, rateLimiter, Validator.formLoginCheck, Validator.loginCheck, AuthControl.login);
    app.post('/v1/lupa-pw', rateSlowdown, rateLimiter, AuthControl.lupapw); // ke admin
    app.post('/v1/lupa-pw/email', rateSlowdown, rateLimiter, AuthControl.lupapwSmtp); // ke email
    app.patch('/v1/ubah-pw', rateSlowdown, rateLimiter, Validator.ubahPwCheck, AuthControl.ubahPassNoauth); // no auth

    /*--RUTE ALL USER LOGGEDIN--*/
    app.post('/v1/refresh-token', rateSlowdown, rateLimiter, AuthControl.getAccessToken);// perbarui access token dan refresh token
    app.delete('/v1/logout', AuthControl.jwtauthAll, AuthControl.deleteTokenHistory);// hapus history token > 10 hari
    app.patch('/v1/ubah-pw', cacheWare, rateSlowdown, rateLimiter, AuthControl.jwtauthAll, Validator.ubahPwCheck, AlluserControl.ubahPass); // dengan auth
    app.post('/v1/avatar', cacheWare, rateSlowdown, rateLimiter, AuthControl.jwtauthAll, uploadPic.single('foto_profil'), AlluserControl.setAvatar);// tambah baru, atau rubah   
    app.get('/v1/profil', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getProfilUser);// profil singkat u/ disidebar
    app.get('/v1/kelas', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getAllKelas);
    app.get('/v1/kelas/search', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.cariKelas);
    app.get('/v1/kelas/:id_kelas', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getKelas);
    app.get('/v1/kelas/:id_semester', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getperSemester);    
    app.get('/v1/paket-soal/:id_paket/soal-essay', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getSoalPaket); //get all soal untuk paket tertentu
    app.get('/v1/profil-dosen/:id_dosen', cacheWare, rateLimiter, AuthControl.jwtauthAll, DosenControl.getProfile);
    app.get('/v1/profil-mahasiswa/:id_mhs', cacheWare, rateLimiter, AuthControl.jwtauthAll, MhsControl.getProfile);
    app.get('/v1/pengumuman', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getPengumumn);
    app.get('/v1/notifikasi', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getNotifikasi);
    app.get('/v1/jenis-ujian', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getJenisUjian);
    app.get('/v1/kelompok-matakuliah', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getKelompokMatakuliah);
    app.get('/v1/peminatan', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getPeminatan);
    app.get('/v1/semester', cacheWare, rateLimiter, AuthControl.jwtauthAll, AlluserControl.getSemester);

    /*--RUTE SISTEM--*/
    app.get('/v1/cache/performance', (req, res) => { res.json(apicache.getPerformance()) });
    app.get('/v1/cache/index', (req, res) => { res.json(apicache.getIndex()) });
    app.delete('/v1/cache/clear/:target_key?', (req, res) => { res.json(apicache.clear(req.params.target)) });
    app.delete('/v1/cache/clear/bulk', (req, res) => { res.json(apicache.clear(req.body.target_key)) });
    app.get('/v1/ujian/:id_ujian/tipe-penilaian', cacheWare, rateLimiter, AlluserControl.getTipePenilaian);
    app.post('/v1/notifikasi', cacheWare, rateSlowdown, rateLimiter, AlluserControl.setNotifikasi);
    app.post('/v1/nilai/:id_ujian', cacheWare, rateSlowdown, rateLimiter, AlluserControl.setNilaiAuto); //berlaku kepada seluruh peserta ujian

    /*--RUTE SUPER ADMIN--*/
    app.get('/v1/client', cacheWare, rateLimiter, AuthControl.getAllClient);
    app.post('/v1/client', cacheWare, rateSlowdown, rateLimiter, AuthControl.setClient);
    app.put('/v1/client/:id_client', cacheWare, rateSlowdown, rateLimiter, AuthControl.putClient);
    app.patch('/v1/client/:id_client/api-key', cacheWare, rateSlowdown, rateLimiter, AuthControl.patchClientKey);
    app.delete('/v1/client/:id_client', cacheWare, rateSlowdown, rateLimiter, AuthControl.deleteClient);
    app.post('/v1/admin', rateSlowdown, rateLimiter, Validator.tambahAdminCheck, Validator.adminExist, AuthControl.setAdmin);
    
    /*--Endpoint Test--*/
    // app.post('/test/uploadfile', uploadFiles3, AlluserControl.uploadFile);
   
    

    /*--404--*/
    app.get('*', (req, res, next) => {next(createError.NotFound('404, route tidak ditemukan...'))});
}
