module.exports = (sequelize, DataTypes) => {
    const Kelas = sequelize.define('Kelas', {
        id_kelas: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        illustrasi_kelas: {
            type: DataTypes.STRING(50),
            defaultValue: null
        },
        kode_seksi: { 
            type: DataTypes.STRING(10),
            unique: true,
            allowNull: false
        },
        id_matkul: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        id_semester: {
            type: DataTypes.INTEGER(11).UNSIGNED
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
            type: DataTypes.TEXT,
            defaultValue: null
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
        deletedAt: 'deleted_at'
    });

    Kelas.associate = db => {        
        Kelas.belongsTo(db.Matakuliah, {
            foreignKey: 'id_matkul',
            as: 'Matkul'
        }),        
        Kelas.belongsTo(db.Ref_semester, {
            foreignKey: 'id_semester',
            as: 'RefSem'
        }),
        Kelas.belongsToMany(db.Ujian, {
            through: 'Rel_kelas_ujian',
            foreignKey: 'id_kelas',
            onDelete: 'CASCADE',
            as: 'Ujians'
        }),
        Kelas.hasMany(db.Rel_kelas_ujian, {
            foreignKey: 'id_kelas',
            onDelete: 'CASCADE',
            as: 'KelasOccurance'
        }),
        Kelas.belongsToMany(db.Dosen, {
            through: 'Rel_dosen_kelas',
            foreignKey: 'id_kelas',
            onDelete: 'CASCADE',
            as: 'Dosens'
        }),
        Kelas.belongsToMany(db.Mahasiswa, {
            through: 'Rel_mahasiswa_kelas',
            foreignKey: 'id_kelas',
            onDelete: 'CASCADE',
            as: 'Mahasiswas'
        })
    };

    return Kelas;
}