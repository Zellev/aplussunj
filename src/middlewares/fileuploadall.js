const Multer = require('multer');
const path = require('path');
const { todaysdate } = require('../helpers/global');
const PathPic = path.join(__dirname, '../../public/fileuploads/picInput');
const PathXl = path.join(__dirname, '../../public/fileuploads/xlsxInput');
const PathAud = path.join(__dirname, '../../public/fileuploads/audioInput');
const PathVid = path.join(__dirname, '../../public/fileuploads/videoInput');
const PathDefault = path.join(__dirname, '../../public/fileuploads');
const createError = require('../errorHandlers/ApiErrors');

    const fileFilter = (req, file, cb) => {
        let filesize, filetypes, extname, mimetype, mimelist;
        switch(file.fieldname){
            //case 1 = gambar
            case 'foto_profil':
            case 'gambar_soal_1':
            case 'gambar_soal_2':
            case 'gambar_soal_3':
            case 'gambar_jawaban[]':            
                filetypes = /jpeg|jpg|png|gif/;
                filesize = parseInt(req.headers['content-length']);
                extname = filetypes.test(
                    path.extname(file.originalname).toString()
                );
                mimetype = filetypes.test(file.mimetype);
                if (extname && mimetype && filesize <= 1024*1024*2) {
                    cb(null, true);
                } else if (filesize > 1024*1024*2 ) {
                    cb(createError.TooLarge('Besar file tidak boleh melebihi 2MB'), false);
                } else {
                    cb(createError.Unsupported('File harus berupa,.jpeg/.jpg/.png/.gif'), false);
                }
            break;
            //case 2 = excel
            case 'fileadder':
            case 'fileupdater':
            case 'soal_bulk':
                filetypes = /xlsx|xls/;
                filesize = parseInt(req.headers['content-length']);
                mimelist = [
                    /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application\/vnd.ms-excel/,
                    /application\/vnd.ms-excel/, /excel/ 
                ]                
                extname = filetypes.test(
                    path.extname(file.originalname).toString()
                );
                mimetype = mimelist.some(rx => rx.test(file.mimetype));                
                if(file.fieldname !== 'soal_bulk'){
                    if (extname && mimetype && filesize <= 1024*1024*5) {
                        cb(null, true);
                    } else if (filesize > 1024*1024*5 ) {
                        cb(createError.TooLarge('Besar file tidak boleh melebihi 5MB'), false);
                    } else {
                        cb(createError.Unsupported('File harus berupa,.xlsx/.xls'), false);
                    }
                } else {
                    if (extname && mimetype) {
                        cb(null, true);
                    } else {
                        cb(createError.Unsupported('File harus berupa,.xlsx/.xls'), false);
                    }
                }
            break;
            //case 3 = audio
            case 'audio_soal':
            case 'audio_jawaban':
            case 'audio_soal[]':
                filetypes = /mid|mpeg|ogg|wav|mp3/;
                filesize = parseInt(req.headers['content-length']);
                mimelist = [ /audio\/mid/, /audio\/mp4/, /audio\/mpeg/, /audio\/ogg/, /audio\/vnd.wav/ ]
                extname = filetypes.test(
                    path.extname(file.originalname).toString()
                );
                mimetype = mimelist.some(rx => rx.test(file.mimetype));
                if(file.fieldname === 'audio_soal'){
                    if (extname && mimetype && filesize <= 1024*1024*5) {
                        cb(null, true);
                    } else if (filesize > 1024*1024*5 ) {
                        cb(createError.TooLarge('Besar file tidak boleh melebihi 5MB'), false);
                    } else {                    
                        cb(createError.Unsupported('File harus berupa, .midi/.mp3/.mp4(audio)/.ogg/.wav'), false);
                    }
                } else {
                    if (extname && mimetype) {
                        cb(null, true);
                    } else {                    
                        cb(createError.Unsupported('File harus berupa, .midi/.mp3/.mp4(audio)/.ogg/.wav'), false);
                    }
                }                
            break;
            //case 4 = video
            case 'video_soal':
            case 'video_jawaban':
            case 'video_soal[]':
                filetypes = /flv|mp4|ts|3gp|mov|avi|wmv/;
                filesize = parseInt(req.headers['content-length']);
                mimelist = [ /video\/x-flv/, /video\/mp4/, /video\/MP2T/, /video\/3gpp/,
                    /video\/quicktime/, /video\/x-msvideo/, /video\/x-ms-wmv/ ]
                extname = filetypes.test(
                    path.extname(file.originalname).toString()
                );
                mimetype = mimelist.some(rx => rx.test(file.mimetype));
                if(file.fieldname === 'video_soal'){
                    if (extname && mimetype && filesize <= 1024*1024*500) {
                        cb(null, true);
                    } else if (filesize > 1024*1024*500 ) {
                        cb(createError.TooLarge('Besar file tidak boleh melebihi 500MB'), false);
                    } else {
                        cb(createError.Unsupported('File harus berupa, .flv/.mp4/.ts/.3gp/.mov/.avi/.wmv'), false);
                    }
                } else {
                    if (extname && mimetype) {
                        cb(null, true);
                    } else {
                        cb(createError.Unsupported('File harus berupa, .flv/.mp4/.ts/.3gp/.mov/.avi/.wmv'), false);
                    }
                }
                
            break;
            default:
                cb(createError.Unprocessable('maaf, file tidak dapat diproses lebih lanjut.'), false);
        }        
    };
    let filestorage = Multer.diskStorage({
        destination: (req, file, cb) => {
            switch(file.fieldname){
                case 'foto_profil':
                case 'gambar_soal_1':
                case 'gambar_soal_2':
                case 'gambar_soal_3':
                case 'gambar_jawaban[]':
                    cb(null, PathPic);
                break;
                case 'fileadder':
                case 'fileupdater':
                case 'soal_bulk':
                    cb(null, PathXl);
                break;
                case 'audio_soal':
                case 'audio_jawaban':
                case 'audio_soal[]':                    
                    cb(null, PathAud);
                break;
                case 'video_soal':
                case 'video_jawaban':
                case 'video_soal[]':
                    cb(null, PathVid);
                break;
                default:
                    cb(null, PathDefault);
            }
        },
        filename: (req, file, cb) => {
            let filename;
            if(file.fieldname === 'audio_soal[]'||file.fieldname === 'video_soal[]'){
                filename = file.originalname;
                cb(null, `${filename}`);
            } else {
                const extpath = path.extname(file.originalname).toString();
                const filepath = file.originalname.replace(/\.[^/.]+$/, "");
                filepath.length > 15 ? filename = filepath.substring(0, 15): filename = filepath;
                cb(null, `${req.user.id}_${todaysdate()}-appujian-${filename}${extpath}`);// eslint-disable-line                
            }
        }
    });
    let uploadFile =  Multer({ storage: filestorage, fileFilter: fileFilter });
    module.exports = uploadFile;
