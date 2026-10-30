const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const patientRoutes = require('./patientRoutes');
const adminRoutes = require('./adminRoutes');
const symptomRoutes = require('./symptomRoutes');
const reviewRoutes = require('./reviewRoutes');
const paymentRoutes = require('./paymentRoutes');

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/patients', patientRoutes);
router.use('/admin', adminRoutes);
router.use('/symptoms', symptomRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/payment', paymentRoutes);

module.exports = router;
