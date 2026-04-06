const Contract = require('../models/Contract');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const User = require('../models/User');
const Role = require('../models/Role');

const contractIncludes = [
  { model: Room, as: 'room' },
  { model: User, as: 'tenant', attributes: ['id', 'username', 'email'] },
  { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
];

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const generateCode = prefix => `${prefix}-${Date.now()}`;

const getTenantById = async tenantId => {
  return User.findOne({
    where: { id: tenantId },
    include: [{ model: Role, as: 'role' }]
  });
};

const buildContractPayload = (body, landlordId) => ({
  contractCode: (body.contractCode || '').trim() || generateCode('HD'),
  roomId: toNumber(body.roomId, null),
  tenantId: toNumber(body.tenantId, null),
  landlordId,
  startDate: body.startDate,
  endDate: body.endDate || null,
  monthlyRent: toNumber(body.monthlyRent),
  depositAmount: toNumber(body.depositAmount),
  electricityPrice: toNumber(body.electricityPrice),
  waterPrice: toNumber(body.waterPrice),
  serviceFee: toNumber(body.serviceFee),
  paymentDueDay: toNumber(body.paymentDueDay, 5),
  status: body.status || 'draft',
  signedAt: body.signedAt || null,
  note: (body.note || '').trim() || null
});

exports.getContractLookups = async (req, res) => {
  try {
    const [rooms, tenants] = await Promise.all([
      Room.findAll({
        where: { landlordId: req.user.id },
        attributes: ['id', 'title', 'address', 'price'],
        order: [['createdAt', 'DESC']]
      }),
      User.findAll({
        attributes: ['id', 'username', 'email'],
        include: [{
          model: Role,
          as: 'role',
          where: { name: 'Tenant' },
          attributes: [],
          required: true
        }],
        order: [['username', 'ASC']]
      })
    ]);

    res.status(200).json({ success: true, data: { rooms, tenants } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể tải dữ liệu hợp đồng', error: error.message });
  }
};

exports.getContracts = async (req, res) => {
  try {
    const contracts = await Contract.findAll({
      where: { landlordId: req.user.id },
      include: contractIncludes,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, count: contracts.length, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể tải danh sách hợp đồng', error: error.message });
  }
};

exports.getTenantCurrentContract = async (req, res) => {
  try {
    const preferredContracts = await Contract.findAll({
      where: {
        tenantId: req.user.id,
        status: ['active', 'draft']
      },
      include: contractIncludes,
      order: [['createdAt', 'DESC']]
    });

    let currentContract = preferredContracts.find(item => item.status === 'active') || preferredContracts[0] || null;

    if (!currentContract) {
      currentContract = await Contract.findOne({
        where: { tenantId: req.user.id },
        include: contractIncludes,
        order: [['createdAt', 'DESC']]
      });
    }

    res.status(200).json({
      success: true,
      data: currentContract,
      hasCurrentStay: Boolean(currentContract && ['active', 'draft'].includes(currentContract.status))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể tải thông tin phòng đang ở', error: error.message });
  }
};

exports.createContract = async (req, res) => {
  try {
    const payload = buildContractPayload(req.body, req.user.id);

    if (!payload.roomId || !payload.tenantId || !payload.startDate || payload.monthlyRent <= 0) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc để tạo hợp đồng' });
    }

    const [room, tenant] = await Promise.all([
      Room.findOne({ where: { id: payload.roomId, landlordId: req.user.id } }),
      getTenantById(payload.tenantId)
    ]);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn' });
    }

    if (!tenant || !tenant.role || tenant.role.name !== 'Tenant') {
      return res.status(400).json({ success: false, message: 'Người thuê không hợp lệ' });
    }

    const contract = await Contract.create(payload);
    const createdContract = await Contract.findByPk(contract.id, { include: contractIncludes });

    res.status(201).json({ success: true, data: createdContract });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Không thể tạo hợp đồng', error: error.message });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ where: { id: req.params.id, landlordId: req.user.id } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    const payload = buildContractPayload(req.body, req.user.id);

    if (!payload.roomId || !payload.tenantId || !payload.startDate || payload.monthlyRent <= 0) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc để cập nhật hợp đồng' });
    }

    const [room, tenant] = await Promise.all([
      Room.findOne({ where: { id: payload.roomId, landlordId: req.user.id } }),
      getTenantById(payload.tenantId)
    ]);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại hoặc không thuộc quyền quản lý của bạn' });
    }

    if (!tenant || !tenant.role || tenant.role.name !== 'Tenant') {
      return res.status(400).json({ success: false, message: 'Người thuê không hợp lệ' });
    }

    await contract.update(payload);
    const updatedContract = await Contract.findByPk(contract.id, { include: contractIncludes });

    res.status(200).json({ success: true, data: updatedContract });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Không thể cập nhật hợp đồng', error: error.message });
  }
};

exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ where: { id: req.params.id, landlordId: req.user.id } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    await Payment.destroy({ where: { contractId: contract.id, landlordId: req.user.id } });
    await contract.destroy();

    res.status(200).json({ success: true, message: 'Đã xóa hợp đồng và các khoản thanh toán liên quan' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể xóa hợp đồng', error: error.message });
  }
};