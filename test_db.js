const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    port: parseInt(process.env.DB_PORT) || 3306
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log('Connected to MySQL server successfully.');

    const dbName = process.env.DB_NAME || 'phongtro';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database \`${dbName}\` checked/created successfully.`);

    await connection.end();
  } catch (err) {
    console.error('Error connecting to MySQL:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Is MySQL running on the specified port?');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Check your username and password.');
    }
  }
}

testConnection();
