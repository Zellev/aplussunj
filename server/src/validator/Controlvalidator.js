const Joi = require('joi').extend(require('@joi/date'));
const createError = require('../errorHandlers/ApiErrors');
const { User } = require('../models');

const getUser = async obj => {
    return await User.findOne({
        where: obj
    });
}

const getDosen = async obj => {
    const user = await getUser({kode_role:'2'});
    return await user.getDosen({where: obj});
}

const getMhs = async obj => {
    const user = await getUser({kode_role:'3'});
    return await user.getMahasiswa({where: obj});
}

module.exports = {
/* Admin Input Validator */
    tambahAdminCheck (req, res, next) {
        const schemaAdmin = Joi.object({
            username:Joi.string().pattern(new RegExp('^[a-zA-Z0-9_\\s-/|]{6,20}$')).required(),
            email: Joi.string().email().required()
        });
        let val = {
            username: req.body.username,
            email: req.body.email
        }
        const { error } = schemaAdmin.validate(val)
        let msg;
        if(error){
            switch(error.details[0].context.key){
                case 'username':
                    msg = 'karakter yang boleh digunakan: a-z, A-Z, 0-9, spasi, underscore, panjang 6-20.'
                    break
                case 'email':
                    msg = 'syntax email harus tepat!, ada @-nya...'
                    break
                default:
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {
            return next()
        }
    },

    tambahDosenCheck (req, res, next) {        
        const schemaDosen = Joi.object({
            role: Joi.string().required().valid('Dosen', 'Mahasiswa'),
            NIP: Joi.string().length(18),
            NIDN: Joi.string().length(10),
            NIDK: Joi.string().length(10).required(),
            nama_lengkap: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{2,}$')).required(),
            nomor_telp: Joi.string().min(9).max(12).truncate(),
            email: Joi.string().email().required()
        });

        const { error } = schemaDosen.validate(req.body);
        let msg;
        if (error) {
            switch (error.details[0].context.key) {
                case 'role':
                    msg = 'fatal error, no valid role detected...'
                    break          
                case 'NIDN':
                    msg = 'NIDN harus angka dan min 10 karakter'
                    break
                case 'NIDK':
                    msg = 'NIDK harus angka dan min 10 karakter'
                    break               
                case 'nama_lengkap':
                    msg = 'nama lengkap harus huruf a-z A-Z dan min 2 karakter'
                    break
                case 'nomor_telp':
                    msg = 'nomor harus angka dan max 12 karakter'
                    break
                case 'email':
                    msg = 'Email address harus memiliki @ dan domain email!'
                    break               
                default:
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    tambahMhsCheck (req, res, next) {        
        const schemaMahasiswa = Joi.object({
            role: Joi.string().required().valid('Dosen', 'Mahasiswa'),         
            NIM: Joi.string().length(10).required(),
            nama_lengkap: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{2,}$')).required(),
            nomor_telp: Joi.string().min(9).max(12).truncate(),
            email: Joi.string().email().required()            
        });
       
        const { error } = schemaMahasiswa.validate(req.body);
        let msg;
        if (error) {
            switch (error.details[0].context.key) {
                case 'role':
                    msg = 'fatal error, no valid role detected...'
                    break             
                case 'NIM':
                    msg = 'NIM harus angka dan min 10 karakter'
                    break
                case 'nama_lengkap':
                    msg = 'nama lengkap harus huruf a-z A-Z dan min 2 karakter'
                    break
                case 'nomor_telp':
                    msg = 'nomor harus angka dan max 12 karakter'
                    break
                case 'email':
                    msg = 'Email address harus memiliki @ dan domain email!'
                    break
                default:
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },
    
    async isExistcheck (req, res, next) {           
        const { role, NIP, NIDN, NIDK, NIM, email } = req.body        
        try {
            if ( role === 'Dosen') {
                let errors1 = {
                    nipExist: await getDosen({NIP:NIP}),
                    nidnExist: await getDosen({NIDN:NIDN}),
                    nidkExist: await getDosen({NIDK:NIDK}),                    
                    emailExist: await getUser({email:email})
                };
                if (errors1.nipExist) {
                    throw createError.Conflict('NIP sudah terdaftar!');
                } else if (errors1.nidnExist) {
                    throw createError.Conflict('NIDN sudah terdaftar!');
                } else if (errors1.nidkExist) {
                    throw createError.Conflict('NIDK sudah terdaftar!');
                } else if (errors1.emailExist) {
                    throw createError.Conflict('email sudah terdaftar!');
                } else {
                    return next();
                }
            } else if ( role === 'Mahasiswa' ) {        
                let errors2 = {
                    nimExist: await getMhs({NIM:NIM}),
                    emailExist: await getUser({email:email})
                };     
                if (errors2.nimExist) {
                     throw createError.Conflict('NIM sudah terdaftar!');
                } else if (errors2.emailExist) {
                     throw createError.Conflict('email sudah terdaftar!');
                } else {
                    return next();
                }
            }
        } catch (error) {
            next(error)
        }
    },

    async adminExist (req, res, next) {
        try {
            const { username, email } = req.body
            let usernameExist = await getUser({username:username});
            let emailExist = await getUser({email:email});

            if (usernameExist) {
                throw createError.Conflict('username sudah terdaftar!');
            } else if (emailExist) {
                throw createError.Conflict('email sudah terdaftar!');
            } else {
                return next();
            }
        } catch (error) {
            next(error)
        }        
    },

    matkulInputCheck(req, res, next) {
        const schemaMatkul = Joi.object({
            kode_matkul: Joi.string().pattern(new RegExp('^[0-9]{8}$')).required(),
            nama_matkul: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{5}$')).required(),
            sks: Joi.number().max(4)
        });
        const { error } = schemaMatkul.validate(req.body);
        let msg;
        if (error) {
            switch (error.details[0].context.key) {
                case 'kode_matkul':
                    msg = 'Kode matakuliah minimal 8 karakter angka!'
                    break
                case 'nama_matkul':
                    msg = 'Matakuliah minimal 5 karakter, dan harus huruf (kapital/biasa)!'
                    break          
                case 'sks':
                    msg = 'sks harus berupa angka dan max 4!'
                    break
                default:
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    kelasInputCheck(req, res, next) {
        const schemaMatkul = Joi.object({
            kode_seksi: Joi.string().pattern(new RegExp('^[0-9]{10}$')).required(),
            nama_matkul: Joi.string().min(3).required(),
            hari: Joi.string().valid('senin','selasa','rabu','kamis','jumat').required(),
            jam: Joi.string().pattern(new RegExp('^([0-9]{2})\:([0-9]{2})\\s\-\\s([0-9]{2})\:([0-9]{2})$')).required() // eslint-disable-line 
        });
        let val = {
            kode_seksi: req.body.kode_seksi,
            nama_matkul: req.body.nama_matkul,
            hari: req.body.hari,
            jam: req.body.jam
        }, msg;
        const { error } = schemaMatkul.validate(val);

        if (error) { console.log(error)
            switch (error.details[0].context.key) {
                case 'kode_seksi!':
                    msg = 'kode_seksi minimal 10 karakter angka'
                    break
                case 'nama_matkul':
                    msg = 'min 3 karakter!'
                    break  
                case 'hari':
                    msg = 'hari hanya senin - jumat!'
                    break          
                case 'jam':
                    msg = 'format harus 00:00 - 00:00, waktu mulai - waktu selesai'
                    break
                default:
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {
            return next();
        }
    },
/* All User Input Validator */
    formLoginCheck (req, res, next) {    
        const schema = Joi.object({
            loginData: [
                Joi.string().email(),
                Joi.string().pattern(new RegExp('^[a-zA-Z0-9_\\s-/|]{6,20}$'))
            ],
            password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{6,20}$'))
        });

        const { error } = schema.validate(req.body);
        let msg;
        if (error){
            if (error.details[0].context.key === 'loginData'){
                msg = 'syntax email atau username salah'
            } else {
                msg = 'syntax password salah'
            }
            return next(createError.BadRequest(msg))
        } else {
            return next();
        }        
    },

    async loginCheck (req, res, next){
        const { loginData } = req.body
        const email_regex = new RegExp('^[a-zA-Z0-9.!#$%&*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$');
        const username_regex = new RegExp('^[a-zA-Z0-9_\\s-/|]{6,20}$');

        try {
            if (loginData.match(email_regex)) {               
                req.user = await getUser({email:loginData});
                if (!req.user){
                    throw createError.BadRequest('Email tidak terdaftar!');
                }
                return next();
            } else if (loginData.match(username_regex)) {        
                req.user = await getUser({username:loginData});
                if (!req.user){
                    throw createError.BadRequest('Username tidak terdaftar!');
                }
                return next();
            } else {
                return next();
            }
        } catch (error) {
            return next(error)
        }
    },

    ubahPwCheck(req, res, next) {
        const schema = Joi.object({
            new_password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,20}$'))
        });
        let new_password = req.body.new_password
        const { error } = schema.validate({new_password});
        let msg;
        if (error) {
            if (error.details[0].context.key === 'new_password'){
                msg = `Password baru harus 8-20 karakter, dan kombinasi dari a-z, A-Z,
                        <br>0-9 dan tidak ada spasi.`
            } else {
                msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },
/* Dosen Input Validator */
    async tambahPkSoalCheck(req, res, next){
        const schemaPaketSoal = Joi.object({
            judul_ujian: Joi.string().min(5).max(100),
            jenis_ujian: Joi.string().valid('Penilaian Harian','Penilaian Tengah Semester',
                        'Penilaian Akhir Semester',''), 
            tanggal_mulai: Joi.date().format('DD-MM-YYYY'), 
            waktu_mulai: Joi.string().regex(new RegExp('^([0-9]{2})\\:([0-9]{2})\\:([0-9]{2})$')),
            durasi_ujian: Joi.string().regex(new RegExp('^([0-9]{2})\\:([0-9]{2})\\:([0-9]{2})$')),
            bobot_total: Joi.number().min(70).max(100)
        }).required();

        let val = {
            judul_ujian: req.body.judul_ujian,
            jenis_ujian: req.body.jenis_ujian,
            tanggal_mulai: req.body.tanggal_mulai,
            waktu_mulai: req.body.waktu_mulai,
            durasi_ujian: req.body.durasi_ujian,
            bobot_total: req.body.bobot_total
        }, msg;

        const { error } = schemaPaketSoal.validate(val);

        if (error) {
            switch (error.details[0].context.key) {
                case 'judul_ujian':
                    msg = 'judul ujian min 5 - max 100 karakter'                    
                    break
                case 'jenis_ujian':
                    msg = `jenis ujian harus antara:<br>
                            1.Penilaian Harian<br>
                            2.Penilaian Tengah Semester<br>
                            3.Penilaian Akhir Semester`
                    break          
                case 'tanggal_mulai':
                    msg = 'format harus HARI/BULAN/TAHUN => DD/MM/YYYY'
                    break
                case 'waktu_mulai':
                    msg = 'format harus 00:00:00 waktu 24 jam'
                    break
                case 'durasi_ujian':
                    msg = 'format harus 00:00:00 waktu 24 jam'
                    break
                case 'bobot_total':
                    msg = 'bobot total min 70 max 100'
                    break
                default:
                    console.log(error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    }
}
