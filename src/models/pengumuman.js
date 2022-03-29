module.exports = (sequelize, DataTypes) => {
    const Pengumuman = sequelize.define('Pengumuman', {
        id_pengumuman: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        pengumuman: { 
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('tampil','tidak_tampil'),            
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    return Pengumuman;
}

