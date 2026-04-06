const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Contract = require('./Contract');
const Room = require('./Room');
const User = require('./User');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  contractId: {
    type: DataTypes.INTEGER,
    allowNull: false
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
  billingPeriod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  paymentType: {
    type: DataTypes.ENUM('deposit', 'monthly_rent', 'service', 'other'),
    defaultValue: 'monthly_rent'
  },
  roomUnitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  roomCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  electricityUnitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  electricityPreviousReading: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  electricityCurrentReading: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  electricityUsage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  electricityCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  waterUnitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  waterPreviousReading: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  waterCurrentReading: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  waterUsage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  waterCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  serviceUnitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  serviceCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  additionalCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  paidDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'bank_transfer', 'qr_transfer', 'other'),
    defaultValue: 'cash'
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankAccountHolder: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankAccountNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bankQrImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

Payment.belongsTo(Contract, { as: 'contract', foreignKey: 'contractId' });
Contract.hasMany(Payment, { as: 'payments', foreignKey: 'contractId' });

Payment.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
Room.hasMany(Payment, { as: 'payments', foreignKey: 'roomId' });

Payment.belongsTo(User, { as: 'tenant', foreignKey: 'tenantId' });
User.hasMany(Payment, { as: 'tenantPayments', foreignKey: 'tenantId' });

Payment.belongsTo(User, { as: 'landlord', foreignKey: 'landlordId' });
User.hasMany(Payment, { as: 'landlordPayments', foreignKey: 'landlordId' });

module.exports = Payment;