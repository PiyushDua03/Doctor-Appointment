/**
 * doctorDashboard.js — Doctor Dashboard
 *
 * Protected dashboard showing authenticated doctor's appointments,
 * summary statistics, and weekly schedule calendar.
 *
 * Demonstrates: async/await, fetch, destructuring, template literals,
 * filter(), map(), sort(), reduce(), forEach(), find(), Set, spread,
 * arrow functions, event handling, DOM manipulation, JSON, error handling,
 * conditional rendering, Date operations, closures, classList, dataset
 */

'use strict';

const DoctorDashboard = (() => {

  const API_BASE = window.DOCTOR_API_BASE || 'http://localhost:5050/api';

  /* ──────────────────────────────────────
   * State
   * ────────────────────────────────────── */

  let doctorId = '';
  let doctorName = '';
  let token = '';
  let allAppointments = [];
  let doctorInfo = null;
  let weekOffset = 0; // 0 = current week
  let activeView = 'appointments'; // 'appointments' | 'schedule'
  let activeFilter = 'today'; // 'today' | 'upcoming' | 'all'

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const show = (el) => { if (el) el.classList.remove('hidden'); };
  const hide = (el) => { if (el) el.classList.add('hidden'); };

  /* ──────────────────────────────────────
   * Time Utilities
   * ────────────────────────────────────── */

  const timeToMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
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
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatDateShort = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  };

  const getTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /* ──────────────────────────────────────
   * Week Calculation
   * ────────────────────────────────────── */

  const getWeekDates = (offset = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset + (offset * 7));

    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return toISO(d);
    });
  };

  const getWeekLabel = (dates) => {
    const start = new Date(dates[0] + 'T12:00:00');
    const end = new Date(dates[dates.length - 1] + 'T12:00:00');
    const opts = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}, ${start.getFullYear()}`;
  };

  /* ──────────────────────────────────────
   * Auth Check
   * ────────────────────────────────────── */

  const checkAuth = () => {
    token = sessionStorage.getItem('doctorToken');
    const role = sessionStorage.getItem('doctorRole');
    doctorId = sessionStorage.getItem('doctorId');
    doctorName = sessionStorage.getItem('doctorName');

    if (!token || role !== 'doctor' || !doctorId) {
      window.location.href = 'doctor-login.html';
      return false;
    }
    return true;
  };

  /* ──────────────────────────────────────
   * API Helper
   * ────────────────────────────────────── */

  const apiFetch = async (path) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      sessionStorage.clear();
      window.location.href = 'doctor-login.html';
      return null;
    }

    if (res.status === 403) {
      showError('You are not authorized to view this dashboard.');
      return null;
    }

    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const showError = (msg) => {
    const main = $('#dash-main');
    if (main) {
      main.innerHTML = `
        <div class="empty-msg">
          <span class="empty-icon">⚠️</span>
          <p>${msg}</p>
        </div>`;
    }
  };

  /* ──────────────────────────────────────
   * Load Data
   * ────────────────────────────────────── */

  const loadDoctorInfo = async () => {
    try {
      const result = await apiFetch(`/doctors/${doctorId}`);
      if (result && result.status === 200) {
        doctorInfo = result.data.data;
      }
    } catch (err) {
      console.error('[Dashboard] Doctor info error:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      const result = await apiFetch(`/doctors/${doctorId}/appointments`);
      if (!result) return;

      if (result.status === 200 && result.data.success) {
        allAppointments = result.data.data;
        console.log(`[Dashboard] Loaded ${allAppointments.length} appointments.`);
      } else {
        allAppointments = [];
      }
    } catch (err) {
      console.error('[Dashboard] Appointment load error:', err);
      showError('Could not load appointments. Please try again.');
    }
  };

  /* ──────────────────────────────────────
   * Render Header
   * ────────────────────────────────────── */

  const renderHeader = () => {
    const nameEl = $('#header-doc-name');
    if (nameEl) {
      const displayName = doctorInfo ? doctorInfo.name : doctorName;
      nameEl.textContent = displayName;
    }
  };

  /* ──────────────────────────────────────
   * Render Greeting
   * ────────────────────────────────────── */

  const renderGreeting = () => {
    const el = $('#greeting');
    if (!el) return;

    const displayName = doctorInfo ? doctorInfo.name : doctorName;
    const specialty = doctorInfo ? doctorInfo.specialty : '';

    el.innerHTML = `
      <h2>${getGreeting()}, ${displayName}</h2>
      <p>${specialty ? specialty + ' · ' : ''}${formatDateLong(getTodayISO())}</p>`;
  };

  /* ──────────────────────────────────────
   * Render Stats
   * ────────────────────────────────────── */

  const renderStats = () => {
    const today = getTodayISO();

    // Use reduce() to calculate counts in a single pass
    const counts = allAppointments.reduce((acc, apt) => {
      if (apt.date === today && apt.status !== 'cancelled') acc.today++;
      if (apt.date >= today && apt.status !== 'cancelled') acc.upcoming++;
      if (apt.status === 'cancelled' || apt.date < today) acc.completed++;
      return acc;
    }, { today: 0, upcoming: 0, completed: 0 });

    const todayEl = $('#stat-today');
    const upcomingEl = $('#stat-upcoming');
    const completedEl = $('#stat-completed');

    if (todayEl) todayEl.textContent = counts.today;
    if (upcomingEl) upcomingEl.textContent = counts.upcoming;
    if (completedEl) completedEl.textContent = counts.completed;
  };

  /* ──────────────────────────────────────
   * Appointment Status Helper
   * ────────────────────────────────────── */

  const getStatus = (apt) => {
    if (apt.status === 'cancelled') return 'cancelled';
    const today = getTodayISO();
    if (apt.date < today) return 'completed';
    return 'confirmed';
  };

  const getStatusLabel = (apt) => {
    const s = getStatus(apt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /* ──────────────────────────────────────
   * Render Appointment List
   * ────────────────────────────────────── */

  const renderAppointments = () => {
    const container = $('#apt-list');
    if (!container) return;

    const today = getTodayISO();

    // Filter based on active tab
    let filtered;
    if (activeFilter === 'today') {
      filtered = allAppointments.filter((a) => a.date === today && a.status !== 'cancelled');
    } else if (activeFilter === 'upcoming') {
      filtered = allAppointments.filter((a) => a.date >= today && a.status !== 'cancelled');
    } else {
      filtered = [...allAppointments];
    }

    // Sort chronologically
    const sorted = filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-msg">
          <span class="empty-icon">📋</span>
          <p>No appointments scheduled</p>
          <p>Your schedule is clear for this period.</p>
        </div>`;
      return;
    }

    container.innerHTML = sorted.map((apt) => {
      const status = getStatus(apt);
      const dateLabel = apt.date === today ? '' : ` · ${formatDateShort(apt.date)}`;
      return `
        <div class="apt-card" data-apt-id="${apt._id}" role="button" tabindex="0" aria-label="View appointment for ${apt.patientName}">
          <div class="apt-time-badge">${formatTime12(apt.startTime)}</div>
          <div class="apt-info">
            <div class="apt-patient">${apt.patientName}</div>
            <div class="apt-meta">${apt.specialty || (doctorInfo && doctorInfo.specialty) || ''} · ${apt.roomName || apt.roomId}${dateLabel}</div>
          </div>
          <span class="apt-status status-${status}">${getStatusLabel(apt)}</span>
        </div>`;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.apt-card').forEach((card) => {
      card.addEventListener('click', () => {
        const aptId = card.dataset.aptId;
        const apt = allAppointments.find((a) => a._id === aptId);
        if (apt) showDetailModal(apt);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  };

  /* ──────────────────────────────────────
   * Detail Modal
   * ────────────────────────────────────── */

  const showDetailModal = (apt) => {
    const existing = $('#detail-modal');
    if (existing) existing.remove();

    const status = getStatusLabel(apt);
    const statusClass = getStatus(apt);

    const html = `
      <div class="modal-overlay" id="detail-modal" role="dialog" aria-labelledby="detail-title" aria-modal="true">
        <div class="modal-content">
          <button class="modal-close" id="detail-close" aria-label="Close">&times;</button>
          <h2 id="detail-title" class="modal-title">Appointment Details</h2>
          <div class="detail-grid">
            <div class="detail-row">
              <span class="detail-label">Patient</span>
              <span class="detail-value">${apt.patientName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Specialty</span>
              <span class="detail-value">${apt.specialty || (doctorInfo && doctorInfo.specialty) || '—'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDateLong(apt.date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time</span>
              <span class="detail-value">${formatTime12(apt.startTime)} – ${formatTime12(apt.endTime)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Duration</span>
              <span class="detail-value">${apt.duration} minutes</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Room</span>
              <span class="detail-value">${apt.roomName || apt.roomId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status</span>
              <span class="detail-value"><span class="apt-status status-${statusClass}">${status}</span></span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="detail-done">Close</button>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    const modal = $('#detail-modal');
    const closeBtn = $('#detail-close');
    const doneBtn = $('#detail-done');

    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);
    doneBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    doneBtn.focus();

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
  };

  /* ──────────────────────────────────────
   * Weekly Calendar
   * ────────────────────────────────────── */

  const renderCalendar = () => {
    const container = $('#cal-container');
    const weekLabel = $('#week-label');
    if (!container) return;

    const dates = getWeekDates(weekOffset);
    const today = getTodayISO();
    if (weekLabel) weekLabel.textContent = getWeekLabel(dates);

    // Time rows: 8:00 to 18:00 (hourly)
    const hours = [];
    for (let h = 8; h <= 17; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }

    // Build header
    let html = '<div class="cal-header">';
    html += '<div class="cal-header-cell">Time</div>';
    dates.forEach((d) => {
      const isToday = d === today;
      html += `<div class="cal-header-cell${isToday ? ' today-col' : ''}">${formatDateShort(d)}</div>`;
    });
    html += '</div>';

    // Build body rows
    html += '<div class="cal-body">';
    hours.forEach((hour) => {
      html += '<div class="cal-row">';
      html += `<div class="cal-time-cell">${formatTime12(hour)}</div>`;
      const hourMins = timeToMinutes(hour);
      const nextHourMins = hourMins + 60;

      dates.forEach((dateStr) => {
        const isToday = dateStr === today;
        html += `<div class="cal-day-cell${isToday ? ' today-bg' : ''}">`;

        // Find appointments in this hour block
        const cellApts = allAppointments.filter((a) => {
          if (a.date !== dateStr || a.status === 'cancelled') return false;
          const aStart = timeToMinutes(a.startTime);
          const aEnd = timeToMinutes(a.endTime);
          return aStart < nextHourMins && aEnd > hourMins;
        });

        cellApts.forEach((apt) => {
          html += `
            <div class="cal-event" data-apt-id="${apt._id}" title="${apt.patientName} · ${apt.startTime}–${apt.endTime}">
              <span class="cal-event-name">${apt.patientName}</span>
              <span class="cal-event-time">${apt.startTime}–${apt.endTime}</span>
            </div>`;
        });

        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Click events on calendar
    container.querySelectorAll('.cal-event').forEach((ev) => {
      ev.addEventListener('click', () => {
        const apt = allAppointments.find((a) => a._id === ev.dataset.aptId);
        if (apt) showDetailModal(apt);
      });
    });
  };

  /* ──────────────────────────────────────
   * View Switching
   * ────────────────────────────────────── */

  const switchView = (view) => {
    activeView = view;
    const aptSection = $('#section-appointments');
    const calSection = $('#section-schedule');

    if (view === 'appointments') {
      show(aptSection);
      hide(calSection);
    } else {
      hide(aptSection);
      show(calSection);
      renderCalendar();
    }

    // Update sidebar
    $$('.sidebar-nav a').forEach((a) => a.classList.remove('active'));
    const activeLink = $(`.sidebar-nav a[data-view="${view}"]`);
    if (activeLink) activeLink.classList.add('active');
  };

  /* ──────────────────────────────────────
   * Logout
   * ────────────────────────────────────── */

  const logout = () => {
    sessionStorage.removeItem('doctorToken');
    sessionStorage.removeItem('doctorRole');
    sessionStorage.removeItem('doctorId');
    sessionStorage.removeItem('doctorName');
    sessionStorage.removeItem('doctorEmail');
    window.location.href = 'doctor-login.html';
  };

  /* ──────────────────────────────────────
   * Event Listeners
   * ────────────────────────────────────── */

  const attachListeners = () => {
    // Logout
    const logoutBtn = $('#btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Sidebar navigation
    $$('.sidebar-nav a[data-view]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
      });
    });

    // Sidebar logout link
    const sideLogout = $('a[data-action="logout"]');
    if (sideLogout) sideLogout.addEventListener('click', (e) => { e.preventDefault(); logout(); });

    // Appointment filter tabs
    $$('.tab-btn[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        $$('.tab-btn[data-filter]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderAppointments();
      });
    });

    // Week navigation
    const prevWeek = $('#btn-prev-week');
    const nextWeek = $('#btn-next-week');
    const thisWeek = $('#btn-this-week');

    if (prevWeek) prevWeek.addEventListener('click', () => { weekOffset--; renderCalendar(); });
    if (nextWeek) nextWeek.addEventListener('click', () => { weekOffset++; renderCalendar(); });
    if (thisWeek) thisWeek.addEventListener('click', () => { weekOffset = 0; renderCalendar(); });
  };

  /* ──────────────────────────────────────
   * Initialize
   * ────────────────────────────────────── */

  const init = async () => {
    if (!checkAuth()) return;

    // Show loading
    const aptList = $('#apt-list');
    if (aptList) aptList.innerHTML = '<div class="loading-msg">Loading appointments...</div>';

    attachListeners();

    // Load data in parallel
    await Promise.all([loadDoctorInfo(), loadAppointments()]);

    // Render everything
    renderHeader();
    renderGreeting();
    renderStats();
    renderAppointments();

    console.log('[Dashboard] Initialized.');
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => DoctorDashboard.init());
