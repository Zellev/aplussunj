module.exports = (sequelize, DataTypes) => {
    const Rel_Mahasiswa_PaketSoal = sequelize.define('Rel_mahasiswa_paketsoal', {
        id: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        id_mhs: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        id_paket: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        nilai_total:{
            type: DataTypes.INTEGER(3),
            defaultValue: null
        },
        waktu_mulai: {
            type: DataTypes.DATE,
            defaultValue: null
        },
        waktu_selesai: {
            type: DataTypes.DATE,
            defaultValue: null
        },
        lama_pengerjaan: {
            type: DataTypes.STRING(30),
            defaultValue: null
        },
    }, {
        freezeTableName: true,
        timestamps: false
    });

    Rel_Mahasiswa_PaketSoal.associate = db => {
        Rel_Mahasiswa_PaketSoal.belongsTo(db.Mahasiswa, {
            foreignKey: 'id_mhs',
            onDelete: 'CASCADE',
            as: 'Mahasiswa'
        }),
        Rel_Mahasiswa_PaketSoal.belongsTo(db.Paket_soal, {
            foreignKey: 'id_paket',
            onDelete: 'CASCADE',
            as: 'PaketSoal'
        })
    };

    return Rel_Mahasiswa_PaketSoal;
}

