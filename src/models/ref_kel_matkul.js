module.exports = (sequelize, DataTypes) => {
    const Kel_matkul = sequelize.define('Ref_kel_matkul', {
        id_kel_mk: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true
        },
        kelompok_matakuliah: { 
            type: DataTypes.STRING(25),
            allowNull: false,
            unique:true
        },
    }, {
        freezeTableName: true,
        timestamps: false        
    });

    Kel_matkul.associate = db => {
        Kel_matkul.hasMany(db.Matakuliah, {
            foreignKey: 'id_kel_mk',
            onDelete: 'CASCADE',
            as: 'Matkul'
        })
    };

    return Kel_matkul;
}

