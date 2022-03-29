module.exports = (sequelize, DataTypes) => {
    const Notifikasi = sequelize.define('Notifikasi', {
        id_notif: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        id_pengirim: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            defaultValue: null,
        },
        id_penerima: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false
        },
        notifikasi: { 
            type: DataTypes.TEXT,
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
        indexes:[            
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }            
        ]
    });

    Notifikasi.associate = db => {
        Notifikasi.belongsTo(db.User, {
            foreignKey: 'id_pengirim',
            onDelete: 'CASCADE',
            as: 'IdPengirim'
        }),
        Notifikasi.belongsTo(db.User, {
            foreignKey: 'id_penerima',
            onDelete: 'CASCADE',
            as: 'IdPenerima'
        })
    }

    return Notifikasi;
}

