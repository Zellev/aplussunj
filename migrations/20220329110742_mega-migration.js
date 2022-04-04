const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * createTable() => "Captcha", deps: []
 * createTable() => "Lupa_pw", deps: []
 * createTable() => "Pengumuman", deps: []
 * createTable() => "Ref_client", deps: []
 * createTable() => "Ref_jenis_ujian", deps: []
 * createTable() => "Ref_kel_matkul", deps: []
 * createTable() => "Ref_peminatan", deps: []
 * createTable() => "Ref_role", deps: []
 * createTable() => "Ref_semester", deps: []
 * createTable() => "Clients", deps: [Ref_client]
 * createTable() => "Users", deps: [Ref_role]
 * createTable() => "Dosen", deps: [Users]
 * createTable() => "Matakuliah", deps: [Ref_kel_matkul, Ref_peminatan]
 * createTable() => "Soal_essay", deps: [Dosen, Matakuliah, Dosen]
 * createTable() => "Kelas", deps: [Matakuliah, Ref_semester]
 * createTable() => "Mahasiswa", deps: [Users]
 * createTable() => "Ujian", deps: [Ref_jenis_ujian]
 * createTable() => "Rel_dosen_kelas", deps: [Dosen, Kelas]
 * createTable() => "Paket_soal", deps: [Ujian]
 * createTable() => "Rel_mahasiswa_kelas", deps: [Mahasiswa, Kelas]
 * createTable() => "Rel_mahasiswa_paketsoal", deps: [Mahasiswa, Paket_soal]
 * createTable() => "Rel_paketsoal_soal", deps: [Paket_soal, Soal_essay]
 * createTable() => "Jawaban_mahasiswa", deps: [Rel_paketsoal_soal, Mahasiswa]
 * createTable() => "Notifikasi", deps: [Users, Users]
 * createTable() => "Rel_kelas_ujian", deps: [Kelas, Ujian]
 * createTable() => "Token_histories", deps: [Users]
 * addIndex(archived_by_createdAt) => "Clients"
 * addIndex(archived_by_createdAt) => "Dosen"
 * addIndex(archived_by_createdAt) => "Jawaban_mahasiswa"
 * addIndex(archived_by_createdAt) => "Mahasiswa"
 * addIndex(archived_by_createdAt) => "Notifikasi"
 * addIndex(archived_by_createdAt) => "Soal_essay"
 * addIndex(archived_by_createdAt) => "Ujian"
 * addIndex(archived_by_createdAt) => "Users"
 *
 */

