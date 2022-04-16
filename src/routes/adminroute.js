const AdminControl = require('../controllers/AdminControl');
const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const uploadFile = require('../middlewares/fileuploadall');
const express = require('express');
let router = express.Router({mergeParams:true});

    router.get('/', AdminControl.getDashboard);
    router.get('/status/pdf', AdminControl.printStatusPdf);
    router.get('/status/xlsx', AdminControl.printStatusXcel);
    //User operation
    router.get('/users', AdminControl.getallUser);
    router.get('/users/search', AdminControl.searchUser);
    router.get('/user/:id_user', AdminControl.getUser);
    router.put('/user/:id_user(?!bulk)', AdminControl.putUser);
    router.put('/users/bulk', uploadFile.single('fileupdater'), AdminControl.putUserbulk);
    router.patch('/user/:id_user/reset-pw', AdminControl.patchUserPw);
    router.delete('/user/:id_user', AdminControl.deleteUser);
    //Admin profile operation
    router.get('/my-profile', AdminControl.getProfile);
    router.put('/my-profile', AdminControl.putProfile);    
    //Admin dosen operation
    router.get('/dosen', AdminControl.getallDosen);
    router.get('/dosen/search', AdminControl.searchDosen);
    router.post('/dosen', Validator.tambahDosenCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/dosen/bulk', uploadFile.single('fileadder'), AdminControl.daftarDosenbulk);
    router.put('/dosen/:id_dosen(?!bulk)', AdminControl.putDosen);
    router.put('/dosen/bulk', uploadFile.single('fileupdater'), AdminControl.putDosenbulk);
    router.delete('/dosen/:id_dosen', AdminControl.deleteDosen);
    //Admin mahasiswa operation
    router.get('/mahasiswa', AdminControl.getallMhs);
    router.get('/mahasiswa/search', AdminControl.searchMhs);
    router.post('/mahasiswa', Validator.tambahMhsCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/mahasiswa/bulk', uploadFile.single('fileadder'), AdminControl.daftarMhsbulk);    
    router.put('/mahasiswa/:id_mhs(?!bulk)', AdminControl.putMhs);
    router.put('/mahasiswa/bulk', uploadFile.single('fileupdater'), AdminControl.putMhsbulk);
    router.delete('/mahasiswa/:id_mhs', AdminControl.deleteMhs);
    //Admin matakuliah operation
    router.get('/matakuliah', AdminControl.getallMatkul);
    router.get('/matakuliah/search', AdminControl.searchMatkul);
    router.get('/matakuliah/:id_matkul', AdminControl.getMatkul);
    router.post('/matakuliah', uploadFile.single('gambar_matkul'), Validator.matkulInputCheck, AdminControl.setMatkul);
    router.post('/matakuliah/bulk', uploadFile.single('fileadder'), AdminControl.setMatkulbulk);
    router.put('/matakuliah/:id_matkul', uploadFile.single('gambar_matkul'), Validator.matkulInputCheck, AdminControl.putMatkul);
    router.put('/matakuliah/bulk', uploadFile.single('fileupdater'), AdminControl.putMatkulbulk);
    router.delete('/matakuliah/:id_matkul', AdminControl.deleteMatkul);
    //Admin kelas operation   
    router.post('/kelas', Validator.kelasInputCheck, AdminControl.setKelas);
    router.post('/kelas/bulk', uploadFile.single('fileadder'), AdminControl.setKelasbulk);
    router.put('/kelas/:id_kelas(?!bulk)', AdminControl.putKelas);
    router.put('/kelas/bulk', uploadFile.single('fileupdater'), AdminControl.putKelasbulk);
    router.delete('/kelas/:id_kelas', AdminControl.deleteKelas);
    //Admin kelas-mahasiswa operation
    router.get('/kelas/:id_kelas/mhs', AdminControl.kelasGetMhs);
    router.post('/kelas/:id_kelas/mhs', uploadFile.single('fileadder'), AdminControl.kelasSetMhs);
    router.put('/kelas/:id_kelas/mhs', uploadFile.single('fileupdater'), AdminControl.kelasUpdateMhs);
    router.delete('/kelas/:id_kelas/mhs', AdminControl.kelasRemoveMhs);
    //Admin kelas-dosen operation
    router.get('/kelas/:id_kelas/dosen', AdminControl.kelasGetDosen);
    router.post('/kelas/:id_kelas/dosen', AdminControl.kelasSetDosen);
    router.put('/kelas/:id_kelas/dosen', AdminControl.kelasUpdateDosen);
    router.delete('/kelas/:id_kelas/dosen', AdminControl.kelasRemoveDosen);
    //Admin kelas-ujian operation
    router.get('/kelas/:id_kelas/ujian', AdminControl.kelasGetAllUjian);
    router.get('/kelas/:id_kelas/ujian/search', AdminControl.kelasSearchUjian);    
    router.post('/kelas/:id_kelas/ujian', AdminControl.kelasSetUjian);
    router.put('/kelas/:id_kelas/ujian', AdminControl.kelasPutUjian);
    router.delete('/kelas/:id_kelas/ujian', AdminControl.kelasDelUjian);
    //Admin Ujian operation
    router.get('/ujian', AdminControl.getAllUjian);
    router.get('/ujian/search', AdminControl.searchUjian);
    router.get('/ujian/:id_ujian', AdminControl.getUjian);
    router.post('/nilai/:id_ujian', DosenControl.setNilaiUjian); // untuk ujian tipe penilaian manual dan campuran
    router.put('/ujian/:id_ujian', Validator.UjianCheck, AdminControl.putUjian);
    router.patch('/ujian/:id_ujian/status', AdminControl.patchStatusUjian); // put status ujian...
    router.patch('/ujian/:id_ujian/keaktifan', AdminControl.patchKeaktifanUjian); // put keaktifan ujian...
    router.delete('/ujian/:id_ujian', AdminControl.deleteUjian);
    //Admin paket_soal-mahasiswa operation
    router.post('/paket-soal/randomize', AdminControl.randomizePkSoal);
    router.patch('/paket-soal/:id_paket/keaktifan', DosenControl.patchKeaktifanPkSoal);
    router.delete('/paket-soal/:id_paket', AdminControl.deletePaketSoal);
    router.get('/paket-soal/:id_paket/mahasiswa', DosenControl.getPkSoalMhs); // lihat semua mahasiswa yang mengambil paket
    router.get('/paket-soal/:id_paket/mahasiswa/:id_mhs', DosenControl.getNilaiTotalMhs); // lihat data mhs dan data ujian
    router.put('/nilai/:id_relasi_pksoalmhs', Validator.NilaiCheck, DosenControl.setNilaiTotal); // put nilai total mhs
    router.post('/paket-soal/:id_paket/mahasiswa', AdminControl.pkSoalSetMhs); // set relasi pksoal-mhs manual
    router.put('/paket-soal/:id_paket/mahasiswa', AdminControl.pkSoalPutMhs);
    router.delete('/paket-soal/:id_paket/mahasiswa', AdminControl.pkSoalDelMhs);
    //Admin password operation
    router.get('/lupa-pw', AdminControl.getLupapw);
    router.patch('/lupa-pw/:id_reset', AdminControl.resetPw);
    router.delete('/lupa-pw/:id_reset', AdminControl.deleteLupapw);
    //Admin pengumuman operation    
    router.get('/pengumuman', AdminControl.getPengumumanAll);
    router.get('/pengumuman/:id_pengumuman', AdminControl.getPengumuman);
    router.post('/pengumuman', AdminControl.setPengumuman);
    router.put('/pengumuman/:id_pengumuman', AdminControl.putPengumuman);
    router.delete('/pengumuman/:id_pengumuman', AdminControl.deletePengumuman);
    //Admin semester operation
    router.get('/semester', AdminControl.getSmstrAll);
    router.post('/semester', AdminControl.setSemester);
    router.put('/semester/:id_semester', AdminControl.putSemester);
    router.delete('/semester/:id_semester', AdminControl.deleteSemester);// delete all associated Matkul also!
    //Admin captcha operation
    router.get('/captcha', AdminControl.getCaptchaAll);
    router.get('/captcha/:id_captcha', AdminControl.getCaptcha);
    router.post('/captcha', AdminControl.setCaptcha);
    router.put('/captcha/:id_captcha', AdminControl.putCaptcha);
    router.delete('/captcha/:id_captcha', AdminControl.deleteCaptcha);
    //Admin notifikasi operation
    router.get('/notifikasi', AdminControl.getNotifikasiAll);
    router.get('/notifikasi/:id_notif', AdminControl.getNotifikasi);
    router.post('/notifikasi', AdminControl.setNotifikasi);
    router.put('/notifikasi/:id_notif', AdminControl.putNotifikasi);
    router.delete('/notifikasi/:id_notif', AdminControl.deleteNotifikasi);
    //Admin illustrasi operation
    router.post('/illustrasi', uploadFile.single('gambar_banner'), AdminControl.setIllustrasi);
    router.delete('/illustrasi/:id_illustrasi', AdminControl.deleteIllustrasi);

    module.exports = router;
