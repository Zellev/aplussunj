module.exports = (sequelize, DataTypes) => {
    const Jenis_ujian = sequelize.define('Ref_jenis_ujian', {
        kode_jenis_ujian: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        jenis_ujian: { 
            type: DataTypes.STRING(50),
            allowNull: true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true
        
    });

    Jenis_ujian.associate = db => {
        Jenis_ujian.hasMany(db.Paket_soal, {
            foreignKey: 'kode_jenis_ujian',
            onDelete: 'CASCADE',
            as: 'PaketSoal'
        }),
        Jenis_ujian.hasMany(db.Rel_kelas_paketsoal, {
            foreignKey: 'jenis_ujian',
            onDelete: 'CASCADE',
            as: 'UjianperKelas'
        })
    };

    return Jenis_ujian;
}

