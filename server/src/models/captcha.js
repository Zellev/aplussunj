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
            allowNull: false
        },
        jawaban: {
            type: DataTypes.STRING(100),            
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
    });

    return Captcha;
}

