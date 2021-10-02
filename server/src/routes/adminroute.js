const AdminControl = require('../controllers/AdminControl');
const Validator = require('../validator/Controlvalidator');
const uploadExcel = require('../middlewares/fileuploadexcel');
const express = require('express');
let router = express.Router()

    router.get('/get-users', AdminControl.getusers);// for testing only!   
    //Admin profile operation
    router.get('/:id/profil', AdminControl.getprofil)
    
    router.post('/tambah/admin', Validator.adminExist, AdminControl.daftarAdmin);
    //Admin dosen operation
    router.post('/tambah/dosen', Validator.tambahdosencheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/tambah/dosen-bulk', uploadExcel.single('filedosen'), AdminControl.daftarDosenbulk);
    //Admin mahasiswa operation
    router.post('/tambah/mahasiswa', Validator.tambahmhscheck, Validator.isExistcheck, AdminControl.daftar);
    router.post('/tambah/mahasiswa-bulk', uploadExcel.single('filemhs'), AdminControl.daftarMhsbulk);

    router.post('/tambah/semester', AdminControl.tambahsemester);
    router.post('/tambah/captcha', AdminControl.tambahcaptcha);
    //Admin matakuliah operation
    router.post('/matakuliah/input', Validator.matakuliahinput, AdminControl.matakuliahadd);
    router.post('/matakuliah-bulk/input',uploadExcel.single('filematkul'), AdminControl.matakuliahaddbulk);
    //Admin password operation
    router.get('/get-lupa-pw', AdminControl.getlupapw);
    router.patch('/reset-pw/:kode_reset',AdminControl.resetpw);
    router.delete('/delete-lupa-pw/:kode_reset', AdminControl.hapuslupapw);

    module.exports = router
