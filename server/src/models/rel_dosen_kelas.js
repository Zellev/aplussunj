module.exports = (sequelize, DataTypes) => {
    const Rel_Dosen_Kelas = sequelize.define('Rel_dosen_kelas', {
        id: {
            type: DataTypes.INTEGER(20).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        kode_dosen: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        kode_seksi: { 
            type: DataTypes.INTEGER(20).UNSIGNED,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    return Rel_Dosen_Kelas;
}

