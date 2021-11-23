module.exports = (sequelize, DataTypes) => {
    const Matkul = sequelize.define('Matakuliah', {
        kode_matkul: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true
        },
        kode_kel_mk: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        kode_peminatan: {
            type: DataTypes.INTEGER(11).UNSIGNED
        },
        nama_matkul: {
            type: DataTypes.STRING(25),
            allowNull: false,
            unique: true
        },
        semester: {
            type: DataTypes.INTEGER(11).UNSIGNED
        },
        sks: {
            type: DataTypes.INTEGER(5),
            allowNull: false
        },
        deskripsi: {
            type: DataTypes.TEXT
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    Matkul.associate = db => {        
        Matkul.belongsTo(db.Ref_kel_matkul, {
            foreignKey: 'kode_kel_mk',
            as: 'KelMk'
        }),
        Matkul.belongsTo(db.Ref_peminatan, {
            foreignKey: 'kode_peminatan',            
            allowNull: true,
            as: 'RefPemin'
        }),
        Matkul.belongsTo(db.Ref_semester, {
            foreignKey: 'semester',
            as: 'RefSem'
        }),
        Matkul.hasMany(db.Kelas, {
            foreignKey: 'kode_matkul',
            as: 'Kelas'
        })
    };

    return Matkul;
}