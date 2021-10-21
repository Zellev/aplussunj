module.exports = (sequelize, DataTypes) => {
    const Mahasiswa = sequelize.define('Mahasiswa', {
        kode_mhs: { 
            type: DataTypes.INTEGER(11).UNSIGNED, 
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        id_user: { 
            type: DataTypes.INTEGER(11).UNSIGNED,            
            allowNull: false
        },
        NIM: { 
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
            allowNull: false
        },
        updated_at: { 
            type: DataTypes.DATE,
            defaultValue: null
        }
    }, {
        freezeTableName: true,
        timestamps: false,
        paranoid: true,
        indexes:[            
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }            
        ]
    });

    Mahasiswa.associate = db => {
        Mahasiswa.belongsTo(db.User, { 
            foreignKey: 'id_user',
            as: 'User'
        });
    }

    return Mahasiswa;
}

