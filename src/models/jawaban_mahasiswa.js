module.exports = (sequelize, DataTypes) => { 
    const Jawaban_mahasiswa  = sequelize.define('Jawaban_mahasiswa', {
        id_jawaban: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        id_relasi_soalpksoal: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        id_mhs: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        jawaban: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        gambar_jawaban: {
            type: DataTypes.STRING(255),
            defaultValue: null,
            get: function() {
                return JSON.parse(this.getDataValue('gambar_jawaban'));
            },
            set: function(val) {
                return this.setDataValue('gambar_jawaban', JSON.stringify(val));
            }            
        },
        audio_jawaban: {
            type: DataTypes.STRING(50),
            defaultValue: null,
        },
        video_jawaban: {
            type: DataTypes.STRING(50),
            defaultValue: null,
        },
        nilai_jawaban: {
            type: DataTypes.INTEGER(3),
            defaultValue: null
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
        deletedAt: 'deleted_at',
        indexes:[
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }
        ]
    });

    Jawaban_mahasiswa.associate = db => {
        Jawaban_mahasiswa.belongsTo(db.Rel_paketsoal_soal, {
            foreignKey: 'id_relasi_soalpksoal',
            as: 'RelPaketSoal'
        }),
        Jawaban_mahasiswa.belongsTo(db.Mahasiswa, {
            foreignKey: 'id_mhs',
            as: 'Mahasiswa'
        })
    };

    return Jawaban_mahasiswa;
}