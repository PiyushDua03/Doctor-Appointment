const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema(
  {
    keywords: [{ type: String, lowercase: true, trim: true }],
    specialty: { type: String, required: true },
    description: { type: String, required: true },
    urgency: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    icon: { type: String, default: 'stethoscope' },
    color: { type: String, default: '#2563EB' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Symptom', symptomSchema);
