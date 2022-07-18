'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_jenis_client',[
      {
        client: 'Website'
      },
      {
        client: 'Mobile'
      },
      {
        client: 'Desktop'
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_jenis_client', null, {});
  }
};
