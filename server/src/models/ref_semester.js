module.exports = (sequelize, DataTypes) => {
    const Semester = sequelize.define('Ref_semester', {
        kode_semester: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true
        },
        semester: { 
            type: DataTypes.STRING(50),
            allowNull: true,
            unique:true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true
    });

    Semester.associate = db => {
        Semester.hasMany(db.Matakuliah, {
            foreignKey: 'semester',
            onDelete: 'CASCADE'
        })
    };

    return Semester;
}

