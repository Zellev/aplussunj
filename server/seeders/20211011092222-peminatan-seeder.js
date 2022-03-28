'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_peminatan',[
      {
        peminatan: null
      },
      {
        peminatan: 'Multimedia'
      },
      {
        peminatan: 'Rekayasa Perangkat Lunak'
      }, 
      {
        peminatan: 'Teknik Komputer Jaringan'
      },       
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_peminatan', {}, null);
  }
};
