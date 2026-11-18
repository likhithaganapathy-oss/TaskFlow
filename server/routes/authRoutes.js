const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.patch('/profile', protect, updateProfile);

module.exports = router;
