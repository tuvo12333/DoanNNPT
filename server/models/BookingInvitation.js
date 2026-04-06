const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Room = require('./Room');
const User = require('./User');

const BookingInvitation = sequelize.define('BookingInvitation', {
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
  viewingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  viewingTime: {
    type: DataTypes.STRING,
    allowNull: false
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // pending | confirmed | rejected
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'rejected'),
    defaultValue: 'pending'
  }
});

BookingInvitation.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
BookingInvitation.belongsTo(User, { as: 'tenant', foreignKey: 'tenantId' });
BookingInvitation.belongsTo(User, { as: 'landlord', foreignKey: 'landlordId' });

module.exports = BookingInvitation;
