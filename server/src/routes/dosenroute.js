const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const express = require('express');
let router = express.Router({mergeParams:true});
    

    router.get('/', DosenControl.getDashboard);
    // Paket Soal operation // Paket soal yang terikat sama dosen ini saja, melalui relasi kelas paket soal
    // router.get('/paket_soal', DosenControl.getAllPaketsoal); 
    router.post('/:kode_seksi/paket_soal/tambah', Validator.tambahPkSoalCheck, DosenControl.setPaketsoal); //       
    // router.put('/:kode_seksi/paket_soal/ubah/:kode_paket', Validator.paketSoalvalidator, DosenControl.editPaketsoal);
    // router.delete('/:kode_seksi/paket_soal/hapus/:kode_paket', Validator.paketSoalvalidator, DosenControl.deletePaketsoal);


    module.exports = router;