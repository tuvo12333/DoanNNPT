const express = require('express');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  deleteRoomImage
} = require('../controllers/roomController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

const router = express.Router();

// Xóa ảnh riêng lẻ
router.delete('/images/:id', auth, deleteRoomImage);

router.route('/')
  .get(getAllRooms)
  .post(auth, upload.array('images', 10), createRoom);

router.route('/:id')
  .get(getRoomById)
  .put(auth, upload.array('images', 10), updateRoom)
  .delete(auth, deleteRoom);

module.exports = router;
