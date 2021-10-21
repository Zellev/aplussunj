module.exports = (sequelize, DataTypes) => {
    const Peminatan = sequelize.define('Ref_peminatan', {
        kode_peminatan: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            primaryKey: true, 
            autoIncrement: true
        },
        peminatan: { 
            type: DataTypes.STRING(100),
            allowNull: true,
            unique:true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true
    });

    Peminatan.associate = db => {
        Peminatan.hasMany(db.Matakuliah, {
            foreignKey: 'kode_peminatan',
            allowNull: true,
            onDelete: 'CASCADE',
            as: 'Matkul'
        })
    };

    return Peminatan;
}

