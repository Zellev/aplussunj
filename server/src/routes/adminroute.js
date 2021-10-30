const AdminControl = require('../controllers/AdminControl');
const Validator = require('../validator/Controlvalidator');
const uploadExcel = require('../middlewares/fileuploadexcel');
const express = require('express');
let router = express.Router({mergeParams:true});

    router.get('/', AdminControl.getDashboard);
    router.get('/status/pdf', AdminControl.printStatusPdf);
    router.get('/status/xlsx', AdminControl.printStatusXcel);
    //User operation
    router.get('/user', AdminControl.getallUser);
    router.get('/user/cari', AdminControl.cariUser);
    router.get('/user/:id_user', AdminControl.getUser);
    router.put('/user/ubah/:id_user', AdminControl.ubahUser);
    router.put('/user/ubah-bulk', uploadExcel.single('fileupdate'), AdminControl.ubahUserbulk);
    router.delete('/user/hapus/:id_user', AdminControl.hapusUser);
    //Admin profile operation
    router.get('/profil', AdminControl.getProfil);
    router.put('/profil/edit', Validator.tambahAdminCheck, AdminControl.editProfil);
    router.post('/tambah/admin', Validator.tambahAdminCheck, Validator.adminExist, AdminControl.daftarAdmin);
    //Admin dosen operation
    router.get('/dosen', AdminControl.getallDosen);
    router.get('/dosen/cari', AdminControl.cariDosen);
    router.post('/dosen/tambah', Validator.tambahDosenCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/dosen/tambah/bulk', uploadExcel.single('fileadder'), AdminControl.daftarDosenbulk);
    router.put('/dosen/ubah/:kode_dosen', AdminControl.ubahDosen);
    router.put('/dosen/ubah-bulk', uploadExcel.single('fileupdate'), AdminControl.ubahDosenbulk);
    router.delete('/dosen/hapus/:kode_dosen', AdminControl.hapusDosen);
    //Admin mahasiswa operation
    router.get('/mahasiswa', AdminControl.getallMhs);
    router.get('/mahasiswa/cari', AdminControl.cariMhs);
    router.post('/mahasiswa/tambah', Validator.tambahMhsCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/mahasiswa/tambah/bulk', uploadExcel.single('fileadder'), AdminControl.daftarMhsbulk);    
    router.put('/mahasiswa/ubah/:kode_mhs', AdminControl.ubahMhs);
    router.put('/mahasiswa/ubah-bulk', uploadExcel.single('fileupdate'), AdminControl.ubahMhsbulk);
    router.delete('/mahasiswa/hapus/:kode_mhs', AdminControl.hapusMhs);
    //Admin matakuliah operation
    router.get('/matakuliah', AdminControl.getallMatkul);
    router.get('/matakuliah/cari', AdminControl.cariMatkul);
    router.get('/matakuliah/:kode_matkul', AdminControl.getMatkul);
    router.post('/matakuliah/input', Validator.matkulInputCheck, AdminControl.setMatkul);
    router.post('/matakuliah/input/bulk',uploadExcel.single('fileadder'), AdminControl.setMatkulbulk);
    router.put('/matakuliah/edit/:kode_matkul', AdminControl.editMatkul);
    router.put('/matakuliah/edit-bulk', uploadExcel.single('fileupdate'), AdminControl.editMatkulbulk);
    router.delete('/matakuliah/delete/:kode_matkul', AdminControl.deleteMatkul);
    //Admin kelas operation
    router.post('/kelas/:kode_seksi/assign/dosen', AdminControl.kelasSetDosen);
    router.post('/kelas/:kode_seksi/change/dosen', AdminControl.kelasUpdateDosen);
    router.post('/kelas/:kode_seksi/remove/dosen', AdminControl.kelasRemoveDosen);
    router.post('/kelas/input', Validator.kelasInputCheck, AdminControl.setKelas);
    router.post('/kelas/input/bulk', uploadExcel.single('fileadder'), AdminControl.setKelasbulk);
    router.put('/kelas/edit/:kode_seksi', AdminControl.editKelas);
    router.put('/kelas/edit-bulk', uploadExcel.single('fileupdate'), AdminControl.editKelasbulk);
    router.delete('/kelas/delete/:kode_seksi', AdminControl.deleteKelas);
    //Admin password operation
    router.get('/lupaPw', AdminControl.getLupapw);
    router.patch('/lupaPw/reset/:kode_reset', AdminControl.resetPw);
    router.delete('/lupaPw/delete/:kode_reset', AdminControl.deleteLupapw);
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
