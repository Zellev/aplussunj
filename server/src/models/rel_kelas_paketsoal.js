module.exports = (sequelize, DataTypes) => {
    const Rel_Kelas_PaketSoal = sequelize.define('Rel_kelas_paketsoal', {
        id: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        kode_seksi: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        kode_paket: { 
            type: DataTypes.STRING(11),
            allowNull: false
        },
        jenis_ujian: {
            type: DataTypes.INTEGER(11).UNSIGNED
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    Rel_Kelas_PaketSoal.associate = db => {
        Rel_Kelas_PaketSoal.belongsTo(db.Kelas, {
            foreignKey: 'kode_seksi',
            onDelete: 'NO ACTION',
            as: 'Kosek'
        }),
        Rel_Kelas_PaketSoal.belongsTo(db.Paket_soal, {
            foreignKey: 'kode_paket',
            onDelete: 'NO ACTION',
            as: 'PaketSoal'
        })
        Rel_Kelas_PaketSoal.belongsTo(db.Ref_jenis_ujian, {
            foreignKey: 'jenis_ujian',
            as: 'JenisUjian'
        })
    };

    return Rel_Kelas_PaketSoal;
}

