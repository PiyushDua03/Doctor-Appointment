const DoctorProfile = require('../models/DoctorProfile');
const Slot = require('../models/Slot');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');

// @desc    Get all doctors with filters, search, and pagination
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res, next) => {
  try {
    const {
      specialty,
      specialization,
      city,
      minRating,
      minFee,
      maxFee,
      search,
      sortBy = 'rating',
      page = 1,
      limit = 12,
    } = req.query;

    const query = { approvalStatus: 'approved' };

    // Search filter
    const spec = specialization || specialty;
    if (spec && spec !== 'all') {
      query.specialization = { $regex: spec, $options: 'i' };
    }

    if (city && city !== 'all') {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (minFee || maxFee) {
      query.consultationFee = {};
      if (minFee) query.consultationFee.$gte = parseInt(minFee, 10);
      if (maxFee) query.consultationFee.$lte = parseInt(maxFee, 10);
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { specialization: { $regex: search.trim(), $options: 'i' } },
        { clinicName: { $regex: search.trim(), $options: 'i' } },
        { 'location.city': { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Sort order
    let sortOptions = { rating: -1 };
    if (sortBy === 'fee_asc') sortOptions = { consultationFee: 1 };
    else if (sortBy === 'fee_desc') sortOptions = { consultationFee: -1 };
    else if (sortBy === 'experience') sortOptions = { experience: -1 };
    else if (sortBy === 'name') sortOptions = { name: 1 };
    else if (sortBy === 'rating') sortOptions = { rating: -1 };

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await DoctorProfile.countDocuments(query);
    const doctors = await DoctorProfile.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'email phone');

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

// @desc    Get single doctor by ID with reviews
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await DoctorProfile.findById(req.params.id).populate('userId', 'email phone');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Fetch recent reviews for this doctor
    const reviews = await Review.find({ doctorId: doctor._id })
      .populate('patientId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      doctor,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update or create doctor profile (Doctor role only)
// @route   PATCH /api/doctors/profile or POST /api/doctors/profile
// @access  Protected (Doctor)
const updateProfile = async (req, res, next) => {
  try {
    let doctor = await DoctorProfile.findOne({ userId: req.user._id });

    if (!doctor) {
      // Create new profile for doctor
      doctor = await DoctorProfile.create({
        userId: req.user._id,
        name: req.user.name,
        ...req.body,
      });
      return res.status(201).json({ success: true, message: 'Profile created', doctor });
    }

    // Update existing profile
    const allowedFields = [
      'name',
      'specialization',
      'qualifications',
      'experience',
      'consultationFee',
      'clinicName',
      'location',
      'bio',
      'profileImage',
      'availableDays',
      'timeSlots',
      'slotDuration',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        doctor[field] = req.body[field];
      }
    });

    await doctor.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', doctor });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor's availability and slots for a specific date
// @route   GET /api/doctors/:id/availability?date=YYYY-MM-DD
// @access  Public
const getAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const doctor = await DoctorProfile.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);

    // Standard default slots if doctor has not customized
    const defaultSlots = doctor.timeSlots && doctor.timeSlots.length > 0
      ? doctor.timeSlots
      : ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

    // Find all existing slots or bookings for this doctor and date
    const bookedAppointments = await Appointment.find({
      doctorId: id,
      appointmentDate: targetDate,
      status: { $in: ['pending', 'confirmed'] },
    }).select('startTime');

    const bookedTimes = new Set(bookedAppointments.map((a) => a.startTime));

    // Release any expired locked slots (older than 5 minutes)
    const now = new Date();
    await Slot.deleteMany({
      doctorId: id,
      date: targetDate,
      status: 'locked',
      lockedUntil: { $lt: now },
    });

    // Check currently locked slots
    const lockedSlots = await Slot.find({
      doctorId: id,
      date: targetDate,
      status: 'locked',
      lockedUntil: { $gte: now },
    });
    const lockedMap = new Map();
    lockedSlots.forEach((s) => lockedMap.set(s.time, s));

    // Build slot list with status
    const slots = defaultSlots.map((time) => {
      if (bookedTimes.has(time)) {
        return { time, status: 'booked', available: false };
      }
      if (lockedMap.has(time)) {
        const lock = lockedMap.get(time);
        return {
          time,
          status: 'locked',
          available: false,
          lockedUntil: lock.lockedUntil,
        };
      }
      return { time, status: 'available', available: true };
    });

    res.status(200).json({
      success: true,
      doctorId: id,
      date: targetDate,
      availableDays: doctor.availableDays || [],
      slots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor availability days and time slots
// @route   PUT /api/doctors/availability
// @access  Protected (Doctor)
const updateAvailability = async (req, res, next) => {
  try {
    const doctor = await DoctorProfile.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const { availableDays, timeSlots } = req.body;
    if (availableDays) doctor.availableDays = availableDays;
    if (timeSlots) doctor.timeSlots = timeSlots;

    await doctor.save();
    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      availableDays: doctor.availableDays,
      timeSlots: doctor.timeSlots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch generate recurring availability slots for doctor
// @route   POST /api/doctors/slots/batch-generate
// @access  Protected (Doctor)
const batchGenerateSlots = async (req, res, next) => {
  try {
    const doctor = await DoctorProfile.findOne({ userId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const {
      startDate,
      endDate,
      daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      shifts = [
        { start: '09:00', end: '13:00' },
        { start: '17:00', end: '20:00' },
      ],
      slotDuration = 30,
    } = req.body;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 14 * 86400000);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlotsSet = new Set();
    let createdCount = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayName = dayNames[d.getDay()];
      if (!daysOfWeek.includes(dayName)) continue;

      const dateStr = d.toISOString().slice(0, 10);

      for (const shift of shifts) {
        const [startH, startM] = (shift.start || '09:00').split(':').map(Number);
        const [endH, endM] = (shift.end || '13:00').split(':').map(Number);

        let currentTotalMins = startH * 60 + startM;
        const endTotalMins = endH * 60 + endM;

        while (currentTotalMins + slotDuration <= endTotalMins) {
          const slotH = String(Math.floor(currentTotalMins / 60)).padStart(2, '0');
          const slotM = String(currentTotalMins % 60).padStart(2, '0');
          const slotTime = `${slotH}:${slotM}`;
          timeSlotsSet.add(slotTime);

          const existing = await Slot.findOne({
            doctorId: doctor._id,
            date: dateStr,
            time: slotTime,
          });

          if (!existing) {
            await Slot.create({
              doctorId: doctor._id,
              date: dateStr,
              time: slotTime,
              status: 'available',
            });
            createdCount++;
          }

          currentTotalMins += slotDuration;
        }
      }
    }

    const allSlotsList = Array.from(timeSlotsSet).sort();
    doctor.availableDays = daysOfWeek;
    if (allSlotsList.length > 0) {
      doctor.timeSlots = allSlotsList;
    }
    doctor.slotDuration = slotDuration;
    await doctor.save();

    res.status(201).json({
      success: true,
      message: `Generated ${createdCount} availability slots across selected schedule!`,
      createdCount,
      uniqueDailySlots: allSlotsList,
      availableDays: doctor.availableDays,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Temporarily lock a slot for 5 minutes during checkout
// @route   POST /api/doctors/slots/lock
// @access  Protected
const lockSlot = async (req, res, next) => {
  try {
    const { doctorId, date, time } = req.body;
    const userId = req.user._id;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ success: false, message: 'Doctor ID, date, and time are required' });
    }

    // Check if appointment already exists
    const existingApt = await Appointment.findOne({
      doctorId,
      appointmentDate: date,
      startTime: time,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (existingApt) {
      return res.status(409).json({ success: false, message: 'This slot is already booked' });
    }

    const now = new Date();
    const lockExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

    // Upsert lock
    const slot = await Slot.findOneAndUpdate(
      {
        doctorId,
        date,
        time,
        $or: [
          { status: 'available' },
          { lockedUntil: { $lt: now } },
          { lockedBy: userId },
        ],
      },
      {
        $set: {
          status: 'locked',
          lockedBy: userId,
          lockedUntil: lockExpiry,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Slot reserved for 5 minutes',
      slot: {
        doctorId,
        date,
        time,
        status: 'locked',
        lockedUntil: lockExpiry,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This slot is currently locked by another patient. Please choose another slot.',
      });
    }
    next(error);
  }
};

// @desc    Get all doctors with geo-coordinates for interactive map
// @route   GET /api/doctors/map
// @access  Public
const getMapDoctors = async (req, res, next) => {
  try {
    const doctors = await DoctorProfile.find(
      { approvalStatus: 'approved' },
      'name specialization consultationFee rating totalReviews profileImage location clinicName'
    );
    res.status(200).json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  updateProfile,
  getAvailability,
  updateAvailability,
  batchGenerateSlots,
  lockSlot,
  getMapDoctors,
};
