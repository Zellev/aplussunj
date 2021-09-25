const Joi = require('joi');
const createError = require('../errorHandlers/ApiErrors');
const { User, Dosen, Mahasiswa } = require('../models');

const getUser = async obj => {
    return await User.findOne({
        where: obj
    });
}

const getDosen = async obj => {
    return await Dosen.findOne({
        where: obj
    });
}

const getMhs = async obj => {
    return await Mahasiswa.findOne({
        where: obj
    });
}

module.exports = {
    // validator  tambah pengguna? route
    tambahdosencheck (req, res, next) {
        
        const schemaDosen = Joi.object({
            role: Joi.string().required().valid('Dosen', 'Mahasiswa'),
            NIDN: Joi.number().integer(),
            NIDK: Joi.number().integer().min(10).required(),
            nama_lengkap: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{2,}$')),
            nomor_telp: Joi.number().min(12),
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
            NIM: Joi.number().integer().min(10).required(),
            nama_lengkap: Joi.string().pattern(new RegExp('^[a-zA-Z\\s]{2,}$')),
            nomor_telp: Joi.number().integer().min(12),
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
        const { role, NIDN, NIDK, NIM, email } = req.body
        
        if ( role === 'Dosen') {
            let nidnExist = await getDosen({NIDN:NIDN});
            let nidkExist = await getDosen({NIDK:NIDK});
            let emailExist = await getUser({email:email});

            if (nidnExist) {
                return next(createError.Conflict('NIDN sudah terdaftar!'));
            } else if (nidkExist) {
                return next(createError.Conflict('NIDK sudah terdaftar!'));
            } else if (emailExist) {
                return next(createError.Conflict('email sudah terdaftar!'));
            } else {
                return next();
            }
        } else if ( role === 'Mahasiswa' ) {
            let nimExist = await getMhs({NIM:NIM});
            let emailExist = await getUser({email:email});
            
            if (nimExist) {
                return next(createError.Conflict('NIM sudah terdaftar!'));
            } else if (emailExist) {
                return next(createError.Conflict('email sudah terdaftar!'));
            } else {
                return next();
            }
        }
    },

    async adminExist (req, res, next) {           
        const { username, email } = req.body
        const usernameExist = await getUser({username:username});
        const emailExist = await getUser({email:email});

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
            password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$'))
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


        if (loginData.match(email_regex)) {               
            req.user = await getUser({email:loginData});
            if (!req.user){
                return next(createError.BadRequest('Email tidak terdaftar!'));
            }
            return next();
        } else if (loginData.match(username_regex)) {        
            req.user = await getUser({username:loginData});
            if (!req.user){
                return next(createError.BadRequest('Username tidak terdaftar!'));
            }
            return next();
        } else {
            return next();
        }
    }

}

