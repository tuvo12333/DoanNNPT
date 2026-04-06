const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const Payment = require('../models/Payment');
const Contract = require('../models/Contract');
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');

const paymentIncludes = [
  {
    model: Contract,
    as: 'contract',
    attributes: ['id', 'contractCode', 'status', 'monthlyRent', 'depositAmount', 'electricityPrice', 'waterPrice', 'serviceFee', 'paymentDueDay', 'startDate', 'endDate']
  },
  { model: Room, as: 'room', attributes: ['id', 'title', 'address'] },
  { model: User, as: 'tenant', attributes: ['id', 'username', 'email'] },
  { model: User, as: 'landlord', attributes: ['id', 'username', 'email'] }
];

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const generateCode = prefix => `${prefix}-${Date.now()}`;

const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toPositiveMoney = value => Math.max(roundMoney(value), 0);

const toNullableNumber = value => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeBillingPeriod = value => String(value ?? '').trim();

const formatCurrency = value => `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`;

const formatDate = value => {
  if (!value) return 'Chưa xác định';
  return new Date(value).toLocaleDateString('vi-VN');
};

const paymentMethodLabels = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản ngân hàng',
  qr_transfer: 'Quét QR',
  other: 'Khác'
};

const paymentTypeLabels = {
  deposit: 'Tiền cọc',
  monthly_rent: 'Tiền phòng tháng',
  service: 'Phí dịch vụ',
  other: 'Khoản khác'
};

const measurementLabels = {
  electricity: 'số',
  water: 'khối'
};

const transferPaymentMethods = ['bank_transfer', 'qr_transfer'];

const trimOrNull = value => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const isTransferPaymentMethod = paymentMethod => transferPaymentMethods.includes(paymentMethod);

const normalizeUploadPath = file => {
  if (!file) return null;
  return `/uploads/${file.filename}`;
};

