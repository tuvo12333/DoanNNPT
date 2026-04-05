const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Role = require('./Role');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roleId: {
    type: DataTypes.INTEGER,
    references: {
      model: Role,
      key: 'id'
    }
  }
});

User.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });
Role.hasMany(User, { as: 'users', foreignKey: 'roleId' });

module.exports = User;
