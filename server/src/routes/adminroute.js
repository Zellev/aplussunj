const AdminControl = require('../controllers/AdminControl');
const Validator = require('../validator/Controlvalidator');
const uploadExcel = require('../middlewares/fileuploadexcel');
const express = require('express');
let router = express.Router({mergeParams:true});

    router.get('/get-users', AdminControl.getusers);// for testing only!   
    //Admin profile operation
    router.get('/profil', AdminControl.getProfil);
    router.put('/edit-profil', Validator.admincheck, AdminControl.editProfil);
    
    router.post('/tambah/admin', Validator.admincheck, Validator.adminExist, AdminControl.daftarAdmin);
    //Admin dosen operation
    router.post('/tambah/dosen', Validator.tambahdosencheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/tambah/dosen-bulk', uploadExcel.single('filedosen'), AdminControl.daftarDosenbulk);
    router.get('/getDosen/all', AdminControl.getallDosen);
    //Admin mahasiswa operation
    router.post('/tambah/mahasiswa', Validator.tambahmhscheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/tambah/mahasiswa-bulk', uploadExcel.single('filemhs'), AdminControl.daftarMhsbulk);
    router.get('/getMhs/all', AdminControl.getallMhs);

    router.post('/tambah/semester', AdminControl.tambahSemester);
    router.post('/tambah/captcha', AdminControl.tambahCaptcha);
    //Admin matakuliah operation
    router.post('/matakuliah/input', Validator.matakuliahinput, AdminControl.matakuliahAdd);
    router.post('/matakuliah-bulk/input',uploadExcel.single('filematkul'), AdminControl.matakuliahAddbulk);
    //Admin kelas operation
    router.post('/kelas/input', Validator.kelasinput, AdminControl.kelasAdd);
    router.post('/kelas-bulk/input', uploadExcel.single('filekelas'), AdminControl.kelasAddbulk);
    //Admin password operation
    router.get('/get-lupa-pw', AdminControl.getLupapw);
    router.patch('/reset-pw/:kode_reset',AdminControl.resetPw);
    router.delete('/delete-lupa-pw/:kode_reset', AdminControl.hapusLupapw);

    module.exports = router;
