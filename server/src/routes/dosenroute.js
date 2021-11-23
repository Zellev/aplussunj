const DosenControl = require('../controllers/DosenControl');
const Validator = require('../validator/Controlvalidator');
const express = require('express');
let router = express.Router({mergeParams:true});
    

    router.get('/', DosenControl.getDashboard);
    // Paket Soal operation // Paket soal yang terikat sama dosen ini saja, melalui relasi kelas paket soal
    router.get('/paket-soal', DosenControl.getAllPaketsoal); 
    router.post('/paket-soal/tambah', Validator.tambahPkSoalCheck, DosenControl.setPaketsoal);    
    // router.put('/paket-soal/ubah/:kode_paket', Validator.paketSoalvalidator, DosenControl.editPaketsoal);
    // router.delete('/paket-soal/hapus/:kode_paket', Validator.paketSoalvalidator, DosenControl.deletePaketsoal);


    module.exports = router;