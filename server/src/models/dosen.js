module.exports = (sequelize, DataTypes) => { 
    const Dosen = sequelize.define('Dosen', {
        kode_dosen: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            primaryKey: true, 
            autoIncrement: true,
        },
        id_user: { 
            type: DataTypes.INTEGER(11).UNSIGNED,            
            allowNull: false
        },
        NIDN: { 
            type: DataTypes.STRING(30), 
            unique: true,
            allowNull: false
        },
        NIDK: { 
            type: DataTypes.STRING(30), 
            unique: true,
            allowNull: false
        },
        nama_lengkap:{ 
            type: DataTypes.STRING(100),
            allowNull: false
        },
        alamat: { 
            type: DataTypes.TEXT
        },
        nomor_telp: { 
            type: DataTypes.STRING(50),
            allowNull: false
        },
        created_at: { 
            type: DataTypes.DATE,
            defaultValue: sequelize.fn('NOW'),
            allowNull: false
        },
        updated_at: { 
            type: DataTypes.DATE,
            defaultValue: null
        }
    }, {
        freezeTableName: true,
        timestamps: false,       
        indexes:[
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }
        ],
        getterMethods: {
            
        } 
    });

    Dosen.associate = db => {
        Dosen.belongsTo(db.User, { 
            foreignKey: 'id_user'            
        });
    }

    return Dosen;
}

