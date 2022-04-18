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
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
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

