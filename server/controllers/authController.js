const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

exports.register = async (req, res) => {
  try {
    const { username, email, password, roleName } = req.body;

    // Check if user exists
    let user = await User.findOne({ where: { email } });
    if (user) return res.status(400).json({ message: 'Tài khoản hoặc email đã tồn tại' });

    // Find role
    const role = await Role.findOne({ where: { name: roleName || 'Tenant' } });
    if (!role) return res.status(400).json({ message: 'Vai trò không hợp lệ' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId: role.id
    });

    res.status(201).json({ message: 'Đăng ký tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Role, as: 'role' }]
    });
    if (!user) return res.status(400).json({ message: 'Sai mật khẩu hoặc tài khoản không đúng' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Sai mật khẩu hoặc tài khoản không đúng' });

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
