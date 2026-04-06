const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Room = require('./Room');
const User = require('./User');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  contractCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
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
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  monthlyRent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  electricityPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  waterPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  serviceFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  paymentDueDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'expired', 'terminated'),
    defaultValue: 'draft'
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

Contract.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
Room.hasMany(Contract, { as: 'contracts', foreignKey: 'roomId' });

Contract.belongsTo(User, { as: 'tenant', foreignKey: 'tenantId' });
User.hasMany(Contract, { as: 'tenantContracts', foreignKey: 'tenantId' });

Contract.belongsTo(User, { as: 'landlord', foreignKey: 'landlordId' });
User.hasMany(Contract, { as: 'landlordContracts', foreignKey: 'landlordId' });

module.exports = Contract;