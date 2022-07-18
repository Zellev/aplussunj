"use strict";
module.exports = (sequelize, DataTypes) => {
    const Client = sequelize.define('Client', {
        id_client: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        client_name: { 
            type: DataTypes.STRING(25), 
            unique: true,
            allowNull: false
        },
        client_url: { 
            type: DataTypes.STRING(40), 
            unique: true,
            allowNull: false
        },
        api_key:{ 
            type: DataTypes.STRING(65),
            allowNull: false
        },
        id_jenis_client: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
        },
        updated_at: { 
            type: DataTypes.DATE,
            defaultValue: null
        }
    }, {       
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: false,
        deletedAt: 'deleted_at'
    });

    Client.associate = db => {
        Client.belongsTo(db.Ref_jenis_client, {
            foreignKey: 'id_jenis_client',
            as: 'Jenis_client'
        })        
    }

    return Client;
}

