"use strict";
module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Ref_role', {
        id_role: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        role: { 
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

    Role.associate = db => {
        Role.hasOne(db.User, {
            foreignKey: 'id_role',
            onDelete: 'RESTRICT',
            as: 'User'
        });
    }

    return Role;
}

