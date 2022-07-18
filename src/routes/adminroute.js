"use strict";
const AdminControl = require('../controllers/AdminControl');
const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const uploadFile = require('../middlewares/fileuploadall');
const express = require('express');
const uploadGambarChecker = (req, res, next) => {
    if(req.url == '/matakuliah/bulk') return next('route');
}

let router = express.Router({mergeParams:true});

    router.get('/', AdminControl.getDashboard);
    router.get('/status/pdf', AdminControl.printStatusPdf);
    router.get('/status/xlsx', AdminControl.printStatusXcel);
    router.put('/profil', Validator.putProfileCheck, AdminControl.putProfil);
    //User operation
    router.get('/users', AdminControl.getorsearchUser);
    router.put('/user/:id_user', Validator.putProfileCheck, AdminControl.putUser);
    router.put('/users/bulk', uploadFile.single('fileupdater'), AdminControl.putUserbulk);
    router.delete('/user/:id_user', AdminControl.deleteUser);
    router.delete('/users/bulk', AdminControl.deleteUserBulk);
    //Admin dosen operation
    router.get('/dosen', AdminControl.getorsearchDosen);
    router.post('/dosen', Validator.tambahDosenCheck, Validator.dosenExist, AdminControl.setDosen);
    router.post('/dosen/bulk', uploadFile.single('fileadder'), AdminControl.setDosenbulk);
    router.put('/dosen/:id_dosen', Validator.tambahDosenCheck, AdminControl.putDosen);
    router.put('/dosen/bulk', uploadFile.single('fileupdater'), AdminControl.putDosenbulk);
    router.delete('/dosen/:id_dosen', AdminControl.deleteDosen);
    router.delete('/dosen/bulk', AdminControl.deleteDosenBulk);
    //Admin mahasiswa operation
    router.get('/mahasiswa', AdminControl.getorsearchMhs);
    router.post('/mahasiswa', Validator.tambahMhsCheck, Validator.mhsExist, AdminControl.setMhs);
    router.post('/mahasiswa/bulk', uploadFile.single('fileadder'), AdminControl.setMhsbulk);    
    router.put('/mahasiswa/:id_mhs', Validator.tambahMhsCheck, AdminControl.putMhs);
    router.put('/mahasiswa/bulk', uploadFile.single('fileupdater'), AdminControl.putMhsbulk);
    router.delete('/mahasiswa/:id_mhs', AdminControl.deleteMhs);
    router.delete('/mahasiswa/bulk', AdminControl.deleteMhsBulk);
    //Admin matakuliah operation
    router.get('/matakuliah', AdminControl.getorsearchMatkul);
    router.get('/matakuliah/:id_matkul', AdminControl.getMatkul);
    router.post('/matakuliah', uploadFile.single('gambar_matkul'), Validator.matkulInputCheck, AdminControl.setMatkul);
    router.post('/matakuliah/bulk', uploadFile.single('fileadder'), AdminControl.setMatkulbulk);
    router.put('/matakuliah/:id_matkul', uploadGambarChecker, uploadFile.single('gambar_matkul'), Validator.matkulInputCheck, AdminControl.putMatkul);
    router.put('/matakuliah/bulk', uploadFile.single('fileupdater'), AdminControl.putMatkulbulk);
    router.delete('/matakuliah/:id_matkul', AdminControl.deleteMatkul); 
    router.delete('/matakuliah/bulk', AdminControl.deleteMatkulBulk);
    //Admin kelas operation   
    router.post('/kelas', Validator.kelasInputCheck, AdminControl.setKelas);
    router.post('/kelas/bulk', uploadFile.single('fileadder'), AdminControl.setKelasbulk);
    router.put('/kelas/:id_kelas', AdminControl.putKelas);
    router.put('/kelas/bulk', uploadFile.single('fileupdater'), AdminControl.putKelasbulk);
    router.delete('/kelas/:id_kelas', AdminControl.deleteKelas);
    router.delete('/kelas/bulk', AdminControl.deleteKelasBulk);
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
    router.get('/kelas/:id_kelas/ujian', AdminControl.kelasGetorSearchUjian);
    router.post('/kelas/:id_kelas/ujian', AdminControl.kelasSetUjian);
    router.put('/kelas/:id_kelas/ujian', AdminControl.kelasPutUjian);
    router.delete('/kelas/:id_kelas/ujian', AdminControl.kelasDelUjian);
    //Admin Ujian operation
    router.get('/ujian', AdminControl.getorsearchUjian);
    router.get('/ujian/:id_ujian', AdminControl.getUjian);   
    router.put('/ujian/:id_ujian', Validator.UjianCheck, AdminControl.putUjian);
    router.patch('/ujian/:id_ujian/status', AdminControl.patchStatusUjian);
    router.patch('/ujian/:id_ujian/keaktifan', AdminControl.patchKeaktifanUjian);
    router.delete('/ujian/:id_ujian', AdminControl.deleteUjian);
    router.delete('/ujian/:id_ujian', AdminControl.deleteUjianBulk);
    //Admin paket_soal-mahasiswa operation
    router.get('/paket-soal/:id_paket', DosenControl.getPaketSoal);
    router.post('/paket-soal/randomize', AdminControl.randomizePkSoal);
    router.patch('/paket-soal/:id_paket/keaktifan', DosenControl.patchKeaktifanPkSoal);
    router.delete('/paket-soal/:id_paket', AdminControl.deletePaketSoal);
    router.delete('/paket-soal/bulk', DosenControl.deletePaketSoalBulk);
    router.get('/paket-soal/:id_paket/mahasiswa', DosenControl.getPkSoalMhs); // lihat semua mahasiswa yang mengambil paket
    // router.get('/paket-soal/:id_paket/mahasiswa/:id_mhs', DosenControl.getNilaiTotalMhs); // lihat data mhs dan data ujian
    router.post('/paket-soal/:id_paket/mahasiswa', AdminControl.pkSoalSetMhs); // set relasi pksoal-mhs manual
    router.put('/paket-soal/:id_paket/mahasiswa', AdminControl.pkSoalPutMhs);
    router.delete('/paket-soal/:id_paket/mahasiswa', AdminControl.pkSoalDelMhs);
    //Admin nilai operation
    router.post('/ujian/:id_ujian/nilai', DosenControl.setNilaiUjian); // untuk ujian tipe penilaian manual dan campuran
    router.post('/nilai-total/:id_relasi_pksoalmhs', Validator.NilaiCheck, DosenControl.setNilaiTotal);
    router.put('/nilai-total/:id_relasi_pksoalmhs', Validator.NilaiCheck, DosenControl.setNilaiTotal);
    //Admin password operation
    router.get('/lupa-pw', AdminControl.getLupapw);
    router.patch('/user/:id_user/password', AdminControl.resetPw);
    router.patch('/user/password/bulk', AdminControl.resetPwBulk);
    router.delete('/lupa-pw/:id_reset', AdminControl.deleteLupapw);
    router.delete('/lupa-pw/bulk', AdminControl.deleteLupaPwBulk);
    //Admin pengumuman operation    
    router.get('/pengumuman', AdminControl.getPengumumanAll);
    router.get('/pengumuman/:id_pengumuman', AdminControl.getPengumuman);
    router.post('/pengumuman', AdminControl.setPengumuman);
    router.put('/pengumuman/:id_pengumuman', AdminControl.putPengumuman);
    router.delete('/pengumuman/:id_pengumuman', AdminControl.deletePengumuman);
    router.delete('/pengumuman/bulk', AdminControl.deletePengumumanBulk);
    //Admin semester operation
    router.get('/semester', AdminControl.getSmstrAll);
    router.post('/semester', AdminControl.setSemester);
    router.put('/semester/:id_semester', AdminControl.putSemester);
    router.delete('/semester/:id_semester', AdminControl.deleteSemester);// delete all associated Matkul also!
    router.delete('/semester/bulk', AdminControl.deleteSemesterBulk);
    //Admin captcha operation
    router.get('/captcha', AdminControl.getCaptchaAll);
    router.get('/captcha/:id_captcha', AdminControl.getCaptcha);
    router.post('/captcha', AdminControl.setCaptcha);
    router.put('/captcha/:id_captcha', AdminControl.putCaptcha);
    router.delete('/captcha/:id_captcha', AdminControl.deleteCaptcha);
    router.delete('/captcha/bulk', AdminControl.deleteCaptchaBulk);
    //Admin notifikasi operation
    router.get('/notifikasi', AdminControl.getNotifikasiAll);
    router.get('/notifikasi/:id_notif', AdminControl.getNotifikasi);
    router.post('/notifikasi', AdminControl.setNotifikasi);
    router.put('/notifikasi/:id_notif', AdminControl.putNotifikasi);
    router.delete('/notifikasi/:id_notif', AdminControl.deleteNotifikasi);
    router.delete('/notifikasi/bulk', AdminControl.deleteNotifikasiBulk);
    //Admin illustrasi operation
    router.post('/illustrasi', uploadFile.single('gambar_banner'), AdminControl.setIllustrasi);
    router.delete('/illustrasi/:id_illustrasi', AdminControl.deleteIllustrasi);
    router.delete('/illustrasi/bulk', AdminControl.deleteIllustrasiBulk);
    //Admin perma Delete operation
    router.get('/nama-tabel', AdminControl.getAllModelName);
    router.get('/soft-deleted/:nama_tabel', AdminControl.getAllSoftDeleted); // get all soft deleted records of tabel
    router.put('/soft-deleted/:nama_tabel', AdminControl.putSoftDeleted); // restore soft deleted records of tabel
    router.delete('/permanent-delete/:nama_tabel', AdminControl.permanentDelete); // perma delete soft deleted records of tabel

    module.exports = router;
