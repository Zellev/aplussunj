const createError = require('./errorHandlers/ApiErrors');
const AuthControl = require('./controllers/AuthControl');// controller all role
const AdminControl = require('./controllers/AdminControl');// controller admin
const Validator = require('./validator/Controlvalidator');

module.exports = (app) => {    
    //rute admin
    app.post('/tambah/admin', AuthControl.JwtauthAdmin, Validator.adminExist, AdminControl.daftarAdmin);
    app.post('/tambah/dosen', AuthControl.JwtauthAdmin, Validator.tambahdosencheck, Validator.isExistcheck, AdminControl.daftar);
    app.post('/tambah/mahasiswa', AuthControl.JwtauthAdmin, Validator.tambahmhscheck, Validator.isExistcheck, AdminControl.daftar);
    app.post('/tambah/captcha', AuthControl.JwtauthAdmin, AdminControl.tambahcaptcha);

    app.get('/auth-test', AuthControl.JwtauthAdmin, async (req, res, next) => {
            try {
                let user = await req.user
                res.send({
                    msg: 'authed',
                    user_id: user.id,
                    username: user.username,
                    email: user.email
                })
            } catch (error) {
                console.log(error)
                next(error)
            }
        })

    //rute all user
    app.get('/get-captcha', AuthControl.captcha);
    app.post('/login', Validator.formchecklogin, Validator.logincheck, AuthControl.login);

    //rute dosen
    //rute mahasiswa

    app.get('*',(req, res, next) => {next(createError.NotFound('404, resource tidak ditemukan...'))});
}
