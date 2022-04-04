'use strict';
const bcrypt = require('bcrypt');
const sequelize = require('sequelize');
const config = require('.././src/config/dbconfig');
const pass = async () => {return bcrypt.hash(config.auth.defaultPass, 10)}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users',[
      {
        username: 'admin77',
        email: 'admin@gmail.com',
        password: await pass(), // liat di.ENV
        status_civitas: 'aktif',
        id_role: '1',
        created_at: sequelize.fn('NOW')
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', {}, null);
  }
};
