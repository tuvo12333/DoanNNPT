const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Room = require('./Room');
const User = require('./User');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  landlordId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  senderRole: {
    type: DataTypes.ENUM('Tenant', 'Landlord', 'System'),
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

Message.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
Message.belongsTo(User, { as: 'tenant', foreignKey: 'tenantId' });
Message.belongsTo(User, { as: 'landlord', foreignKey: 'landlordId' });

module.exports = Message;
