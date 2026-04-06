const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const upload = require('../middleware/upload');
const {
  getPayments,
  getTenantPayments,
  createPayment,
  updatePayment,
  deletePayment
} = require('../controllers/paymentController');

const router = express.Router();

router.get('/tenant', auth, authorize('Tenant'), getTenantPayments);

router.route('/')
  .get(auth, authorize('Landlord'), getPayments)
  .post(auth, authorize('Landlord'), upload.single('bankQrImage'), createPayment);

router.route('/:id')
  .put(auth, authorize('Landlord'), upload.single('bankQrImage'), updatePayment)
  .delete(auth, authorize('Landlord'), deletePayment);

module.exports = router;