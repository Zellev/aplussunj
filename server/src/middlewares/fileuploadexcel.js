const Multer = require('multer');
const path = require('path');
const { todaysdate } = require('../helpers/global');
const Path = path.join(__dirname, '../../public/fileuploads/xlsxInput');
const createError = require('../errorHandlers/ApiErrors');

    const xcelFilter = (req, file, cb) => {
        const fileSize = parseInt(req.headers['content-length']);
        if (
            file.mimetype.includes('excel') ||
            file.mimetype.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
            file.mimetype.includes('application/vnd.ms-excel') &&
            fileSize <= 1024*1024*10
        ) {
            cb(null, true);
        } else if (fileSize > 1024*1024*10 ) {
            cb(createError.Forbidden('Besar file tidak boleh melebihi 10mb'), false);
        } else {
            cb(createError.Forbidden('Hanya boleh file excel, .xlsx/.xls'), false);
        }
    };
    let filestorage = Multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, Path);
        },
        filename: (req, file, cb) => {
            cb(null, `${todaysdate()}-appujian-${file.originalname}`);
        }
    });
    let uploadFile =  Multer({ storage: filestorage, fileFilter: xcelFilter });
    module.exports = uploadFile;
