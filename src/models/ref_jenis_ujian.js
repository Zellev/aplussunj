"use strict";
module.exports = (sequelize, DataTypes) => {
    const Jenis_ujian = sequelize.define('Ref_jenis_ujian', {
        id_jenis_ujian: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        jenis_ujian: { 
            type: DataTypes.STRING(25),
            allowNull: true
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

    Jenis_ujian.associate = db => {
        Jenis_ujian.hasMany(db.Ujian, {
            foreignKey: 'id_jenis_ujian',
            onDelete: 'CASCADE',
            as: 'Ujian'
        })
    };

    return Jenis_ujian;
}

