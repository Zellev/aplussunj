// const { format } = require('date-fns') 

module.exports = (sequelize, DataTypes) => { 
    const Paket_soal = sequelize.define('Paket_soal', {
        id_paket: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        kode_paket: { 
            type: DataTypes.STRING(5),
            unique: true,
            allowNull: false
        },
        id_ujian: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        aktif: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    Paket_soal.associate = db => {
        Paket_soal.belongsTo(db.Ujian, {
            foreignKey: 'id_ujian',
            as: 'Ujian'
        }),        
        Paket_soal.belongsToMany(db.Soal_essay, {
            through: 'Rel_paketsoal_soal',
            foreignKey: 'id_paket',
            onDelete: 'CASCADE',
            as: 'Soals'
        }),
        Paket_soal.hasMany(db.Rel_paketsoal_soal, {
            foreignKey: 'id_paket',
            onDelete: 'CASCADE',
            as: 'PaketSoal_Soal_auto',
            constraint: false
        }),
        Paket_soal.hasMany(db.Rel_paketsoal_soal, {
            foreignKey: 'id_paket',
            onDelete: 'CASCADE',
            as: 'PaketSoal_Soal_manual',
            constraint: false
        }),
        Paket_soal.belongsToMany(db.Mahasiswa, {
            through: 'Rel_mahasiswa_paketsoal',
            foreignKey: 'id_paket',
            onDelete: 'CASCADE',
            as: 'Mahasiswas'
        }),
        Paket_soal.hasMany(db.Rel_mahasiswa_paketsoal, {
            foreignKey: 'id_paket',
            onDelete: 'CASCADE',
            as: 'PaketSoal_mhs'
        })
    };

    return Paket_soal;
}