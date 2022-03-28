const Joi = require('joi').extend(require('@joi/date'));
const createError = require('../errorHandlers/ApiErrors');
const { User } = require('../models');
const config = require('../config/dbconfig');

const getUser = async obj => {
    return await User.findOne({
        where: obj
    });
}

const getDosen = async obj => {
    const user = await getUser({id_role:'2'});
    return await user.getDosen({where: obj});
}

const getMhs = async obj => {
    const user = await getUser({id_role:'3'});
    return await user.getMahasiswa({where: obj});
}

module.exports = {
/* Admin Input Validator */
    tambahAdminCheck (req, res, next) {
        const schemaAdmin = Joi.object({
            username:Joi.string().pattern(/^[a-zA-Z0-9_\s-]{6,20}$/).required(),
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
            NIP: Joi.string().length(18),
            NIDN: Joi.string().length(10),
            NIDK: Joi.string().length(10).required(),
            nama_lengkap: Joi.string().pattern(/^[a-zA-Z\\s]{2,}$/).required(),
            nomor_telp: Joi.string().min(9).max(12).truncate(),
            email: Joi.string().email().required()
        });

        const { error } = schemaDosen.validate(req.body);
        let msg;
        if (error) {
            switch (error.details[0].context.key) {
                case 'NIP':
                    msg = 'NIP harus berupa 18 digit angka'
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
                    console.error(error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    tambahMhsCheck (req, res, next) {        
        const schemaMahasiswa = Joi.object({      
            NIM: Joi.string().length(10).required(),
            nama_lengkap: Joi.string().pattern(/^[a-zA-Z\\s]{2,}$/).required(),
            nomor_telp: Joi.string().min(9).max(12).truncate(),
            email: Joi.string().email().required()            
        });
       
        const { error } = schemaMahasiswa.validate(req.body);
        let msg;
        if (error) {
            switch (error.details[0].context.key) {
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
        const { NIP, NIDN, NIDK, NIM, email } = req.body        
        try {
            let path = req.baseUrl + req.path;
            if ( path === '/admin/dosen' || path === '/admin/dosen/' ) {
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
            } else if (  path === '/admin/mahasiswa' || path === '/admin/mahasiswa/' ) {        
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
            kode_matkul: Joi.string().pattern(/^[0-9]{8}$/).required(),
            nama_matkul: Joi.string().pattern(/^[a-zA-Z\\s]{3,}$/).required(),
            sks: Joi.number().max(5)
        });

        let body = {
            kode_matkul: req.body.kode_matkul,
            nama_matkul: req.body.nama_matkul,
            sks: req.body.sks
        }, msg;

        const { error } = schemaMatkul.validate(body);

        if (error) {
            switch (error.details[0].context.key) {
                case 'kode_matkul':
                    msg = 'Kode matakuliah minimal 8 karakter angka!'
                    break
                case 'nama_matkul':
                    msg = 'Matakuliah minimal 3 karakter, dan harus huruf (kapital/biasa)!'
                    break          
                case 'sks':
                    msg = 'sks harus berupa angka dan max 5!'
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
            kode_seksi: Joi.string().pattern(/^[0-9]{10}$/).required(),
            hari: Joi.string().valid('senin','selasa','rabu','kamis','jumat').required(),
            jam: Joi.string().pattern(/^([0-9]{2}):([0-9]{2})\s-\s([0-9]{2}):([0-9]{2})$/).required() // eslint-disable-line 
        });
        let val = {
            kode_seksi: req.body.kode_seksi,
            hari: req.body.hari,
            jam: req.body.jam
        }, msg;
        const { error } = schemaMatkul.validate(val);

        if (error) { console.error(error)
            switch (error.details[0].context.key) {
                case 'kode_seksi!':
                    msg = 'kode_seksi minimal 10 karakter angka'
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
                Joi.string().pattern(/^[a-zA-Z0-9_\s-]{6,20}$/)
            ],
            password: Joi.string().pattern(/^[a-zA-Z0-9]{6,20}$/)
        });

        const { error } = schema.validate(req.body);
        let msg;
        if (error){
            console.log(error)
            if (error.details[0].context.key === 'loginData'){
                msg = `syntax email atau username salah, username min 6 karakter,<br>
                       huruf kapital/biasa, email harus ber-@`
            } else {
                msg = 'syntax password salah'
            }
            return next(createError.BadRequest(msg))
        } else {
            return next();
        }        
    },

    async loginCheck (req, res, next){
        const { loginData } = req.body;
        const email_regex = /^[a-zA-Z0-9_+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,7}$/;
        const match = email_regex.test(loginData);
        try {
            if ( match === true ) {
                req.user = await getUser({email: loginData});
                if (!req.user){
                    throw createError.BadRequest('Email tidak terdaftar!');
                }
                return next();
            } else if ( match === false ) {
                req.user = await getUser({username: loginData});
                if (!req.user){
                    throw createError.BadRequest('Username tidak terdaftar!');
                }
                return next();
            }
        } catch (error) {
            return next(error)
        }
    },

    ubahPwCheck(req, res, next) {
        const schema = Joi.object({
            new_password: Joi.string().pattern(/^[a-zA-Z0-9]{8,20}$/)
        });
        let new_password = req.body.new_password
        const { error } = schema.validate({new_password});
        let msg;
        if (error) {
            if (error.details[0].context.key === 'new_password'){
                msg = `Password baru harus 8-20 karakter, dan kombinasi dari a-z, A-Z, <br>
                        0-9 dan tidak ada spasi.`
            } else {
                msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },
/* Dosen Input Validator */
    UjianCheck(req, res, next){
        const schemaUjianBase = Joi.object().keys({
            judul_ujian: Joi.string().min(5).max(100),
            jenis_ujian: Joi.string().valid('Penilaian Harian','Penilaian Tengah Semester',
                        'Penilaian Akhir Semester','Quiz',' '), 
            tanggal_mulai: Joi.date().format('DD-MM-YYYY'), 
            waktu_mulai: Joi.string().regex(/^([0-9]{2})\\:([0-9]{2})\\:([0-9]{2})$/),
            durasi_ujian: Joi.string().regex(/^([0-9]{2})\\:([0-9]{2})\\:([0-9]{2})$/),
            bobot_total: Joi.number().min(70).max(100).integer()            
        }).required();

        const schemaUjiandanSoal = schemaUjianBase.keys({            
            quota_soal: Joi.number().integer(),
            id_soal: Joi.any().when('quota_soal', { 
                is: 0, then: Joi.array().max(50), otherwise: Joi.array().max(Joi.ref('quota_soal'))
            }),
            bobot_soal: Joi.array().items(Joi.number()).custom((value, helpers) => {
                var total = value.reduce((a, b) => a + b, 0)              
                if (total > Joi.ref('bobot_total')) {
                  return helpers.error('any.invalid');
                }              
                return value;
              }),
            kata_kunci_soal: Joi.any().when('quota_soal', { 
                is: 0, 
                then: Joi.array().items(Joi.array().items(Joi.object({
                    kata_kunci: Joi.string().max(25),
                    bobot_kata: Joi.number().max(100)
                })).allow(null)).max(50), 
                otherwise: Joi.array().items(Joi.array().items(Joi.object({
                    kata_kunci: Joi.string().max(25),
                    bobot_kata: Joi.number().max(100)
                })).allow(null)).max(Joi.ref('quota_soal'))
            })
        }).required();

        const schemaUjianBulk = schemaUjiandanSoal.keys({
            jml_paket:  Joi.number().integer().max(config.jmlpkmax)
        }).required();

        let val = {
            judul_ujian: req.body.judul_ujian,
            jenis_ujian: req.body.jenis_ujian,
            tanggal_mulai: req.body.tanggal_mulai,
            waktu_mulai: req.body.waktu_mulai,
            durasi_ujian: req.body.durasi_ujian,
            bobot_total: req.body.bobot_total
        }, result, msg;

        if('quota_soal' in req.body === true && 'jml_paket' in req.body === false){
            val.quota_soal = req.body.quota_soal;
            val.id_soal = req.body.id_soal;
            val.bobot_soal = req.body.bobot_soal;
            val.kata_kunci_soal = req.body.kata_kunci_soal;
            result = schemaUjiandanSoal.validate(val);
        } else if('quota_soal' in req.body === true && 'jml_paket' in req.body === true) {
            val.jml_paket = req.body.jml_paket;
            val.quota_soal = req.body.quota_soal;
            val.id_soal = req.body.id_soal;
            val.bobot_soal = req.body.bobot_soal;
            val.kata_kunci_soal = req.body.kata_kunci_soal;
            result = schemaUjianBulk.validate(val);
        } else {
            result = schemaUjianBase.validate(val);
        }

        if (result.error) {
            switch (result.error.details[0].path[0]) {
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
                    msg = 'format harus HARI/BULAN/TAHUN => DD/MM/YYYY, taruh 0 didepan angka satuan.'
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
                case 'jml_paket':
                    msg = `jumlah paket tidak boleh melebihi ${config.jmlpkmax}`
                    break
                case 'quota_soal':
                    msg = 'quota soal berupa angka!'
                    break
                case 'id_soal':
                    if(val.quota_soal){
                        msg = `soal tidak boleh melebihi ${val.quota_soal} butir`
                    } else {
                        msg = 'maksimal jumlah soal tidak berdurasi adalah 50 butir soal per ujian'
                    }
                    break
                case 'bobot_soal':
                    msg = `bobot soal harus berupa angka dan total bobot seluruh soal tidak boleh melebihi ${val.bobot_total}`
                    break
                case 'kata_kunci_soal':
                    if(val.quota_soal){
                        msg = `kata kunci soal harus berupa array of arrays of objects atau array of null.<br>
                               tiap object terdiri dari: <br>
                               1. "kata_kunci" max 25 huruf, <br>
                               2. "bobot_kata" berupa angka max 100.`
                    } else {
                        msg = `kata kunci soal harus berupa array of arrays of objects atau array of null.<br>
                               tiap object terdiri dari: <br>
                               1. "kata_kunci" max 25 huruf, <br>
                               2. "bobot_kata" berupa angka max 100, <br>
                               panjang array utama max 50`
                    }
                    break
                default:
                    console.error(result.error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    PaketSoalCheck(req, res, next){
        const schemaPkSoalBase = Joi.object().keys({            
            quota_soal: Joi.number().integer(),
            id_soal: Joi.any().when('quota_soal', { 
                is: 0, then: Joi.array().max(50), otherwise: Joi.array().max(Joi.ref('quota_soal'))
            }),
            bobot_soal: Joi.array().items(Joi.number()).custom((value, helpers) => {
                var total = value.reduce((a, b) => a + b, 0)              
                if (total > 100) {
                  return helpers.error('any.invalid');
                }              
                return value;
              }),
            kata_kunci_soal: Joi.any().when('quota_soal', { 
                is: 0, 
                then: Joi.array().items(Joi.array().items(Joi.object({
                    kata_kunci: Joi.string().max(25),
                    bobot_kata: Joi.number().max(100)
                })).allow(null)).max(50), 
                otherwise: Joi.array().items(Joi.array().items(Joi.object({
                    kata_kunci: Joi.string().max(25),
                    bobot_kata: Joi.number().max(100)
                })).allow(null)).max(Joi.ref('quota_soal'))
            })
        }).required();

        const schemaPkSoalBulk = schemaPkSoalBase.keys({
            jml_paket:  Joi.number().integer().max(config.jmlpkmax),
        })

        let val = {            
            quota_soal: req.body.quota_soal,
            id_soal: req.body.id_soal,
            bobot_soal: req.body.bobot_soal,
            kata_kunci_soal: req.body.kata_kunci_soal
        }, msg, result;

        if('jml_paket' in req.body){
            val.jml_paket = req.body.jml_paket;
            result = schemaPkSoalBulk.validate(val);
        } else {
            result = schemaPkSoalBase.validate(val);
        }

        if (result.error) {
            switch (result.error.details[0].path[0]) {
                case 'jml_paket':
                    msg = `jumlah paket berupa angka bulat, dan tidak boleh melebihi ${config.jmlpkmax}`
                    break
                case 'quota_soal':
                    msg = 'quota soal harus berupa angka bulat'
                    break
                case 'id_soal':
                    if(val.quota_soal){
                        msg = `soal tidak boleh melebihi ${val.quota_soal} butir`
                    } else {
                        msg = 'maksimal jumlah soal tidak berdurasi adalah 50 butir soal per ujian'
                    }
                    break
                case 'bobot_soal':
                    msg = 'bobot soal harus berupa angka, dan total bobot seluruh soal tidak boleh melebihi 100'
                    break
                case 'kata_kunci_soal':
                    if(val.quota_soal){
                        msg = `kata kunci soal harus berupa array of arrays of objects atau array of null.<br>
                               tiap object terdiri dari: <br>
                               1. "kata_kunci" max 25 huruf, <br>
                               2. "bobot_kata" berupa angka max 100.`
                    } else {
                        msg = `kata kunci soal harus berupa array of arrays of objects atau array of null.<br>
                                tiap object terdiri dari: <br>
                                1. "kata_kunci" max 25 huruf, <br>
                                2. "bobot_kata" berupa angka max 100, <br>
                                panjang array utama max 50`
                    }
                    break
                default:
                    console.error(result.error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },
    
    SoalCheck(req, res, next){
        const schemaSoal = Joi.object({
            soal: Joi.string().min(15),
            status: Joi.string().valid('draft', 'terbit')
        }).required();

        let val = {
            soal: req.body.soal,
            status: req.body.status,
        }, msg;

        const { error } = schemaSoal.validate(val);

        if (error) {
            switch (error.details[0].context.key) {
                case 'soal':
                    msg = 'soal min 15 karakter'                    
                    break
                case 'status':
                    msg = 'antara draft atau terbit'
                    break
                default:
                    console.error(error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    BulkSoalCheck(req, res, next){
        req.audioPatharr = [], req.videoPatharr = [];
        if (!req.files.soal_bulk) {
            return next(createError.BadRequest('File excel tidak boleh kosong!'));
        } else if(req.files.soal_bulk[0].size > 2320924){
            return next(createError.TooLarge('File excel terlalu besar, maksimal 2MB'));
        }
        if(req.files['audio_soal[]']){
            req.files['audio_soal[]'].forEach(i => {
                if(i.size > 5000000) {
                    req.audioPatharr.push(i.path);
                    return next(createError.TooLarge(`File audio ${i.originalname} terlalu besar, maksimal 5MB`));   
                }
            });
        }
        if(req.files['video_soal[]']){
            req.files['video_soal[]'].forEach(i => {
                if(i.size > 500000000) {
                    req.videoPatharr.push(i.path);
                    return next(createError.TooLarge(`File video ${i.originalname} terlalu besar, maksimal 500MB`));
                }
            });
        }
        return next();
    },

    BobotSoalCheck(req, res, next){        
        const schemaBobotSoal = Joi.object({
            bobot_soal: Joi.number().max(100),
        }).required();

        let val = {
            bobot_soal: req.body.bobot_soal
        }, result, msg;

        if(Array.isArray(val.bobot_soal)){
            for(let i of val.bobot_soal){
                const val = {
                    bobot_soal: i
                }
                result = schemaBobotSoal.validate(val);
            }
        } else {
            result = schemaBobotSoal.validate(val);
        }

        if (result.error) {
            switch (result.error.details[0].context.key) {
                case 'bobot_total':
                    msg = 'bobot berupa angka dan maksimal per-soal 100'
                    break
                default:
                    console.error(result.error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },
    
    KunciSoalCheck(req, res, next){        
        const schemaKunciSoal = Joi.object({
            kata_kunci_soal1: Joi.array().items(Joi.object({
                kata_kunci: Joi.string().max(25),
                bobot_kata: Joi.number().max(100)
            }))
        }).required(); // array of objects

        const schemaKunciSoalBulk = Joi.object({
            kata_kunci_soal2: Joi.array().items(Joi.array().items(Joi.object({
                kata_kunci: Joi.string().max(25),
                bobot_kata: Joi.number().max(100)
            })).allow(null))
        }).required(); // array of arrays of objects

        let val, result, msg;

        function arrTest(){
            for(let i of req.body.kata_kunci_soal){
                if(Array.isArray(i)) return true;     
                else if(i == null) return true;
                else return false;
            }
        }

        if(arrTest()){
            val = { kata_kunci_soal2: req.body.kata_kunci_soal }
            result = schemaKunciSoalBulk.validate(val);
        } else {
            val = { kata_kunci_soal1: req.body.kata_kunci_soal }
            result = schemaKunciSoal.validate(val);
        }

        if (result.error) {
            switch (result.error.details[0].path[0]) {
                case 'kata_kunci_soal1':
                    msg = `harus berupa array of objects tiap object terdiri dari: <br>
                           1. "kata_kunci" max 25 huruf, <br>
                           2. "bobot_kata" berupa angka max 100.`
                    break
                case 'kata_kunci_soal2':
                    msg = `kata kunci soal harus berupa array of arrays of objects atau array of null. <br>
                           tiap object terdiri dari: <br>
                           1. "kata_kunci" max 25 huruf, <br>
                           2. "bobot_kata" berupa angka max 100.`
                    break
                default:
                    console.error(result.error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    TipePenilaianCheck(req, res, next){
        if(!req.body.tipe_penilaian){
            const kata_kunci = req.body.kata_kunci_soal;
            const soalLength = req.body.id_soal.length;
            let totalArray = 0, totalNull = 0;
            for(let i of kata_kunci){
                if(Array.isArray(i)){
                    totalArray++;
                } else if(i == null){
                    totalNull++;
                } else {
                    return next(createError.BadRequest(
                        'kata kunci harus berupa array of arrays of objects atau array of null'
                    ));
                }
            }
            if(totalArray === soalLength && totalNull === 0){
                req.body.tipe_penilaian = 'automatis';
                return next();
            } else if(totalNull === soalLength && totalArray === 0){
               req.body.tipe_penilaian = 'manual';
                return next();
            } else if(totalArray !== 0 && totalArray < soalLength && 
                      totalNull !== 0 && totalNull < soalLength){
                req.body.tipe_penilaian = 'campuran';
                return next();
            } else {
                return next(createError.BadRequest('format array kata kunci salah!'));
            }
        } else {
            return next()
        }
    },

    NilaiCheck(req, res, next){
        const schemaNilaiSoal = Joi.object({
           nilai: Joi.number().min(0).max(100)
        }).required();

        const { error } = schemaNilaiSoal.validate(req.body);

        let msg;
        if (error) {
            switch (error.details[0].context.key) {
                case 'nilai':
                    msg = 'nilai harus berupa angka antara 0 - 100, dan tergantung bobot soal/ total nilai ujian'                    
                    break
                default:
                    console.error(error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },
/* All User Input Validator */
    putProfileCheck (req, res, next) {
        const user = req.user;
        if(user.id_role===1){
            const schemaProfile = Joi.object({
                username:Joi.string().pattern(/^[a-zA-Z0-9_\s-]{6,20}$/).required(),
                email: Joi.string().email().required(),
                status_civitas: Joi.string().valid('aktif','tidak_aktif')
            });
            let val = {
                username: req.body.username,
                email: req.body.email,
                status_civitas: req.body.status_civitas
            }, msg;
            const { error } = schemaProfile.validate(val);

            if(error){
                switch(error.details[0].context.key){
                    case 'username':
                        msg = 'karakter yang boleh digunakan: a-z, A-Z, 0-9, spasi, underscore, panjang 6-20.'
                        break
                    case 'email':
                        msg = 'syntax email harus tepat!, ada @-nya...'
                        break
                    case 'status_civitas':
                        msg = 'pilihan yang diperbolehkan: aktif dan tidak aktif'
                        break
                    default:
                        msg = 'unknown error...coba refresh ulang.'
                }
                return next(createError.BadRequest(msg));
            } else {
                return next()
            }
        } else {
            const schemaProfile = Joi.object({
                username:Joi.string().pattern(/^[a-zA-Z0-9_\s-]{6,20}$/).required(),
                email: Joi.string().email().required(),
                alamat: Joi.string().max(100),
                no_telp: Joi.string().length(12)
            });
            let val = {
                username: req.body.username,
                email: req.body.email,
                alamat: req.body.alamat,
                no_telp: req.body.no_telp
            }, msg;
            const { error } = schemaProfile.validate(val);

            if(error){
                switch(error.details[0].context.key){
                    case 'username':
                        msg = 'karakter yang boleh digunakan: a-z, A-Z, 0-9, spasi, underscore, panjang 6-20.'
                        break
                    case 'email':
                        msg = 'syntax email harus tepat!, ada @-nya...'
                        break
                    case 'alamat':
                        msg = 'maksimal 100 karakter'
                        break
                    case 'no_telp':
                        msg = 'harus 12 karakter'
                        break
                    default:
                        msg = 'unknown error...coba refresh ulang.'
                }
                return next(createError.BadRequest(msg));
            } else {
                return next()
            }
        }
        
    },
/* Mahasiswa Input Validator */
    WaktuCheck(req, res, next){
        const schemaDateTime = Joi.object({
            waktu_mulai: Joi.string().rule.pattern(/^(\d{2})(-|\/)(\d{2})(-|\/)(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/),
            waktu_selesai: Joi.string().rule.pattern(/^(\d{2})(-|\/)(\d{2})(-|\/)(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/)
        }).xor('waktu_mulai', 'waktu_selesai');

        const { error } = schemaDateTime.validate(req.body);

        let msg;
        if (error) {
            switch (error.details[0].context.key) {
                case 'waktu_mulai':
                case 'waktu_selesai':
                    msg = 'format harus berupa "YYYY-MM-DD hh:mm:ss" atau "YYYY/MM/DD hh:mm:ss"'
                    break
                default:
                    console.error(error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {            
            return next();
        }
    },

    JawabanBulkCheck(req, res, next){
       const schemaJawabanBulk = Joi.object({
           array_jawaban: Joi.array().items(Joi.object({
                id_relasi_soalpksoal: Joi.number().integer(),
                jawaban: Joi.string(),
                gambar_jawaban: Joi.alternatives([
                    Joi.array().items(Joi.string().max(19)), 
                    Joi.array()
                ]),
                audio_jawaban: Joi.string().max(19).allow(null),
                video_jawaban: Joi.string().max(19).allow(null),
            }))
       }).required();

       const { error } = schemaJawabanBulk.validate(req.body);

       let msg;
        if (error) {
            switch (error.details[0].path[0]) {
                case 'array_jawaban':
                    msg = `array jawaban harus berupa array, dan array item harus berupa object <br>
                           dengan key: <br>
                           1. id_relasi_soalpksoal: angka integer, <br> 
                           2. jawaban: string, <br> 
                           3. gambar_jawaban: array of string maksimal 15 karakter per string atau array kosong, <br> 
                           4. audio_jawaban: string maksimal 15 karakter atau null, <br> 
                           5. video_jawaban: string maksimal 15 karakter atau null
                           (ps: 15 karakter tidak termasuk ekstensi)`
                    break
                default:
                    console.error(error)
                    msg = 'unknown error...coba refresh ulang.'
            }
            return next(createError.BadRequest(msg));
        } else {
            return next()
        }
    }
}
