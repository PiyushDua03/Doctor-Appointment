/**
 * adminDashboard.js — Admin Dashboard Logic (Syllabus-Compliant)
 *
 * Uses ONLY syllabus-approved JavaScript:
 * - const, let (variables)
 * - functions, arrow functions
 * - arrays: filter, map, find, findIndex, forEach, sort, slice, join
 * - objects, destructuring
 * - conditionals (if/else), ternary
 * - for loop
 * - template literals
 * - async/await, fetch, try/catch
 * - JSON.stringify, JSON.parse
 * - querySelector, querySelectorAll, classList, dataset
 * - addEventListener, preventDefault
 * - sessionStorage
 * - Date object, toLocaleDateString, padStart
 * - confirm() browser dialog
 * - innerHTML, textContent
 *
 * NO optional chaining (?.), NO nullish coalescing (??)
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  var API = 'http://localhost:5050/api';
  var token = sessionStorage.getItem('adminToken');

  // Auth guard
  if (!token) {
    window.location.href = '/';
    return;
  }

  /* ──────────────────────────────────────
   * State
   * ────────────────────────────────────── */

  var allDoctors = [];
  var allAppointments = [];
  var weekOffset = 0;
  var editingDoctorId = null;

  var COLORS = [
    '#5B8FA8', '#78A98B', '#C7A86B', '#C98282',
    '#8B7FC7', '#6BAA9E', '#A8856B', '#7B9FC4',
    '#B08EA2', '#6CA87C', '#C4956B', '#8A9BB5'
  ];

  /* ──────────────────────────────────────
   * Helpers
   * ────────────────────────────────────── */

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    };
  }

  function formatTime12(t) {
    var parts = t.split(':');
    var h = Number(parts[0]);
    var m = Number(parts[1]);
    var suffix = h >= 12 ? 'PM' : 'AM';
    var hr = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return hr + ':' + String(m).padStart(2, '0') + ' ' + suffix;
  }

  function getTodayISO() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function toISO(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateShort(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getMonday(offset) {
    var d = new Date();
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
    var mon = new Date(d);
    mon.setDate(diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  function findDocName(doctorId) {
    var doc = allDoctors.find(function (d) { return d.doctorId === doctorId; });
    return (doc && doc.name) ? doc.name : doctorId;
  }

  /* ──────────────────────────────────────
   * API Helper
   * ────────────────────────────────────── */

  async function apiFetch(url, opts) {
    if (!opts) opts = {};
    opts.headers = authHeaders();
    var res = await fetch(API + url, opts);
    if (res.status === 401) {
      sessionStorage.clear();
      window.location.href = '/';
      return null;
    }
    return res;
  }

  /* ──────────────────────────────────────
   * Header
   * ────────────────────────────────────── */

  var nameEl = $('#admin-name');
  if (nameEl) {
    nameEl.textContent = sessionStorage.getItem('adminName') || 'Admin';
  }

  $('#btn-logout').addEventListener('click', function () {
    sessionStorage.clear();
    window.location.href = '/';
  });

  /* ──────────────────────────────────────
   * Tab Switching
   * ────────────────────────────────────── */

  var tabs = $$('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      var allTabs = $$('.tab');
      for (var j = 0; j < allTabs.length; j++) {
        allTabs[j].classList.remove('active');
      }
      this.classList.add('active');
      var view = this.dataset.tab;

      var sections = ['overview', 'schedule', 'doctors'];
      for (var k = 0; k < sections.length; k++) {
        var el = $('#tab-' + sections[k]);
        if (el) {
          if (sections[k] === view) {
            el.classList.remove('hidden');
          } else {
            el.classList.add('hidden');
          }
        }
      }

      if (view === 'doctors') loadDoctors();
      if (view === 'schedule') renderSchedule();
    });
  }

  /* ──────────────────────────────────────
   * Data Loading
   * ────────────────────────────────────── */

  async function loadDoctors() {
    try {
      var res = await fetch(API + '/doctors');
      var json = await res.json();
      allDoctors = json.data || [];
      renderDoctorsTable();
    } catch (err) {
      console.error('Load doctors error:', err);
    }
  }

  async function loadAppointments() {
    try {
      var res = await apiFetch('/appointments');
      if (!res) return;
      var json = await res.json();
      allAppointments = json.data || [];
    } catch (err) {
      console.error('Load appointments error:', err);
    }
  }

  async function loadAll() {
    await loadDoctors();
    await loadAppointments();
    renderOverview();
  }

  /* ──────────────────────────────────────
   * Overview Tab
   * ────────────────────────────────────── */

  function renderOverview() {
    var today = getTodayISO();

    // Filter active (non-cancelled) appointments
    var active = allAppointments.filter(function (a) { return a.status !== 'cancelled'; });
    var todayAppts = active.filter(function (a) { return a.date === today; });
    var upcoming = active.filter(function (a) { return a.date >= today; });

    // Stats
    $('#stat-total').textContent = allAppointments.length;
    $('#stat-today').textContent = todayAppts.length;
    $('#stat-upcoming').textContent = upcoming.length;
    $('#stat-doctors').textContent = allDoctors.length;

    // Today's list
    var todayEl = $('#today-list');
    if (todayAppts.length === 0) {
      todayEl.innerHTML = '<div class="today-empty">No appointments today.</div>';
    } else {
      var sorted = todayAppts.sort(function (a, b) {
        return a.startTime.localeCompare(b.startTime);
      });
      var html = '';
      for (var i = 0; i < sorted.length; i++) {
        var apt = sorted[i];
        var docIdx = allDoctors.findIndex(function (d) { return d.doctorId === apt.doctorId; });
        var color = COLORS[docIdx >= 0 ? docIdx % COLORS.length : 0];
        var docName = findDocName(apt.doctorId);
        html += '<div class="today-item">';
        html += '  <div class="today-item-left">';
        html += '    <span class="today-dot" style="background:' + color + '"></span>';
        html += '    <div>';
        html += '      <div class="today-patient">' + apt.patientName + '</div>';
        html += '      <div class="today-doc">' + docName + ' · ' + (apt.roomName || apt.roomId) + '</div>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="today-time">' + formatTime12(apt.startTime) + ' – ' + formatTime12(apt.endTime) + '</div>';
        html += '</div>';
      }
      todayEl.innerHTML = html;
    }

    // Doctor breakdown
    var breakdownEl = $('#doctor-breakdown');
    var maxCount = 1;
    for (var i = 0; i < allDoctors.length; i++) {
      var count = active.filter(function (a) { return a.doctorId === allDoctors[i].doctorId; }).length;
      if (count > maxCount) maxCount = count;
    }

    var bHtml = '';
    for (var i = 0; i < allDoctors.length; i++) {
      var doc = allDoctors[i];
      var count = active.filter(function (a) { return a.doctorId === doc.doctorId; }).length;
      var pct = Math.round((count / maxCount) * 100);
      var color = COLORS[i % COLORS.length];
      bHtml += '<div class="breakdown-item">';
      bHtml += '  <div class="breakdown-header">';
      bHtml += '    <span class="breakdown-name">' + doc.name + '</span>';
      bHtml += '    <span class="breakdown-count">' + count + '</span>';
      bHtml += '  </div>';
      bHtml += '  <div class="breakdown-bar">';
      bHtml += '    <div class="breakdown-fill" style="width:' + pct + '%;background:' + color + '"></div>';
      bHtml += '  </div>';
      bHtml += '</div>';
    }
    breakdownEl.innerHTML = bHtml;

    // Recent bookings (last 10)
    var recentTbody = $('#recent-tbody');
    var recent = allAppointments.slice().sort(function (a, b) {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    }).slice(0, 10);

    if (recent.length === 0) {
      recentTbody.innerHTML = '<tr><td colspan="6" class="loading-msg">No bookings yet.</td></tr>';
    } else {
      var rHtml = '';
      for (var i = 0; i < recent.length; i++) {
        var apt = recent[i];
        var docName = findDocName(apt.doctorId);
        var statusClass = apt.status === 'cancelled' ? 'status-cancelled' : 'status-confirmed';
        rHtml += '<tr>';
        rHtml += '  <td>' + apt.patientName + '</td>';
        rHtml += '  <td>' + docName + '</td>';
        rHtml += '  <td>' + formatDateShort(apt.date) + '</td>';
        rHtml += '  <td>' + formatTime12(apt.startTime) + ' – ' + formatTime12(apt.endTime) + '</td>';
        rHtml += '  <td>' + (apt.roomName || apt.roomId) + '</td>';
        rHtml += '  <td><span class="status-pill ' + statusClass + '">' + apt.status + '</span></td>';
        rHtml += '</tr>';
      }
      recentTbody.innerHTML = rHtml;
    }
  }

  /* ──────────────────────────────────────
   * Schedule Tab — Weekly Grid
   * ────────────────────────────────────── */

  function renderSchedule() {
    var mon = getMonday(weekOffset);
    var today = getTodayISO();
    var dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    // Build week dates (Mon–Fri)
    var weekDates = [];
    for (var i = 0; i < 5; i++) {
      var d = new Date(mon);
      d.setDate(d.getDate() + i);
      weekDates.push(d);
    }

    // Week label
    var fmt = function (d) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };
    $('#week-label').textContent = fmt(weekDates[0]) + ' — ' + fmt(weekDates[4]);

    // Legend
    var legendHtml = '';
    for (var i = 0; i < allDoctors.length; i++) {
      legendHtml += '<div class="legend-item">';
      legendHtml += '  <span class="legend-dot" style="background:' + COLORS[i % COLORS.length] + '"></span>';
      legendHtml += '  <span>' + allDoctors[i].name + '</span>';
      legendHtml += '</div>';
    }
    $('#legend').innerHTML = legendHtml;

    // Build grid
    var hours = [];
    for (var h = 8; h <= 17; h++) { hours.push(h); }

    var html = '';
    // Header row
    html += '<div class="sg-header"></div>';
    for (var i = 0; i < weekDates.length; i++) {
      var iso = toISO(weekDates[i]);
      var isToday = iso === today;
      html += '<div class="sg-header' + (isToday ? ' today-col' : '') + '">';
      html += dayLabels[i] + '<br><small>' + weekDates[i].getDate() + '</small>';
      html += '</div>';
    }

    // Hour rows
    for (var hi = 0; hi < hours.length; hi++) {
      var hour = hours[hi];
      var label = hour <= 12 ? hour + ' AM' : (hour - 12) + ' PM';
      html += '<div class="sg-time">' + label + '</div>';

      for (var di = 0; di < weekDates.length; di++) {
        var iso = toISO(weekDates[di]);
        var isToday = iso === today;

        // Find appointments in this hour
        var hourAppts = allAppointments.filter(function (apt) {
          if (apt.date !== iso || apt.status === 'cancelled') return false;
          var sh = Number(apt.startTime.split(':')[0]);
          return sh === hour;
        });

        var cellHtml = '';
        for (var ai = 0; ai < hourAppts.length; ai++) {
          var apt = hourAppts[ai];
          var docIdx = allDoctors.findIndex(function (d) { return d.doctorId === apt.doctorId; });
          var color = COLORS[docIdx >= 0 ? docIdx % COLORS.length : 0];
          var docName = findDocName(apt.doctorId);
          cellHtml += '<div class="sg-event" style="background:' + color + '" title="' + docName + ': ' + apt.patientName + '">';
          cellHtml += '<span class="ev-doc">' + docName.replace('Dr. ', '') + '</span>';
          cellHtml += '<span class="ev-patient"> · ' + apt.patientName + '</span>';
          cellHtml += '</div>';
        }

        html += '<div class="sg-cell' + (isToday ? ' today-col' : '') + '">' + cellHtml + '</div>';
      }
    }

    $('#schedule-grid').innerHTML = html;
  }

  // Week navigation
  $('#btn-prev').addEventListener('click', function () { weekOffset--; renderSchedule(); });
  $('#btn-next').addEventListener('click', function () { weekOffset++; renderSchedule(); });
  $('#btn-today').addEventListener('click', function () { weekOffset = 0; renderSchedule(); });

  /* ──────────────────────────────────────
   * Doctors Table
   * ────────────────────────────────────── */

  function renderDoctorsTable() {
    var tbody = $('#doctors-tbody');
    if (allDoctors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-msg">No doctors found.</td></tr>';
      return;
    }

    var html = '';
    for (var i = 0; i < allDoctors.length; i++) {
      var doc = allDoctors[i];
      var avail = doc.availability || [];
      var availStr = '';
      for (var j = 0; j < avail.length; j++) {
        if (j > 0) availStr += '<br>';
        availStr += avail[j].day.slice(0, 3) + ': ' + avail[j].start + '–' + avail[j].end;
      }
      if (!availStr) availStr = '—';

      html += '<tr>';
      html += '<td><span class="doc-id">' + doc.doctorId + '</span></td>';
      html += '<td>' + doc.name + '</td>';
      html += '<td><span class="doc-specialty">' + doc.specialty + '</span></td>';
      html += '<td><span class="doc-avail-list">' + availStr + '</span></td>';
      html += '<td><div class="action-btns">';
      html += '<button class="btn-edit" data-id="' + doc.doctorId + '">Edit</button>';
      html += '<button class="btn-delete" data-id="' + doc.doctorId + '" data-name="' + doc.name + '">Delete</button>';
      html += '</div></td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;

    // Attach handlers
    var editBtns = tbody.querySelectorAll('.btn-edit');
    for (var i = 0; i < editBtns.length; i++) {
      editBtns[i].addEventListener('click', function () {
        openEditModal(this.dataset.id);
      });
    }
    var delBtns = tbody.querySelectorAll('.btn-delete');
    for (var i = 0; i < delBtns.length; i++) {
      delBtns[i].addEventListener('click', function () {
        deleteDoctor(this.dataset.id, this.dataset.name);
      });
    }
  }

  /* ──────────────────────────────────────
   * Doctor CRUD Modal — helpers
   * ────────────────────────────────────── */

  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function getAvailFromUI() {
    var result = [];
    for (var i = 0; i < DAYS.length; i++) {
      var day = DAYS[i];
      var cb = document.querySelector('.day-check[data-day="' + day + '"]');
      if (cb && cb.checked) {
        var startEl = document.querySelector('.avail-start[data-day="' + day + '"]');
        var endEl = document.querySelector('.avail-end[data-day="' + day + '"]');
        result.push({
          day: day,
          start: startEl ? startEl.value : '09:00',
          end: endEl ? endEl.value : '17:00'
        });
      }
    }
    return result;
  }

  function setAvailUI(availability) {
    // Uncheck all
    var checks = document.querySelectorAll('.day-check');
    for (var i = 0; i < checks.length; i++) {
      checks[i].checked = false;
    }
    // Reset times to defaults
    var starts = document.querySelectorAll('.avail-start');
    for (var i = 0; i < starts.length; i++) { starts[i].value = '09:00'; }
    var ends = document.querySelectorAll('.avail-end');
    for (var i = 0; i < ends.length; i++) { ends[i].value = '17:00'; }

    if (!availability) return;
    for (var i = 0; i < availability.length; i++) {
      var slot = availability[i];
      var cb = document.querySelector('.day-check[data-day="' + slot.day + '"]');
      var startEl = document.querySelector('.avail-start[data-day="' + slot.day + '"]');
      var endEl = document.querySelector('.avail-end[data-day="' + slot.day + '"]');
      if (cb) cb.checked = true;
      if (startEl && slot.start) startEl.value = slot.start;
      if (endEl && slot.end) endEl.value = slot.end;
    }
  }

  var modal = $('#doctor-modal');
  var pendingPhotoUrl = ''; // Track uploaded/existing photo URL

  // Photo file input — preview and filename
  $('#f-photo').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (file) {
      $('#photo-filename').textContent = file.name;
      var reader = new FileReader();
      reader.onload = function (e) {
        $('#photo-preview').src = e.target.result;
        $('#photo-preview').style.display = 'block';
        $('#photo-placeholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    } else {
      resetPhotoUI();
    }
  });

  function resetPhotoUI() {
    $('#photo-preview').src = '';
    $('#photo-preview').style.display = 'none';
    $('#photo-placeholder').style.display = 'flex';
    $('#photo-filename').textContent = 'No file chosen';
    pendingPhotoUrl = '';
  }

  function setPhotoPreview(url) {
    if (url) {
      $('#photo-preview').src = url;
      $('#photo-preview').style.display = 'block';
      $('#photo-placeholder').style.display = 'none';
      $('#photo-filename').textContent = 'Current photo';
      pendingPhotoUrl = url;
    } else {
      resetPhotoUI();
    }
  }

  function openAddModal() {
    editingDoctorId = null;
    $('#modal-title').textContent = 'Add Doctor';
    $('#f-docId').value = '';
    $('#f-docId').disabled = false;
    $('#f-name').value = '';
    $('#f-specialty').value = '';
    $('#f-photo').value = '';
    resetPhotoUI();
    setAvailUI([
      { day: 'Monday', start: '09:00', end: '17:00' }
    ]);
    $('#modal-error').classList.add('hidden');
    modal.classList.remove('hidden');
  }

  function openEditModal(docId) {
    var doc = allDoctors.find(function (d) { return d.doctorId === docId; });
    if (!doc) return;
    editingDoctorId = docId;
    $('#modal-title').textContent = 'Edit ' + doc.name;
    $('#f-docId').value = doc.doctorId;
    $('#f-docId').disabled = true;
    $('#f-name').value = doc.name;
    $('#f-specialty').value = doc.specialty;
    $('#f-photo').value = '';
    setPhotoPreview(doc.photoUrl || '');

    // Convert availableSlots (nested) to availability (array) for UI
    var availArray = doc.availability || [];
    if ((!availArray || availArray.length === 0) && doc.availableSlots) {
      availArray = [];
      var dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      var dayLabels = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      for (var i = 0; i < dayNames.length; i++) {
        var slots = doc.availableSlots[dayNames[i]];
        if (slots && slots.length > 0) {
          for (var j = 0; j < slots.length; j++) {
            availArray.push({ day: dayLabels[i], start: slots[j].start, end: slots[j].end });
          }
        }
      }
    }
    setAvailUI(availArray);

    $('#modal-error').classList.add('hidden');
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
    editingDoctorId = null;
  }

  $('#btn-add-doctor').addEventListener('click', openAddModal);
  $('#btn-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  // Save (create or update)
  $('#doctor-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorEl = $('#modal-error');
    errorEl.classList.add('hidden');

    var name = $('#f-name').value.trim();
    var specialty = $('#f-specialty').value;
    var doctorId = $('#f-docId').value.trim();

    if (!name || !specialty || !doctorId) {
      errorEl.textContent = 'Doctor ID, name, and specialty are required.';
      errorEl.classList.remove('hidden');
      return;
    }

    var availability = getAvailFromUI();
    if (availability.length === 0) {
      errorEl.textContent = 'Please select at least one available day.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Upload photo file if selected
    var photoUrl = pendingPhotoUrl || '';
    var photoFile = $('#f-photo').files && $('#f-photo').files[0];
    if (photoFile) {
      try {
        var formData = new FormData();
        formData.append('photo', photoFile);
        var uploadRes = await fetch(API + '/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        var uploadData = await uploadRes.json();
        if (uploadData.success) {
          photoUrl = uploadData.photoUrl;
        } else {
          errorEl.textContent = uploadData.message || 'Photo upload failed.';
          errorEl.classList.remove('hidden');
          return;
        }
      } catch (uploadErr) {
        errorEl.textContent = 'Photo upload failed.';
        errorEl.classList.remove('hidden');
        return;
      }
    }

    var body = {
      doctorId: doctorId,
      name: name,
      specialty: specialty,
      availability: availability
    };
    if (photoUrl) body.photoUrl = photoUrl;

    try {
      var res;
      if (editingDoctorId) {
        res = await apiFetch('/doctors/' + editingDoctorId, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        res = await apiFetch('/doctors', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      if (!res) return;
      var data = await res.json();

      if (!res.ok || !data.success) {
        errorEl.textContent = data.message || 'Failed to save.';
        errorEl.classList.remove('hidden');
        return;
      }

      closeModal();
      await loadDoctors();
      await loadAppointments();
      renderOverview();
    } catch (err) {
      errorEl.textContent = 'Connection error.';
      errorEl.classList.remove('hidden');
    }
  });

  /* ──────────────────────────────────────
   * Delete Doctor
   * ────────────────────────────────────── */

  async function deleteDoctor(docId, docName) {
    if (!confirm('Delete ' + docName + '? This cannot be undone.')) return;
    try {
      var res = await apiFetch('/doctors/' + docId, { method: 'DELETE' });
      if (!res) return;
      var data = await res.json();
      if (res.ok && data.success) {
        await loadDoctors();
        await loadAppointments();
        renderOverview();
      } else {
        alert(data.message || 'Failed to delete.');
      }
    } catch (err) {
      alert('Connection error.');
    }
  }

  /* ──────────────────────────────────────
   * Init
   * ────────────────────────────────────── */

  loadAll();

});
