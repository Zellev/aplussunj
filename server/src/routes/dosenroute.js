const DosenControl = require('../controllers/DosenControl');
const { UjianCheck, TipePenilaianCheck, PaketSoalCheck, SoalCheck, BulkSoalCheck, 
        NilaiCheck, BobotSoalCheck, KunciSoalCheck } = require('../validator/Controlvalidator');
const uploadFile = require('../middlewares/fileuploadall');
const { rateLimiter } = require('../middlewares/ratelimiter');
const { rateSlowdown } = require('../middlewares/rateslowdown');
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
    

    router.get('/', rateLimiter, DosenControl.getDashboard);
    router.get('/my-profile', rateLimiter, DosenControl.getProfile);
    router.put('/my-profile', rateSlowdown, rateLimiter, DosenControl.putProfile);
    router.get('/status', rateLimiter, DosenControl.getStatus);
    router.get('/matakuliah', rateLimiter, DosenControl.getAllMatkulDosen); // get all matkul yang diampu dosen
    router.get('/matakuliah/:id_matkul', rateLimiter, DosenControl.getMatkul); 
    router.get('/kelas', rateLimiter, DosenControl.getAllKelasDosen); // get all Kelas yang diampu dosen
    // Ujian operation
    router.get('/ujian', rateLimiter, DosenControl.getAllUjian);
    router.get('/ujian/search', rateLimiter, DosenControl.searchUjian);
    router.get('/ujian/:id_ujian', rateLimiter, DosenControl.getUjian);
    router.get('/ujian/:id_ujian/soal-essay', rateLimiter, DosenControl.getSoalUjian);
    router.get('/ujian/pdf', rateLimiter, DosenControl.printUjianPdf);
    router.get('/ujian/xlsx', rateLimiter, DosenControl.printUjianXcel);
    router.post('/ujian', rateSlowdown, rateLimiter, UjianCheck, DosenControl.setUjian); // set Ujian saja, tanpa paket soal
    router.post('/ujian/paket-soal', rateSlowdown, rateLimiter, UjianCheck, TipePenilaianCheck, DosenControl.setUjiandanRelasi); // Generate 1 ujian dan 1 paket
    router.post('/ujian/bulk-paket-soal', rateSlowdown, rateLimiter, UjianCheck, TipePenilaianCheck, DosenControl.generatePaketSoalUjian); // Generate 1 ujian dan banyak paket soal berdasarkan jml_paket
    // router.post('/ujian/:id_ujian/auto', Validator.PaketSoalCheck, DosenControl.generatePaketSoal); // automatis membuat paket soal dan mengambil soal secara random
    router.post('/ujian/:id_ujian/paket-soal', rateSlowdown, rateLimiter, PaketSoalCheck, TipePenilaianCheck, DosenControl.generatePaketSoalstrict); // array soal harus ditentukan    
    router.put('/ujian/:id_ujian', rateSlowdown, rateLimiter, UjianCheck, DosenControl.putUjian);
    router.patch('/ujian/:id_ujian/status', rateSlowdown, rateLimiter, DosenControl.patchStatusUjian); // ubah status ujian...
    router.patch('/ujian/:id_ujian/keaktifan', rateSlowdown, rateLimiter, DosenControl.patchKeaktifanUjian); // ubah keaktifan ujian...
    router.delete('/ujian/:id_ujian', rateSlowdown, rateLimiter, DosenControl.deleteUjian);
    // Paket-soal operation
    router.get('/paket-soal/:id_paket', rateLimiter, DosenControl.getPaketSoal);
    router.get('/paket-soal/:id_paket/mahasiswa', rateLimiter, DosenControl.getPkSoalMhs); // lihat semua mahasiswa yang mendapat paket
    router.get('/paket-soal/:id_paket/mahasiswa/:id_mhs', rateLimiter, DosenControl.getNilaiTotalMhs); //get nilai total dr paket yg dikerjakan mhs bersangkutan
    router.patch('/paket-soal/:id_paket/keaktifan', rateSlowdown, rateLimiter, DosenControl.patchKeaktifanPkSoal);
    router.delete('/paket-soal/:id_paket', rateSlowdown, rateLimiter, DosenControl.deletePaketSoal);
    // Relasi Paket-soal_Soal operation
    router.post('/paket-soal/:id_paket/soal-essay', rateSlowdown, rateLimiter, PaketSoalCheck, TipePenilaianCheck, DosenControl.pkSoalsetSoal);
    router.put('/paket-soal/:id_paket/soal-essay', rateSlowdown, rateLimiter, PaketSoalCheck, DosenControl.pkSoalputSoal);
    router.delete('/paket-soal/:id_paket/soal-essay', rateSlowdown, rateLimiter, DosenControl.pkSoaldelSoal);
    router.patch('/bobot-soal/:id_soal', rateSlowdown, rateLimiter, BobotSoalCheck, DosenControl.patchBobotSoal);
    router.patch('/bobot-soal/bulk', rateSlowdown, rateLimiter, BobotSoalCheck, DosenControl.patchBobotSoalBulk);
    router.patch('/kunci-soal/:id_soal', rateSlowdown, rateLimiter, KunciSoalCheck, DosenControl.patchKunciSoal);
    router.patch('/kunci-soal/bulk', rateSlowdown, rateLimiter, KunciSoalCheck, DosenControl.patchKunciSoalBulk);
    // Relasi Kelas-Ujian operation
    router.post('/kelas/:id_kelas/ujian', rateSlowdown, rateLimiter, DosenControl.kelasSetUjian);
    router.put('/kelas/:id_kelas/ujian', rateSlowdown, rateLimiter, DosenControl.kelasPutUjian);
    router.delete('/kelas/:id_kelas/ujian', rateSlowdown, rateLimiter, DosenControl.kelasDelUjian);
    // Relasi Ujian-Kelas operation
    router.post('/ujian/:id_ujian/kelas', rateSlowdown, rateLimiter, DosenControl.ujianSetKelas);
    router.put('/ujian/:id_ujian/kelas', rateSlowdown, rateLimiter, DosenControl.ujianPutKelas);
    router.delete('/ujian/:id_ujian/kelas', rateSlowdown, rateLimiter, DosenControl.ujianDelKelas);   
    // Soal Operation
    router.get('/soal-essay', rateLimiter, DosenControl.getAllSoal);
    router.get('/matakuliah/:id_matkul/soal-essay', rateLimiter, DosenControl.getAllSoalMatkul);
    router.get('/soal-essay/search', rateLimiter, DosenControl.searchSoal);
    router.get('/soal-essay/:id_soal', rateLimiter, DosenControl.getSoal);
    router.get('/soal-essay/pdf', rateLimiter, DosenControl.printSoalPdf);
    router.get('/soal-essay/xlsx', rateLimiter, DosenControl.printSoalXcel);
    router.post('/soal-essay', rateSlowdown, rateLimiter, SoalCheck, uploadFiles, DosenControl.setSoal); // post ke bank soal, return juga id_soal yg baru dibuat
    router.post('/soal-essay/bulk', rateSlowdown, rateLimiter, uploadFiles3, BulkSoalCheck, DosenControl.setSoalBulk);
    router.post('/soal-essay/rel-ujian', rateSlowdown, rateLimiter, SoalCheck, uploadFiles, DosenControl.setSoaldanRelasi); // post ke bank soal sekaligus relasikan ke paket ybs
    router.put('/soal-essay/:id_soal', rateSlowdown, rateLimiter, SoalCheck, uploadFiles, DosenControl.putSoal);
    router.put('/soal-essay/bulk', rateSlowdown, rateLimiter, uploadFiles3,  BulkSoalCheck, DosenControl.putSoalBulk);
    router.patch('/soal-essay/:id_soal/gambar', rateSlowdown, rateLimiter, uploadFiles2, DosenControl.patchGambarSoal);
    router.patch('/soal-essay/:id_soal/audio', rateSlowdown, rateLimiter, uploadFile.single('audio_soal'), DosenControl.patchAudioSoal);
    router.patch('/soal-essay/:id_soal/video', rateSlowdown, rateLimiter, uploadFile.single('video_soal'), DosenControl.patchVideoSoal);
    router.patch('/soal-essay/:id_soal/status', rateSlowdown, rateLimiter, DosenControl.patchStatusSoal); // change status soal...
    router.delete('/soal-essay/:id_soal', rateSlowdown, rateLimiter, DosenControl.deleteSoal);
    // Soal-Jawaban Operation
    router.get('/ujian/:id_ujian/soal-essay/penilaian', rateLimiter, DosenControl.getSoalPenilaian); // tidak memunculkan soal yg memiliki kata kunci
    router.get('/soal-essay/:id_soal/jawaban-anon', rateLimiter, DosenControl.getAllJawabanSoalAnon); // get all jawaban for that soal secara anonim
    router.get('/soal-essay/:id_soal/jawaban', rateLimiter, DosenControl.getAllJawabanSoal); // get all jawaban for that soal dengan data penjawab
    router.get('/jawaban/:id_jawaban', rateLimiter, DosenControl.getJawaban); // detail jawaban
    // Nilai Operation
    router.post('/nilai/:id_jawaban(?!:id_ujian)', rateSlowdown, rateLimiter, NilaiCheck, DosenControl.setNilaiJawaban);
    router.put('/nilai/:id_jawaban', rateSlowdown, rateLimiter, NilaiCheck, DosenControl.setNilaiJawaban);
    router.post('/nilai/:id_ujian', rateSlowdown, rateLimiter, DosenControl.setNilaiUjian); // untuk ujian tipe penilaian manual dan campuran
    router.post('/nilai/:id_relasi_pksoalmhs', rateSlowdown, rateLimiter, NilaiCheck, DosenControl.setNilaiTotal); // post nilai lgsg ke relasi pkSoal-mhs
    router.put('/nilai/:id_relasi_pksoalmhs', rateSlowdown, rateLimiter, NilaiCheck, DosenControl.setNilaiTotal);

    module.exports = router;