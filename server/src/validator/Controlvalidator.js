const Joi = require('joi');
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
    admincheck (req, res, next) {
        const schemaAdmin = Joi.object({
            username:Joi.string().pattern(new RegExp('^[a-zA-Z0-9_\\s-/|]{6,20}$')).required(),
            email: Joi.string().email().required()
        });
        let val = {
            username: req.body.username,
            email: req.body.email
        }
        const { error } = schemaAdmin.validate(val)

        if(error){
            switch(error.details[0].context.key){
                case 'username':
                    next(createError.BadRequest(
                        'karakter yang boleh digunakan: a-z, A-Z, 0-9, spasi, underscore, panjang 6-20.'
                    ));
                    break
                case 'email':
                    next(createError.BadRequest(
                        'syntax email harus tepat!, ada @-nya...'
                    ));
                    break
                default:
                    next(createError.BadRequest(
                        'unknown error...coba refresh ulang.'
                    ));
            }
        } else {
            return next()
        }

    },

    tambahdosencheck (req, res, next) {        
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

        if (error) {
            switch (error.details[0].context.key) {
                case 'role':
                    next(createError.BadRequest(
                       'fatal error, no valid role detected...'
                    ));
                    break          
                case 'NIDN':
                    next(createError.BadRequest(
                       'NIDN harus angka dan min 10 karakter'
                    ));
                    break
                case 'NIDK':
                    next(createError.BadRequest(
                        'NIDK harus angka dan min 10 karakter'
                    ));
                    break               
                case 'nama_lengkap':
                    next(createError.BadRequest(
                        'nama lengkap harus huruf a-z A-Z dan min 2 karakter'
                    ));
                    break
                case 'nomor_telp':
                    next(createError.BadRequest(
                        'nomor harus angka dan max 12 karakter'
                    ));
                    break
                case 'email':
                    next(createError.BadRequest(
                        'Email address harus memiliki @ dan domain email!'
                    ));
                    break               
                default:
                    next(createError.BadRequest(
                        'unknown error...coba refresh ulang.'
                    ));
            }
        } else {            
            return next();
        }
    },

    tambahmhscheck (req, res, next) {        
        const schemaMahasiswa = Joi.object({
            role: Joi.string().required().valid('Dosen', 'Mahasiswa'),         
            NIM: Joi.string().length(10).required(),
            nama_lengkap: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{2,}$')).required(),
            nomor_telp: Joi.string().min(9).max(12).truncate(),
            email: Joi.string().email().required()            
        });
       
        const { error } = schemaMahasiswa.validate(req.body);

        if (error) {
            switch (error.details[0].context.key) {
                case 'role':
                    next(createError.BadRequest(
                       'fatal error, no valid role detected...'
                    ));
                    break             
                case 'NIM':
                    next(createError.BadRequest(
                        'NIM harus angka dan min 10 karakter'
                    ));
                    break
                case 'nama_lengkap':
                    next(createError.BadRequest(
                        'nama lengkap harus huruf a-z A-Z dan min 2 karakter'
                    ));
                    break
                case 'nomor_telp':
                    next(createError.BadRequest(
                        'nomor harus angka dan max 12 karakter'
                    ));
                    break
                case 'email':
                    next(createError.BadRequest(
                        'Email address harus memiliki @ dan domain email!'
                    ));
                    break
                default:
                    next(createError.BadRequest(
                        'unknown error...coba refresh ulang.'
                    ));
            }
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
        const { username, email } = req.body
        let usernameExist = await getUser({username:username});
        let emailExist = await getUser({email:email});

        if (usernameExist) {
            return next(createError.Conflict('username sudah terdaftar!'));
        } else if (emailExist) {
            return next(createError.Conflict('email sudah terdaftar!'));
        } else {
            return next();
        }
    },

    // validator login route
    formchecklogin (req, res, next) {    
        const schema = Joi.object({
            loginData: [
                Joi.string().email(),
                Joi.string().pattern(new RegExp('^[a-zA-Z0-9_\\s-/|]{6,20}$'))
            ],
            password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{6,20}$'))
        });

        const { error } = schema.validate(req.body);
        
        if (error){
            if (error.details[0].context.key === 'loginData'){
                return next(createError.BadRequest('syntax email atau username salah'));
            } else {
                return next(createError.BadRequest('syntax password salah'));
            }            
        } else {
            return next();
        }        
    },

    async logincheck (req, res, next){
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
    
    matakuliahinput(req, res, next) {
        const schemaMatkul = Joi.object({
            kode_matkul: Joi.string().pattern(new RegExp('^[0-9]{8}$')).required(),
            nama_matkul: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{5}$')).required(),
            sks: Joi.number().max(4)
        });
        const { error } = schemaMatkul.validate(req.body);

        if (error) {
            switch (error.details[0].context.key) {
                case 'kode_matkul':
                    next(createError.BadRequest(
                       'Kode matakuliah minimal 8 karakter'
                    ));
                    break
                case 'nama_matkul':
                    next(createError.BadRequest(
                       'Matakuliah minimal 5 karakter, dan harus huruf (kapital/biasa)'
                    ));
                    break          
                case 'sks':
                    next(createError.BadRequest(
                       'sks harus berupa angka dan max 4'
                    ));
                    break
                default:
                    next(createError.BadRequest(
                        'unknown error...coba refresh ulang.'
                    ));
            }
        } else {            
            return next();
        }
    },

    kelasinput(req, res, next) {
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
        }
        const { error } = schemaMatkul.validate(val);

        if (error) { console.log(error)
            switch (error.details[0].context.key) {
                case 'kode_seksi':
                    next(createError.BadRequest(
                       'kode_seksi minimal 10 karakter'
                    ));
                    break
                case 'nama_matkul':
                    next(createError.BadRequest(
                       'min 3 karakter'
                    ));
                    break  
                case 'hari':
                    next(createError.BadRequest(
                       'hari senin - jumat'
                    ));
                    break          
                case 'jam':
                    next(createError.BadRequest(
                       'format harus 00:00 - 00:00, waktu mulai - waktu selesai'
                    ));
                    break
                default:
                    next(createError.BadRequest(
                        'unknown error...coba refresh ulang.'
                    ));
            }
        } else {
            return next();
        }
    },

    ubahpassword(req, res, next) {
        const schema = Joi.object({
            new_password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,20}$'))
        });
        let new_password = req.body.new_password
        const { error } = schema.validate({new_password});

        if (error) {
            if (error.details[0].context.key === 'new_password'){
                next(createError.BadRequest(
                    `Password baru harus 8-20 karakter, dan kombinasi dari a-z, A-Z,
                    <br>
                    0-9 dan tidak ada spasi.`
                 ));
            } else {
                next(createError.BadRequest(
                    'unknown error...coba refresh ulang.'
                ));
            }
        } else {            
            return next();
        }
    }

}
