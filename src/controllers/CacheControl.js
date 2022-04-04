const apicache = require('apicache');

//AuthController
//get
const getAllClient = (req) => { return req.apicacheGroup = 'client-all'};
const getCaptcha = (req) => { return req.apicacheGroup = 'captcha'};
//post
const postClient = () => {return apicache.clear(['client-all'])};
//put
const putClient = () => {return apicache.clear('client-all')};
//delete
const deleteClient = () => {return apicache.clear(['client-all'])};

//AllUserController
//get
const getProfilSingkat = (req) => { return req.apicacheGroup = 'profil'};
const getAllKelas = (req) => { return req.apicacheGroup = 'kelas-all'};
const getKelas = (req) => { return req.apicacheGroup = 'kelas'};
const getSoalPaketSoal = (req) => { return req.apicacheGroup = 'soal-paket-soal'};
const getProfilDosen = (req) => { return req.apicacheGroup = 'profil-dosen'};
const getProfilMhs = (req) => { return req.apicacheGroup = 'profil-mhs'};
const getPengumuman = (req) => { return req.apicacheGroup = 'pengumuman'};
const getNotifikasi = (req) => { return req.apicacheGroup = 'notifikasi'};
const getJenisUjian = (req) => { return req.apicacheGroup = 'jenis-ujian'};
const getKelompokMatakuliah = (req) => { return req.apicacheGroup = 'kelompok-matakuliah'};
const getPeminatan = (req) => { return req.apicacheGroup = 'peminatan'};
const getSemester = (req) => { return req.apicacheGroup = 'semester'};
//post
const postProfilePic = () => {return apicache.clear(['profil-dosen', 'myprofile-dosen', 
'profil-mhs', 'myprofile-mhs'])};
const postNotifikasi = () => {return apicache.clear(['notifikasi'])};
const postNilaiAuto = () => {return apicache.clear(['nilai-total-mhs', 'nilai-akhir'])}; // getter nilai ~
const postNewAdmin = () => {return apicache.clear(['user-all', 'user', 'dashboard-admin'])};

