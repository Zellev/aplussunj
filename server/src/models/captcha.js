module.exports = (sequelize, DataTypes) => {
    const Captcha = sequelize.define('Captcha', {
        kode_captcha: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        pertanyaan: { 
            type: DataTypes.STRING(100),
            unique: true,
            allowNull: false
        },
        jawaban: {
            type: DataTypes.STRING(100),
            unique: true,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    return Captcha;
}

