module.exports = (sequelize, DataTypes) => {
    const Peminatan = sequelize.define('Ref_peminatan', {
        id_peminatan: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            primaryKey: true, 
            autoIncrement: true
        },
        peminatan: { 
            type: DataTypes.STRING(25),
            allowNull: true,
            unique:true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
        deletedAt: 'deleted_at'
    });

    Peminatan.associate = db => {
        Peminatan.hasMany(db.Matakuliah, {
            foreignKey: 'id_peminatan',
            allowNull: true,
            onDelete: 'CASCADE',
            as: 'Matkul'
        })
    };

    return Peminatan;
}

