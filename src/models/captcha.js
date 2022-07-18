"use strict";
module.exports = (sequelize, DataTypes) => {
    const Captcha = sequelize.define('Captcha', {
        id_captcha: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        pertanyaan: { 
            type: DataTypes.STRING(25),
            allowNull: false
        },
        jawaban: {
            type: DataTypes.STRING(5),            
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

    return Captcha;
}

