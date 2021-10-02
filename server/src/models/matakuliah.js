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
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        semester: {
            type: DataTypes.INTEGER(11).UNSIGNED
        },
        sks: {
            type: DataTypes.INTEGER(11),
            allowNull: false
        },
        deskripsi: {
            type: DataTypes.TEXT
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
    });

    Matkul.associate = db => {        
        Matkul.belongsTo(db.Ref_kel_matkul, {
            foreignKey: 'kode_kel_mk'
        }),
        Matkul.belongsTo(db.Ref_peminatan, {
            foreignKey: 'kode_peminatan',            
            allowNull: true
        }),
        Matkul.belongsTo(db.Ref_semester, {
            foreignKey: 'semester'
        })
    };

    return Matkul;
}