const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config/dbconfig');
const db = {};

const sequelize = new Sequelize(
    config.db.database,
    config.db.user,
    config.db.password,
    config.db.options
);

fs
   .readdirSync(__dirname)
   .filter((file)=>
      file !== 'index.js'
   )
   .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
   });

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
  })

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.sequelize.authenticate().then(() => {
  console.log('Berhasil terkoneksi ke database.')
}).catch((err) => {
  console.error('Tidak dapat terhubung ke database:', err)
})

module.exports = db