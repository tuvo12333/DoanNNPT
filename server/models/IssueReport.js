const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Room = require('./Room');
const User = require('./User');

const IssueReport = sequelize.define('IssueReport', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'resolved', 'closed'),
    defaultValue: 'pending'
  }
});

IssueReport.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
IssueReport.belongsTo(User, { as: 'tenant', foreignKey: 'tenantId' });
IssueReport.belongsTo(User, { as: 'landlord', foreignKey: 'landlordId' });

module.exports = IssueReport;
