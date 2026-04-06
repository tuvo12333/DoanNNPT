const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Room = require('./Room');

const RoomImage = sequelize.define('RoomImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roomId: {
    type: DataTypes.INTEGER,
    references: {
      model: Room,
      key: 'id'
    }
  }
});

RoomImage.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
Room.hasMany(RoomImage, { as: 'images', foreignKey: 'roomId' });

module.exports = RoomImage;
