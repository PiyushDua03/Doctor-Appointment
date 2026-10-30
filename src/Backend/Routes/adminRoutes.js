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
} = require('../Controllers/adminController');
const { protect } = require('../Middleware/authMiddleware');
const { authorize } = require('../Middleware/roleMiddleware');

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
