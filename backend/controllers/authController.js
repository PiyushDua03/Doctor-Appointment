const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const generateToken = require('../utils/generateToken');

// @desc    Register a new patient or doctor
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'patient',
      phone,
      gender,
      age,
      specialization,
      qualifications,
      experience,
      consultationFee,
      clinicName,
      city,
      address,
      bio,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Role safety: cannot self-register as admin
    const assignedRole = role === 'doctor' ? 'doctor' : 'patient';

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      phone: phone || '',
      gender: gender || 'Not specified',
      age: age ? Number(age) : null,
      status: 'active',
    });

    let doctorProfile = null;

    // If registering as doctor, create DoctorProfile
    if (assignedRole === 'doctor') {
      doctorProfile = await DoctorProfile.create({
        userId: user._id,
        name: user.name,
        specialization: specialization || 'General Medicine',
        qualifications: qualifications
          ? (Array.isArray(qualifications) ? qualifications : qualifications.split(',').map((q) => q.trim()))
          : ['MBBS'],
        experience: experience ? Number(experience) : 2,
        consultationFee: consultationFee ? Number(consultationFee) : 500,
        clinicName: clinicName || 'Health Center',
        location: {
          address: address || 'Medical Enclave',
          city: city || 'New Delhi',
          coordinates: { lat: 28.6139, lng: 77.209 },
        },
        bio: bio || 'Compassionate healthcare provider committed to clinical excellence.',
        approvalStatus: 'approved', // Auto-approved for frictionless demo/college evaluation
        isVerified: true,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
      },
      doctorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact administrator.',
      });
    }

    const token = generateToken(user._id, user.role);

    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
      },
      doctorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Protected
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let doctorProfile = null;

    if (user.role === 'doctor') {
      doctorProfile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      doctorProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (clear cookie / acknowledge logout)
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = { register, login, getMe, logout };
