"use strict";
const MhsControl = require('../controllers/MhsControl');
const uploadFile = require('../middlewares/fileuploadall');
const Validator =  require('../validator/Controlvalidator');
const express = require('express');
const uploadFiles = uploadFile.fields([
    { name: 'gambar_jawaban[]', maxCount: 10 },
    { name: 'audio_jawaban' },
    { name: 'video_jawaban' },
]);
let router = express.Router({mergeParams:true});


    router.get('/', MhsControl.getDashboard);
    router.put('/profil', Validator.putProfileCheck, MhsControl.putProfil);
    router.get('/status', MhsControl.getStatus);
    // Relasi Kelas Operation
    router.get('/kelas', MhsControl.getAllKelas);
    router.post('/kelas', MhsControl.setKelas); // array of ids
    router.put('/kelas', MhsControl.putKelas); // array of ids
    router.delete('/kelas', MhsControl.deleteKelas); // array of ids
    // Ujian Operation 
    router.get('/ujian', MhsControl.getorsearchUjianHistory); 
    router.get('/ujian/:id_ujian|/paket-soal/:id_paket', MhsControl.getUjian);   
    router.get('/ujian/:id_ujian/jawaban|/paket-soal/:id_paket/jawaban', MhsControl.getAllJawabanUjian); // get all jawaban berdasarkan paket
    router.get('/ujian/pdf', MhsControl.printUjianPdf);
    router.get('/ujian/xlsx', MhsControl.printUjianXcel);
    router.post('/ujian/:id_ujian/waktu-mulai|/paket-soal/:id_paket/waktu-mulai', Validator.WaktuCheck, MhsControl.setWaktuMulai);
    router.post('/ujian/:id_ujian/waktu-selesai|/paket-soal/:id_paket/waktu-selesai', Validator.WaktuCheck, MhsControl.setWaktuSelesai);
    router.post('/kelas/:id_kelas/ujian', MhsControl.autosetPaketSoal); // automatis men set relasi PkSoal ke mahasiswa berdasarkan kelas yang diambil mhs
    // Soal Operation
    router.get('/soal-essay/:id_relasi_soalpksoal', MhsControl.getSoal);
    // Jawaban Operation 
    router.get('/jawaban', MhsControl.getorsearchJawaban);
    router.get('/jawaban/:id_jawaban', MhsControl.getJawaban);
    router.post('/jawaban', uploadFiles, MhsControl.setJawaban);
    router.post('/jawaban/bulk', Validator.JawabanBulkCheck, uploadFiles, MhsControl.setJawabanBulk);
    router.put('/jawaban/:id_jawaban', uploadFiles, MhsControl.putJawaban);
    router.delete('/jawaban/:id_jawaban', MhsControl.deleteJawaban);
    // Nilai Operation
    router.get('/ujian/:id_ujian/nilai|/paket-soal/:id_paket/nilai', MhsControl.getNilaiAkhir);
    /* Nilai Auto */
    router.post('/ujian/:id_ujian/nilai|/paket-soal/:id_paket/nilai', MhsControl.setNilaiAuto);

    module.exports = router;