//AdminController
//get
const getDashboardAdmin = (req) => { return req.apicacheGroup = 'dashboard-admin'};
const getAllUser = (req) => { return req.apicacheGroup = 'user-all'};
const getUser = (req) => { return req.apicacheGroup = 'user'};
const getmyProfileAdmin = (req) => { return req.apicacheGroup = 'myprofile-admin'};
const getAllDosen = (req) => { return req.apicacheGroup = 'dosen-all'};
const getAllMhs = (req) => { return req.apicacheGroup = 'mhs-all'};
const getAllMatkul = (req) => { return req.apicacheGroup = 'matkul-all'};
const getMatkul = (req) => { return req.apicacheGroup = 'matkul'};
const getMhsKelas = (req) => { return req.apicacheGroup = 'mhs-kelas'};
const getDosenKelas = (req) => { return req.apicacheGroup = 'dosen-kelas'};
const getUjianKelas = (req) => { return req.apicacheGroup = 'ujian-kelas'};
const getAllUjian = (req) => { return req.apicacheGroup = 'ujian-all'};
const getUjian = (req) => { return req.apicacheGroup = 'ujian'};
const getLupapw = (req) => { return req.apicacheGroup = 'lupapw'};
const getAllPengumuman = (req) => { return req.apicacheGroup = 'pengumuman-all'};
const getAllCaptcha = (req) => { return req.apicacheGroup = 'captcha-all'};
const getAllSemester = (req) => { return req.apicacheGroup = 'semester-all'};
const getAllNotifikasi = (req) => { return req.apicacheGroup = 'notifikasi-all'};
const getNotifikasiAdm = (req) => { return req.apicacheGroup = 'notifikasi-admin'};
//post
const postNewUser = () => {return apicache.clear(['user-all', 'dosen-all', 'mhs-all', 'dashboard-admin'])};
const postNewMatkul = () => {return apicache.clear(['dashboard-admin', 'matkul-all', 'matkul'])};
const postNewKelas = () => {return apicache.clear(['kelas-all', 'kelas'])};
const postNewMhsKelas = () => {return apicache.clear(['mhs-kelas'])};
const postNewDosenKelas = () => {return apicache.clear(['dosen-kelas', 'dashboard-dosen', 'status-dosen'])};
const postNewUjianKelas = () => {return apicache.clear(['ujian-kelas', 'kelas', 'dashboard-dosen', 'status-dosen'])};
const postNewMhsPkSoal = () => {return apicache.clear(['paket-soal-mhs'])}; // post mhs to pksoal
const postNewPengumuman = () => {return apicache.clear(['pengumuman-all', 'pengumuman'])};
const postNewCaptcha = () => {return apicache.clear(['captcha-all', 'captcha'])};
const postNewSemester = () => {return apicache.clear(['semester-all', 'semester'])};
const postNewNotifikasi = () => {return apicache.clear(['notifikasi-all', 'notifikasi-admin', 'notifikasi'])};
//put
const putUser = () => {return apicache.clear(['user-all', 'user', 'profil-dosen', 'myprofile-dosen', 'profil-mhs', 
'myprofile-mhs', 'dosen-all', 'mhs-all'])};
const putmyProfileAdmin = () => {return apicache.clear(['myprofile-admin', 'user'])};
const putDosen = () => {return apicache.clear(['dosen-all', 'profil-dosen', 'myprofile-dosen', 'dosen-kelas'])};
const putMhs = () => {return apicache.clear(['mhs-all', 'profil-mhs', 'myprofile-mhs', 'mhs-kelas'])};
const putMatkul = () => {return apicache.clear(['matkul-all', 'matkul', 'matkul-dosen-all', 'matkul-dosen'])};
const putKelas = () => {return apicache.clear(['kelas-all', 'kelas', 'dashboard-dosen', 'kelas-dosen-all', 'dashboard-mhs',
'kelas-mhs-all'])};
const putMhsKelas = () => {return apicache.clear(['mhs-kelas'])};
const putDosenKelas = () => {return apicache.clear(['dosen-kelas', 'dashboard-dosen', 'status-dosen', 'kelas-dosen-all', 
'kelas-mhs-all'])};
const putUjianKelas = () => {return apicache.clear(['ujian-kelas', 'dashboard-dosen', 'status-dosen'])};
const putUjian = () => {return apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'kelas', 'dashboard-dosen', 'ujian-mhs'])};
const putMhsPkSoal = () => {return apicache.clear(['paket-soal-mhs'])}; // put mhs in pksoal
const putPengumuman = () => {return apicache.clear(['pengumuman-all', 'pengumuman'])};
const putCaptcha = () => {return apicache.clear(['captcha-all', 'captcha'])};
const putSemester = () => {return apicache.clear(['semester-all', 'semester'])};
const putNotifikasi = () => {return apicache.clear(['notifikasi-all', 'notifikasi-admin', 'notifikasi'])};
//patch
const patchStatusUjian = () => {return apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'kelas', 'dashboard-dosen', 
'dashboard-mhs', 'ujian-mhs', 'ujian-mhs-all-bystatus'])};
const patchKeaktifanUjian = () => {return apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'dashboard-dosen', 'dashboard-mhs', 
'ujian-mhs', 'ujian-mhs-all-S', 'ujian-mhs-all-L', 'ujian-mhs-all-bystatus'])};
const resetPw = () => {return apicache.clear(['lupapw'])};
//delete
const deleteUser = () => {return apicache.clear(['dashboard-admin', 'user', 'user-all', 'dosen-all', 'mhs-all', 'profil-dosen', 
'myprofile-dosen', 'profil-mhs', 'myprofile-mhs', 'mhs-kelas', 'dosen-kelas'])};
const deleteDosen = () => {return apicache.clear(['user-all', 'dosen-all', 'profil-dosen', 'myprofile-dosen', 'dosen-kelas'])};
const deleteMhs = () => {return apicache.clear(['user-all', 'mhs-all', 'profil-mhs', 'myprofile-mhs', 'mhs-kelas'])};
const deleteMatkul = () => {return apicache.clear(['dashboard-admin', 'matkul-all', 'matkul', 'matkul-dosen-all', 'matkul-dosen'])};
const deleteKelas = () => {return apicache.clear(['kelas-all', 'kelas', 'dashboard-dosen', 'status-dosen', 'matkul-dosen-all',
'matkul-dosen', 'kelas-dosen-all', 'dashboard-mhs', 'kelas-mhs-all'])};
const deleteMhsKelas = () => {return apicache.clear(['mhs-kelas'])};
const deleteDosenKelas = () => {return apicache.clear(['dosen-kelas', 'dashboard-dosen', 'status-dosen', 'kelas-dosen-all', 
'kelas-mhs-all'])};
const deleteUjianKelas = () => {return apicache.clear(['ujian-kelas', 'dashboard-dosen', 'status-dosen'])};
const deleteUjian = () => {return apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'kelas', 'dashboard-dosen', 'status-dosen', 
'ujian-mhs'])};
const deletePaketSoal = () => {return apicache.clear(['ujian-kelas', 'paket-soal', 'paket-soal-mhs', 'ujian', 'soal-paket-soal'])};
const deleteMhsPkSoal = () => {return apicache.clear(['paket-soal-mhs'])}; // delete mhs in pksoal
const deleteLupapw = () => {return apicache.clear(['lupapw'])};
const deletePengumuman = () => {return apicache.clear(['pengumuman-all', 'pengumuman'])};
const deleteCaptcha = () => {return apicache.clear(['captcha-all', 'captcha'])};
const deleteSemester = () => {return apicache.clear(['semester-all', 'semester'])};
const deleteNotifikasi = () => {return apicache.clear(['notifikasi-all', 'notifikasi-admin', 'notifikasi'])};

