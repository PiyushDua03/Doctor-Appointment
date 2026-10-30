const express = require('express');
const router = express.Router();
const {
  getPatientProfile,
  updatePatientProfile,
  getPatientStats,
  getPatientRecords,
  createPatientRecord,
  deletePatientRecord,
  getRecordsForDoctor,
} = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/profile', getPatientProfile);
router.patch('/profile', updatePatientProfile);
router.get('/stats', getPatientStats);

// Medical Records & Lab Vault
router.get('/records', getPatientRecords);
router.post('/records', createPatientRecord);
router.delete('/records/:id', deletePatientRecord);
router.get('/:patientId/records', authorize('doctor', 'admin'), getRecordsForDoctor);

module.exports = router;
