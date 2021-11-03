const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const express = require('express');
let router = express.Router({mergeParams:true});
    

    router.get('/', DosenControl.getDashboard);
    // Paket Soal operation // Paket soal yang terikat sama dosen ini saja, melalui relasi kelas paket soal
    router.get('/paket_soal', DosenControl.getAllPaketsoal); 
    router.post('/paket_soal/tambah', Validator.tambahPkSoalCheck, DosenControl.setPaketsoal);
    // router.put('/paket_soal/cari', DosenControl.searchPaketsoal);
    // router.put('/paket_soal/ubah/:kode_paket', Validator.paketSoalvalidator, DosenControl.editPaketsoal);
    // router.delete('/paket_soal/hapus/:kode_paket', Validator.paketSoalvalidator, DosenControl.deletePaketsoal);


    module.exports = router;