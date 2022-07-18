"use strict";
module.exports = (sequelize, DataTypes) => {
    const Peminatan = sequelize.define('Ref_peminatan', {
        id_peminatan: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            primaryKey: true, 
            autoIncrement: true
        },
        peminatan: { 
            type: DataTypes.STRING(25),
            allowNull: true,
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

    Peminatan.associate = db => {
        Peminatan.hasMany(db.Matakuliah, {
            foreignKey: 'id_peminatan',
            allowNull: true,
            onDelete: 'CASCADE',
            as: 'Matkul'
        })
    };

    return Peminatan;
}

