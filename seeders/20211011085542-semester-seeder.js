'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_semester',[
      {
        semester: null
      },
      {
        semester: '119'
      },
      {
        semester: '120'
      },
      {
        semester: '121'
      },
      {
        semester: '122'
      },
      {
        semester: '123'
      },
      {
        semester: '124'
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_semester', {}, null);
  }
};
