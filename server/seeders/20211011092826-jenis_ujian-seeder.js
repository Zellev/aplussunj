'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_jenis_ujian',[
      {
        jenis_ujian: 'Penilaian Harian'
      },
      {
        jenis_ujian: 'Penilaian Tengah Semester'
      },
      {
        jenis_ujian: 'Penilaian Akhir Semester'
      },
      {
        jenis_ujian: null
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_jenis_ujian', {}, null);
  }
};
