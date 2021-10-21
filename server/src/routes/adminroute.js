const AdminControl = require('../controllers/AdminControl');
const Validator = require('../validator/Controlvalidator');
const uploadExcel = require('../middlewares/fileuploadexcel');
const express = require('express');
let router = express.Router({mergeParams:true});

    router.get('/', AdminControl.getDashboard);
    //User operation
    router.get('/user', AdminControl.getallUser);
    router.get('/user/:id_user', AdminControl.getUser);// ubah user, delete user
    router.put('/user/ubah/:id_user', AdminControl.ubahUser);
    router.put('/user/ubah-bulk', uploadExcel.single('fileupdate'), AdminControl.ubahUserbulk);
    router.delete('/user/hapus/:id_user', AdminControl.hapusUser);
    //Admin profile operation
    router.get('/profil', AdminControl.getProfil);
    router.put('/profil/edit', Validator.admincheck, AdminControl.editProfil);
    router.post('/tambah/admin', Validator.admincheck, Validator.adminExist, AdminControl.daftarAdmin);
    //Admin dosen operation
    router.get('/dosen', AdminControl.getallDosen);
    router.get('/dosen/cari', AdminControl.cariDosen);
    router.post('/dosen/tambah', Validator.tambahdosencheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/dosen/tambah/bulk', uploadExcel.single('filedosen'), AdminControl.daftarDosenbulk);
    router.put('/dosen/ubah/:kode_dosen', AdminControl.ubahDosen);
    router.put('/dosen/ubah-bulk', uploadExcel.single('fileupdate'), AdminControl.ubahDosenbulk);
    router.delete('/dosen/hapus/:kode_dosen', AdminControl.hapusDosen);
    //Admin mahasiswa operation
    router.get('/mahasiswa', AdminControl.getallMhs);
    router.get('/mahasiswa/cari', AdminControl.cariMhs);
    router.post('/mahasiswa/tambah', Validator.tambahmhscheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/mahasiswa/tambah/bulk', uploadExcel.single('filemhs'), AdminControl.daftarMhsbulk);    
    router.put('/mahasiswa/ubah/:kode_mhs', AdminControl.ubahMhs);
    router.put('/mahasiswa/ubah-bulk', uploadExcel.single('fileupdate'), AdminControl.ubahMhsbulk);
    router.delete('/mahasiswa/hapus/:kode_mhs', AdminControl.hapusMhs);
    //Admin matakuliah operation
    router.get('/matakuliah', AdminControl.getallMatkul);
    router.get('/matakuliah/cari', AdminControl.cariMatkul);
    router.get('/matakuliah/:kode_matkul', AdminControl.getMatkul);
    router.post('/matakuliah/input', Validator.matakuliahinput, AdminControl.matakuliahAdd);
    router.post('/matakuliah/input/bulk',uploadExcel.single('filematkul'), AdminControl.matakuliahAddbulk);
    router.put('/matakuliah/edit/:kode_matkul', AdminControl.matkulEdit);
    router.put('/matakuliah/edit-bulk', uploadExcel.single('fileupdate'), AdminControl.matkulEditbulk);
    router.delete('/matakuliah/delete/:kode_matkul', AdminControl.matkulDelete);
    //Admin kelas operation
    router.post('/kelas/:kode_seksi/assign/dosen', AdminControl.kelasAddDosen);
    router.post('/kelas/:kode_seksi/change/dosen', AdminControl.kelasChangeDosen);
    router.post('/kelas/:kode_seksi/remove/dosen', AdminControl.kelasRemoveDosen);
    router.post('/kelas/input', Validator.kelasinput, AdminControl.kelasAdd);
    router.post('/kelas/input/bulk', uploadExcel.single('filekelas'), AdminControl.kelasAddbulk);
    router.put('/kelas/edit/:kode_seksi', AdminControl.kelasEdit);
    router.put('/kelas/edit-bulk', uploadExcel.single('fileupdate'), AdminControl.kelasEditbulk);
    router.delete('/kelas/delete/:kode_seksi', AdminControl.kelasDelete);
    //Admin password operation
    router.get('/lupaPw', AdminControl.getLupapw);
    router.patch('/lupaPw/reset/:kode_reset', AdminControl.resetPw);
    router.delete('/lupaPw/hapus/:kode_reset', AdminControl.hapusLupapw);
    //Admin pengumuman operation
    router.post('/pengumuman/tambah', AdminControl.tambahPengumuman);
    router.get('/pengumuman', AdminControl.getPengumumanAll);
    router.get('/pengumuman/:kode_pengumuman', AdminControl.getPengumuman);
    router.put('/pengumuman/ubah/:kode_pengumuman', AdminControl.ubahPengumuman);
    router.delete('/pengumuman/hapus/:kode_pengumuman', AdminControl.hapusPengumuman);

    router.get('/semester', AdminControl.getSmstrAll);
    router.post('/semester/tambah', AdminControl.tambahSemester);
    router.put('/semester/ubah/:kode_semester', AdminControl.ubahSemester);
    router.delete('/semester/hapus/:kode_semester', AdminControl.hapusSemester);// delete all associated Matkul also!
    router.get('/captcha', AdminControl.getCaptchaAll);
    router.post('/captcha/tambah', AdminControl.tambahCaptcha);
    router.delete('/pengumuman/hapus/:kode_captcha', AdminControl.hapusCaptcha);

    module.exports = router;
