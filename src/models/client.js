module.exports = (sequelize, DataTypes) => {
    const Client = sequelize.define('Client', {
        id_client: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true, 
            autoIncrement: true,
        },
        client_name: { 
            type: DataTypes.STRING(25), 
            unique: true,
            allowNull: false
        },
        client_url: { 
            type: DataTypes.STRING(40), 
            unique: true,
            allowNull: false
        },
        api_key:{ 
            type: DataTypes.STRING(65),
            allowNull: false
        },
        jenis_client: { 
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: false,
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
        paranoid: true,
        deletedAt: 'deleted_at',
        indexes:[
            {
                name: 'archived_by_createdAt',
                unique: false,
                fields:['created_at', 'updated_at']
            }
        ]
    });

    Client.associate = db => {
        Client.belongsTo(db.Ref_client, {
            foreignKey: 'jenis_client',
            as: 'Client'
        })        
    }

    return Client;
}

