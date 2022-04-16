'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Ref_illustrasi',[
      {
        nama_illustrasi: 'default-banner.jpg'
      },
      {
        nama_illustrasi: 'pexels-ákos-szabó-440731.jpg'
      }, 
      {
        nama_illustrasi: 'pexels-angela-roma-7319297.jpg'
      },
      {
        nama_illustrasi: 'pexels-dom-j-310452.jpg'
      }, 
      {
        nama_illustrasi: 'pexels-gdtography-911738.jpg'
      }, 
      {
        nama_illustrasi: 'pexels-henry-&-co-2341290.jpg'
      },
      {
        nama_illustrasi: 'pexels-ivan-babydov-7789867.jpg'
      },
      {
        nama_illustrasi: 'pexels-johannes-plenio-1103970.jpg'
      },
      {
        nama_illustrasi: 'pexels-magda-ehlers-1279813.jpg'
      },
      {
        nama_illustrasi: 'pexels-matheus-natan-3297593.jpg'
      },
      {
        nama_illustrasi: 'pexels-mathias-pr-reding-11692915.jpg'
      },
      {
        nama_illustrasi: 'pexels-miguel-á-padriñán-19670.jpg'
      },
      {
        nama_illustrasi: 'pexels-roman-friptuleac-10925135.jpg'
      },
      {
        nama_illustrasi: 'pexels-suzy-hazelwood-1629236.jpg'
      },
      {
        nama_illustrasi: 'pexels-tasso-mitsarakis-7996788.jpg'
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Ref_illustrasi', null, {});
  }
};
