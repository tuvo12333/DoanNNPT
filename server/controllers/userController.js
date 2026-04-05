const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, email, password, roleName } = req.body;
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) return res.status(400).json({ message: 'Invalid role' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId: role.id
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, roleName } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (roleName) {
      const role = await Role.findOne({ where: { name: roleName } });
      if (role) user.roleId = role.id;
    }

    user.username = username || user.username;
    user.email = email || user.email;
    
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
