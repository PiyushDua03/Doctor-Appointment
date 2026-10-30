const User = require('../models/User');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');

// Sample default health records for demonstration
const defaultDemoRecords = [
  {
    title: 'Comprehensive Metabolic Panel & Lipid Profile',
    recordType: 'Lab Report',
    recordDate: '2026-10-15',
    doctorOrLab: 'Apollo Diagnostics & Health Labs',
    fileUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    summary: 'Cholesterol 185 mg/dL (Normal), Fasting Glucose 94 mg/dL (Optimal), HbA1c 5.4%. All metabolic vitals within clinical reference ranges.',
    tags: ['Blood Test', 'Metabolic', 'Normal'],
  },
  {
    title: 'Digital Chest X-Ray (PA View)',
    recordType: 'Radiology / Scan',
    recordDate: '2026-09-28',
    doctorOrLab: 'Max Multi-Speciality Imaging Center',
    fileUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    summary: 'Normal bronchovascular markings. No focal consolidation, pneumothorax, or pleural effusion detected. Cardiac size normal.',
    tags: ['X-Ray', 'Lungs', 'Clear'],
  },
  {
    title: 'Cardiology ECG & Holter Monitor Summary',
    recordType: 'Lab Report',
    recordDate: '2026-09-02',
    doctorOrLab: 'Fortis Escorts Heart Institute',
    fileUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=600&q=80',
    summary: 'Normal sinus rhythm @ 72 bpm. PR interval 140ms. Normal axis and QRS progression. No ischemic ST changes.',
    tags: ['Cardiology', 'ECG', 'Healthy'],
  },
];

// @desc    Get patient profile
// @route   GET /api/patients/profile
// @access  Protected (Patient)
const getPatientProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update patient profile
// @route   PATCH /api/patients/profile
// @access  Protected (Patient)
const updatePatientProfile = async (req, res, next) => {
  try {
    const { name, phone, gender, age, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (gender) user.gender = gender;
    if (age) user.age = Number(age);
    if (avatar) user.avatar = avatar;

    await user.save();
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        age: user.age,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient dashboard stats
// @route   GET /api/patients/stats
// @access  Protected (Patient)
const getPatientStats = async (req, res, next) => {
  try {
    const patientId = req.user._id;

    const total = await Appointment.countDocuments({ patientId });
    const upcoming = await Appointment.countDocuments({
      patientId,
      status: { $in: ['pending', 'confirmed'] },
    });
    const completed = await Appointment.countDocuments({ patientId, status: 'completed' });
    const cancelled = await Appointment.countDocuments({ patientId, status: 'cancelled' });

    res.status(200).json({
      success: true,
      stats: { total, upcoming, completed, cancelled },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get patient medical records
// @route   GET /api/patients/records
// @access  Protected (Patient)
const getPatientRecords = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    let records = await MedicalRecord.find({ patientId }).sort({ createdAt: -1 });

    // Auto-seed initial demo records if new patient
    if (records.length === 0) {
      const seeded = await Promise.all(
        defaultDemoRecords.map((r) =>
          MedicalRecord.create({
            ...r,
            patientId,
          })
        )
      );
      records = seeded;
    }

    res.status(200).json({ success: true, count: records.length, records });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload / add medical record
// @route   POST /api/patients/records
// @access  Protected (Patient)
const createPatientRecord = async (req, res, next) => {
  try {
    const { title, recordType, recordDate, doctorOrLab, fileUrl, summary, tags } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Please provide a record title' });
    }

    const record = await MedicalRecord.create({
      patientId: req.user._id,
      title: title.trim(),
      recordType: recordType || 'Lab Report',
      recordDate: recordDate || new Date().toISOString().slice(0, 10),
      doctorOrLab: doctorOrLab || 'Apollo Diagnostics & Health Labs',
      fileUrl: fileUrl || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
      summary: summary || 'Report uploaded by patient.',
      tags: tags || ['Verified Document'],
    });

    res.status(201).json({ success: true, message: 'Medical record added successfully', record });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete medical record
// @route   DELETE /api/patients/records/:id
// @access  Protected (Patient)
const deletePatientRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findOneAndDelete({
      _id: req.params.id,
      patientId: req.user._id,
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found or unauthorized' });
    }
    res.status(200).json({ success: true, message: 'Medical record removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Doctor view patient medical records
// @route   GET /api/patients/:patientId/records
// @access  Protected (Doctor)
const getRecordsForDoctor = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    let records = await MedicalRecord.find({ patientId }).sort({ createdAt: -1 });

    if (records.length === 0) {
      records = await Promise.all(
        defaultDemoRecords.map((r) => MedicalRecord.create({ ...r, patientId }))
      );
    }

    const patient = await User.findById(patientId).select('name email phone age gender avatar');

    res.status(200).json({ success: true, patient, records });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatientProfile,
  updatePatientProfile,
  getPatientStats,
  getPatientRecords,
  createPatientRecord,
  deletePatientRecord,
  getRecordsForDoctor,
};