const resolveUploadFilePath = relativePath => {
  if (!relativePath || !relativePath.startsWith('/uploads/')) return null;
  return path.join(__dirname, '..', relativePath.replace(/^\//, ''));
};

const deleteUploadedFile = relativePath => {
  const filePath = resolveUploadFilePath(relativePath);
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Failed to delete uploaded payment QR image:', error.message);
  }
};

const deriveStatus = (requestedStatus, paidAmount, totalAmount, dueDate) => {
  if (requestedStatus) return requestedStatus;
  if (paidAmount >= totalAmount && totalAmount > 0) return 'paid';
  if (paidAmount > 0) return 'partial';
  if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
  return 'pending';
};

const buildContractSnapshot = contract => ({
  monthlyRent: toPositiveMoney(contract.monthlyRent),
  depositAmount: toPositiveMoney(contract.depositAmount),
  electricityPrice: toPositiveMoney(contract.electricityPrice),
  waterPrice: toPositiveMoney(contract.waterPrice),
  serviceFee: toPositiveMoney(contract.serviceFee)
});

const buildMeterSnapshot = (previousValue, currentValue, label) => {
  const previousReading = toNullableNumber(previousValue);
  const currentReading = toNullableNumber(currentValue);

  if (previousReading === null && currentReading === null) {
    return {
      previousReading: 0,
      currentReading: 0,
      usage: 0
    };
  }

  if (previousReading === null || currentReading === null) {
    throw new Error(`Vui lòng nhập đầy đủ chỉ số ${label} cũ và mới`);
  }

  if (previousReading < 0 || currentReading < 0) {
    throw new Error(`Chỉ số ${label} không được âm`);
  }

  if (currentReading < previousReading) {
    throw new Error(`Chỉ số ${label} mới phải lớn hơn hoặc bằng chỉ số cũ`);
  }

  return {
    previousReading: roundMoney(previousReading),
    currentReading: roundMoney(currentReading),
    usage: roundMoney(currentReading - previousReading)
  };
};

const formatMeasurement = value => Number(value || 0).toLocaleString('vi-VN');

const buildUtilityDetailLine = (label, previousReading, currentReading, usage, unitPrice, charge, unit) => {
  if (previousReading === null && currentReading === null && Number(charge || 0) <= 0) return null;

  return `${label}: ${formatMeasurement(previousReading)} -> ${formatMeasurement(currentReading)} (${formatMeasurement(usage)} ${unit} x ${formatCurrency(unitPrice)}) = ${formatCurrency(charge)}`;
};

const ensureUniqueBillingPeriod = async (contractId, landlordId, billingPeriod, currentPaymentId = null) => {
  const where = {
    contractId,
    landlordId,
    billingPeriod
  };

  if (currentPaymentId) {
    where.id = { [Op.ne]: currentPaymentId };
  }

  const existing = await Payment.findOne({ where, attributes: ['id'] });
  if (existing) {
    throw new Error('Kỳ thanh toán này đã tồn tại cho hợp đồng đã chọn');
  }
};

const buildPaymentPayload = (body, contract, landlordId, options = {}) => {
  const snapshot = buildContractSnapshot(contract);
  const paymentType = body.paymentType || 'monthly_rent';
  const additionalCharge = toPositiveMoney(toNumber(body.additionalCharge));
  const discountAmount = toPositiveMoney(toNumber(body.discountAmount));
  const paidAmount = toPositiveMoney(toNumber(body.paidAmount));
  const paymentMethod = body.paymentMethod || 'cash';
  const removeBankQrImage = String(body.removeBankQrImage || '').toLowerCase() === 'true';
  const usingTransferInfo = isTransferPaymentMethod(paymentMethod);

  let roomUnitPrice = 0;
  let roomCharge = 0;
  let serviceUnitPrice = 0;
  let serviceCharge = 0;
  let electricityUnitPrice = 0;
  let electricityPreviousReading = null;
  let electricityCurrentReading = null;
  let electricityUsage = 0;
  let electricityCharge = 0;
  let waterUnitPrice = 0;
  let waterPreviousReading = null;
  let waterCurrentReading = null;
  let waterUsage = 0;
  let waterCharge = 0;

  if (paymentType === 'deposit') {
    roomUnitPrice = snapshot.depositAmount;
    roomCharge = snapshot.depositAmount;
  } else if (paymentType === 'service') {
    serviceUnitPrice = snapshot.serviceFee;
    serviceCharge = snapshot.serviceFee;
  } else if (paymentType === 'monthly_rent') {
    const electricityMeter = buildMeterSnapshot(body.electricityPreviousReading, body.electricityCurrentReading, 'điện');
    const waterMeter = buildMeterSnapshot(body.waterPreviousReading, body.waterCurrentReading, 'nước');

    roomUnitPrice = snapshot.monthlyRent;
    roomCharge = snapshot.monthlyRent;
    serviceUnitPrice = snapshot.serviceFee;
    serviceCharge = snapshot.serviceFee;

    electricityUnitPrice = snapshot.electricityPrice;
    electricityPreviousReading = electricityMeter.previousReading;
    electricityCurrentReading = electricityMeter.currentReading;
    electricityUsage = electricityMeter.usage;
    electricityCharge = roundMoney(electricityUsage * electricityUnitPrice);

    waterUnitPrice = snapshot.waterPrice;
    waterPreviousReading = waterMeter.previousReading;
    waterCurrentReading = waterMeter.currentReading;
    waterUsage = waterMeter.usage;
    waterCharge = roundMoney(waterUsage * waterUnitPrice);
  }

  const totalAmount = toPositiveMoney(roomCharge + electricityCharge + waterCharge + serviceCharge + additionalCharge - discountAmount);

  let bankQrImage = options.uploadedBankQrImage || null;
  if (!bankQrImage) {
    bankQrImage = removeBankQrImage
      ? null
      : options.currentPayment?.bankQrImage || null;
  }

  return {
    paymentCode: (body.paymentCode || '').trim() || generateCode('TT'),
    contractId: contract.id,
    roomId: contract.roomId,
    tenantId: contract.tenantId,
    landlordId,
    billingPeriod: normalizeBillingPeriod(body.billingPeriod),
    paymentType,
    roomUnitPrice,
    roomCharge,
    electricityUnitPrice,
    electricityPreviousReading,
    electricityCurrentReading,
    electricityUsage,
    electricityCharge,
    waterUnitPrice,
    waterPreviousReading,
    waterCurrentReading,
    waterUsage,
    waterCharge,
    serviceUnitPrice,
    serviceCharge,
    additionalCharge,
    discountAmount,
    totalAmount,
    paidAmount,
    dueDate: body.dueDate,
    paidDate: body.paidDate || null,
    paymentMethod,
    bankName: usingTransferInfo ? trimOrNull(body.bankName) : null,
    bankAccountHolder: usingTransferInfo ? trimOrNull(body.bankAccountHolder) : null,
    bankAccountNumber: usingTransferInfo ? trimOrNull(body.bankAccountNumber) : null,
    bankQrImage: usingTransferInfo ? bankQrImage : null,
    status: deriveStatus(body.status, paidAmount, totalAmount, body.dueDate),
    note: (body.note || '').trim() || null
  };
};

const validateTransferPaymentPayload = payload => {
  if (!isTransferPaymentMethod(payload.paymentMethod)) return null;
  if (!payload.bankAccountNumber) {
    return 'Vui lòng nhập số tài khoản của chủ trọ khi chọn chuyển khoản';
  }
  if (!payload.bankQrImage) {
    return 'Vui lòng tải mã QR nhận tiền của chủ trọ khi chọn chuyển khoản';
  }
  return null;
};

const buildPaymentNotificationContent = payment => {
  const detailLines = [];

  if (payment.paymentType === 'deposit') {
    detailLines.push(`- Tiền cọc: ${formatCurrency(payment.roomCharge)}`);
  } else if (payment.paymentType === 'service') {
    detailLines.push(`- Phí dịch vụ: ${formatCurrency(payment.serviceCharge)}`);
  } else if (payment.paymentType === 'monthly_rent') {
    detailLines.push(`- Tiền phòng: ${formatCurrency(payment.roomCharge)}`);

    const electricityDetail = buildUtilityDetailLine(
      'Tiền điện',
      payment.electricityPreviousReading,
      payment.electricityCurrentReading,
      payment.electricityUsage,
      payment.electricityUnitPrice,
      payment.electricityCharge,
      measurementLabels.electricity
    );
    if (electricityDetail) detailLines.push(`- ${electricityDetail}`);

    const waterDetail = buildUtilityDetailLine(
      'Tiền nước',
      payment.waterPreviousReading,
      payment.waterCurrentReading,
      payment.waterUsage,
      payment.waterUnitPrice,
      payment.waterCharge,
      measurementLabels.water
    );
    if (waterDetail) detailLines.push(`- ${waterDetail}`);

    if (Number(payment.serviceCharge || 0) > 0) {
      detailLines.push(`- Phí dịch vụ: ${formatCurrency(payment.serviceCharge)}`);
    }
  } else if (Number(payment.additionalCharge || 0) > 0) {
    detailLines.push(`- Khoản khác: ${formatCurrency(payment.additionalCharge)}`);
  }

  if (Number(payment.additionalCharge || 0) > 0 && payment.paymentType !== 'other') {
    detailLines.push(`- Phụ thu: ${formatCurrency(payment.additionalCharge)}`);
  }

  if (Number(payment.discountAmount || 0) > 0) {
    detailLines.push(`- Giảm trừ: - ${formatCurrency(payment.discountAmount)}`);
  }

  const transferDetails = isTransferPaymentMethod(payment.paymentMethod)
    ? [
        payment.bankName ? `Ngân hàng: ${payment.bankName}` : null,
        payment.bankAccountHolder ? `Chủ tài khoản: ${payment.bankAccountHolder}` : null,
        payment.bankAccountNumber ? `Số tài khoản: ${payment.bankAccountNumber}` : null,
        payment.bankQrImage ? 'Mở chuông thông báo để xem mã QR chuyển khoản.' : null
      ]
    : [];

  return [
    'Thông báo thanh toán mới từ chủ trọ.',
    `Mã phiếu: ${payment.paymentCode || `TT-${payment.id}`}`,
    `Kỳ thanh toán: ${payment.billingPeriod}`,
    `Loại phí: ${paymentTypeLabels[payment.paymentType] || payment.paymentType || 'Khoản thanh toán'}`,
    payment.room ? `Phòng: ${payment.room.title}` : null,
    payment.contract ? `Hợp đồng: ${payment.contract.contractCode || `HD-${payment.contractId}`}` : null,
    detailLines.length > 0 ? 'Chi tiết:' : null,
    ...detailLines,
    `Tổng cần thanh toán: ${formatCurrency(payment.totalAmount)}`,
    `Hạn thanh toán: ${formatDate(payment.dueDate)}`,
    `Phương thức: ${paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod || 'Chưa xác định'}`,
    ...transferDetails,
    payment.note ? `Ghi chú: ${payment.note}` : null
  ].filter(Boolean).join('\n');
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { landlordId: req.user.id },
      include: paymentIncludes,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể tải danh sách thanh toán', error: error.message });
  }
};

