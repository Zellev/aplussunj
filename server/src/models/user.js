module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        username: { 
            type: DataTypes.STRING(50), 
            unique: true,
            allowNull: false
        },
        email: { 
            type: DataTypes.STRING(100), 
            unique: true,
            allowNull: false
        },
        password:{ 
            type: DataTypes.STRING(100),
            allowNull: false
        },
        status_civitas: { 
            type: DataTypes.ENUM('aktif','tidak_aktif'), 
            defaultValue: 'aktif',
            allowNull: false
        },
        kode_role: { 
            type: DataTypes.INTEGER(11).UNSIGNED
        },
        foto_profil: { 
            type: DataTypes.BLOB 
        },
        keterangan: { 
            type: DataTypes.TEXT 
        },
        created_at: { 
            type: DataTypes.DATE,
            defaultValue: sequelize.fn('NOW'),            
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
        User.belongsTo(db.Ref_role, {
            foreignKey: 'kode_role'
        })
    }

    return User;
}

