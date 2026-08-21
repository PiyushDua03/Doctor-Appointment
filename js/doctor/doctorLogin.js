/**
 * doctorLogin.js — Doctor Login Page
 *
 * Handles doctor authentication via POST /api/auth/login.
 * Stores JWT in sessionStorage, verifies role, and redirects to dashboard.
 *
 * Demonstrates: async/await, fetch, destructuring, template literals,
 * form validation, event handling, preventDefault(), JSON, error handling,
 * sessionStorage, conditional logic, regex
 */

'use strict';

const DoctorLogin = (() => {

  const API_BASE = window.DOCTOR_API_BASE || 'http://localhost:5050/api';
  let isSubmitting = false;

  const $ = (sel) => document.querySelector(sel);

  /* ──────────────────────────────────────
   * Check if already logged in
   * ────────────────────────────────────── */

  const checkExistingAuth = () => {
    const token = sessionStorage.getItem('doctorToken');
    const role = sessionStorage.getItem('doctorRole');
    if (token && role === 'doctor') {
      window.location.href = 'doctor-dashboard.html';
    }
  };

  /* ──────────────────────────────────────
   * Show / Hide Error
   * ────────────────────────────────────── */

  const showError = (message) => {
    const el = $('#login-error');
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
    }
  };

  const hideError = () => {
    const el = $('#login-error');
    if (el) el.classList.add('hidden');
  };

  /* ──────────────────────────────────────
   * Form Validation
   * ────────────────────────────────────── */

  const validateForm = () => {
    const emailEl = $('#login-email');
    const passEl = $('#login-password');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value : '';

    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!password) return 'Password is required.';
    return null;
  };

  /* ──────────────────────────────────────
   * Login
   * ────────────────────────────────────── */

  const handleLogin = async () => {
    if (isSubmitting) return;
    hideError();

    // Frontend validation
    const error = validateForm();
    if (error) {
      showError(error);
      return;
    }

    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    // Loading state
    isSubmitting = true;
    const btn = $('#login-btn');
    const origText = btn.textContent;
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 200 && data.success) {
        const { token, user } = data;

        // Verify role
        if (user.role !== 'doctor') {
          showError('This login is for doctors only.');
          return;
        }

        // Store auth state in sessionStorage
        sessionStorage.setItem('doctorToken', token);
        sessionStorage.setItem('doctorRole', user.role);
        sessionStorage.setItem('doctorId', user.doctorId);
        sessionStorage.setItem('doctorName', user.name);
        sessionStorage.setItem('doctorEmail', user.email);

        // Redirect to dashboard
        window.location.href = 'doctor-dashboard.html';

      } else if (res.status === 401) {
        showError('Email or password is incorrect.');
      } else {
        showError(data.message || 'Something went wrong. Please try again.');
      }

    } catch (err) {
      console.error('[Login] Error:', err);
      showError('Could not connect to the server. Please try again.');
    } finally {
      isSubmitting = false;
      btn.textContent = origText;
      btn.disabled = false;
    }
  };

  /* ──────────────────────────────────────
   * Initialize
   * ────────────────────────────────────── */

  const init = () => {
    checkExistingAuth();

    const form = $('#login-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
      });
    }

    // Clear error on input
    const inputs = document.querySelectorAll('#login-email, #login-password');
    inputs.forEach((input) => input.addEventListener('input', hideError));
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => DoctorLogin.init());
