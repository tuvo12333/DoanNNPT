const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Category = require('./Category');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  area: {
    type: DataTypes.FLOAT, // Diện tích
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: Category,
      key: 'id'
    }
  },
  landlordId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

Room.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });
Category.hasMany(Room, { as: 'rooms', foreignKey: 'categoryId' });

module.exports = Room;
