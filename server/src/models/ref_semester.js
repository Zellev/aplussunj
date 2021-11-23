module.exports = (sequelize, DataTypes) => {
    const Semester = sequelize.define('Ref_semester', {
        kode_semester: { 
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
        timestamps: false
    });

    Semester.associate = db => {
        Semester.hasMany(db.Matakuliah, {
            foreignKey: 'semester',
            onDelete: 'CASCADE',
            as: 'Matkul'
        })
    };

    return Semester;
}

