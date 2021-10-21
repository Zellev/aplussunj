'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_kel_matkul',[
      {
        kelompok_matakuliah: 'Wajib'
      },
      {
        kelompok_matakuliah: 'Peminatan'
      },
      {
        kelompok_matakuliah: 'MKU'
      },
      {
        kelompok_matakuliah: 'MKDK'
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_kel_matkul', {}, null);
  }
};
