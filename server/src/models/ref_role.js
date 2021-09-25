module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Ref_role', {
        kode_role: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        role: { 
            type: DataTypes.STRING(50), 
            unique: true,
            allowNull: false
        }      
    }, {
        freezeTableName: true,
        timestamps: false        
    });

    Role.associate = db => {
        Role.hasOne(db.User, {
            foreignKey: 'kode_role',
            onDelete: 'RESTRICT'
        });
    }

    return Role;
}

