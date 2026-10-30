const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const Slot = require('../models/Slot');

// @desc    Get Admin dashboard overview statistics
// @route   GET /api/admin/dashboard
// @access  Protected (Admin)
const getAdminDashboard = async (req, res, next) => {
  try {
    const totalDoctors = await DoctorProfile.countDocuments();
    const approvedDoctors = await DoctorProfile.countDocuments({ approvalStatus: 'approved' });
    const pendingDoctors = await DoctorProfile.countDocuments({ approvalStatus: 'pending' });
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });

    // Revenue calculation
    const revenueAggregate = await Appointment.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$fee' } } },
    ]);
    const totalRevenue = revenueAggregate.length > 0 ? revenueAggregate[0].totalRevenue : 0;

    // Recent 5 appointments
    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('doctorId', 'name specialization clinicName')
      .populate('patientId', 'name email phone');

    res.status(200).json({
      success: true,
      stats: {
        totalDoctors,
        approvedDoctors,
        pendingDoctors,
        totalPatients,
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        totalRevenue,
      },
      recentAppointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all doctors for admin with approval filter
// @route   GET /api/admin/doctors
// @access  Protected (Admin)
const getDoctors = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.approvalStatus = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const total = await DoctorProfile.countDocuments(query);
    const doctors = await DoctorProfile.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'email phone status createdAt');

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      doctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject doctor registration
// @route   PATCH /api/admin/doctors/:id/approval
// @access  Protected (Admin)
const updateDoctorApproval = async (req, res, next) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status. Must be approved, rejected, or pending.',
      });
    }

    const doctor = await DoctorProfile.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    doctor.approvalStatus = status;
    doctor.isVerified = status === 'approved';
    await doctor.save();

    res.status(200).json({
      success: true,
      message: `Doctor status updated to ${status}`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all patients for admin
// @route   GET /api/admin/patients
// @access  Protected (Admin)
const getPatients = async (req, res, next) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments for admin
// @route   GET /api/admin/appointments
// @access  Protected (Admin)
const getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .populate('doctorId', 'name specialization clinicName')
      .populate('patientId', 'name email phone');

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin add a new verified doctor
// @route   POST /api/admin/doctors
// @access  Protected (Admin)
const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      specialization,
      experience,
      consultationFee,
      clinicName,
      city,
      profileImage,
      languages,
      bio,
    } = req.body;

    if (!name || !email || !specialization) {
      return res.status(400).json({ success: false, message: 'Please provide doctor name, email, and specialization' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user or doctor with this email already exists' });
    }

    const defaultImg = profileImage || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password || 'Doctor@123',
      role: 'doctor',
      phone: phone || '+91 98111 22334',
      status: 'active',
      avatar: defaultImg,
    });

    const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = ['09:30', '10:30', '11:30', '14:00', '15:00', '16:00', '17:00'];

    const doctorProfile = await DoctorProfile.create({
      userId: user._id,
      name: name.trim(),
      specialization: specialization.trim(),
      medicalRegNumber: `MCI-${Math.floor(10000 + Math.random() * 90000)}-D`,
      qualifications: ['MBBS', `MD (${specialization.trim()})`],
      experience: Number(experience) || 5,
      consultationFee: Number(consultationFee) || 500,
      clinicName: clinicName || 'Apollo Multi-Speciality Clinic',
      location: {
        address: 'Medical Enclave, Healthcare Blvd',
        city: city || 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      languages: languages || ['English', 'Hindi'],
      consultationModes: ['In-Clinic Visit', 'Video Consultation'],
      bio: bio || `Dr. ${name} is a certified specialist in ${specialization} with ${experience || 5} years of clinical excellence.`,
      profileImage: defaultImg,
      approvalStatus: 'approved',
      isVerified: true,
      isAvailableToday: true,
      rating: 5.0,
      totalReviews: 1,
      availableDays,
      timeSlots,
      slotDuration: 30,
    });

    // Seed realistic slots for today and next 5 days
    for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
      const slotDate = new Date();
      slotDate.setDate(slotDate.getDate() + dayOffset);
      const dateStr = slotDate.toISOString().slice(0, 10);

      for (const t of timeSlots.slice(0, 4)) {
        await Slot.create({
          doctorId: doctorProfile._id,
          date: dateStr,
          time: t,
          status: 'available',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Doctor ${name} successfully added and approved!`,
      doctor: doctorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin remove/delete a doctor
// @route   DELETE /api/admin/doctors/:id
// @access  Protected (Admin)
const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await DoctorProfile.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Delete associated slots
    await Slot.deleteMany({ doctorId: doctor._id });

    // Delete user account
    if (doctor.userId) {
      await User.findByIdAndDelete(doctor.userId);
    }

    // Delete doctor profile
    await DoctorProfile.findByIdAndDelete(doctor._id);

    res.status(200).json({
      success: true,
      message: `Doctor ${doctor.name} was successfully removed from the system.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getDoctors,
  updateDoctorApproval,
  getPatients,
  getAppointments,
  createDoctor,
  deleteDoctor,
};

