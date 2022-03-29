module.exports = (sequelize, DataTypes) => {
    const Lupa_pw = sequelize.define("Lupa_pw", {
        id_reset_pw: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        username: {
            type: DataTypes.STRING(25), 
            allowNull: false
        },
        email: { 
            type: DataTypes.STRING(25), 
            allowNull: false
        },
        status: { 
            type: DataTypes.ENUM('sudah', 'belum')
        }
    }, {
        freezeTableName: true,
        timestamps: false,
    });

    return Lupa_pw;
}