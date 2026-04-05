const sequelize = require('./config/db');
const Role = require('./models/Role');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await sequelize.sync({ force: true });

    const adminRole = await Role.create({ name: 'Admin' });
    await Role.create({ name: 'Landlord' });
    await Role.create({ name: 'Tenant' });

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      roleId: adminRole.id
    });

    console.log('Database seeded!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
