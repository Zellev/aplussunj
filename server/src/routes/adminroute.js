const AdminControl = require('../controllers/AdminControl');
const Validator = require('../validator/Controlvalidator');
const uploadExcel = require('../middlewares/fileuploadexcel');
const express = require('express');
let router = express.Router({mergeParams:true});

    router.get('/', AdminControl.getDashboard);
    router.get('/status/pdf', AdminControl.printStatusPdf);
    router.get('/status/xlsx', AdminControl.printStatusXcel);
    //User operation
    router.get('/users', AdminControl.getallUser);
    router.get('/users/search', AdminControl.cariUser);
    router.get('/users/:id_user', AdminControl.getUser);
    router.put('/users/:id_user', AdminControl.ubahUser);
    router.put('/users/bulk', uploadExcel.single('fileupdate'), AdminControl.ubahUserbulk);
    router.delete('/users/:id_user', AdminControl.hapusUser);
    //Admin profile operation
    router.get('/my-profil', AdminControl.getOwnProfil);
    router.put('/my-profil', Validator.tambahAdminCheck, AdminControl.editOwnProfil);
    router.post('/add-admin', Validator.tambahAdminCheck, Validator.adminExist, AdminControl.daftarAdmin);
    //Admin dosen operation
    router.get('/dosen', AdminControl.getallDosen);
    router.get('/dosen/search', AdminControl.cariDosen);
    router.post('/dosen', Validator.tambahDosenCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/dosen/bulk', uploadExcel.single('fileadder'), AdminControl.daftarDosenbulk);
    router.put('/dosen/:kode_dosen', AdminControl.ubahDosen);
    router.put('/dosen/bulk', uploadExcel.single('fileupdate'), AdminControl.ubahDosenbulk);
    router.delete('/dosen/:kode_dosen', AdminControl.hapusDosen);
    //Admin mahasiswa operation
    router.get('/mahasiswa', AdminControl.getallMhs);
    router.get('/mahasiswa/search', AdminControl.cariMhs);
    router.post('/mahasiswa', Validator.tambahMhsCheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/mahasiswa/bulk', uploadExcel.single('fileadder'), AdminControl.daftarMhsbulk);    
    router.put('/mahasiswa/:kode_mhs', AdminControl.ubahMhs);
    router.put('/mahasiswa/bulk', uploadExcel.single('fileupdate'), AdminControl.ubahMhsbulk);
    router.delete('/mahasiswa/:kode_mhs', AdminControl.hapusMhs);
    //Admin matakuliah operation
    router.get('/matakuliah', AdminControl.getallMatkul);
    router.get('/matakuliah/search', AdminControl.cariMatkul);
    router.get('/matakuliah/:kode_matkul', AdminControl.getMatkul);
    router.post('/matakuliah', Validator.matkulInputCheck, AdminControl.setMatkul);
    router.post('/matakuliah/bulk',uploadExcel.single('fileadder'), AdminControl.setMatkulbulk);
    router.put('/matakuliah/:kode_matkul', AdminControl.editMatkul);
    router.put('/matakuliah/bulk', uploadExcel.single('fileupdate'), AdminControl.editMatkulbulk);
    router.delete('/matakuliah/:kode_matkul', AdminControl.deleteMatkul);
    //Admin kelas operation
    router.post('/kelas/:kode_seksi/dosen', AdminControl.kelasSetDosen);
    router.patch('/kelas/:kode_seksi/dosen', AdminControl.kelasUpdateDosen);
    router.delete('/kelas/:kode_seksi/dosen', AdminControl.kelasRemoveDosen);
    router.post('/kelas', Validator.kelasInputCheck, AdminControl.setKelas);
    router.post('/kelas/bulk', uploadExcel.single('fileadder'), AdminControl.setKelasbulk);
    router.put('/kelas/:kode_seksi', AdminControl.editKelas);
    router.put('/kelas/bulk', uploadExcel.single('fileupdate'), AdminControl.editKelasbulk);
    router.delete('/kelas/:kode_seksi', AdminControl.deleteKelas);
    //Admin password operation
    router.get('/lupa-pw', AdminControl.getLupapw);
    router.patch('/lupa-pw/:kode_reset', AdminControl.resetPw);
    router.delete('/lupa-pw/:kode_reset', AdminControl.deleteLupapw);
    //Admin pengumuman operation
    router.post('/pengumuman', AdminControl.tambahPengumuman);
    router.get('/pengumuman', AdminControl.getPengumumanAll);
    router.get('/pengumuman/:kode_pengumuman', AdminControl.getPengumuman);
    router.put('/pengumuman/:kode_pengumuman', AdminControl.ubahPengumuman);
    router.delete('/pengumuman/:kode_pengumuman', AdminControl.hapusPengumuman);

    router.get('/semester', AdminControl.getSmstrAll);
    router.post('/semester', AdminControl.tambahSemester);
    router.put('/semester/:kode_semester', AdminControl.ubahSemester);
    router.delete('/semester/:kode_semester', AdminControl.hapusSemester);// delete all associated Matkul also!
    router.get('/captcha', AdminControl.getCaptchaAll);
    router.post('/captcha', AdminControl.tambahCaptcha);
    router.delete('/captcha/:kode_captcha', AdminControl.hapusCaptcha);

    module.exports = router;
