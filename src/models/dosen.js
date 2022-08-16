"use strict";
module.exports = (sequelize, DataTypes) => { 
    const Dosen = sequelize.define('Dosen', {
        id_dosen: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true            
        },
        id_user: { 
            type: DataTypes.INTEGER(11).UNSIGNED,            
            allowNull: false
        },
        NIP: { 
            type: DataTypes.STRING(20), 
            unique: true,
            allowNull: false
        },
        NIDN: { 
            type: DataTypes.STRING(10), 
            unique: true
        },
        NIDK: { 
            type: DataTypes.STRING(10), 
            unique: true,
            allowNull: false
        },
        nama_lengkap:{ 
            type: DataTypes.STRING(60),
            allowNull: false
        },
        alamat: { 
            type: DataTypes.TEXT,
            defaultValue: null
        },
        nomor_telp: { 
            type: DataTypes.STRING(15),
            allowNull: false
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

    Dosen.associate = db => {
        Dosen.belongsTo(db.User, { 
            foreignKey: 'id_user',
            as: 'User' 
        }),
        Dosen.belongsToMany(db.Kelas, {
            through: 'Rel_dosen_kelas',            
            foreignKey: 'id_dosen',
            onDelete: 'CASCADE',
            as: 'Kelases'
        }),
        Dosen.hasMany(db.Soal_essay, {
            foreignKey: 'id_soal',
            onDelete: 'CASCADE',
            as: 'Soals'
        })
    }

    return Dosen;
}

