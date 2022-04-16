const DosenControl = require('../controllers/DosenControl');
const { UjianCheck, TipePenilaianCheck, PaketSoalCheck, SoalCheck, BulkSoalCheck, 
        NilaiCheck, BobotSoalCheck, KunciSoalCheck } = require('../validator/Controlvalidator');
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
    router.get('/my-profile', DosenControl.getProfile);
    router.put('/my-profile', DosenControl.putProfile);
    router.get('/status', DosenControl.getStatus);
    router.get('/matakuliah', DosenControl.getAllMatkulDosen); // get all matkul yang diampu dosen
    router.get('/matakuliah/:id_matkul', DosenControl.getMatkul); 
    router.get('/kelas', DosenControl.getAllKelasDosen); // get all Kelas yang diampu dosen
    // Ujian operation
    router.get('/ujian', DosenControl.getAllUjian);
    router.get('/ujian/search', DosenControl.searchUjian);
    router.get('/ujian/:id_ujian', DosenControl.getUjian);
    router.get('/ujian/:id_ujian/soal-essay', DosenControl.getSoalUjian);
    router.get('/ujian/pdf', DosenControl.printUjianPdf);
    router.get('/ujian/xlsx', DosenControl.printUjianXcel);
    router.post('/ujian', UjianCheck, DosenControl.setUjian); // set Ujian saja, tanpa paket soal
    router.post('/ujian/paket-soal', UjianCheck, TipePenilaianCheck, DosenControl.setUjiandanRelasi); // Generate 1 ujian dan 1 paket
    router.post('/ujian/bulk-paket-soal', UjianCheck, TipePenilaianCheck, DosenControl.generatePaketSoalUjian); // Generate 1 ujian dan banyak paket soal berdasarkan jml_paket
    // router.post('/ujian/:id_ujian/auto', Validator.PaketSoalCheck, DosenControl.generatePaketSoal); // automatis membuat paket soal dan mengambil soal secara random
    router.post('/ujian/:id_ujian/paket-soal', PaketSoalCheck, TipePenilaianCheck, DosenControl.generatePaketSoalstrict); // array soal harus ditentukan    
    router.put('/ujian/:id_ujian', UjianCheck, DosenControl.putUjian);
    router.patch('/ujian/:id_ujian/status', DosenControl.patchStatusUjian); // ubah status ujian...
    router.patch('/ujian/:id_ujian/keaktifan', DosenControl.patchKeaktifanUjian); // ubah keaktifan ujian...
    router.delete('/ujian/:id_ujian', DosenControl.deleteUjian);
    router.get('/ujian/:id_ujian/hasil/pdf', DosenControl.printHasilUjianPdf);
    router.get('/ujian/:id_ujian/hasil/xlsx', DosenControl.printHasilUjianXcel);
    // Paket-soal operation
    router.get('/paket-soal/:id_paket', DosenControl.getPaketSoal);
    router.get('/paket-soal/:id_paket/mahasiswa', DosenControl.getPkSoalMhs); // lihat semua mahasiswa yang mendapat paket
    // router.get('/paket-soal/:id_paket/mahasiswa/:id_mhs', DosenControl.getNilaiTotalMhs); //get nilai total dr paket yg dikerjakan mhs bersangkutan
    router.patch('/paket-soal/:id_paket/keaktifan', DosenControl.patchKeaktifanPkSoal);
    router.delete('/paket-soal/:id_paket', DosenControl.deletePaketSoal);
    // Relasi Paket-soal_Soal operation
    router.post('/paket-soal/:id_paket/soal-essay', PaketSoalCheck, TipePenilaianCheck, DosenControl.pkSoalsetSoal);
    router.put('/paket-soal/:id_paket/soal-essay', PaketSoalCheck, DosenControl.pkSoalputSoal);
    router.delete('/paket-soal/:id_paket/soal-essay', DosenControl.pkSoaldelSoal);
    router.patch('/bobot-soal/:id_soal', BobotSoalCheck, DosenControl.patchBobotSoal);
    router.patch('/bobot-soal/bulk', BobotSoalCheck, DosenControl.patchBobotSoalBulk);
    router.patch('/kunci-soal/:id_soal', KunciSoalCheck, DosenControl.patchKunciSoal);
    router.patch('/kunci-soal/bulk', KunciSoalCheck, DosenControl.patchKunciSoalBulk);
    // Relasi Kelas-Ujian operation
    router.post('/kelas/:id_kelas/ujian', DosenControl.kelasSetUjian);
    router.put('/kelas/:id_kelas/ujian', DosenControl.kelasPutUjian);
    router.delete('/kelas/:id_kelas/ujian', DosenControl.kelasDelUjian);
    // Relasi Ujian-Kelas operation
    router.post('/ujian/:id_ujian/kelas', DosenControl.ujianSetKelas);
    router.put('/ujian/:id_ujian/kelas', DosenControl.ujianPutKelas);
    router.delete('/ujian/:id_ujian/kelas', DosenControl.ujianDelKelas);   
    // Soal Operation
    router.get('/soal-essay', DosenControl.getAllSoal);
    router.get('/matakuliah/:id_matkul/soal-essay', DosenControl.getAllSoalMatkul);
    router.get('/soal-essay/search', DosenControl.searchSoal);
    router.get('/soal-essay/:id_soal', DosenControl.getSoal);
    router.get('/soal-essay/pdf', DosenControl.printSoalPdf);
    router.get('/soal-essay/xlsx', DosenControl.printSoalXcel);
    router.post('/soal-essay', SoalCheck, uploadFiles, DosenControl.setSoal); // post ke bank soal, return juga id_soal yg baru dibuat
    router.post('/soal-essay/bulk', uploadFiles3, BulkSoalCheck, DosenControl.setSoalBulk);
    router.post('/soal-essay/rel-ujian', SoalCheck, uploadFiles, DosenControl.setSoaldanRelasi); // post ke bank soal sekaligus relasikan ke paket ybs
    router.put('/soal-essay/:id_soal', SoalCheck, uploadFiles, DosenControl.putSoal);
    router.put('/soal-essay/bulk', uploadFiles3, BulkSoalCheck, DosenControl.putSoalBulk);
    router.patch('/soal-essay/:id_soal/gambar', uploadFiles2, DosenControl.patchGambarSoal);
    router.patch('/soal-essay/:id_soal/audio', uploadFile.single('audio_soal'), DosenControl.patchAudioSoal);
    router.patch('/soal-essay/:id_soal/video', uploadFile.single('video_soal'), DosenControl.patchVideoSoal);
    router.patch('/soal-essay/:id_soal/status', DosenControl.patchStatusSoal); // change status soal...
    router.delete('/soal-essay/:id_soal', DosenControl.deleteSoal);
    // Soal-Jawaban Operation
    router.get('/ujian/:id_ujian/soal-essay/penilaian', DosenControl.getSoalPenilaian); // tidak memunculkan soal yg memiliki kata kunci
    router.get('/soal-essay/:id_soal/jawaban-anon', DosenControl.getAllJawabanSoalAnon); // get all jawaban for that soal secara anonim
    router.get('/soal-essay/:id_soal/jawaban', DosenControl.getAllJawabanSoal); // get all jawaban for that soal dengan data penjawab
    router.get('/jawaban/:id_jawaban', DosenControl.getJawaban); // detail jawaban
    // Nilai Operation
    router.post('/nilai/:id_jawaban(?!:id_ujian)', NilaiCheck, DosenControl.setNilaiJawaban);
    router.put('/nilai/:id_jawaban', NilaiCheck, DosenControl.setNilaiJawaban);
    router.post('/nilai/:id_ujian', DosenControl.setNilaiUjian); // untuk ujian tipe penilaian manual dan campuran
    router.post('/nilai/:id_relasi_pksoalmhs', NilaiCheck, DosenControl.setNilaiTotal); // post nilai lgsg ke relasi pkSoal-mhs
    router.put('/nilai/:id_relasi_pksoalmhs', NilaiCheck, DosenControl.setNilaiTotal);

    module.exports = router;