const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: 'UPI / Online',
      trim: true,
    },
    paymentGateway: {
      type: String,
      default: 'DoctorP SecurePay',
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'processing', 'paid', 'failed', 'refunded', 'pay_at_clinic'],
      default: 'created',
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentDetails: {
      upiId: { type: String, trim: true },
      cardLast4: { type: String, trim: true },
      cardNetwork: { type: String, trim: true },
      bankName: { type: String, trim: true },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
    },
    receiptNumber: {
      type: String,
      index: true,
    },
    paidAt: {
      type: Date,
    },
    refundReason: {
      type: String,
      default: '',
    },
    refundedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate realistic paymentId and receiptNumber
paymentSchema.pre('save', function () {
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);

  if (!this.paymentId) {
    this.paymentId = `PAY-${timestamp}-${rand}`;
  }
  if (!this.orderId) {
    this.orderId = `ORD-${timestamp}-${rand}`;
  }
  if (!this.receiptNumber) {
    this.receiptNumber = `REC-${timestamp}-${rand}`;
  }
  if (!this.transactionId) {
    this.transactionId = `TXN-${timestamp}-${rand}`;
  }
  if (this.status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
