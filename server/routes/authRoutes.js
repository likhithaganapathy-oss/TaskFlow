const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
  updateEmail,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.patch('/profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);
router.patch('/update-email', protect, updateEmail);

module.exports = router;