//DosenController
//get
const getmyProfileDosen = (req) => { return req.apicacheGroup = 'myprofile-dosen'};
const getDashboardDosen = (req) => { return req.apicacheGroup = 'dashboard-dosen'};
const getStatus = (req) => { return req.apicacheGroup = 'status-dosen'};
const getAllMatkulDosen = (req) => { return req.apicacheGroup = 'matkul-dosen-all'};
const getMatkulDosen = (req) => { return req.apicacheGroup = 'matkul-dosen'};
const getAllKelasDosen = (req) => { return req.apicacheGroup = 'kelas-dosen-all'};
const getPaketSoal = (req) => { return req.apicacheGroup = 'paket-soal'};
const getPaketSoalMhs = (req) => { return req.apicacheGroup = 'paket-soal-mhs'};
const getNilaiTotalMhs = (req) => { return req.apicacheGroup = 'nilai-total-mhs'};
const getSoalPenilaian = (req) => { return req.apicacheGroup = 'soal-penilaian'};
const getAllJawabanSoalAnon = (req) => { return req.apicacheGroup = 'jawaban-soal-anon'};
const getAllJawabanSoal = (req) => { return req.apicacheGroup = 'jawaban-soal'};
const getJawaban = (req) => { return req.apicacheGroup = 'jawaban'};
const getAllSoal = (req) => { return req.apicacheGroup = 'soal-all'};
const getSoal = (req) => { return req.apicacheGroup = 'soal'};
const getAllSoalMk = (req) => { return req.apicacheGroup = 'soal-matkul-all'}; 
//post
const postNewUjianDraft = () => { return apicache.clear(['ujian-all', 'ujian', 'ujian-kelas', 'dashboard-dosen', 'status-dosen'])};
const postNewUjianAktif = () => { return apicache.clear(['ujian-all', 'ujian', 'ujian-kelas', 'kelas', 'dashboard-dosen', 'status-dosen'])};
const postNewPaketSoal = () => { return apicache.clear(['ujian', 'soal-paket-soal', 'paket-soal', 'paket-soal-mhs'])};
const postNewSoalPkSoal = () => { return apicache.clear(['soal-paket-soal', 'paket-soal', 'ujian', 'soal-penilaian'])};
const postNewNilaiTotal = () => { return apicache.clear(['nilai-total-mhs', 'nilai-akhir'])};
const postNewNilaiUjian = () => { return apicache.clear(['jawaban', 'jawaban-soal', 'jawaban-soal-anon', 'nilai-total-mhs', 'ujian-mhs', 
'nilai-akhir'])};
const postNewSoal = () => { return apicache.clear(['soal-all', 'soal-paket-soal', 'soal-matkul-all'])};
const postputNilaiJawaban = () => { return apicache.clear(['jawaban', 'jawaban-soal', 'jawaban-soal-anon'])};
//put
const putmyProfileDosen = () => { return apicache.clear(['myprofile-dosen', 'profil-dosen', 'user', 'user-all'])};
const putSoalPkSoal = () => { return apicache.clear(['soal-paket-soal', 'paket-soal', 'ujian', 'soal-penilaian'])};
const putSoal = () => { return apicache.clear(['soal-all', 'soal', 'soal-paket-soal', 'soal-matkul-all'])};
//patch
const patchKeaktifanPkSoal = () => { return apicache.clear(['ujian-kelas', 'paket-soal', 'paket-soal-mhs', 'ujian', 'soal-paket-soal', 
'soal-penilaian', 'ujian-mhs-all-bystatus'])};
const patchBobotSoal = () => { return apicache.clear(['soal-paket-soal', 'soal-penilaian', 'soal-mhs'])};
const patchKunciSoal = () => { return apicache.clear(['soal-paket-soal', 'soal-penilaian', 'soal-mhs'])};
const patchGambarSoal = () => { return apicache.clear(['soal', 'soal-paket-soal', 'soal-penilaian'])};
const patchAudioSoal = () => { return apicache.clear(['soal', 'soal-paket-soal', 'soal-penilaian'])};
const patchVideoSoal = () => { return apicache.clear(['soal', 'soal-paket-soal', 'soal-penilaian'])};
const patchStatusSoal = () => { return apicache.clear(['soal-all', 'soal', 'soal-paket-soal', 'soal-penilaian', 'soal-mhs'])};
//delete
const deleteSoalPkSoal = () => { return apicache.clear(['soal-paket-soal', 'paket-soal', 'ujian', 'soal-penilaian'])};
const deleteSoal = () => { return apicache.clear(['soal-all', 'soal', 'soal-paket-soal', 'soal-penilaian'])};

