module.exports = (sequelize, DataTypes) => {
    const Rel_Kelas_PaketSoal = sequelize.define('Rel_kelas_paketsoal', {
        id: {
            type: DataTypes.INTEGER(20).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        kode_seksi: { 
            type: DataTypes.INTEGER(20).UNSIGNED,
            allowNull: false
        },
        kode_paket: { 
            type: DataTypes.INTEGER(20).UNSIGNED,
            allowNull: false
        },
        jenis_ujian: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    Rel_Kelas_PaketSoal.associate = db => {
        Rel_Kelas_PaketSoal.belongsTo(db.Ref_jenis_ujian, {
            foreignKey: 'jenis_ujian'
        })
    };

    return Rel_Kelas_PaketSoal;
}

