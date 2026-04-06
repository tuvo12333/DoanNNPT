const IssueReport = require('../models/IssueReport');
const Room = require('../models/Room');
const User = require('../models/User');
const Contract = require('../models/Contract');

const getTenantCurrentStay = async tenantId => {
  const activeContract = await Contract.findOne({
    where: {
      tenantId,
      status: 'active'
    },
    include: [
      { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
      { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  return activeContract;
};

exports.reportIssue = async (req, res) => {
  try {
    const { title, severity, description } = req.body;
    const tenantId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung sự cố' });
    }

    const currentStay = await getTenantCurrentStay(tenantId);
    if (!currentStay) {
      return res.status(400).json({ success: false, message: 'Bạn chưa có phòng đang thuê để gửi báo cáo sự cố' });
    }

    const report = await IssueReport.create({
      roomId: currentStay.roomId,
      tenantId,
      landlordId: currentStay.landlordId,
      title: String(title).trim(),
      severity: severity || 'medium',
      description: String(description).trim(),
      status: 'pending'
    });

    const fullReport = await IssueReport.findByPk(report.id, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
      ]
    });

    res.status(201).json({ success: true, data: fullReport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTenantIssueReports = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const reports = await IssueReport.findAll({
      where: { tenantId },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const landlordId = req.user.id;

    const report = await IssueReport.findOne({ where: { id, landlordId } });
    if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo sự cố' });

    await report.update({ status });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLandlordIssueReports = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const reports = await IssueReport.findAll({
      where: { landlordId },
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'tenant', attributes: ['id', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
