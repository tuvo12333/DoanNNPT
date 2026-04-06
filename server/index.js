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

const categoryRoutes = require('./routes/categoryRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const contractRoutes = require('./routes/contractRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const issueRoutes = require('./routes/issueRoutes');

// Preload models to register associations
require('./models/Message');
require('./models/BookingInvitation');
require('./models/Contract');
require('./models/Payment');
require('./models/IssueReport');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/issues', issueRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: false }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
