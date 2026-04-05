const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

const path = require('path');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

/*
// Catch-all route for SPA
app.get('(.*)', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});
*/

const PORT = process.env.PORT || 5000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
