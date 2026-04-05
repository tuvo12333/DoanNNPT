const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

router.get('/', auth, authorize('Admin'), userController.getUsers);
router.post('/', auth, authorize('Admin'), userController.createUser);
router.put('/:id', auth, authorize('Admin'), userController.updateUser);
router.delete('/:id', auth, authorize('Admin'), userController.deleteUser);

module.exports = router;
