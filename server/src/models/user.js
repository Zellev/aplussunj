module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        username: { 
            type: DataTypes.STRING(25), 
            unique: true,
            allowNull: false
        },
        email: { 
            type: DataTypes.STRING(25), 
            unique: true,
            allowNull: false
        },
        password:{ 
            type: DataTypes.STRING(50),
            allowNull: false
        },
        status_civitas: { 
            type: DataTypes.ENUM('aktif','tidak_aktif'), 
            defaultValue: 'aktif',
            allowNull: false
        },
        kode_role: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
        },
        foto_profil: { 
            type: DataTypes.STRING(100)             
        },
        keterangan: { 
            type: DataTypes.TEXT 
        },
        created_at: { 
            type: DataTypes.DATE,
            allowNull: false           
         },
        updated_at: { 
            type: DataTypes.DATE,
            defaultValue: null
         }
    }, {       
        timestamps: false,
        indexes:[
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }
        ]
    });

    User.associate = db => {
        User.hasOne(db.Dosen, {
            foreignKey: 'id_user',
            as: 'Dosen',
            onDelete: 'CASCADE'
        }),
        User.hasOne(db.Mahasiswa, {
            foreignKey: 'id_user',
            as: 'Mahasiswa',
            onDelete: 'CASCADE'
        }),
        User.hasOne(db.Token_session, {
            foreignKey: 'id_user',
            as: 'Token',
            onDelete: 'CASCADE'
        }),
        User.belongsTo(db.Ref_role, {
            foreignKey: 'kode_role',
            as: 'Role'
        })
    }

    return User;
}

