module.exports = (sequelize, DataTypes) => {
    const Ref_illustrasi = sequelize.define('Ref_illustrasi', {
        id_illustrasi: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        nama_illustrasi: { 
            type: DataTypes.STRING(50), 
            unique: true,
            allowNull: false
        }      
    }, {
        freezeTableName: true,
        timestamps: false 
    });

    return Ref_illustrasi;
}

