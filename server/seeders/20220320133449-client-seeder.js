'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_client',[
      {
        client: 'Website'
      },
      {
        client: 'Mobile'
      },
      {
        client: 'iOS'
      },
      {
        client: 'Desktop'
      },
      {
        client: 'MacOS'
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_client', null, {});
  }
};
