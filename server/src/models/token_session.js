module.exports = (sequelize, DataTypes) => {
    const Token_session = sequelize.define('Token_session', {
        id_user: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true
        },
        refresh_token: {
            type: DataTypes.STRING(255),
            primaryKey: true
        }
    }, {       
        timestamps: false,
        // indexes:[
        //     {
        //         name: 'user_token',                
        //         fields:['id_user', 'refresh_token'],
        //         primaryKey: true
        //     }
        // ]
    });

    Token_session.associate = db => {        
        Token_session.belongsTo(db.User, {
            foreignKey: 'id_user',
            as: 'User'
        })
    }

    return Token_session;
}

