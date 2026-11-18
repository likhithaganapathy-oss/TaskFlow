const express = require('express');
const router = express.Router();
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getSubjects);
router.post('/', adminOnly, createSubject);
router.put('/:id', adminOnly, updateSubject);
router.delete('/:id', adminOnly, deleteSubject);

module.exports = router;
