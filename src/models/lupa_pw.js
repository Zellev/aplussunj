"use strict";
module.exports = (sequelize, DataTypes) => {
    const Lupa_pw = sequelize.define("Lupa_pw", {
        id_reset_pw: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        id_user: { 
            type: DataTypes.INTEGER(11).UNSIGNED,            
            allowNull: false
        },
        status: { 
            type: DataTypes.ENUM('sudah', 'belum')
        }
    }, {
        freezeTableName: true,
        timestamps: false,
    });

    Lupa_pw.associate = db => {
        Lupa_pw.belongsTo(db.User, { 
            foreignKey: 'id_user',
            as: 'User' 
        })
    }

    return Lupa_pw;
}