const apicache = require('apicache');

//AuthController
//get
const getAllClient = (req) => { return req.apicacheGroup = 'client-all'};
const getCaptcha = (req) => { return req.apicacheGroup = 'captcha'};
//post
const postClient = apicache.clear(['client-all']);
//put
const putClient = apicache.clear(['client-all']);
//delete
const deleteClient = apicache.clear(['client-all']);

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
const postProfilePic = apicache.clear(['profil-dosen', 'myprofile-dosen', 'profil-mhs', 'myprofile-mhs']);
const postNotifikasi = apicache.clear(['notifikasi']);
const postNilaiAuto = apicache.clear(['nilai-total-mhs', 'nilai-akhir']); // getter nilai ~
const postNewAdmin = apicache.clear(['user-all', 'user', 'dashboard-admin']);

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
const postNewUser = apicache.clear(['user-all', 'dosen-all', 'mhs-all', 'dashboard-admin']);
const postNewMatkul = apicache.clear(['dashboard-admin', 'matkul-all', 'matkul']);
const postNewKelas = apicache.clear(['kelas-all', 'kelas']);
const postNewMhsKelas = apicache.clear(['mhs-kelas']);
const postNewDosenKelas = apicache.clear(['dosen-kelas', 'dashboard-dosen', 'status-dosen']);
const postNewUjianKelas = apicache.clear(['ujian-kelas', 'kelas', 'dashboard-dosen', 'status-dosen']);
const postNewMhsPkSoal = apicache.clear(['paket-soal-mhs']); // post mhs to pksoal
const postNewPengumuman = apicache.clear(['pengumuman-all', 'pengumuman']);
const postNewCaptcha = apicache.clear(['captcha-all', 'captcha']);
const postNewSemester = apicache.clear(['semester-all', 'semester']);
const postNewNotifikasi = apicache.clear(['notifikasi-all', 'notifikasi-admin', 'notifikasi']);
//put
const putUser = apicache.clear(['user-all', 'user', 'profil-dosen', 'myprofile-dosen', 'profil-mhs', 
'myprofile-mhs', 'dosen-all', 'mhs-all']);
const putmyProfileAdmin = apicache.clear(['myprofile-admin', 'user']);
const putDosen = apicache.clear(['dosen-all', 'profil-dosen', 'myprofile-dosen', 'dosen-kelas']);
const putMhs = apicache.clear(['mhs-all', 'profil-mhs', 'myprofile-mhs', 'mhs-kelas']);
const putMatkul = apicache.clear(['matkul-all', 'matkul', 'matkul-dosen-all', 'matkul-dosen']);
const putKelas = apicache.clear(['kelas-all', 'kelas', 'dashboard-dosen', 'kelas-dosen-all', 'dashboard-mhs',
'kelas-mhs-all']);
const putMhsKelas = apicache.clear(['mhs-kelas']);
const putDosenKelas = apicache.clear(['dosen-kelas', 'dashboard-dosen', 'status-dosen', 'kelas-dosen-all', 
'kelas-mhs-all']);
const putUjianKelas = apicache.clear(['ujian-kelas', 'dashboard-dosen', 'status-dosen']);
const putUjian = apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'kelas', 'dashboard-dosen', 'ujian-mhs']);
const putMhsPkSoal = apicache.clear(['paket-soal-mhs']); // put mhs in pksoal
const putPengumuman = apicache.clear(['pengumuman-all', 'pengumuman']);
const putCaptcha = apicache.clear(['captcha-all', 'captcha']);
const putSemester = apicache.clear(['semester-all', 'semester']);
const putNotifikasi = apicache.clear(['notifikasi-all', 'notifikasi-admin', 'notifikasi']);
//patch
const patchStatusUjian = apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'kelas', 'dashboard-dosen', 
'dashboard-mhs', 'ujian-mhs', 'ujian-mhs-all-bystatus']);
const patchKeaktifanUjian = apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'dashboard-dosen', 'dashboard-mhs', 
'ujian-mhs', 'ujian-mhs-all-S', 'ujian-mhs-all-L', 'ujian-mhs-all-bystatus']);
const resetPw = apicache.clear(['lupapw']);
//delete
const deleteUser = apicache.clear(['dashboard-admin', 'user', 'user-all', 'dosen-all', 'mhs-all', 'profil-dosen', 
'myprofile-dosen', 'profil-mhs', 'myprofile-mhs', 'mhs-kelas', 'dosen-kelas']);
const deleteDosen = apicache.clear(['user-all', 'dosen-all', 'profil-dosen', 'myprofile-dosen', 'dosen-kelas']);
const deleteMhs = apicache.clear(['user-all', 'mhs-all', 'profil-mhs', 'myprofile-mhs', 'mhs-kelas']);
const deleteMatkul = apicache.clear(['dashboard-admin', 'matkul-all', 'matkul', 'matkul-dosen-all', 'matkul-dosen']);
const deleteKelas = apicache.clear(['kelas-all', 'kelas', 'dashboard-dosen', 'status-dosen', 'matkul-dosen-all',
'matkul-dosen', 'kelas-dosen-all', 'dashboard-mhs', 'kelas-mhs-all']);
const deleteMhsKelas = apicache.clear(['mhs-kelas']);
const deleteDosenKelas = apicache.clear(['dosen-kelas', 'dashboard-dosen', 'status-dosen', 'kelas-dosen-all', 
'kelas-mhs-all']);
const deleteUjianKelas = apicache.clear(['ujian-kelas', 'dashboard-dosen', 'status-dosen']);
const deleteUjian = apicache.clear(['ujian-kelas', 'ujian-all', 'ujian', 'kelas', 'dashboard-dosen', 'status-dosen', 
'ujian-mhs']);
const deletePaketSoal = apicache.clear(['ujian-kelas', 'paket-soal', 'paket-soal-mhs', 'ujian', 'soal-paket-soal']);
const deleteMhsPkSoal = apicache.clear(['paket-soal-mhs']); // delete mhs in pksoal
const deleteLupapw = apicache.clear(['lupapw']);
const deletePengumuman = apicache.clear(['pengumuman-all', 'pengumuman']);
const deleteCaptcha = apicache.clear(['captcha-all', 'captcha']);
const deleteSemester = apicache.clear(['semester-all', 'semester']);
const deleteNotifikasi = apicache.clear(['notifikasi-all', 'notifikasi-admin', 'notifikasi']);

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
const postNewUjianDraft = apicache.clear(['ujian-all', 'ujian', 'ujian-kelas', 'dashboard-dosen', 'status-dosen']);
const postNewUjianAktif = apicache.clear(['ujian-all', 'ujian', 'ujian-kelas', 'kelas', 'dashboard-dosen', 'status-dosen']);
const postNewPaketSoal = apicache.clear(['ujian', 'soal-paket-soal', 'paket-soal', 'paket-soal-mhs']);
const postNewSoalPkSoal = apicache.clear(['soal-paket-soal', 'paket-soal', 'ujian', 'soal-penilaian']);
const postNewNilaiTotal = apicache.clear(['nilai-total-mhs', 'nilai-akhir']);
const postNewNilaiUjian = apicache.clear(['jawaban', 'jawaban-soal', 'jawaban-soal-anon', 'nilai-total-mhs', 'ujian-mhs', 
'nilai-akhir']);
const postNewSoal = apicache.clear(['soal-all', 'soal-paket-soal', 'soal-matkul-all']);
const postputNilaiJawaban = apicache.clear(['jawaban', 'jawaban-soal', 'jawaban-soal-anon']);
//put
const putmyProfileDosen = apicache.clear(['myprofile-dosen', 'profil-dosen', 'user', 'user-all']);
const putSoalPkSoal = apicache.clear(['soal-paket-soal', 'paket-soal', 'ujian', 'soal-penilaian']);
const putSoal = apicache.clear(['soal-all', 'soal', 'soal-paket-soal', 'soal-matkul-all']);
//patch
const patchKeaktifanPkSoal = apicache.clear(['ujian-kelas', 'paket-soal', 'paket-soal-mhs', 'ujian', 'soal-paket-soal', 
'soal-penilaian', 'ujian-mhs-all-bystatus']);
const patchBobotSoal = apicache.clear(['soal-paket-soal', 'soal-penilaian', 'soal-mhs']);
const patchKunciSoal = apicache.clear(['soal-paket-soal', 'soal-penilaian', 'soal-mhs']);
const patchGambarSoal = apicache.clear(['soal', 'soal-paket-soal', 'soal-penilaian']);
const patchAudioSoal = apicache.clear(['soal', 'soal-paket-soal', 'soal-penilaian']);
const patchVideoSoal = apicache.clear(['soal', 'soal-paket-soal', 'soal-penilaian']);
const patchStatusSoal = apicache.clear(['soal-all', 'soal', 'soal-paket-soal', 'soal-penilaian', 'soal-mhs']);
//delete
const deleteSoalPkSoal = apicache.clear(['soal-paket-soal', 'paket-soal', 'ujian', 'soal-penilaian']);
const deleteSoal = apicache.clear(['soal-all', 'soal', 'soal-paket-soal', 'soal-penilaian']);

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
const postKelasMhs = apicache.clear(['kelas-mhs-all']);
const postWaktuMulai = apicache.clear(['paket-soal-mhs', 'nilai-total-mhs']);
const postWaktuSelesai = apicache.clear(['paket-soal-mhs', 'nilai-total-mhs']);
const postPaketMhs = apicache.clear(['paket-soal-mhs', 'dashboard-mhs']);
const postNewJawaban = apicache.clear(['jawaban-mhs', 'jawaban-soal-anon', 'jawaban-soal', 'nilai-total-mhs']);
//put
const putmyProfileMhs = apicache.clear(['myprofile-mhs', 'profil-mhs', 'user', 'user-all']);
const putKelasMhs = apicache.clear(['kelas-mhs-all']);
const putJawaban = apicache.clear(['jawaban-mhs', 'jawaban-soal-anon', 'jawaban-soal', 'nilai-total-mhs']);
//patch
const deleteKelasMhs = apicache.clear(['kelas-mhs-all']);
const deleteJawaban = apicache.clear(['jawaban-mhs', 'jawaban-soal-anon', 'jawaban-soal', 'nilai-total-mhs']);

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