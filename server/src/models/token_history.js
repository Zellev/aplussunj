module.exports = (sequelize, DataTypes) => {
    const Token_history = sequelize.define('Token_history', {
        id_user: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true
        },
        refresh_token: {
            type: DataTypes.STRING(255),
            primaryKey: true
        },
        isValid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        created_at: { 
            type: DataTypes.DATEONLY,
            allowNull: false
        }
    }, {
        timestamps: false,
        // indexes:[
        //     {
        //         name: 'user_token',                
        //         fields: ['id_user', 'refresh_token'],
        //         primaryKey: true
        //     }
        // ]
    });

    Token_history.associate = db => {        
        Token_history.belongsTo(db.User, {
            foreignKey: 'id_user',
            as: 'User'
        })
    }

    return Token_history;
}

