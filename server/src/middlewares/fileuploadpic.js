const Multer = require('multer');
const path = require('path');
const { todaysdate } = require('../helpers/global');
const Path = path.join(__dirname, '../../public/fileuploads/picInput');
const createError = require('../errorHandlers/ApiErrors');

    const picFilter = (req, file, cb) => {
        const fileSize = parseInt(req.headers['content-length']);
        if (
            file.mimetype.includes('image/jpeg') ||
            file.mimetype.includes('image/png') &&
            fileSize <= 1024*1024*2
        ) {
            cb(null, true);
        } else if (fileSize > 1024*1024*2 ) {
            cb(createError.Forbidden('Besar file tidak boleh melebihi 2mb'), false);
        } else {
            cb(createError.Forbidden('Hanya boleh file .jpg/.png'), false);
        }
    };
    let filestorage = Multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, Path);
        },
        filename: (req, file, cb) => {
            cb(null, `${req.user.id}_${todaysdate()}-appujian-${file.originalname}`); // eslint-disable-line
        }
    });
    let uploadFile =  Multer({ storage: filestorage, fileFilter: picFilter });
    module.exports = uploadFile;
