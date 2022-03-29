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
    }, {
        freezeTableName: true,
        timestamps: false        
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

