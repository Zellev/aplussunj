"use strict";
module.exports = (sequelize, DataTypes) => {
    const Kel_matkul = sequelize.define('Ref_kel_matkul', {
        id_kel_mk: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true
        },
        kelompok_matakuliah: { 
            type: DataTypes.STRING(25),
            allowNull: false,
            unique:true
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

    Kel_matkul.associate = db => {
        Kel_matkul.hasMany(db.Matakuliah, {
            foreignKey: 'id_kel_mk',
            onDelete: 'CASCADE',
            as: 'Matkul'
        })
    };

    return Kel_matkul;
}

