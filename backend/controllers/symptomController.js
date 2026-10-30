const Symptom = require('../models/Symptom');
const DoctorProfile = require('../models/DoctorProfile');

// @desc    Analyze symptom text and recommend specialist
// @route   POST /api/symptoms/check
// @access  Public
const checkSymptoms = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please describe your symptoms.',
      });
    }

    const cleanInput = text.toLowerCase().trim();

    // Query symptoms in DB
    const allSymptoms = await Symptom.find();

    let matchedSymptom = null;
    let maxMatchCount = 0;

    for (const item of allSymptoms) {
      let count = 0;
      for (const kw of item.keywords) {
        if (cleanInput.includes(kw.toLowerCase())) {
          count++;
        }
      }
      if (count > maxMatchCount) {
        maxMatchCount = count;
        matchedSymptom = item;
      }
    }

    // Default fallback if no exact keyword found
    let recommendation = {
      specialty: 'General Medicine',
      description: 'Based on your description, a General Physician can evaluate your symptoms and guide appropriate clinical care.',
      urgency: 'low',
      color: '#0D9488',
    };

    if (matchedSymptom) {
      recommendation = {
        specialty: matchedSymptom.specialty,
        description: matchedSymptom.description,
        urgency: matchedSymptom.urgency,
        color: matchedSymptom.color || (matchedSymptom.urgency === 'high' ? '#EF4444' : '#0D9488'),
      };
    }

    // Also fetch top 3 doctors in this specialty
    const suggestedDoctors = await DoctorProfile.find({
      approvalStatus: 'approved',
      specialization: { $regex: recommendation.specialty, $options: 'i' },
    })
      .sort({ rating: -1 })
      .limit(3);

    res.status(200).json({
      success: true,
      recommendation,
      matched: !!matchedSymptom,
      suggestedDoctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all symptom categories/keywords
// @route   GET /api/symptoms
// @access  Public
const getSymptoms = async (req, res, next) => {
  try {
    const symptoms = await Symptom.find();
    res.status(200).json({ success: true, symptoms });
  } catch (error) {
    next(error);
  }
};

module.exports = { checkSymptoms, getSymptoms };
