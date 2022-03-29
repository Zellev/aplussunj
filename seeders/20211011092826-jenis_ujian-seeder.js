'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_jenis_ujian',[
      {
        jenis_ujian: null
      },
      {
        jenis_ujian: 'Penilaian Harian'
      },
      {
        jenis_ujian: 'Penilaian Tengah Semester'
      },
      {
        jenis_ujian: 'Penilaian Akhir Semester'
      },      
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_jenis_ujian', {}, null);
  }
};
