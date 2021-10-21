module.exports = (sequelize, DataTypes) => {
    const Paket_soal = sequelize.define('Paket_soal', {
        kode_paket: { 
            type: DataTypes.INTEGER(20).UNSIGNED,
            allowNull: false,
            primaryKey: true
        },
        kode_jenis_ujian: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: true
        },
        judul_ujian: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        tanggal_mulai: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        waktu_mulai: {
            type: DataTypes.TIME,
            allowNull: false
        },
        durasi_ujian: {
            type: DataTypes.TIME,
            allowNull: false
        },
        bobot_total: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('terbit','draft'),            
            allowNull: false
        },
        deskripsi: {
            type: DataTypes.TEXT
        },
        created_at: { 
            type: DataTypes.DATE,
            allowNull: false           
        },
        updated_at: { 
            type: DataTypes.DATE,
            defaultValue: null
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
        indexes:[
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }
        ]
    });

    Paket_soal.associate = db => {        
        Paket_soal.belongsTo(db.Ref_jenis_ujian, {
            foreignKey: 'kode_jenis_ujian',
            as: 'RefJenis'
        }),
        Paket_soal.belongsToMany(db.Kelas, {
            through: 'Rel_kelas_paketsoal',
            foreignKey: 'kode_paket',
            as: 'Kelases'
        }),
        Paket_soal.hasMany(db.Rel_kelas_paketsoal, {
            foreignKey: 'kode_paket',
            as: 'PaketOccurance'
        })
    };

    return Paket_soal;
}