const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const {
  sendMessage,
  replyMessage,
  getConversation,
  getLandlordInbox,
  getTenantConversations,
  getTenantNotifications,
  sendInvitation,
  getTenantInvitations,
  getLandlordInvitations,
  respondInvitation
} = require('../controllers/messageController');

router.get('/tenant/notifications', auth, authorize('Tenant'), getTenantNotifications);

// Tin nhắn
router.post('/send', auth, sendMessage);             // Tenant gửi tin nhắn
router.post('/reply', auth, replyMessage);           // Landlord trả lời
router.get('/conversation/:roomId/:tenantId', auth, getConversation); // Xem cuộc hội thoại
router.get('/inbox/landlord', auth, getLandlordInbox); // Landlord xem inbox
router.get('/inbox/tenant', auth, getTenantConversations); // Tenant xem conversations

// Lời mời xem phòng
router.post('/invitation', auth, sendInvitation);              // Landlord gửi lời mời
router.get('/invitation/tenant', auth, getTenantInvitations);  // Tenant xem lời mời
router.get('/invitation/landlord', auth, getLandlordInvitations); // Landlord xem lời mời đã gửi
router.put('/invitation/:id/respond', auth, respondInvitation); // Tenant phản hồi lời mời

module.exports = router;
