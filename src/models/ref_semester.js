"use strict";
module.exports = (sequelize, DataTypes) => {
    const Semester = sequelize.define('Ref_semester', {
        id_semester: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true
        },
        semester: { 
            type: DataTypes.STRING(5),
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

    Semester.associate = db => {
        Semester.hasMany(db.Kelas, {
            foreignKey: 'id_semester',
            onDelete: 'CASCADE',
            as: 'Kelas'
        })
    };

    return Semester;
}

