module.exports = (sequelize, DataTypes) => {
    const Captcha = sequelize.define('Captcha', {
        kode_captcha: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        pertanyaan: { 
            type: DataTypes.STRING(25),
            allowNull: false
        },
        jawaban: {
            type: DataTypes.STRING(5),            
            allowNull: false
        }
    }, {
        freezeTableName: true,
        timestamps: false
    });

    return Captcha;
}

