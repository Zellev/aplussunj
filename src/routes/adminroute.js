const AdminControl = require('../controllers/AdminControl');
const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const uploadExcel = require('../middlewares/fileuploadall');
const { rateLimiter } = require('../middlewares/ratelimiter');
const { rateSlowdown } = require('../middlewares/rateslowdown');
const express = require('express');
let router = express.Router({mergeParams:true});

    router.get('/', rateLimiter, AdminControl.getDashboard);
    router.get('/status/pdf', rateLimiter, AdminControl.printStatusPdf);
    router.get('/status/xlsx', rateLimiter, AdminControl.printStatusXcel);
    //User operation
    router.get('/users', rateLimiter, AdminControl.getallUser);
    router.get('/users/search', rateLimiter, AdminControl.searchUser);
    router.get('/users/:id_user', rateLimiter, AdminControl.getUser);
    router.put('/users/:id_user(?!bulk)', rateSlowdown, rateLimiter, AdminControl.putUser);
    router.put('/users/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileupdater'), AdminControl.putUserbulk);
    router.delete('/users/:id_user', rateSlowdown, rateLimiter, AdminControl.deleteUser);
    //Admin profile operation
    router.get('/my-profile', rateLimiter, AdminControl.getProfile);
    router.put('/my-profile', rateSlowdown, rateLimiter, AdminControl.putProfile);    
    //Admin dosen operation
    router.get('/dosen', rateLimiter, AdminControl.getallDosen);
    router.get('/dosen/search', rateLimiter, AdminControl.searchDosen);
    router.post('/dosen', rateSlowdown, rateLimiter, Validator.tambahDosenCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/dosen/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileadder'), AdminControl.daftarDosenbulk);
    router.put('/dosen/:id_dosen(?!bulk)', rateSlowdown, rateLimiter, AdminControl.putDosen);
    router.put('/dosen/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileupdater'), AdminControl.putDosenbulk);
    router.delete('/dosen/:id_dosen', rateSlowdown, rateLimiter, AdminControl.deleteDosen);
    //Admin mahasiswa operation
    router.get('/mahasiswa', rateLimiter, AdminControl.getallMhs);
    router.get('/mahasiswa/search', rateLimiter, AdminControl.searchMhs);
    router.post('/mahasiswa', rateSlowdown, rateLimiter, Validator.tambahMhsCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/mahasiswa/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileadder'), AdminControl.daftarMhsbulk);    
    router.put('/mahasiswa/:id_mhs(?!bulk)', rateSlowdown, rateLimiter, AdminControl.putMhs);
    router.put('/mahasiswa/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileupdater'), AdminControl.putMhsbulk);
    router.delete('/mahasiswa/:id_mhs', rateSlowdown, rateLimiter, AdminControl.deleteMhs);
    //Admin matakuliah operation
    router.get('/matakuliah', rateLimiter, AdminControl.getallMatkul);
    router.get('/matakuliah/search', rateLimiter, AdminControl.searchMatkul);
    router.get('/matakuliah/:id_matkul', rateLimiter, AdminControl.getMatkul);
    router.post('/matakuliah', rateSlowdown, rateLimiter, Validator.matkulInputCheck, AdminControl.setMatkul);
    router.post('/matakuliah/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileadder'), AdminControl.setMatkulbulk);
    router.put('/matakuliah/:id_matkul', rateSlowdown, rateLimiter, AdminControl.putMatkul);
    router.put('/matakuliah/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileupdater'), AdminControl.putMatkulbulk);
    router.delete('/matakuliah/:id_matkul', rateSlowdown, rateLimiter, AdminControl.deleteMatkul);
    //Admin kelas operation   
    router.post('/kelas', rateSlowdown, rateLimiter, Validator.kelasInputCheck, AdminControl.setKelas);
    router.post('/kelas/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileadder'), AdminControl.setKelasbulk);
    router.put('/kelas/:id_kelas(?!bulk)', rateSlowdown, rateLimiter, AdminControl.putKelas);
    router.put('/kelas/bulk', rateSlowdown, rateLimiter, uploadExcel.single('fileupdater'), AdminControl.putKelasbulk);
    router.delete('/kelas/:id_kelas', rateSlowdown, rateLimiter, AdminControl.deleteKelas);
    //Admin kelas-mahasiswa operation
    router.get('/kelas/:id_kelas/mhs', rateLimiter, AdminControl.kelasGetMhs);
    router.post('/kelas/:id_kelas/mhs', rateSlowdown, rateLimiter, uploadExcel.single('fileadder'), AdminControl.kelasSetMhs);
    router.put('/kelas/:id_kelas/mhs', rateSlowdown, rateLimiter, uploadExcel.single('fileupdater'), AdminControl.kelasUpdateMhs);
    router.delete('/kelas/:id_kelas/mhs', rateSlowdown, rateLimiter, AdminControl.kelasRemoveMhs);
    //Admin kelas-dosen operation
    router.get('/kelas/:id_kelas/dosen', rateLimiter, AdminControl.kelasGetDosen);
    router.post('/kelas/:id_kelas/dosen', rateSlowdown, rateLimiter, AdminControl.kelasSetDosen);
    router.put('/kelas/:id_kelas/dosen', rateSlowdown, rateLimiter, AdminControl.kelasUpdateDosen);
    router.delete('/kelas/:id_kelas/dosen', rateSlowdown, rateLimiter, AdminControl.kelasRemoveDosen);
    //Admin kelas-ujian operation
    router.get('/kelas/:id_kelas/ujian', rateLimiter, AdminControl.kelasGetAllUjian);
    router.get('/kelas/:id_kelas/ujian/search', rateLimiter, AdminControl.kelasSearchUjian);    
    router.post('/kelas/:id_kelas/ujian', rateSlowdown, rateLimiter, AdminControl.kelasSetUjian);
    router.put('/kelas/:id_kelas/ujian', rateSlowdown, rateLimiter, AdminControl.kelasPutUjian);
    router.delete('/kelas/:id_kelas/ujian', rateSlowdown, rateLimiter, AdminControl.kelasDelUjian);
    //Admin Ujian operation
    router.get('/ujian', rateLimiter, AdminControl.getAllUjian);
    router.get('/ujian/search', rateLimiter, AdminControl.searchUjian);
    router.get('/ujian/:id_ujian', rateLimiter, AdminControl.getUjian);
    router.post('/nilai/:id_ujian', rateSlowdown, rateLimiter, DosenControl.setNilaiUjian); // untuk ujian tipe penilaian manual dan campuran
    router.put('/ujian/:id_ujian', rateSlowdown, rateLimiter, Validator.UjianCheck, AdminControl.putUjian);
    router.patch('/ujian/:id_ujian/status', rateSlowdown, rateLimiter, AdminControl.patchStatusUjian); // put status ujian...
    router.patch('/ujian/:id_ujian/keaktifan', rateSlowdown, rateLimiter, AdminControl.patchKeaktifanUjian); // put keaktifan ujian...
    router.delete('/ujian/:id_ujian', rateSlowdown, rateLimiter, AdminControl.deleteUjian);
    //Admin paket_soal-mahasiswa operation
    router.post('/paket-soal/randomize', rateSlowdown, rateLimiter, AdminControl.randomizePkSoal);
    router.patch('/paket-soal/:id_paket/keaktifan', rateSlowdown, rateLimiter, DosenControl.patchKeaktifanPkSoal);
    router.delete('/paket-soal/:id_paket', rateSlowdown, rateLimiter, AdminControl.deletePaketSoal);
    router.get('/paket-soal/:id_paket/mahasiswa', rateLimiter, DosenControl.getPkSoalMhs); // lihat semua mahasiswa yang mengambil paket
    router.get('/paket-soal/:id_paket/mahasiswa/:id_mhs', rateLimiter, DosenControl.getNilaiTotalMhs); // lihat data mhs dan data ujian
    router.put('/nilai/:id_relasi_pksoalmhs', rateSlowdown, rateLimiter, Validator.NilaiCheck, DosenControl.setNilaiTotal); // put nilai total mhs
    router.post('/paket-soal/:id_paket/mahasiswa', rateSlowdown, rateLimiter, AdminControl.pkSoalSetMhs); // set relasi pksoal-mhs manual
    router.put('/paket-soal/:id_paket/mahasiswa', rateSlowdown, rateLimiter, AdminControl.pkSoalPutMhs);
    router.delete('/paket-soal/:id_paket/mahasiswa', rateSlowdown, rateLimiter, AdminControl.pkSoalDelMhs);
    //Admin password operation
    router.get('/lupa-pw', rateLimiter, AdminControl.getLupapw);
    router.patch('/lupa-pw/:id_reset', rateSlowdown, rateLimiter, AdminControl.resetPw);
    router.delete('/lupa-pw/:id_reset', rateSlowdown, rateLimiter, AdminControl.deleteLupapw);
    //Admin pengumuman operation    
    router.get('/pengumuman', rateLimiter, AdminControl.getPengumumanAll);
    router.get('/pengumuman/:id_pengumuman', rateLimiter, AdminControl.getPengumuman);
    router.post('/pengumuman', rateSlowdown, rateLimiter, AdminControl.setPengumuman);
    router.put('/pengumuman/:id_pengumuman', rateSlowdown, rateLimiter, AdminControl.putPengumuman);
    router.delete('/pengumuman/:id_pengumuman', rateSlowdown, rateLimiter, AdminControl.deletePengumuman);
    //Admin semester operation
    router.get('/semester', rateLimiter, AdminControl.getSmstrAll);
    router.post('/semester', rateSlowdown, rateLimiter, AdminControl.setSemester);
    router.put('/semester/:id_semester', rateSlowdown, rateLimiter, AdminControl.putSemester);
    router.delete('/semester/:id_semester', rateSlowdown, rateLimiter, AdminControl.deleteSemester);// delete all associated Matkul also!
    //Admin captcha operation
    router.get('/captcha', rateLimiter, AdminControl.getCaptchaAll);
    router.get('/captcha/:id_captcha', rateLimiter, AdminControl.getCaptcha);
    router.post('/captcha', rateSlowdown, rateLimiter, AdminControl.setCaptcha);
    router.put('/captcha/:id_captcha', rateSlowdown, rateLimiter, AdminControl.putCaptcha);
    router.delete('/captcha/:id_captcha', rateSlowdown, rateLimiter, AdminControl.deleteCaptcha);
    //Admin notifikasi operation
    router.get('/notifikasi', rateLimiter, AdminControl.getNotifikasiAll);
    router.get('/notifikasi/:id_notif', rateSlowdown, rateLimiter, AdminControl.getNotifikasi);
    router.post('/notifikasi', rateSlowdown, rateLimiter, AdminControl.setNotifikasi);
    router.put('/notifikasi/:id_notif', rateSlowdown, rateLimiter, AdminControl.putNotifikasi);
    router.delete('/notifikasi/:id_notif', rateSlowdown, rateLimiter, AdminControl.deleteNotifikasi);

    module.exports = router;
