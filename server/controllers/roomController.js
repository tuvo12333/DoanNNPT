const Room = require('../models/Room');
const RoomImage = require('../models/RoomImage');
const Category = require('../models/Category');
const User = require('../models/User');
const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const BookingInvitation = require('../models/BookingInvitation');
const IssueReport = require('../models/IssueReport');
const sequelize = require('../config/db');
const fs = require('fs');
const path = require('path');

const removeUploadFile = fileUrl => {
  if (!fileUrl) return;

  const normalized = String(fileUrl).replace(/^\/+/, '');
  const uploadsSegment = normalized.startsWith('uploads/') ? normalized.slice('uploads/'.length) : null;
  if (!uploadsSegment) return;

  const filePath = path.join(__dirname, '../uploads', uploadsSegment);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Lấy danh sách tất cả các phòng
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.findAll({
      include: [
        { model: Category, as: 'category' },
        { model: RoomImage, as: 'images' }
      ]
    });
    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Lấy chi tiết 1 phòng
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category' },
        { model: RoomImage, as: 'images' }
      ]
    });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// Tạo phòng mới (kèm upload ảnh)
exports.createRoom = async (req, res) => {
  try {
    const { title, description, price, area, address, categoryId } = req.body;

    // Lấy landlordId từ JWT (nếu có auth)
    const landlordId = req.user ? req.user.id : null;

    // 1. Tạo Room trước
    const room = await Room.create({
      title,
      description,
      price,
      area,
      address,
      categoryId,
      landlordId
    });

    // 2. Lưu thông tin hình ảnh nếu có file upload
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(file => {
        // Tạo URL (Bạn có thể dùng path tương đối như sau)
        const imageUrl = `/uploads/${file.filename}`;
        return RoomImage.create({
          url: imageUrl,
          roomId: room.id
        });
      });
      await Promise.all(imagePromises);
    }

    // Load lại room kèm theo liên kết ảnh và danh mục
    const createdRoom = await Room.findByPk(room.id, {
      include: [
        { model: Category, as: 'category' },
        { model: RoomImage, as: 'images' }
      ]
    });

    res.status(201).json({ success: true, data: createdRoom });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Bad Request', error: error.message });
  }
};

// Cập nhật thông tin phòng (Chỉ thông tin cơ bản)
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    await room.update(req.body);

    // Nếu có upload ảnh bổ sung
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(file => {
        const imageUrl = `/uploads/${file.filename}`;
        return RoomImage.create({
          url: imageUrl,
          roomId: room.id
        });
      });
      await Promise.all(imagePromises);
    }

    const updatedRoom = await Room.findByPk(room.id, {
      include: [
        { model: Category, as: 'category' },
        { model: RoomImage, as: 'images' }
      ]
    });

    res.status(200).json({ success: true, data: updatedRoom });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Bad Request', error: error.message });
  }
};

// Xóa phòng
exports.deleteRoom = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const room = await Room.findByPk(req.params.id, { transaction });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!req.user || !['Landlord', 'Admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa phòng này' });
    }

    if (req.user.role === 'Landlord' && room.landlordId !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Bạn chỉ có thể xóa phòng thuộc quyền quản lý của mình' });
    }

    const [roomImages, payments] = await Promise.all([
      RoomImage.findAll({ where: { roomId: room.id }, transaction }),
      Payment.findAll({ where: { roomId: room.id }, attributes: ['bankQrImage'], transaction })
    ]);

    const filesToDelete = [
      ...roomImages.map(image => image.url),
      ...payments.map(payment => payment.bankQrImage).filter(Boolean)
    ];

    await Payment.destroy({ where: { roomId: room.id }, transaction });
    await Contract.destroy({ where: { roomId: room.id }, transaction });
    await Message.destroy({ where: { roomId: room.id }, transaction });
    await IssueReport.destroy({ where: { roomId: room.id }, transaction });
    await BookingInvitation.destroy({ where: { roomId: room.id }, transaction });
    await RoomImage.destroy({ where: { roomId: room.id }, transaction });
    await room.destroy({ transaction });

    await transaction.commit();

    filesToDelete.forEach(fileUrl => {
      try {
        removeUploadFile(fileUrl);
      } catch (fileError) {
        console.warn('Failed to remove upload during room deletion:', fileError.message);
      }
    });

    res.status(200).json({ success: true, message: 'Đã xóa phòng cùng hợp đồng, thanh toán, tin nhắn, lời mời và hình ảnh liên quan' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: 'Không thể xóa phòng', error: error.message });
  }
};

// Xóa một ảnh riêng lẻ
exports.deleteRoomImage = async (req, res) => {
  try {
    const image = await RoomImage.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    await image.destroy();
    res.status(200).json({ success: true, message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