const info = {
  revision: 1,
  name: "migtest",
  created: "2022-03-29T11:07:42.250Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "createTable",
    params: [
      "Captcha",
      {
        id_captcha: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_captcha",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        pertanyaan: {
          type: Sequelize.STRING(25),
          field: "pertanyaan",
          allowNull: false,
        },
        jawaban: {
          type: Sequelize.STRING(5),
          field: "jawaban",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Lupa_pw",
      {
        id_reset_pw: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_reset_pw",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        username: {
          type: Sequelize.STRING(25),
          field: "username",
          allowNull: false,
        },
        email: { type: Sequelize.STRING(25), field: "email", allowNull: false },
        status: { type: Sequelize.ENUM("sudah", "belum"), field: "status" },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Pengumuman",
      {
        id_pengumuman: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_pengumuman",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        pengumuman: {
          type: Sequelize.TEXT,
          field: "pengumuman",
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("tampil", "tidak_tampil"),
          field: "status",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ref_client",
      {
        id_client: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_client",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        client: {
          type: Sequelize.STRING(11),
          field: "client",
          allowNull: false,
          unique: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ref_jenis_ujian",
      {
        id_jenis_ujian: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_jenis_ujian",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        jenis_ujian: {
          type: Sequelize.STRING(25),
          field: "jenis_ujian",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ref_kel_matkul",
      {
        id_kel_mk: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_kel_mk",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        kelompok_matakuliah: {
          type: Sequelize.STRING(25),
          field: "kelompok_matakuliah",
          unique: true,
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ref_peminatan",
      {
        id_peminatan: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_peminatan",
          autoIncrement: true,
          primaryKey: true,
        },
        peminatan: {
          type: Sequelize.STRING(25),
          field: "peminatan",
          unique: true,
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ref_role",
      {
        id_role: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_role",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        role: {
          type: Sequelize.STRING(11),
          field: "role",
          allowNull: false,
          unique: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ref_semester",
      {
        id_semester: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_semester",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        semester: {
          type: Sequelize.STRING(5),
          field: "semester",
          unique: true,
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Clients",
      {
        id_client: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_client",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        client_name: {
          type: Sequelize.STRING(25),
          field: "client_name",
          allowNull: false,
          unique: true,
        },
        client_url: {
          type: Sequelize.STRING(25),
          field: "client_url",
          allowNull: false,
          unique: true,
        },
        api_key: {
          type: Sequelize.STRING(65),
          field: "api_key",
          allowNull: false,
        },
        jenis_client: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Ref_client", key: "id_client" },
          field: "jenis_client",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Users",
      {
        id: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        username: {
          type: Sequelize.STRING(25),
          field: "username",
          allowNull: false,
          unique: true,
        },
        email: {
          type: Sequelize.STRING(50),
          field: "email",
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING(65),
          field: "password",
          allowNull: false,
        },
        status_civitas: {
          type: Sequelize.ENUM("aktif", "tidak_aktif"),
          field: "status_civitas",
          allowNull: false,
          defaultValue: "aktif",
        },
        id_role: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
          references: { model: "Ref_role", key: "id_role" },
          field: "id_role",
          allowNull: false,
        },
        foto_profil: {
          type: Sequelize.STRING(100),
          field: "foto_profil",
          defaultValue: null,
        },
        keterangan: {
          type: Sequelize.TEXT,
          field: "keterangan",
          defaultValue: null,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Dosen",
      {
        id_dosen: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_dosen",
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        id_user: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Users", key: "id" },
          field: "id_user",
          allowNull: false,
        },
        NIP: {
          type: Sequelize.STRING(20),
          field: "NIP",
          allowNull: false,
          unique: true,
        },
        NIDN: { type: Sequelize.STRING(10), field: "NIDN", unique: true },
        NIDK: {
          type: Sequelize.STRING(10),
          field: "NIDK",
          allowNull: false,
          unique: true,
        },
        nama_lengkap: {
          type: Sequelize.STRING(25),
          field: "nama_lengkap",
          allowNull: false,
        },
        alamat: { type: Sequelize.TEXT, field: "alamat", defaultValue: null },
        nomor_telp: {
          type: Sequelize.STRING(12),
          field: "nomor_telp",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Matakuliah",
      {
        id_matkul: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_matkul",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        kode_matkul: {
          type: Sequelize.STRING(10),
          field: "kode_matkul",
          allowNull: false,
          unique: true,
        },
        id_kel_mk: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Ref_kel_matkul", key: "id_kel_mk" },
          field: "id_kel_mk",
          allowNull: false,
        },
        id_peminatan: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Ref_peminatan", key: "id_peminatan" },
          allowNull: true,
          field: "id_peminatan",
        },
        nama_matkul: {
          type: Sequelize.STRING(50),
          field: "nama_matkul",
          unique: true,
          allowNull: false,
        },
        sks: { type: Sequelize.INTEGER(5), field: "sks", allowNull: false },
        deskripsi: { type: Sequelize.TEXT, field: "deskripsi" },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Soal_essay",
      {
        id_soal: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Dosen", key: "id_dosen" },
          field: "id_soal",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_matkul: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Matakuliah", key: "id_matkul" },
          field: "id_matkul",
          allowNull: false,
        },
        id_dosen: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Dosen", key: "id_dosen" },
          field: "id_dosen",
          allowNull: false,
        },
        soal: { type: Sequelize.TEXT, field: "soal", allowNull: false },
        gambar_soal: {
          type: Sequelize.STRING(155),
          field: "gambar_soal",
          defaultValue: null,
        },
        audio_soal: {
          type: Sequelize.STRING(50),
          field: "audio_soal",
          defaultValue: null,
        },
        video_soal: {
          type: Sequelize.STRING(50),
          field: "video_soal",
          defaultValue: null,
        },
        status: {
          type: Sequelize.ENUM("draft", "terbit"),
          field: "status",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Kelas",
      {
        id_kelas: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_kelas",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        kode_seksi: {
          type: Sequelize.STRING(10),
          field: "kode_seksi",
          allowNull: false,
          unique: true,
        },
        id_matkul: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Matakuliah", key: "id_matkul" },
          field: "id_matkul",
          allowNull: false,
        },
        id_semester: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Ref_semester", key: "id_semester" },
          allowNull: true,
          field: "id_semester",
        },
        hari: { type: Sequelize.STRING(10), field: "hari", allowNull: false },
        jam: { type: Sequelize.STRING(15), field: "jam", allowNull: false },
        deskripsi: {
          type: Sequelize.TEXT,
          field: "deskripsi",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Mahasiswa",
      {
        id_mhs: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_mhs",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_user: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Users", key: "id" },
          field: "id_user",
          allowNull: false,
        },
        NIM: {
          type: Sequelize.STRING(10),
          field: "NIM",
          allowNull: false,
          unique: true,
        },
        nama_lengkap: {
          type: Sequelize.STRING(25),
          field: "nama_lengkap",
          allowNull: false,
        },
        alamat: { type: Sequelize.TEXT, field: "alamat" },
        nomor_telp: {
          type: Sequelize.STRING(12),
          field: "nomor_telp",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Ujian",
      {
        id_ujian: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_ujian",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_jenis_ujian: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Ref_jenis_ujian", key: "id_jenis_ujian" },
          field: "id_jenis_ujian",
          allowNull: true,
        },
        judul_ujian: {
          type: Sequelize.STRING(45),
          field: "judul_ujian",
          allowNull: false,
        },
        tanggal_mulai: {
          type: Sequelize.DATEONLY,
          field: "tanggal_mulai",
          allowNull: false,
        },
        waktu_mulai: {
          type: Sequelize.TIME,
          field: "waktu_mulai",
          allowNull: false,
        },
        durasi_ujian: {
          type: Sequelize.TIME,
          field: "durasi_ujian",
          allowNull: false,
        },
        durasi_per_soal: {
          type: Sequelize.TIME,
          field: "durasi_per_soal",
          defaultValue: null,
        },
        bobot_per_soal: {
          type: Sequelize.ENUM("tampilkan", "sembunyikan"),
          field: "bobot_per_soal",
          defaultValue: "sembunyikan",
          allowNull: false,
        },
        bobot_total: {
          type: Sequelize.INTEGER(5).UNSIGNED,
          field: "bobot_total",
          allowNull: false,
        },
        status_ujian: {
          type: Sequelize.ENUM(
            "draft",
            "akan dimulai",
            "sedang berlangsung",
            "selesai"
          ),
          field: "status_ujian",
          allowNull: false,
        },
        tipe_penilaian: {
          type: Sequelize.ENUM("automatis", "manual", "campuran"),
          field: "tipe_penilaian",
        },
        aktif: {
          type: Sequelize.BOOLEAN,
          field: "aktif",
          defaultValue: 0,
          allowNull: false,
        },
        deskripsi: { type: Sequelize.TEXT, field: "deskripsi" },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Rel_dosen_kelas",
      {
        id: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_dosen: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Dosen", key: "id_dosen" },
          unique: "Rel_dosen_kelas_id_kelas_id_dosen_unique",
          field: "id_dosen",
          allowNull: false,
        },
        id_kelas: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Kelas", key: "id_kelas" },
          unique: "Rel_dosen_kelas_id_kelas_id_dosen_unique",
          field: "id_kelas",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Paket_soal",
      {
        id_paket: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_paket",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        kode_paket: {
          type: Sequelize.STRING(5),
          field: "kode_paket",
          allowNull: false,
          unique: true,
        },
        id_ujian: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Ujian", key: "id_ujian" },
          field: "id_ujian",
          allowNull: false,
        },
        aktif: {
          type: Sequelize.BOOLEAN,
          field: "aktif",
          defaultValue: 1,
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Rel_mahasiswa_kelas",
      {
        id: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_mhs: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Mahasiswa", key: "id_mhs" },
          unique: "Rel_mahasiswa_kelas_id_mhs_id_kelas_unique",
          field: "id_mhs",
          allowNull: false,
        },
        id_kelas: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Kelas", key: "id_kelas" },
          unique: "Rel_mahasiswa_kelas_id_mhs_id_kelas_unique",
          field: "id_kelas",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Rel_mahasiswa_paketsoal",
      {
        id: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_mhs: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Mahasiswa", key: "id_mhs" },
          unique: "Rel_mahasiswa_paketsoal_id_paket_id_mhs_unique",
          field: "id_mhs",
          allowNull: false,
        },
        id_paket: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Paket_soal", key: "id_paket" },
          unique: "Rel_mahasiswa_paketsoal_id_paket_id_mhs_unique",
          field: "id_paket",
          allowNull: false,
        },
        nilai_total: {
          type: Sequelize.INTEGER(3),
          field: "nilai_total",
          defaultValue: null,
        },
        waktu_mulai: {
          type: Sequelize.DATE,
          field: "waktu_mulai",
          defaultValue: null,
        },
        waktu_selesai: {
          type: Sequelize.DATE,
          field: "waktu_selesai",
          defaultValue: null,
        },
        lama_pengerjaan: {
          type: Sequelize.STRING(30),
          field: "lama_pengerjaan",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Rel_paketsoal_soal",
      {
        id: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_paket: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Paket_soal", key: "id_paket" },
          unique: "Rel_paketsoal_soal_id_soal_id_paket_unique",
          field: "id_paket",
          allowNull: false,
        },
        id_soal: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          unique: "Rel_paketsoal_soal_id_soal_id_paket_unique",
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Soal_essay", key: "id_soal" },
          field: "id_soal",
          allowNull: false,
        },
        no_urut_soal: {
          type: Sequelize.INTEGER(2),
          field: "no_urut_soal",
          allowNull: false,
        },
        bobot_soal: {
          type: Sequelize.INTEGER(3),
          field: "bobot_soal",
          defaultValue: 0,
          allowNull: false,
        },
        kata_kunci_soal: {
          type: Sequelize.STRING(200),
          field: "kata_kunci_soal",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Jawaban_mahasiswa",
      {
        id_jawaban: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_jawaban",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_relasi_soalpksoal: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Rel_paketsoal_soal", key: "id" },
          field: "id_relasi_soalpksoal",
          allowNull: false,
        },
        id_mhs: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Mahasiswa", key: "id_mhs" },
          field: "id_mhs",
          allowNull: false,
        },
        jawaban: { type: Sequelize.TEXT, field: "jawaban", allowNull: false },
        gambar_jawaban: {
          type: Sequelize.STRING(255),
          field: "gambar_jawaban",
          defaultValue: null,
        },
        audio_jawaban: {
          type: Sequelize.STRING(50),
          field: "audio_jawaban",
          defaultValue: null,
        },
        video_jawaban: {
          type: Sequelize.STRING(50),
          field: "video_jawaban",
          defaultValue: null,
        },
        nilai_jawaban: {
          type: Sequelize.INTEGER(3),
          field: "nilai_jawaban",
          defaultValue: null,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Notifikasi",
      {
        id_notif: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id_notif",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_pengirim: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Users", key: "id" },
          allowNull: true,
          field: "id_pengirim",
          defaultValue: null,
        },
        id_penerima: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Users", key: "id" },
          field: "id_penerima",
          allowNull: false,
        },
        notifikasi: {
          type: Sequelize.TEXT,
          field: "notifikasi",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          defaultValue: null,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Rel_kelas_ujian",
      {
        id: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        id_kelas: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Kelas", key: "id_kelas" },
          unique: "Rel_kelas_ujian_id_ujian_id_kelas_unique",
          field: "id_kelas",
          allowNull: false,
        },
        id_ujian: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          unique: "Rel_kelas_ujian_id_ujian_id_kelas_unique",
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "Ujian", key: "id_ujian" },
          field: "id_ujian",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "Token_histories",
      {
        id_user: {
          type: Sequelize.INTEGER(11).UNSIGNED,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "Users", key: "id" },
          field: "id_user",
          primaryKey: true,
          allowNull: false,
        },
        refresh_token: {
          type: Sequelize.STRING(255),
          field: "refresh_token",
          primaryKey: true,
        },
        isValid: {
          type: Sequelize.BOOLEAN,
          field: "isValid",
          defaultValue: 0,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATEONLY,
          field: "created_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Clients",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Dosen",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Jawaban_mahasiswa",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Mahasiswa",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Notifikasi",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Soal_essay",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Ujian",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "Users",
      ["created_at", "updated_at"],
      {
        indexName: "archived_by_createdAt",
        name: "archived_by_createdAt",
        transaction,
      },
    ],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "dropTable",
    params: ["Captcha", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Clients", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Dosen", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Jawaban_mahasiswa", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Kelas", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Lupa_pw", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Mahasiswa", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Matakuliah", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Notifikasi", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Paket_soal", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Pengumuman", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ref_client", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ref_jenis_ujian", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ref_kel_matkul", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ref_peminatan", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ref_role", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ref_semester", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Rel_dosen_kelas", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Rel_kelas_ujian", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Rel_mahasiswa_kelas", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Rel_mahasiswa_paketsoal", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Rel_paketsoal_soal", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Soal_essay", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Token_histories", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Ujian", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["Users", { transaction }],
  },
];

const pos = 0;
const useTransaction = true;

const execute = (queryInterface, sequelize, _commands) => {
  let index = pos;
  const run = (transaction) => {
    const commands = _commands(transaction);
    return new Promise((resolve, reject) => {
      const next = () => {
        if (index < commands.length) {
          const command = commands[index];
          console.log(`[#${index}] execute: ${command.fn}`);
          index++;
          queryInterface[command.fn](...command.params).then(next, reject);
        } else resolve();
      };
      next();
    });
  };
  if (useTransaction) return queryInterface.sequelize.transaction(run);
  return run(null);
};

module.exports = {
  pos,
  useTransaction,
  up: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, migrationCommands),
  down: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, rollbackCommands),
  info,
};
