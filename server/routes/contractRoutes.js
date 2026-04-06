const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const {
  getContractLookups,
  getContracts,
  getTenantCurrentContract,
  createContract,
  updateContract,
  deleteContract
} = require('../controllers/contractController');

const router = express.Router();

router.get('/tenant/current', auth, authorize('Tenant'), getTenantCurrentContract);

router.use(auth, authorize('Landlord'));

router.get('/lookups', getContractLookups);
router.route('/')
  .get(getContracts)
  .post(createContract);

router.route('/:id')
  .put(updateContract)
  .delete(deleteContract);

module.exports = router;