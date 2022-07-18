"use strict";
const { format } = require('date-fns') 

module.exports = (sequelize, DataTypes) => { 
    const Ujian = sequelize.define('Ujian', {
        id_ujian: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        illustrasi_ujian: {
            type: DataTypes.STRING(50),
            defaultValue: null
        },
        id_jenis_ujian: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: true
        },
        judul_ujian: {
            type: DataTypes.STRING(45),
            allowNull: false
        },
        tanggal_mulai: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            get: function (){
                const date = this.getDataValue('tanggal_mulai');
                if(date === undefined){
                    return null
                } else {
                    return format(new Date(date), 'dd-MM-yyyy')
                }
            },
            set: function(val) {
                return this.setDataValue('tanggal_mulai', format(new Date(String(val)), 'yyyy-MM-dd'));
            }
        },
        waktu_mulai: {
            type: DataTypes.TIME,
            allowNull: false
        },
        durasi_ujian: {
            type: DataTypes.TIME,
            allowNull: false
        },
        durasi_per_soal: {
            type: DataTypes.TIME,
            defaultValue: null
        },
        bobot_per_soal: {
            type: DataTypes.ENUM('tampilkan', 'sembunyikan'),            
            allowNull: false,
            defaultValue: 'sembunyikan'
        },
        bobot_total: {
            type: DataTypes.INTEGER(5).UNSIGNED,
            allowNull: false
        },
        status_ujian:{
            type: DataTypes.ENUM('draft', 'akan dimulai', 'sedang berlangsung', 'selesai'),            
            allowNull: false
        },
        tipe_penilaian:{
            type: DataTypes.ENUM('automatis', 'manual', 'campuran')
        },
        aktif: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        deskripsi: {
            type: DataTypes.TEXT
        },        
        updated_at: { 
            type: DataTypes.DATE,
            defaultValue: null
        }
    }, {
        freezeTableName: true,
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: false,
        deletedAt: 'deleted_at'
    });

    Ujian.associate = db => {
        Ujian.belongsToMany(db.Kelas, { 
            through: 'Rel_kelas_ujian',
            foreignKey: 'id_ujian',
            onDelete: 'CASCADE',
            as: 'Kelases'
        }),
        Ujian.hasMany(db.Rel_kelas_ujian, {
            foreignKey: 'id_ujian',
            onDelete: 'CASCADE',
            as: 'Ujianoccurance'
        }),
        Ujian.hasMany(db.Paket_soal, {
            foreignKey: 'id_ujian',
            onDelete: 'CASCADE',
            as: 'PaketSoals'
        }),     
        Ujian.belongsTo(db.Ref_jenis_ujian, {
            foreignKey: 'id_jenis_ujian',
            as: 'RefJenis'
        })
    };

    return Ujian;
}