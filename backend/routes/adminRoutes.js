const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getDoctors,
  updateDoctorApproval,
  getPatients,
  getAppointments,
  createDoctor,
  deleteDoctor,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/doctors', getDoctors);
router.post('/doctors', createDoctor);
router.patch('/doctors/:id/approval', updateDoctorApproval);
router.delete('/doctors/:id', deleteDoctor);
router.get('/patients', getPatients);
router.get('/appointments', getAppointments);

module.exports = router;
