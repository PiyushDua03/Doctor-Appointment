const crypto = require('crypto');
const Payment = require('../Models/Payment');
const Appointment = require('../Models/Appointment');
const DoctorProfile = require('../Models/DoctorProfile');

// @desc    Get payment configuration (supported gateways, public keys)
// @route   GET /api/payments/config
// @access  Public
const getPaymentConfig = async (req, res, next) => {
  try {
    const razorpayKey = process.env.RAZORPAY_KEY_ID || '';
    const hasRazorpay = Boolean(razorpayKey);

    res.status(200).json({
      success: true,
      provider: hasRazorpay ? 'razorpay' : 'builtin',
      currency: 'INR',
      keyId: razorpayKey,
      supportedMethods: ['UPI / QR', 'Credit/Debit Card', 'Net Banking', 'Pay at Clinic'],
      sandboxMode: process.env.NODE_ENV !== 'production',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a payment order before checkout
// @route   POST /api/payments/create-order, POST /api/payments/order
// @access  Protected (Patient)
const createOrder = async (req, res, next) => {
  try {
    const { amount, doctorId, appointmentId, currency, notes } = req.body;
    const patientId = req.user._id;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid payment amount is required.',
      });
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${timestamp}-${rand}`;
    const paymentId = `PAY-${timestamp}-${rand}`;

    const payment = await Payment.create({
      paymentId,
      orderId,
      patientId,
      doctorId: doctorId || null,
      appointmentId: appointmentId || null,
      amount: Number(amount),
      currency: currency || 'INR',
      status: 'created',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      order: {
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'doctorp_live_key',
        status: payment.status,
      },
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process a payment directly (UPI, Card, Net Banking, Pay at Clinic)
// @route   POST /api/payments/process
// @access  Protected
const processPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      appointmentId,
      doctorId,
      amount,
      paymentMethod = 'UPI / QR',
      paymentDetails = {},
      notes = '',
    } = req.body;

    const patientId = req.user._id;
    const isClinic = paymentMethod === 'Pay at Clinic';

    let resolvedDoctorId = doctorId;
    let finalAmount = amount;

    // If appointment ID was provided, verify and link it
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId);
      if (appointment) {
        resolvedDoctorId = resolvedDoctorId || appointment.doctorId;
        finalAmount = finalAmount || appointment.fee;
      }
    }

    if (!finalAmount || Number(finalAmount) <= 0) {
      if (resolvedDoctorId) {
        const doc = await DoctorProfile.findById(resolvedDoctorId);
        finalAmount = doc?.consultationFee || 500;
      } else {
        finalAmount = 500;
      }
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `TXN-${timestamp}-${rand}`;
    const receiptNumber = `REC-${timestamp}-${rand}`;

    let payment;
    if (orderId) {
      payment = await Payment.findOne({ orderId });
    }

    if (payment) {
      payment.paymentMethod = paymentMethod;
      payment.paymentDetails = paymentDetails;
      payment.status = isClinic ? 'pay_at_clinic' : 'paid';
      payment.transactionId = transactionId;
      payment.receiptNumber = receiptNumber;
      payment.amount = Number(finalAmount);
      if (appointmentId) payment.appointmentId = appointmentId;
      if (resolvedDoctorId) payment.doctorId = resolvedDoctorId;
      if (!isClinic) payment.paidAt = new Date();
      await payment.save();
    } else {
      payment = await Payment.create({
        paymentId: `PAY-${timestamp}-${rand}`,
        orderId: orderId || `ORD-${timestamp}-${rand}`,
        patientId,
        doctorId: resolvedDoctorId || null,
        appointmentId: appointmentId || null,
        amount: Number(finalAmount),
        currency: 'INR',
        paymentMethod,
        status: isClinic ? 'pay_at_clinic' : 'paid',
        transactionId,
        receiptNumber,
        paymentDetails,
        paidAt: isClinic ? null : new Date(),
        notes,
      });
    }

    // Update appointment paymentStatus if linked
    if (appointment) {
      appointment.paymentStatus = isClinic ? 'pay_at_clinic' : 'paid';
      appointment.paymentMethod = paymentMethod;
      appointment.transactionId = transactionId;
      if (!isClinic && appointment.status === 'pending') {
        appointment.status = 'confirmed';
      }
      await appointment.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('doctorId', 'name specialization clinicName consultationFee')
      .populate('patientId', 'name email phone avatar')
      .populate('appointmentId', 'appointmentId appointmentDate startTime consultationType status');

    res.status(200).json({
      success: true,
      message: isClinic ? 'Appointment confirmed for Pay-at-Clinic' : 'Payment completed successfully!',
      payment: populatedPayment,
      receipt: {
        receiptNumber: payment.receiptNumber,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify an external/gateway payment response (Razorpay / Signature)
// @route   POST /api/payments/verify
// @access  Protected
const verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      paymentId,
      transactionId,
      razorpayPaymentId,
      razorpaySignature,
      appointmentId,
      paymentMethod = 'Razorpay',
    } = req.body;

    let payment = null;

    if (orderId) {
      payment = await Payment.findOne({ orderId });
    } else if (paymentId) {
      payment = await Payment.findOne({ paymentId });
    }

    // Optional cryptographic verification if Razorpay secret is configured
    if (process.env.RAZORPAY_KEY_SECRET && orderId && razorpayPaymentId && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid transaction signature.',
        });
      }
    }

    const resolvedTxnId = razorpayPaymentId || transactionId || `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (payment) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.transactionId = resolvedTxnId;
      payment.paymentMethod = paymentMethod;
      if (razorpayPaymentId) {
        payment.paymentDetails = {
          ...payment.paymentDetails,
          razorpayPaymentId,
          razorpaySignature,
        };
      }
      if (appointmentId) payment.appointmentId = appointmentId;
      await payment.save();
    } else {
      const timestamp = Date.now().toString(36).toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      payment = await Payment.create({
        paymentId: `PAY-${timestamp}-${rand}`,
        orderId: orderId || `ORD-${timestamp}-${rand}`,
        patientId: req.user._id,
        appointmentId: appointmentId || null,
        amount: Number(req.body.amount || 500),
        currency: 'INR',
        paymentMethod,
        status: 'paid',
        transactionId: resolvedTxnId,
        paidAt: new Date(),
      });
    }

    // Update appointment if appointmentId provided
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        paymentStatus: 'paid',
        paymentMethod,
        transactionId: resolvedTxnId,
        status: 'confirmed',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and confirmed successfully!',
      payment,
      transactionId: resolvedTxnId,
      receiptNumber: payment.receiptNumber,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment history for current user
// @route   GET /api/payments/my
// @access  Protected
const getMyPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: req.user._id });
      if (!doctorProfile) {
        return res.status(200).json({ success: true, total: 0, payments: [] });
      }
      query.doctorId = doctorProfile._id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('doctorId', 'name specialization clinicName consultationFee profileImage')
      .populate('patientId', 'name email phone avatar')
      .populate('appointmentId', 'appointmentId appointmentDate startTime consultationType status');

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment details by ID or transaction ID
// @route   GET /api/payments/:id
// @access  Protected
const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let payment = await Payment.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { paymentId: id },
        { transactionId: id },
        { orderId: id },
      ].filter((condition) => Object.values(condition)[0] !== null),
    })
      .populate('doctorId', 'name specialization clinicName consultationFee profileImage')
      .populate('patientId', 'name email phone avatar')
      .populate('appointmentId', 'appointmentId appointmentDate startTime consultationType status');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    // Role check: Only authorized user, doctor, or admin
    const isOwner = payment.patientId && payment.patientId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    let isDoctor = false;

    if (req.user.role === 'doctor' && payment.doctorId) {
      const doc = await DoctorProfile.findOne({ userId: req.user._id });
      if (doc && doc._id.toString() === payment.doctorId._id.toString()) {
        isDoctor = true;
      }
    }

    if (!isOwner && !isAdmin && !isDoctor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment receipt.',
      });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment for specific appointment