exports.getTenantPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { tenantId: req.user.id },
      include: paymentIncludes,
      order: [['createdAt', 'DESC']]
    });

    const notificationCount = payments.filter(payment => ['pending', 'partial', 'overdue'].includes(payment.status)).length;

    res.status(200).json({
      success: true,
      count: payments.length,
      notificationCount,
      data: payments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể tải thông báo thanh toán', error: error.message });
  }
};

exports.createPayment = async (req, res) => {
  let paymentCreated = false;
  let uploadedBankQrImage = normalizeUploadPath(req.file);

  try {
    const contractId = toNumber(req.body.contractId, null);
    const billingPeriod = normalizeBillingPeriod(req.body.billingPeriod);

    if (!contractId || !billingPeriod || !req.body.dueDate) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc để tạo thanh toán' });
    }

    if (uploadedBankQrImage && !isTransferPaymentMethod(req.body.paymentMethod || 'cash')) {
      deleteUploadedFile(uploadedBankQrImage);
      uploadedBankQrImage = null;
    }

    const contract = await Contract.findOne({ where: { id: contractId, landlordId: req.user.id } });
    if (!contract) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng để tạo thanh toán' });
    }

    await ensureUniqueBillingPeriod(contract.id, req.user.id, billingPeriod);

    const payload = buildPaymentPayload({
      ...req.body,
      billingPeriod
    }, contract, req.user.id, { uploadedBankQrImage });
    const transferValidationError = validateTransferPaymentPayload(payload);
    if (transferValidationError) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(400).json({ success: false, message: transferValidationError });
    }

    const payment = await Payment.create(payload);
    paymentCreated = true;
    const createdPayment = await Payment.findByPk(payment.id, { include: paymentIncludes });

    await Message.create({
      roomId: createdPayment.roomId,
      tenantId: createdPayment.tenantId,
      landlordId: createdPayment.landlordId,
      senderRole: 'System',
      content: buildPaymentNotificationContent(createdPayment)
    });

    res.status(201).json({ success: true, notificationSent: true, data: createdPayment });
  } catch (error) {
    if (!paymentCreated && uploadedBankQrImage) {
      deleteUploadedFile(uploadedBankQrImage);
    }
    res.status(400).json({ success: false, message: error.message || 'Không thể tạo thanh toán', error: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  let uploadedBankQrImage = normalizeUploadPath(req.file);
  let updated = false;

  try {
    const payment = await Payment.findOne({ where: { id: req.params.id, landlordId: req.user.id } });
    if (!payment) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    }

    const nextPaymentMethod = req.body.paymentMethod || payment.paymentMethod || 'cash';
    if (uploadedBankQrImage && !isTransferPaymentMethod(nextPaymentMethod)) {
      deleteUploadedFile(uploadedBankQrImage);
      uploadedBankQrImage = null;
    }

    const contractId = toNumber(req.body.contractId || payment.contractId, null);
    const contract = await Contract.findOne({ where: { id: contractId, landlordId: req.user.id } });
    if (!contract) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng liên kết' });
    }

    const billingPeriod = normalizeBillingPeriod(req.body.billingPeriod || payment.billingPeriod);

    if (!billingPeriod) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(400).json({ success: false, message: 'Kỳ thanh toán là bắt buộc' });
    }

    if (!req.body.dueDate && !payment.dueDate) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(400).json({ success: false, message: 'Hạn thanh toán là bắt buộc' });
    }

    await ensureUniqueBillingPeriod(contract.id, req.user.id, billingPeriod, payment.id);

    const payload = buildPaymentPayload({
      ...payment.get(),
      ...req.body,
      contractId: contract.id,
      billingPeriod
    }, contract, req.user.id, {
      currentPayment: payment,
      uploadedBankQrImage
    });

    const transferValidationError = validateTransferPaymentPayload(payload);
    if (transferValidationError) {
      if (uploadedBankQrImage) deleteUploadedFile(uploadedBankQrImage);
      return res.status(400).json({ success: false, message: transferValidationError });
    }

    const previousBankQrImage = payment.bankQrImage;
    await payment.update(payload);
    updated = true;

    if (previousBankQrImage && previousBankQrImage !== payload.bankQrImage) {
      deleteUploadedFile(previousBankQrImage);
    }

    const updatedPayment = await Payment.findByPk(payment.id, { include: paymentIncludes });

    res.status(200).json({ success: true, data: updatedPayment });
  } catch (error) {
    if (!updated && uploadedBankQrImage) {
      deleteUploadedFile(uploadedBankQrImage);
    }
    res.status(400).json({ success: false, message: error.message || 'Không thể cập nhật thanh toán', error: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ where: { id: req.params.id, landlordId: req.user.id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thanh toán' });
    }

    await payment.destroy();
    res.status(200).json({ success: true, message: 'Đã xóa thanh toán' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Không thể xóa thanh toán', error: error.message });
  }
};