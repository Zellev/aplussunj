# AplussPTIK 

RESTFul API untuk Aplikasi Ujian Essay Daring menggunakan tools sebagai berikut:

- Framework => **Express.js**
- DBMS => **MySQL**
- ORM => **Sequelize**
- Web Server => **XAMPP/phpmyadmin**

## Panduan Instalasi:

1. Clone repo dengan command:

```
    git clone https://github.com/Zellev/aplussunj.git
    atau
    git clone git@github.com:Zellev/aplussunj.git
```

2. Install dependencies dan devDependencies dengan command `npm install`

3. Buat file `.env` sesuai dengan format file `.env.dist` pada folder utama/root, dan isi sesuai dengan data app anda.

4. Buat database baru dengan nama database seusai dengan yang ditambahkan pada file `.env`.

5. Jika ingin menambahkan akun admin jalankan command `npx sequelize-cli db:seed --seed 20211011113610-admin-seeder.js`.

```
    Username/email: admin77 / admin@gmail.com
    Password: (sesuai .env)
```

7. Jalankan web service dengan command `npm start`, atau lihat bagian script pada file `package.json`.

## Dummy Data:

Jika ingin menambahkan data dummy ganti command pada langkah no 6 menjadi `npx sequelize-cli db:seed:all`.

## Dokumentasi Pengujian Endpoint:

https://documenter.getpostman.com/view/15028732/UzQxMPLY

## Versi Heroku:

https://github.com/Zellev/aplussunj-heroku.git