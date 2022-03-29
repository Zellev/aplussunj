const MhsControl = require('../controllers/MhsControl');
const uploadFile = require('../middlewares/fileuploadall');
const { rateLimiter } = require('../middlewares/ratelimiter');
const { rateSlowdown } = require('../middlewares/rateslowdown');
const { WaktuCheck, JawabanBulkCheck } =  require('../validator/Controlvalidator');
const express = require('express');
const uploadFiles = uploadFile.fields([
    { name: 'gambar_jawaban[]', maxCount: 10 },
    { name: 'audio_jawaban' },
    { name: 'video_jawaban' },
]);
let router = express.Router({mergeParams:true});


    router.get('/', rateLimiter, MhsControl.getDashboard);
    router.get('/my-profile', rateLimiter, MhsControl.getProfile);
    router.put('/my-profile', rateSlowdown, rateLimiter, MhsControl.putProfile);
    router.get('/status', rateLimiter, MhsControl.getStatus);    
    // Relasi Kelas Operation
    router.get('/kelas', rateLimiter, MhsControl.getAllKelas);
    router.post('/kelas', rateSlowdown, rateLimiter, MhsControl.setKelas); // array
    router.put('/kelas', rateSlowdown, rateLimiter, MhsControl.putKelas); // array
    router.delete('/kelas', rateSlowdown, rateLimiter, MhsControl.deleteKelas); // array
    // Ujian Operation 
    router.get('/ujian/:id_ujian|/paket-soal/:id_paket', rateLimiter, MhsControl.getUjian);
    router.get('/ujian/all-short', rateLimiter, MhsControl.getAllUjianS); // get all pksoal yg pernah dikerjakan mhs {data dibatasi}
    router.get('/ujian/all-long', rateLimiter, MhsControl.getAllUjianL); // get all pksoal yg pernah dikerjakan mhs {dgn paginasi}
    router.get('/ujian/:status((?!pdf|xlsx)[a-zA-Z\s])', rateLimiter, MhsControl.getUjianbyStatus); // eslint-disable-line
    router.get('/ujian/:id_ujian/jawaban|/paket-soal/:id_paket/jawaban', rateLimiter, MhsControl.getAllJawabanUjian); // get all jawaban berdasarkan paket
    router.post('/ujian/:id_ujian/waktu-mulai|/paket-soal/:id_paket/waktu-mulai', rateSlowdown, rateLimiter, WaktuCheck, MhsControl.setWaktuMulai);
    router.post('/ujian/:id_ujian/waktu-selesai|/paket-soal/:id_paket/waktu-selesai', rateSlowdown, rateLimiter, WaktuCheck, MhsControl.setWaktuSelesai);
    router.post('/ujian/:id_kelas', rateSlowdown, rateLimiter, MhsControl.autosetPaketSoal); // automatis men set relasi PkSoal ke mahasiswa berdasarkan kelas yang diambil mhs
    router.get('/ujian/pdf', rateLimiter, MhsControl.printUjianPdf);
    router.get('/ujian/xlsx', rateLimiter, MhsControl.printUjianXcel); 
    // Soal Operation
    router.get('/soal-essay/:id_relasi_soalpksoal', rateLimiter, MhsControl.getSoal);
    // Jawaban Operation    
    router.get('/jawaban', rateLimiter, MhsControl.getAllJawaban); // get all jawaban yg pernah dikerjakan mhs    
    router.get('/jawaban/search', rateLimiter, MhsControl.searchJawaban);
    router.get('/jawaban/:id_jawaban', rateLimiter, MhsControl.getJawaban);
    router.post('/jawaban', rateSlowdown, rateLimiter, uploadFiles, MhsControl.setJawaban);
    router.post('/jawaban/bulk', rateSlowdown, rateLimiter, JawabanBulkCheck, uploadFiles, MhsControl.setJawabanBulk);
    router.put('/jawaban/:id_jawaban', rateSlowdown, rateLimiter, uploadFiles, MhsControl.putJawaban);
    router.delete('/jawaban/:id_jawaban', rateSlowdown, rateLimiter, MhsControl.deleteJawaban);    
    // Nilai Operation
    router.get('/nilai/:id_ujian|/nilai/:id_paket', rateLimiter, MhsControl.getNilaiAkhir);
    /* Nilai Auto */
    router.post('/nilai/:id_ujian|/nilai/:id_paket', rateSlowdown, rateLimiter, MhsControl.setNilaiAuto);

    module.exports = router;