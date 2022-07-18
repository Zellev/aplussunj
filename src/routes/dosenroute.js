"use strict";
const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const uploadFile = require('../middlewares/fileuploadall');
const express = require('express');
const uploadFiles = uploadFile.fields([
    { name: 'gambar_soal_1', maxCount: 1 },
    { name: 'gambar_soal_2', maxCount: 1 },
    { name: 'gambar_soal_3', maxCount: 1 },
    { name: 'audio_soal', maxCount: 1 },
    { name: 'video_soal', maxCount: 1 },
]);
const uploadFiles2 = uploadFile.fields([
    { name: 'gambar_soal_1', maxCount: 1 },
    { name: 'gambar_soal_2', maxCount: 1 },
    { name: 'gambar_soal_3', maxCount: 1 },
]);
const uploadFiles3 = uploadFile.fields([
    { name: 'soal_bulk' },
    { name: 'audio_soal[]' },
    { name: 'video_soal[]' },
]);
let router = express.Router({mergeParams:true});
    

    router.get('/', DosenControl.getDashboard);
    router.put('/profil', Validator.putProfileCheck, DosenControl.putProfil);
    router.get('/status', DosenControl.getStatus);
    router.get('/matakuliah', DosenControl.getAllMatkulDosen); // get all matkul yang diampu dosen
    router.get('/matakuliah/:id_matkul', DosenControl.getMatkul); 
    router.get('/kelas', DosenControl.getAllKelasDosen); // get all Kelas yang diampu dosen
    // Ujian operation
    router.get('/ujian', DosenControl.getorsearchUjian);
    router.get('/ujian/:id_ujian', DosenControl.getUjian);
    router.get('/ujian/:id_ujian/soal-essay', DosenControl.getSoalUjian);
    router.get('/ujian/pdf', DosenControl.printUjianPdf);
    router.get('/ujian/xlsx', DosenControl.printUjianXcel);
    router.post('/ujian', Validator.UjianCheck, DosenControl.setUjian); // set Ujian saja, tanpa paket soal
    // router.post('/ujian/paket-soal', Validator.UjianCheck, Validator.TipePenilaianCheck, DosenControl.setUjiandanRelasi); // Generate 1 ujian dan 1 paket
    router.post('/ujian/bulk-paket-soal', Validator.UjianCheck, Validator.TipePenilaianCheck, DosenControl.setUjianandPaketSoal);  // Generate 1 ujian dan banyak paket soal berdasarkan jml_paket
    // router.post('/ujian/:id_ujian/auto', Validator.PaketSoalCheck, DosenControl.generatePaketSoal); // automatis membuat paket soal dan mengambil soal secara random
    router.post('/ujian/:id_ujian/paket-soal', Validator.PaketSoalCheck, Validator.TipePenilaianCheck, DosenControl.generatePaketSoalstrict); // array soal harus ditentukan    
    router.put('/ujian/:id_ujian', Validator.UjianCheck, DosenControl.putUjian);
    router.patch('/ujian/:id_ujian/status', DosenControl.patchStatusUjian); // ubah status ujian...
    router.patch('/ujian/:id_ujian/keaktifan', DosenControl.patchKeaktifanUjian); // ubah keaktifan ujian...
    router.delete('/ujian/:id_ujian', DosenControl.deleteUjian);
    router.delete('/ujian/bulk', DosenControl.deleteUjianBulk);
    router.get('/ujian/:id_ujian/hasil/pdf', DosenControl.printHasilUjianPdf);
    router.get('/ujian/:id_ujian/hasil/xlsx', DosenControl.printHasilUjianXcel);
    // Relasi Ujian_Soal operation
    router.post('/ujian/:id_ujian/soal-essay', Validator.PaketSoalCheck, DosenControl.UjiansetSoal);
    router.put('/ujian/:id_ujian/soal-essay', Validator.PaketSoalCheck, DosenControl.UjianputSoal);
    router.delete('/ujian/:id_ujian/soal-essay', DosenControl.UjiandelSoal);
    router.patch('/ujian/:id_ujian/bobot-soal/:id_soal', Validator.BobotSoalCheck, DosenControl.patchBobotSoal);
    router.patch('/ujian/:id_ujian/bobot-soal/bulk', Validator.BobotSoalCheck, DosenControl.patchBobotSoalBulk);
    router.patch('/ujian/:id_ujian/kunci-soal/:id_soal', Validator.KunciSoalCheck, DosenControl.patchKunciSoal);
    router.patch('/ujian/:id_ujian/kunci-soal/bulk', Validator.KunciSoalCheck, DosenControl.patchKunciSoalBulk);
    // Paket-soal operation
    router.get('/paket-soal/:id_paket', DosenControl.getPaketSoal);
    router.get('/paket-soal/:id_paket/mahasiswa', DosenControl.getPkSoalMhs); // lihat semua mahasiswa yang mendapat paket
    // router.get('/paket-soal/:id_paket/mahasiswa/:id_mhs', DosenControl.getNilaiTotalMhs); //get nilai total dr paket yg dikerjakan mhs bersangkutan
    router.patch('/paket-soal/:id_paket/keaktifan', DosenControl.patchKeaktifanPkSoal);
    router.delete('/paket-soal/:id_paket', DosenControl.deletePaketSoal);
    router.delete('/paket-soal/bulk', DosenControl.deletePaketSoalBulk);    
    // Relasi Kelas-Ujian operation
    router.post('/kelas/:id_kelas/ujian', DosenControl.kelasSetUjian);
    router.put('/kelas/:id_kelas/ujian', DosenControl.kelasPutUjian);
    router.delete('/kelas/:id_kelas/ujian', DosenControl.kelasDelUjian);
    // Relasi Ujian-Kelas operation
    router.post('/ujian/:id_ujian/kelas', DosenControl.ujianSetKelas);
    router.put('/ujian/:id_ujian/kelas', DosenControl.ujianPutKelas);
    router.delete('/ujian/:id_ujian/kelas', DosenControl.ujianDelKelas);   
    // Soal Operation
    router.get('/matakuliah/:id_matkul/soal-essay', DosenControl.getAllSoalMatkul); //THIS
    router.get('/soal-essay', DosenControl.getorsearchSoal);
    router.get('/soal-essay/:id_soal', DosenControl.getSoal);
    router.get('/soal-essay/pdf', DosenControl.printSoalPdf);
    router.get('/soal-essay/xlsx', DosenControl.printSoalXcel);
    router.post('/soal-essay', Validator.SoalCheck, uploadFiles, DosenControl.setSoal); // post ke bank soal, return juga id_soal yg baru dibuat
    router.post('/soal-essay/bulk', uploadFiles3, Validator.BulkSoalCheck, DosenControl.setSoalBulk);
    // router.post('/soal-essay/rel-ujian', SoalCheck, uploadFiles, DosenControl.setSoaldanRelasi); // post ke bank soal sekaligus relasikan ke paket ybs
    router.put('/soal-essay/:id_soal', Validator.SoalCheck, uploadFiles, DosenControl.putSoal);
    router.put('/soal-essay/bulk', uploadFiles3, Validator.BulkSoalCheck, DosenControl.putSoalBulk);
    router.patch('/soal-essay/:id_soal/gambar', uploadFiles2, DosenControl.patchGambarSoal);
    router.patch('/soal-essay/:id_soal/audio', uploadFile.single('audio_soal'), DosenControl.patchAudioSoal);
    router.patch('/soal-essay/:id_soal/video', uploadFile.single('video_soal'), DosenControl.patchVideoSoal);
    router.patch('/soal-essay/:id_soal/status', DosenControl.patchStatusSoal); // change status soal...
    router.delete('/soal-essay/:id_soal', DosenControl.deleteSoal);
    router.delete('/soal-essay/bulk', DosenControl.deleteSoalBulk);
    // Soal-Jawaban Operation
    // router.get('/ujian/:id_ujian/soal-essay/penilaian', DosenControl.getSoalPenilaian); // tidak memunculkan soal yg memiliki kata kunci
    router.get('/soal-essay/:id_soal/jawaban-anon', DosenControl.getAllJawabanSoalAnon); // get all jawaban for that soal secara anonim
    router.get('/soal-essay/:id_soal/jawaban', DosenControl.getAllJawabanSoal); // get all jawaban for that soal dengan data penjawab
    // router.get('/jawaban/:id_jawaban', DosenControl.getJawaban); // detail jawaban
    // Nilai Operation
    router.post('/ujian/:id_ujian/nilai', DosenControl.setNilaiUjian); // untuk ujian tipe penilaian manual dan campuran
    router.post('/jawaban/:id_jawaban/nilai', Validator.NilaiCheck, DosenControl.setNilaiJawaban);
    router.put('/jawaban/:id_jawaban/nilai', Validator.NilaiCheck, DosenControl.setNilaiJawaban);    
    router.post('/nilai-total/:id_relasi_pksoalmhs', Validator.NilaiCheck, DosenControl.setNilaiTotal); // post nilai lgsg ke relasi pkSoal-mhs
    router.put('/nilai-total/:id_relasi_pksoalmhs', Validator.NilaiCheck, DosenControl.setNilaiTotal);

    module.exports = router;