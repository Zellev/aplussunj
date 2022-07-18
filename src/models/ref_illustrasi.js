"use strict";
module.exports = (sequelize, DataTypes) => {
    const Ref_illustrasi = sequelize.define('Ref_illustrasi', {
        id_illustrasi: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        nama_illustrasi: { 
            type: DataTypes.STRING(50), 
            unique: true,
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

    return Ref_illustrasi;
}

