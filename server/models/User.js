/**
 * User.js — User model with secure password hashing
 *
 * Roles: patient, doctor, admin
 * Passwords are hashed using bcryptjs before save.
 *
 * Demonstrates: Mongoose schema, pre-save hooks, instance methods,
 * async/await, enums, default values, arrow functions
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient'
    },
    // Links a user account to a Doctor record (only for role === 'doctor')
    doctorId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * Pre-save hook — hash password before storing.
 * Only hashes if the password field has been modified (not on every save).
 * Demonstrates: async/await, conditional logic, middleware pattern
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method — compare a candidate password with the stored hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Transform toJSON — remove password from serialized output.
 * Demonstrates: object spread, delete operator
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
