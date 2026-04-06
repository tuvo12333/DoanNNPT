const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'mssql') {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mssql',
    port: parseInt(process.env.DB_PORT) || 1433,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE
      }
    },
    logging: console.log
  });
} else if (dialect === 'mysql') {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: parseInt(process.env.DB_PORT) || 3306,
    logging: console.log
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../' + (process.env.DB_NAME || 'database.sqlite')),
    logging: console.log
  });
}

module.exports = sequelize;
