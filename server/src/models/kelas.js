module.exports = (sequelize, DataTypes) => {
    const Kelas = sequelize.define('Kelas', {
        kode_seksi: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true
        },
        kode_matkul: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        hari: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        jam: {
            type: DataTypes.STRING(15),
            allowNull: false
        },
        deskripsi: {
            type: DataTypes.TEXT
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    Kelas.associate = db => {        
        Kelas.belongsTo(db.Matakuliah, {
            foreignKey: 'kode_matkul',
            as: 'Matkul'
        }),
        Kelas.belongsToMany(db.Paket_soal, {
            through: 'Rel_kelas_paketsoal',
            foreignKey: 'kode_seksi',
            as: 'PaketSoals'
        }),
        Kelas.hasMany(db.Rel_kelas_paketsoal, {
            foreignKey: 'kode_seksi',
            as: 'KelasOccurance'
        }),
        Kelas.belongsToMany(db.Dosen, {
            through: 'Rel_dosen_kelas',
            foreignKey: 'kode_seksi',
            as: 'Dosens'
        })
    };

    return Kelas;
}