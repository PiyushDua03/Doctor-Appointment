/**
 * bookingApi.js — Patient Booking Page connected to Backend API
 *
 * This module handles the complete patient booking flow using the backend API
 * instead of local data. It fetches doctors from GET /api/doctors, submits
 * bookings to POST /api/appointments, and handles conflict responses.
 *
 * Demonstrates: async/await, fetch, destructuring, template literals,
 * filter(), map(), sort(), reduce(), Set, spread, arrow functions,
 * event handling, form validation, DOM manipulation, JSON, error handling,
 * conditional rendering, preventDefault()
 */

'use strict';

const BookingApp = (() => {

  /* ──────────────────────────────────────
   * Configuration
   * ────────────────────────────────────── */

  const API_BASE = window.BOOKING_API_BASE || 'http://localhost:5000/api';
  const DURATIONS = [15, 30, 45, 60];
  const SLOT_GRANULARITY = 15; // minutes

  /* ──────────────────────────────────────
   * State
   * ────────────────────────────────────── */

  let allDoctors = [];
  let isSubmitting = false;

  /* ──────────────────────────────────────
   * DOM Helpers
   * ────────────────────────────────────── */

  const $ = (sel) => document.querySelector(sel);
  const show = (el) => { if (el) el.classList.remove('hidden'); };
  const hide = (el) => { if (el) el.classList.add('hidden'); };

  /* ──────────────────────────────────────
   * Time Utilities
   * ────────────────────────────────────── */

  const timeToMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins) => {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatTime12 = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const formatDateLong = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };

  const getDateOffset = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /* ──────────────────────────────────────
   * API Helpers
   * ────────────────────────────────────── */

  const apiFetch = async (path, options = {}) => {
    const url = `${API_BASE}${path}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options
    };
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  };

  /* ──────────────────────────────────────
   * Notification
   * ────────────────────────────────────── */

  const notify = (message, type = 'info') => {
    const bar = $('#notification-bar');
    const msg = $('#notification-msg');
    if (!bar || !msg) return;

    msg.textContent = message;
    bar.className = `notification-bar notification-${type}`;
    show(bar);

    if (type !== 'error') {
      setTimeout(() => hide(bar), 8000);
    }
  };

  const hideNotification = () => hide($('#notification-bar'));

  /* ──────────────────────────────────────
   * Load Doctors from API
   * ────────────────────────────────────── */

  const loadDoctors = async () => {
    try {
      const { status, data } = await apiFetch('/doctors');
      if (status !== 200 || !data.data) {
        notify('Failed to load doctors. Please refresh the page.', 'error');
        return;
      }
      allDoctors = data.data;
      populateSpecialties();
      populateDoctors();
      console.log(`[Booking] Loaded ${allDoctors.length} doctors.`);
    } catch (err) {
      console.error('[Booking] Failed to load doctors:', err);
      notify('Could not connect to the server. Please check your connection.', 'error');
    }
  };

  /* ──────────────────────────────────────
   * Populate Specialties
   * ────────────────────────────────────── */

  const populateSpecialties = () => {
    const select = $('#specialty');
    if (!select) return;

    // Extract unique specialties using Set + map, then sort
    const specialties = [...new Set(allDoctors.map((d) => d.specialty))].sort();

    select.innerHTML = '<option value="">Select Specialty</option>';
    specialties.forEach((spec) => {
      const opt = document.createElement('option');
      opt.value = spec;
      opt.textContent = spec;
      select.appendChild(opt);
    });
  };

  /* ──────────────────────────────────────
   * Populate Doctors (filtered by specialty)
   * ────────────────────────────────────── */

  const populateDoctors = () => {
    const specSelect = $('#specialty');
    const docSelect = $('#doctorId');
    if (!docSelect) return;

    const selectedSpec = specSelect ? specSelect.value : '';

    // Filter by specialty, then sort by name
    const filtered = selectedSpec
      ? allDoctors.filter((d) => d.specialty === selectedSpec)
      : allDoctors;
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    docSelect.innerHTML = '<option value="">Select Doctor</option>';
    sorted.forEach((doc) => {
      const opt = document.createElement('option');
      opt.value = doc.doctorId;
      opt.textContent = `${doc.name} — ${doc.specialty}`;
      docSelect.appendChild(opt);
    });

    populateTimeSlots();
  };

  /* ──────────────────────────────────────
   * Populate Durations
   * ────────────────────────────────────── */

  const populateDurations = () => {
    const select = $('#duration');
    if (!select) return;

    select.innerHTML = '';
    DURATIONS.forEach((mins) => {
      const opt = document.createElement('option');
      opt.value = mins;
      opt.textContent = `${mins} minutes`;
      select.appendChild(opt);
    });
    select.value = '30';
  };

  /* ──────────────────────────────────────
   * Populate Time Slots
   * ────────────────────────────────────── */

  const populateTimeSlots = () => {
    const timeSelect = $('#startTime');
    if (!timeSelect) return;

    const docEl = $('#doctorId');
    const dateEl = $('#date');
    const durEl = $('#duration');
    const doctorId = docEl ? docEl.value : '';
    const date = dateEl ? dateEl.value : '';
    const duration = parseInt(durEl ? durEl.value : '30', 10) || 30;

    timeSelect.innerHTML = '<option value="">Select Time</option>';
    if (!doctorId || !date) return;

    const doctor = allDoctors.find((d) => d.doctorId === doctorId);
    if (!doctor) return;

    const dayName = getDayName(date);
    const windows = doctor.availableSlots[dayName];

    if (!windows || windows.length === 0) {
      timeSelect.innerHTML = '<option value="">Doctor not available this day</option>';
      return;
    }

    // Generate slots within each availability window
    const slots = [];
    windows.forEach(({ start, end }) => {
      const startMins = timeToMinutes(start);
      const endMins = timeToMinutes(end);
      let cursor = startMins;
      while (cursor + duration <= endMins) {
        slots.push(minutesToTime(cursor));
        cursor += SLOT_GRANULARITY;
      }
    });

    if (slots.length === 0) {
      timeSelect.innerHTML = '<option value="">No slots for this duration</option>';
      return;
    }

    timeSelect.innerHTML = '<option value="">Select Time</option>';
    slots.forEach((time) => {
      const opt = document.createElement('option');
      opt.value = time;
      opt.textContent = formatTime12(time);
      timeSelect.appendChild(opt);
    });
  };

  /* ──────────────────────────────────────
   * Date Input Setup
   * ────────────────────────────────────── */

  const setupDateInput = () => {
    const dateInput = $('#date');
    if (!dateInput) return;
    dateInput.min = getTodayISO();
    dateInput.max = getDateOffset(6);
    dateInput.value = getTodayISO();
  };

  /* ──────────────────────────────────────
   * Form Validation
   * ────────────────────────────────────── */

  const validateForm = () => {
    const errors = [];
    const nameEl = $('#patientName');
    const emailEl = $('#patientEmail');
    const specEl = $('#specialty');
    const docEl = $('#doctorId');
    const dateEl = $('#date');
    const timeEl = $('#startTime');
    const durEl = $('#duration');
    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const specialty = specEl ? specEl.value : '';
    const doctorId = docEl ? docEl.value : '';
    const date = dateEl ? dateEl.value : '';
    const startTime = timeEl ? timeEl.value : '';
    const duration = durEl ? durEl.value : '';

    if (!name) errors.push('Patient name is required.');
    if (!email) {
      errors.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address.');
    }
    if (!specialty) errors.push('Please select a specialty.');
    if (!doctorId) errors.push('Please select a doctor.');
    if (!date) errors.push('Please select a date.');
    if (!startTime) errors.push('Please select a time.');
    if (!duration) errors.push('Please select a duration.');

    return { valid: errors.length === 0, errors };
  };

  /* ──────────────────────────────────────
   * Book Appointment
   * ────────────────────────────────────── */

  const bookAppointment = async () => {
    if (isSubmitting) return;

    const { valid, errors } = validateForm();
    if (!valid) {
      notify(errors.join(' '), 'error');
      return;
    }

    const payload = {
      patientName: $('#patientName').value.trim(),
      patientEmail: $('#patientEmail').value.trim(),
      doctorId: $('#doctorId').value,
      date: $('#date').value,
      startTime: $('#startTime').value,
      duration: parseInt($('#duration').value, 10)
    };

    // Loading state
    isSubmitting = true;
    const bookBtn = $('#btn-book');
    const originalText = bookBtn.textContent;
    bookBtn.textContent = 'Booking...';
    bookBtn.disabled = true;
    bookBtn.classList.add('btn-loading');

    try {
      const { status, data } = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (status === 201 && data.success) {
        showConfirmation(data.data, data.calendar);
        notify('Appointment booked successfully!', 'success');
      } else if (status === 409) {
        showConflict(data);
      } else if (status === 400) {
        notify(data.message || 'Invalid booking information.', 'error');
      } else if (status === 404) {
        notify(data.message || 'Doctor not found.', 'error');
      } else {
        notify(data.message || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      console.error('[Booking] API error:', err);
      notify('Could not connect to the server. Please try again.', 'error');
    } finally {
      isSubmitting = false;
      bookBtn.textContent = originalText;
      bookBtn.disabled = false;
      bookBtn.classList.remove('btn-loading');
    }
  };

  /* ──────────────────────────────────────
   * Confirmation Modal
   * ────────────────────────────────────── */

  const showConfirmation = (appointment, calendar) => {
    const {
      patientName, doctorName, specialty, date,
      startTime, endTime, duration, roomName, _id
    } = appointment;

    // Build Google Calendar "Add Event" URL for the patient
    const buildGoogleCalUrl = () => {
      // Format: YYYYMMDDTHHmmSS
      const toGCalDate = (dateStr, timeStr) => {
        const [y, mo, d] = dateStr.split('-');
        const [h, mi] = timeStr.split(':');
        return `${y}${mo}${d}T${h}${mi}00`;
      };

      const startDT = toGCalDate(date, startTime);
      const endDT = toGCalDate(date, endTime);
      const title = encodeURIComponent(`Doctor Appointment — ${doctorName || 'Clinic'}`);
      const details = encodeURIComponent(
        `Patient: ${patientName}\n` +
        `Doctor: ${doctorName}\n` +
        `Specialty: ${specialty || '—'}\n` +
        `Duration: ${duration} minutes\n` +
        `Room: ${roomName || appointment.roomId}\n\n` +
        `Booked via Clinic Scheduler`
      );
      const location = encodeURIComponent(`${roomName || appointment.roomId} — Clinic`);

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDT}/${endDT}&details=${details}&location=${location}&sf=true&output=xml`;
    };

    const gcalUrl = buildGoogleCalUrl();

    // Calendar status line (clinic-side sync info)
    let calendarHtml = '';
    if (calendar && calendar.synced === true) {
      calendarHtml = `
        <div class="cal-status cal-synced">
          <span class="cal-icon">✓</span>
          <span>Added to clinic Google Calendar</span>
        </div>`;
    }

    const modalHtml = `
      <div class="modal-overlay" id="confirm-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div class="modal-content">
          <div class="modal-success-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 id="modal-title" class="modal-title">Appointment Confirmed</h2>
          <p class="modal-subtitle">Your appointment has been booked.</p>

          <div class="modal-details">
            <div class="modal-row">
              <span class="row-label">Patient</span>
              <span class="row-value">${patientName}</span>
            </div>
            <div class="modal-row">
              <span class="row-label">Doctor</span>
              <span class="row-value">${doctorName || appointment.doctorId}</span>
            </div>
            <div class="modal-row">
              <span class="row-label">Specialty</span>
              <span class="row-value">${specialty || '—'}</span>
            </div>
            <div class="modal-row">
              <span class="row-label">Date</span>
              <span class="row-value">${formatDateLong(date)}</span>
            </div>
            <div class="modal-row">
              <span class="row-label">Time</span>
              <span class="row-value">${formatTime12(startTime)} – ${formatTime12(endTime)}</span>
            </div>
            <div class="modal-row">
              <span class="row-label">Duration</span>
              <span class="row-value">${duration} minutes</span>
            </div>
            <div class="modal-row">
              <span class="row-label">Room</span>
              <span class="row-value">${roomName || appointment.roomId}</span>
            </div>
          </div>

          ${calendarHtml}

          <div class="modal-actions">
            <a href="${gcalUrl}" target="_blank" rel="noopener" class="btn btn-gcal" id="btn-add-gcal">
              📅 Add to My Google Calendar
            </a>
            <button type="button" class="btn btn-primary modal-done-btn" id="modal-done">Done</button>
          </div>
        </div>
      </div>`;

    // Remove any existing modal
    const existing = $('#confirm-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = $('#confirm-modal');
    const doneBtn = $('#modal-done');

    const closeModal = () => {
      modal.remove();
      resetForm();
    };

    doneBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    doneBtn.focus();

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  };

  /* ──────────────────────────────────────
   * Conflict Display
   * ────────────────────────────────────── */

  const showConflict = (data) => {
    const area = $('#conflict-area');
    const details = $('#conflict-details');
    if (!area || !details) return;

    let message = 'This time slot is no longer available.';
    if (data.conflicts && data.conflicts.doctor) {
      message = 'The selected doctor is unavailable at this time.';
    } else if (data.conflicts && data.conflicts.room) {
      message = 'No rooms are available at this time.';
    }

    let html = `
      <div class="conflict-message">
        <span class="conflict-icon">⚠</span>
        <p>${message}</p>
      </div>`;

    if (data.suggestion && data.suggestion.available) {
      const { date, startTime, endTime } = data.suggestion;
      html += `
        <div class="suggestion-card">
          <h4>Next Available Slot</h4>
          <div class="suggestion-info">
            <p><strong>${formatDateLong(date)}</strong></p>
            <p>${formatTime12(startTime)} – ${formatTime12(endTime)}</p>
          </div>
          <button type="button" class="btn btn-primary" id="btn-use-suggestion"
                  data-date="${date}" data-time="${startTime}">
            Book This Slot
          </button>
        </div>`;
    } else if (data.suggestion && !data.suggestion.available) {
      html += `<p class="no-slots-msg">No available slots found in the next 7 days.</p>`;
    }

    details.innerHTML = html;
    show(area);
    notify(message, 'warning');

    const useBtn = $('#btn-use-suggestion');
    if (useBtn) {
      useBtn.addEventListener('click', () => {
        $('#date').value = useBtn.dataset.date;
        populateTimeSlots();
        setTimeout(() => { $('#startTime').value = useBtn.dataset.time; }, 50);
        hide(area);
        notify('Suggestion applied. Click "Book Appointment" to confirm.', 'info');
      });
    }
  };

  /* ──────────────────────────────────────
   * Suggest Next Available
   * ────────────────────────────────────── */

  const suggestNextAvailable = async () => {
    const docEl = $('#doctorId');
    const dateEl = $('#date');
    const durEl = $('#duration');
    const doctorId = docEl ? docEl.value : '';
    const date = (dateEl ? dateEl.value : '') || getTodayISO();
    const duration = (durEl ? durEl.value : '') || '30';

    if (!doctorId) {
      notify('Please select a doctor first.', 'error');
      return;
    }

    const suggestBtn = $('#btn-suggest-slot');
    const origText = suggestBtn.textContent;
    suggestBtn.textContent = 'Searching...';
    suggestBtn.disabled = true;

    try {
      const { status, data } = await apiFetch(
        `/doctors/${doctorId}/next-available?date=${date}&duration=${duration}&from=08:00`
      );

      if (status === 200 && data.data && data.data.available) {
        showNextAvailableSuggestion(data.data);
      } else if (status === 200) {
        notify('No available slots found in the next 7 days.', 'warning');
      } else if (status === 404) {
        notify('Doctor not found.', 'error');
      } else {
        notify('Could not find available slots.', 'warning');
      }
    } catch (err) {
      console.error('[Booking] Next available error:', err);
      notify('Could not connect to the server.', 'error');
    } finally {
      suggestBtn.textContent = origText;
      suggestBtn.disabled = false;
    }
  };

  const showNextAvailableSuggestion = (slot) => {
    const area = $('#conflict-area');
    const details = $('#conflict-details');
    if (!area || !details) return;

    const doctor = allDoctors.find((d) => d.doctorId === slot.doctorId);
    const doctorName = doctor ? doctor.name : slot.doctorId;

    details.innerHTML = `
      <div class="suggestion-card suggestion-highlight">
        <h4>💡 Next Available Slot</h4>
        <div class="suggestion-info">
          <p><strong>${doctorName}</strong></p>
          <p>${formatDateLong(slot.date)}</p>
          <p>${formatTime12(slot.startTime)} – ${formatTime12(slot.endTime)}</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-use-suggestion"
                data-date="${slot.date}" data-time="${slot.startTime}">
          Book This Slot
        </button>
      </div>`;

    show(area);

    const useBtn = $('#btn-use-suggestion');
    if (useBtn) {
      useBtn.addEventListener('click', () => {
        $('#date').value = slot.date;
        populateTimeSlots();
        setTimeout(() => { $('#startTime').value = slot.startTime; }, 50);
        hide(area);
        notify('Suggestion applied. Click "Book Appointment" to confirm.', 'info');
      });
    }
  };

  /* ──────────────────────────────────────
   * Reset Form
   * ────────────────────────────────────── */

  const resetForm = () => {
    const form = $('#booking-form');
    if (form) form.reset();
    setupDateInput();
    populateDurations();
    populateTimeSlots();
    hide($('#conflict-area'));
  };

  /* ──────────────────────────────────────
   * Event Listeners
   * ────────────────────────────────────── */

  const attachListeners = () => {
    const form = $('#booking-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); bookAppointment(); });

    const specSelect = $('#specialty');
    if (specSelect) specSelect.addEventListener('change', () => { populateDoctors(); hide($('#conflict-area')); });

    const docSelect = $('#doctorId');
    if (docSelect) docSelect.addEventListener('change', () => { populateTimeSlots(); hide($('#conflict-area')); });

    const dateInput = $('#date');
    if (dateInput) dateInput.addEventListener('change', () => { populateTimeSlots(); hide($('#conflict-area')); });

    const durSelect = $('#duration');
    if (durSelect) durSelect.addEventListener('change', populateTimeSlots);

    const suggestBtn = $('#btn-suggest-slot');
    if (suggestBtn) suggestBtn.addEventListener('click', (e) => { e.preventDefault(); suggestNextAvailable(); });

    const closeBtn = $('#notification-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', hideNotification);
  };

  /* ──────────────────────────────────────
   * Initialize
   * ────────────────────────────────────── */

  const init = async () => {
    setupDateInput();
    populateDurations();
    attachListeners();
    await loadDoctors();
    console.log('[BookingApp] Initialized.');
  };

  return { init, API_BASE };
})();

document.addEventListener('DOMContentLoaded', () => BookingApp.init());
