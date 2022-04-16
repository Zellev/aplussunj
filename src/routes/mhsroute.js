const MhsControl = require('../controllers/MhsControl');
const uploadFile = require('../middlewares/fileuploadall');
const { WaktuCheck, JawabanBulkCheck } =  require('../validator/Controlvalidator');
const express = require('express');
const uploadFiles = uploadFile.fields([
    { name: 'gambar_jawaban[]', maxCount: 10 },
    { name: 'audio_jawaban' },
    { name: 'video_jawaban' },
]);
let router = express.Router({mergeParams:true});


    router.get('/', MhsControl.getDashboard);
    router.get('/my-profile', MhsControl.getProfile);
    router.put('/my-profile', MhsControl.putProfile);
    router.get('/status', MhsControl.getStatus);    
    // Relasi Kelas Operation
    router.get('/kelas', MhsControl.getAllKelas);
    router.post('/kelas', MhsControl.setKelas); // array
    router.put('/kelas', MhsControl.putKelas); // array
    router.delete('/kelas', MhsControl.deleteKelas); // array
    // Ujian Operation 
    router.get('/ujian/:id_ujian|/paket-soal/:id_paket', MhsControl.getUjian);
    router.get('/ujian/all-short', MhsControl.getAllUjianS); // get all pksoal yg pernah dikerjakan mhs {data dibatasi}
    router.get('/ujian/all-long', MhsControl.getAllUjianL); // get all pksoal yg pernah dikerjakan mhs {dgn paginasi}
    router.get('/ujian/:status((?!pdf|xlsx)[a-zA-Z\s])', MhsControl.getUjianbyStatus); // eslint-disable-line
    router.get('/ujian/:id_ujian/jawaban|/paket-soal/:id_paket/jawaban', MhsControl.getAllJawabanUjian); // get all jawaban berdasarkan paket
    router.post('/ujian/:id_ujian/waktu-mulai|/paket-soal/:id_paket/waktu-mulai', WaktuCheck, MhsControl.setWaktuMulai);
    router.post('/ujian/:id_ujian/waktu-selesai|/paket-soal/:id_paket/waktu-selesai', WaktuCheck, MhsControl.setWaktuSelesai);
    router.post('/ujian/:id_kelas', MhsControl.autosetPaketSoal); // automatis men set relasi PkSoal ke mahasiswa berdasarkan kelas yang diambil mhs
    router.get('/ujian/pdf', MhsControl.printUjianPdf);
    router.get('/ujian/xlsx', MhsControl.printUjianXcel); 
    // Soal Operation
    router.get('/soal-essay/:id_relasi_soalpksoal', MhsControl.getSoal);
    // Jawaban Operation    
    router.get('/jawaban', MhsControl.getAllJawaban); // get all jawaban yg pernah dikerjakan mhs    
    router.get('/jawaban/search', MhsControl.searchJawaban);
    router.get('/jawaban/:id_jawaban', MhsControl.getJawaban);
    router.post('/jawaban', uploadFiles, MhsControl.setJawaban);
    router.post('/jawaban/bulk', JawabanBulkCheck, uploadFiles, MhsControl.setJawabanBulk);
    router.put('/jawaban/:id_jawaban', uploadFiles, MhsControl.putJawaban);
    router.delete('/jawaban/:id_jawaban', MhsControl.deleteJawaban);    
    // Nilai Operation
    router.get('/nilai/:id_ujian|/nilai/:id_paket', MhsControl.getNilaiAkhir);
    /* Nilai Auto */
    router.post('/nilai/:id_ujian|/nilai/:id_paket', MhsControl.setNilaiAuto);

    module.exports = router;