// @route   GET /api/payments/appointment/:appointmentId
// @access  Protected
const getAppointmentPayment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const payment = await Payment.findOne({ appointmentId })
      .populate('doctorId', 'name specialization clinicName')
      .populate('patientId', 'name email phone');

    if (!payment) {
      // Fallback: check appointment directly
      const appointment = await Appointment.findById(appointmentId);
      if (appointment) {
        return res.status(200).json({
          success: true,
          payment: {
            appointmentId: appointment._id,
            amount: appointment.fee,
            paymentStatus: appointment.paymentStatus,
            paymentMethod: appointment.paymentMethod,
            transactionId: appointment.transactionId,
            paidAt: appointment.paidAt,
          },
        });
      }
      return res.status(404).json({ success: false, message: 'No payment found for this appointment.' });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

// @desc    Process refund for an appointment or payment
// @route   POST /api/payments/:id/refund, POST /api/payments/refund
// @access  Protected
const refundPayment = async (req, res, next) => {
  try {
    const targetId = req.params.id || req.body.paymentId || req.body.appointmentId;
    const { reason = 'Patient cancellation' } = req.body;

    let payment = await Payment.findOne({
      $or: [
        { _id: targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null },
        { paymentId: targetId },
        { appointmentId: targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null },
        { transactionId: targetId },
      ].filter((c) => Object.values(c)[0] !== null),
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found for refund.' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'This payment has already been refunded.' });
    }

    payment.status = 'refunded';
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    if (payment.appointmentId) {
      await Appointment.findByIdAndUpdate(payment.appointmentId, {
        paymentStatus: 'refunded',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment refund processed successfully.',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPaymentConfig,
  createOrder,
  processPayment,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getAppointmentPayment,
  refundPayment,
};

