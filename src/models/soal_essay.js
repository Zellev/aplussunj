"use strict";
module.exports = (sequelize, DataTypes) => { 
    const Soal_essay  = sequelize.define('Soal_essay', {
        id_soal: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        id_matkul: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        id_dosen: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        soal: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        gambar_soal: {
            type: DataTypes.STRING(155),
            defaultValue: null,
            get: function() {
                return JSON.parse(this.getDataValue('gambar_soal'));
            },
            set: function(val) {
                return this.setDataValue('gambar_soal', JSON.stringify(val));
            }
        },
        audio_soal: {
            type: DataTypes.STRING(50),
            defaultValue: null,
        },
        video_soal: {
            type: DataTypes.STRING(50),
            defaultValue: null,
        },
        kata_kunci_soal: {
            type: DataTypes.STRING(200),
            defaultValue: null,
            get: function() {
                if(this.getDataValue('kata_kunci_soal') == null){
                    return this.getDataValue('kata_kunci_soal')
                }
                return JSON.parse(this.getDataValue('kata_kunci_soal'));
            },
            set: function(val) {
                if(val == null){
                    return this.setDataValue('kata_kunci_soal', val);
                }
                return this.setDataValue('kata_kunci_soal', JSON.stringify(val));                
            }
        },
        status: {
            type: DataTypes.ENUM('draft', 'terbit'),
            allowNull: false,
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

    Soal_essay.associate = db => {
        Soal_essay.belongsTo(db.Matakuliah, {
            foreignKey: 'id_matkul',
            as: 'Matkul'
        }),
        Soal_essay.belongsTo(db.Dosen, {
            foreignKey: 'id_dosen',
            as: 'Dosen'
        }),
        Soal_essay.belongsToMany(db.Paket_soal, {
            through: 'Rel_paketsoal_soal',
            foreignKey: 'id_soal',
            onDelete: 'CASCADE',
            as: 'PaketSoals'
        }),
        Soal_essay.hasMany(db.Rel_paketsoal_soal, {
            foreignKey: 'id_soal',
            onDelete: 'CASCADE',
            as: 'Soal_PaketSoal'
        })
    };

    return Soal_essay;
}