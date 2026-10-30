const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Record title is required'],
      trim: true,
    },
    recordType: {
      type: String,
      enum: ['Lab Report', 'Prescription', 'Radiology / Scan', 'Discharge Summary', 'Vaccination', 'Other'],
      default: 'Lab Report',
    },
    recordDate: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    doctorOrLab: {
      type: String,
      default: 'Apollo Diagnostics & Health Labs',
      trim: true,
    },
    fileUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    },
    summary: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: ['Verified'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
