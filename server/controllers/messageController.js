const Message = require('../models/Message');
const BookingInvitation = require('../models/BookingInvitation');
const Contract = require('../models/Contract');
const Room = require('../models/Room');
const User = require('../models/User');
const { Op } = require('sequelize');



const getTenantCurrentStay = async tenantId => {
  const preferredContracts = await Contract.findAll({
    where: {
      tenantId,
      status: ['active', 'draft']
    },
    include: [
      { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
      { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  return preferredContracts.find(item => item.status === 'active') || preferredContracts[0] || null;
};



// Tenant gửi tin nhắn đến landlord của phòng
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, content } = req.body;
    const tenantId = req.user.id;

    const room = await Room.findByPk(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng' });
    if (!room.landlordId) return res.status(400).json({ success: false, message: 'Phòng chưa có chủ trọ' });

    const message = await Message.create({
      roomId,
      tenantId,
      landlordId: room.landlordId,
      content,
      senderRole: 'Tenant'
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Landlord trả lời tin nhắn
exports.replyMessage = async (req, res) => {
  try {
    const { roomId, tenantId, content } = req.body;
    const landlordId = req.user.id;

    const message = await Message.create({
      roomId,
      tenantId,
      landlordId,
      content,
      senderRole: 'Landlord'
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy cuộc hội thoại về 1 phòng giữa tenant và landlord
exports.getConversation = async (req, res) => {
  try {
    const { roomId, tenantId } = req.params;
    const messages = await Message.findAll({
      where: { roomId, tenantId },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'tenant', attributes: ['id', 'username'] },
        { model: User, as: 'landlord', attributes: ['id', 'username'] }
      ]
    });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Landlord lấy danh sách các tenant đã nhắn tin (gom nhóm theo tenant+room)
exports.getLandlordInbox = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const messages = await Message.findAll({
      where: { landlordId },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'tenant', attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Gom nhóm theo tenantId + roomId (lấy tin nhắn mới nhất mỗi cặp)
    const seen = new Set();
    const grouped = [];
    for (const msg of messages) {
      const key = `${msg.tenantId}-${msg.roomId}`;
      if (!seen.has(key)) {
        seen.add(key);
        grouped.push(msg);
      }
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tenant lấy danh sách phòng mình đã nhắn tin
exports.getTenantConversations = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const messages = await Message.findAll({
      where: { tenantId },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const seen = new Set();
    const grouped = [];
    for (const msg of messages) {
      const key = `${msg.tenantId}-${msg.roomId}`;
      if (!seen.has(key)) {
        seen.add(key);
        grouped.push(msg);
      }
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTenantNotifications = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const currentStay = await getTenantCurrentStay(tenantId);

    const where = {
      tenantId,
      senderRole: { [Op.in]: ['Landlord', 'System'] }
    };

    if (currentStay) {
      where.roomId = currentStay.roomId;
      where.landlordId = currentStay.landlordId;
    }

    const notifications = await Message.findAll({
      where,
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// Landlord gửi lời mời xem phòng
exports.sendInvitation = async (req, res) => {
  try {
    const { roomId, tenantId, viewingDate, viewingTime, note } = req.body;
    const landlordId = req.user.id;

    const invitation = await BookingInvitation.create({
      roomId,
      tenantId,
      landlordId,
      viewingDate,
      viewingTime,
      note: note || ''
    });

    const full = await BookingInvitation.findByPk(invitation.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'tenant', attributes: ['id', 'username'] },
        { model: User, as: 'landlord', attributes: ['id', 'username'] }
      ]
    });

    // Tạo tin nhắn hệ thống vào khung chat
    await Message.create({
      roomId,
      tenantId,
      landlordId,
      senderRole: 'System',
      content: `🔔 Chủ trọ đã gửi lời mời xem phòng: ngày ${viewingDate} lúc ${viewingTime}.`
    });

    res.status(201).json({ success: true, data: full });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tenant lấy danh sách lời mời nhận được
exports.getTenantInvitations = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const invitations = await BookingInvitation.findAll({
      where: { tenantId },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'landlord', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: invitations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Landlord lấy danh sách lời mời đã gửi
exports.getLandlordInvitations = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const invitations = await BookingInvitation.findAll({
      where: { landlordId },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'tenant', attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: invitations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tenant xác nhận hoặc từ chối lời mời
exports.respondInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' | 'rejected'
    const tenantId = req.user.id;

    const inv = await BookingInvitation.findOne({ where: { id, tenantId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });

    await inv.update({ status });

    // Tạo tin nhắn hệ thống thông báo trạng thái mới
    const statusText = status === 'confirmed' ? '✅ Khách đã xác nhận tham dự xem phòng.' : '❌ Khách đã từ chối lời mời xem phòng.';
    await Message.create({
      roomId: inv.roomId,
      tenantId: inv.tenantId,
      landlordId: inv.landlordId,
      senderRole: 'System',
      content: statusText
    });

    res.json({ success: true, data: inv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
