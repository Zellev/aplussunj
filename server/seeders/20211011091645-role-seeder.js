'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_role',[
      {
        role: 'Admin'
      },
      {
        role: 'Dosen'
      }, 
      {
        role: 'Mahasiswa'
      }, 
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_role', null, {});
  }
};
