'use strict';
const bcrypt = require('bcrypt');
const sequelize = require('sequelize');
const config = require('../config/dbconfig');
const pass = async () => {await bcrypt.hash(config.auth.defaultPass, 10)}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users',[
      {
        username: 'test',
        email: 'test@gmail.com',
        password: pass(), // liat di.ENV
        status_civitas: 'aktif',
        kode_role: '1',
        created_at: sequelize.fn('NOW')
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', {}, null);
  }
};
