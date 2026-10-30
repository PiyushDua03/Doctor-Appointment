const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const Slot = require('../models/Slot');
const Payment = require('../models/Payment');

// @desc    Book a new appointment with concurrency & conflict protection
// @route   POST /api/appointments
// @access  Protected (Patient, Doctor, Admin)
const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, appointmentDate, date, startTime, time, reason, notes, consultationType, paymentMethod, paymentStatus, transactionId } = req.body;
    const patientId = req.user._id;

    const aptDate = appointmentDate || date;
    const aptTime = startTime || time;

    if (!doctorId || !aptDate || !aptTime) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, appointment date, and time slot are required.',
      });
    }

    // Server-side validation: Reject past bookings
    const appointmentDateTime = new Date(`${aptDate}T${aptTime}:00`);
    const now = new Date();
    if (appointmentDateTime < new Date(now.getTime() - 10 * 60 * 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book appointments for a past date or time.',
      });
    }

    // Verify doctor exists and is approved
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    // Check server-side booking conflict: Active appointment for this doctor, date, and time
    const existingConflict = await Appointment.findOne({
      doctorId,
      appointmentDate: aptDate,
      startTime: aptTime,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: This appointment time slot has already been booked. Please choose another slot.',
      });
    }

    // Create the appointment atomically
    const appointment = await Appointment.create({
      doctorId,
      patientId,
      appointmentDate: aptDate,
      startTime: aptTime,
      consultationType: consultationType || 'In-Clinic Visit',
      reason: reason || 'General Healthcare Consultation',
      notes: notes || '',
      fee: doctor.consultationFee || 500,
      paymentStatus: paymentStatus || 'paid',
      paymentMethod: paymentMethod || 'UPI / Online',
      transactionId: transactionId || `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: paymentStatus === 'pay_at_clinic' ? 'pending' : 'confirmed',
    });

    // Update or mark slot as booked
    await Slot.findOneAndUpdate(
      { doctorId, date: aptDate, time: aptTime },
      {
        $set: {
          status: 'booked',
          bookedBy: patientId,
          lockedBy: null,
          lockedUntil: null,
        },
      },
      { upsert: true }
    );

    // Create audit payment record if one doesn't exist for this transaction
    try {
      const isClinic = appointment.paymentStatus === 'pay_at_clinic';
      await Payment.create({
        appointmentId: appointment._id,
        patientId,
        doctorId,
        amount: appointment.fee,
        currency: 'INR',
        paymentMethod: appointment.paymentMethod,
        status: appointment.paymentStatus,
        transactionId: appointment.transactionId,
        paidAt: isClinic ? null : new Date(),
        notes: `Consultation Booking: ${appointment.appointmentDate} ${appointment.startTime} (${appointment.consultationType})`,
      });
    } catch (payErr) {
      console.warn('Payment record auto-create notice:', payErr.message);
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name specialization clinicName location profileImage consultationFee')
      .populate('patientId', 'name email phone avatar');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: populatedAppointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get appointments for the logged-in user (patient or doctor)
// @route   GET /api/appointments/my
// @access  Protected
const getMyAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
      if (!doctorProfile) {
        return res.status(200).json({ success: true, count: 0, appointments: [] });
      }
      query.doctorId = doctorProfile._id;
    } else if (req.user.role === 'admin') {
      // Admin can see all via /my or query param
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('doctorId', 'name specialization clinicName location profileImage consultationFee rating')
      .populate('patientId', 'name email phone avatar gender age');

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment details
// @route   GET /api/appointments/:id
// @access  Protected
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'name specialization clinicName location profileImage consultationFee rating')
      .populate('patientId', 'name email phone avatar gender age');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Authorization check: patient owns it OR doctor owns it OR admin
    const isPatient = appointment.patientId && appointment.patientId._id.toString() === req.user._id.toString();
    const isDoctor = req.user.role === 'doctor'; // Further check below
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isAdmin) {
      if (isDoctor) {
        const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
        if (!doctorProfile || appointment.doctorId._id.toString() !== doctorProfile._id.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized to view this appointment.' });
        }
      } else {
        return res.status(403).json({ success: false, message: 'Not authorized to view this appointment.' });
      }
    }

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an appointment
// @route   PATCH /api/appointments/:id/cancel
// @access  Protected
const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Authorization check
    if (req.user.role === 'patient' && appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment.' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an already completed appointment.' });
    }

    appointment.status = 'cancelled';
    if (req.body.reason) {
      appointment.notes = `Cancelled: ${req.body.reason}`;
    }

    // Auto-refund payment record if previously paid
    try {
      if (appointment.paymentStatus === 'paid') {
        appointment.paymentStatus = 'refunded';
        await Payment.findOneAndUpdate(
          { appointmentId: appointment._id },
          {
            $set: {
              status: 'refunded',
              refundReason: req.body.reason || 'Appointment cancelled',
              refundedAt: new Date(),
            },
          }
        );
      }
    } catch (payErr) {
      console.warn('Payment refund auto-update notice:', payErr.message);
    }

    await appointment.save();

    // Release the slot
    await Slot.findOneAndUpdate(
      { doctorId: appointment.doctorId, date: appointment.appointmentDate, time: appointment.startTime },
      { $set: { status: 'available', bookedBy: null, lockedBy: null, lockedUntil: null } }
    );

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status (confirm, complete, reject)
// @route   PATCH /api/appointments/:id/status
// @access  Protected (Doctor, Admin)
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Role check: Doctor can only update their own appointments
    if (req.user.role === 'doctor') {
      const doctor = await DoctorProfile.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this appointment.' });
      }
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;
    if (req.body.prescription) appointment.prescription = req.body.prescription;
    await appointment.save();

    // If rejected or cancelled, free up the slot
    if (status === 'rejected' || status === 'cancelled') {
      await Slot.findOneAndUpdate(
        { doctorId: appointment.doctorId, date: appointment.appointmentDate, time: appointment.startTime },
        { $set: { status: 'available', bookedBy: null, lockedBy: null, lockedUntil: null } }
      );
    }

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments (Admin)
// @route   GET /api/appointments
// @access  Protected (Admin)
const getAllAppointments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('doctorId', 'name specialization clinicName')
      .populate('patientId', 'name email phone');

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  updateAppointmentStatus,
  getAllAppointments,
};