//MhsController
//get
const getDashboardMhs = (req) => { return req.apicacheGroup = 'dashboard-mhs'};
const getmyProfileMhs = (req) => { return req.apicacheGroup = 'myprofile-mhs'};
const getAllKelasMhs = (req) => { return req.apicacheGroup = 'kelas-mhs-all'};
const getUjianMhs = (req) => { return req.apicacheGroup = 'ujian-mhs'};
const getAllUjianMhsS = (req) => { return req.apicacheGroup = 'ujian-mhs-all-S'};
const getAllUjianMhsL = (req) => { return req.apicacheGroup = 'ujian-mhs-all-L'};
const getAllUjianbyStatus = (req) => { return req.apicacheGroup = 'ujian-mhs-all-bystatus'};
const getSoalMhs = (req) => { return req.apicacheGroup = 'soal-mhs'};
const getAllJawabanMhs = (req) => { return req.apicacheGroup = 'jawaban-mhs'};
const getNilaiAkhir = (req) => { return req.apicacheGroup = 'nilai-akhir'};
//post
const postKelasMhs = () => {return apicache.clear(['kelas-mhs-all'])};
const postWaktuMulai = () => {return apicache.clear(['paket-soal-mhs', 'nilai-total-mhs'])};
const postWaktuSelesai = () => {return apicache.clear(['paket-soal-mhs', 'nilai-total-mhs'])};
const postPaketMhs = () => {return apicache.clear(['paket-soal-mhs', 'dashboard-mhs'])};
const postNewJawaban = () => {return apicache.clear(['jawaban-mhs', 'jawaban-soal-anon', 'jawaban-soal', 'nilai-total-mhs'])};
//put
const putmyProfileMhs = () => {return apicache.clear(['myprofile-mhs', 'profil-mhs', 'user', 'user-all'])};
const putKelasMhs = () => {return apicache.clear(['kelas-mhs-all'])};
const putJawaban = () => {return apicache.clear(['jawaban-mhs', 'jawaban-soal-anon', 'jawaban-soal', 'nilai-total-mhs'])};
//patch
const deleteKelasMhs = () => {return apicache.clear(['kelas-mhs-all'])};
const deleteJawaban = () => {return apicache.clear(['jawaban-mhs', 'jawaban-soal-anon', 'jawaban-soal', 'nilai-total-mhs'])};

