const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const {
  reportIssue,
  getTenantIssueReports,
  updateIssueStatus,
  getLandlordIssueReports
} = require('../controllers/issueController');

router.post('/tenant', auth, authorize('Tenant'), reportIssue);
router.get('/tenant', auth, authorize('Tenant'), getTenantIssueReports);
router.get('/landlord', auth, authorize('Landlord'), getLandlordIssueReports);
router.put('/:id/status', auth, authorize('Landlord'), updateIssueStatus);

module.exports = router;
