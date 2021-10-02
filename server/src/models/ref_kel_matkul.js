module.exports = (sequelize, DataTypes) => {
    const Kel_matkul = sequelize.define('Ref_kel_matkul', {
        kode_kel_mk: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true
        },
        kelompok_matakuliah: { 
            type: DataTypes.STRING(50),
            allowNull: false,
            unique:true
        },
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true
        
    });

    Kel_matkul.associate = db => {
        Kel_matkul.hasMany(db.Matakuliah, {
            foreignKey: 'kode_kel_mk',
            onDelete: 'CASCADE'
        })
    };

    return Kel_matkul;
}