module.exports = {
    /* AuthController */
    getAllClient, getCaptcha,
    postClient,
    putClient,
    deleteClient,
    postNewAdmin,
    /* AllUserController */
    getProfilSingkat, getAllKelas, getKelas, getSoalPaketSoal, getProfilDosen, getProfilMhs,  
    getPengumuman, getNotifikasi, getJenisUjian, getKelompokMatakuliah, getPeminatan, getSemester, 
    postProfilePic, postNotifikasi, postNilaiAuto,
    /* AdminController */
    getDashboardAdmin, getAllUser, getUser, getmyProfileAdmin, getAllDosen, getAllMhs, getAllMatkul,
    getMatkul, getMhsKelas, getDosenKelas, getUjianKelas, getAllUjian, getUjian, getLupapw, getAllPengumuman,
    getAllCaptcha, getAllSemester, getAllNotifikasi, getNotifikasiAdm, 
    postNewUser, postNewMatkul, postNewKelas, postNewMhsKelas, postNewDosenKelas, 
    postNewUjianKelas, postNewMhsPkSoal, postNewPengumuman, postNewCaptcha, postNewSemester, postNewNotifikasi,
    putUser, putmyProfileAdmin, putDosen, putMhs, putMatkul, putKelas, putMhsKelas, putDosenKelas,
    putUjianKelas, putUjian, putMhsPkSoal, putPengumuman, putCaptcha, putSemester, putNotifikasi,
    patchStatusUjian, patchKeaktifanUjian, resetPw,
    deleteUser, deleteDosen, deleteMhs, deleteMatkul, deleteKelas, deleteMhsKelas, deleteDosenKelas,
    deleteUjianKelas, deleteUjian, deletePaketSoal, deleteMhsPkSoal, deleteLupapw, deletePengumuman,
    deleteCaptcha, deleteSemester, deleteNotifikasi,
    /* DosenController */
    getmyProfileDosen, getDashboardDosen, getStatus, getAllMatkulDosen, getMatkulDosen, getAllKelasDosen,
    getPaketSoal, getPaketSoalMhs, getNilaiTotalMhs, getSoalPenilaian, getAllJawabanSoalAnon, getAllJawabanSoal,
    getJawaban, getAllSoal, getSoal, getAllSoalMk,
    postNewUjianDraft, postNewUjianAktif, postNewPaketSoal, postNewSoalPkSoal, postNewNilaiTotal, postNewNilaiUjian, 
    postNewSoal, postputNilaiJawaban, 
    putmyProfileDosen, putSoalPkSoal, putSoal,
    patchKeaktifanPkSoal, patchBobotSoal, patchKunciSoal, patchGambarSoal, patchAudioSoal, patchVideoSoal, 
    patchStatusSoal,
    deleteSoalPkSoal, deleteSoal,
    /* MhsController */
    getmyProfileMhs, getDashboardMhs, getAllKelasMhs, getUjianMhs, getAllUjianMhsS, getAllUjianMhsL, getAllUjianbyStatus,
    getSoalMhs, getAllJawabanMhs, getNilaiAkhir,
    postKelasMhs, postWaktuMulai, postWaktuSelesai, postPaketMhs, postNewJawaban,
    putmyProfileMhs, putKelasMhs, putJawaban,
    deleteKelasMhs, deleteJawaban,
}