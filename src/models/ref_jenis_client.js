"use strict";
module.exports = (sequelize, DataTypes) => {
    const Ref_Jenis_Client = sequelize.define('Ref_jenis_client', {
        id_jenis_client: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        jenis_client: { 
            type: DataTypes.STRING(11), 
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

    Ref_Jenis_Client.associate = db => {
        Ref_Jenis_Client.hasOne(db.Client, {
            foreignKey: 'id_jenis_client',
            onDelete: 'RESTRICT',
            as: 'Client'
        });
    }

    return Ref_Jenis_Client;
}

