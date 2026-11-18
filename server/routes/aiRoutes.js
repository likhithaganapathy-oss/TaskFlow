const express = require('express');
const router = express.Router();
const { getAIAssistance } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/assistant', getAIAssistance);

module.exports = router;
