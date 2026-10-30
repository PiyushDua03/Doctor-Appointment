// Doctor Dashboard Logic (Appointments Workflow, Telehealth Video, Prescriptions & Availability)

let activeAppointmentForRx = null;

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard: Require doctor role
  if (!window.Auth.requireAuth('doctor')) return;

  const user = window.Auth.getUser();
  const welcomeEl = document.getElementById('doctor-welcome-name');
  if (welcomeEl) welcomeEl.innerText = user.name;

  loadDoctorAppointments();
  setupTabs();
  setupAvailabilityForm();
  setupWizardForm();
  setupProfileForm();
  setupRxModal();
});

// Setup Dashboard Tab Navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.dash-menu-link');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const targetSection = tab.dataset.target;
      document.querySelectorAll('.dash-section').forEach((sec) => (sec.style.display = 'none'));
      const activeSec = document.getElementById(targetSection);
      if (activeSec) activeSec.style.display = 'block';

      // Sync active state in top navbar
      document.querySelectorAll('#desktop-nav-links a').forEach((a) => a.classList.remove('active'));
      const navItem = document.querySelector(`#desktop-nav-links a[data-section="${targetSection}"]`);
      if (navItem) navItem.classList.add('active');
    });
  });

  // Check URL hash on page load
  const hash = window.location.hash ? window.location.hash.substring(1) : '';
  if (hash) {
    const matchingTab = document.querySelector(`.dash-menu-link[data-target="${hash}"]`);
    if (matchingTab) matchingTab.click();
  }
}

// Load Doctor Appointments
async function loadDoctorAppointments(statusFilter = 'all') {
  const container = document.getElementById('doctor-appointments-tbody');
  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--navy-muted);">
        <div style="display: inline-block; width: 28px; height: 28px; border: 2.5px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p style="margin-top: 0.5rem; font-size: 0.85rem;">Loading hospital patient appointments...</p>
      </td>
    </tr>
  `;

  try {
    const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const data = await window.apiFetch(`/appointments/my${query}`);
    const appointments = data.appointments || [];
    window.currentDoctorAppointments = appointments;

    // Calculate metrics
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;
    let totalRevenue = 0;

    appointments.forEach((a) => {
      if (a.status === 'pending') pendingCount++;
      if (a.status === 'confirmed') confirmedCount++;
      if (a.status === 'completed') {
        completedCount++;
        totalRevenue += a.fee || 0;
      }
    });

    if (document.getElementById('stat-doc-total')) document.getElementById('stat-doc-total').innerText = appointments.length;
    if (document.getElementById('stat-doc-pending')) document.getElementById('stat-doc-pending').innerText = pendingCount;
    if (document.getElementById('stat-doc-confirmed')) document.getElementById('stat-doc-confirmed').innerText = confirmedCount;
    if (document.getElementById('stat-doc-revenue')) document.getElementById('stat-doc-revenue').innerText = `₹${totalRevenue}`;

    // Update Live OPD Queue Card
    const activeConfirmed = appointments.filter((a) => a.status === 'confirmed');
    if (activeConfirmed.length > 0) {
      const p1 = activeConfirmed[0].patientId || {};
      const curEl = document.getElementById('queue-current-patient');
      if (curEl) curEl.innerText = `Token #01 — ${p1.name || 'Patient'} (${activeConfirmed[0].startTime})`;

      const nextEl = document.getElementById('queue-next-patient');
      if (nextEl) {
        if (activeConfirmed.length > 1) {
          const p2 = activeConfirmed[1].patientId || {};
          nextEl.innerText = `Token #02 — ${p2.name || 'Patient'} (${activeConfirmed[1].startTime})`;
        } else {
          nextEl.innerText = 'No more waiting patients';
        }
      }
    }

    if (appointments.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--navy-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
            <p>No appointments found for the selected filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = appointments
      .map((apt) => {
        const patient = apt.patientId || {};
        const statusBadge = `<span class="badge badge-${apt.status}">${apt.status}</span>`;
        const modeBadge = `<span style="font-size: 0.75rem; background: var(--navy-light); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-light); font-weight: 600;">${apt.consultationType || 'In-Clinic'}</span>`;

        let actionBtns = `<div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">`;

        // Always show Patient Medical Records button if patient ID is known
        const patId = patient._id || (typeof apt.patientId === 'string' ? apt.patientId : '');
        if (patId) {
          actionBtns += `
            <button onclick="window.viewPatientRecords('${patId}', '${(patient.name || 'Patient').replace(/'/g, "\\'")}')" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="View Patient Lab Reports & Medical Records">
              📁 Records
            </button>
          `;
        }

        if (apt.status === 'pending') {
          actionBtns += `
            <button onclick="updateStatus('${apt._id}', 'confirmed')" class="btn btn-success btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Accept</button>
            <button onclick="updateStatus('${apt._id}', 'rejected')" class="btn btn-danger btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Reject</button>
          `;
        } else if (apt.status === 'confirmed') {
          actionBtns += `
            <button onclick="window.doctorCallPatient('${apt.appointmentId || apt._id}', '${(patient.name || 'Patient').replace(/'/g, "\\'")}')" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; background: #0284c7; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Call Patient for Live Consultation">
              📞 Call Patient
            </button>
            <button onclick="openPrescribeModal('${apt._id}', '${(patient.name || 'Patient').replace(/'/g, "\\'")}')" class="btn btn-success btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; background: #059669;">Complete & Rx</button>
            <button onclick="window.downloadIcsFile(window.currentDoctorAppointments.find(a => (a._id === '${apt._id}' || a.appointmentId === '${apt.appointmentId}')))" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.45rem; font-size: 0.75rem;" title="Download .ICS Calendar Invite">
              📅 Cal
            </button>
            <button onclick="updateStatus('${apt._id}', 'cancelled')" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Cancel</button>
          `;
        } else if (apt.status === 'completed') {
          actionBtns += `
            <button onclick="window.openPrescriptionViewer(window.currentDoctorAppointments.find(a => (a._id === '${apt._id}' || a.appointmentId === '${apt.appointmentId}')))" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-color: #0d9488; color: #0d9488; font-weight: 700;" title="View & Print Official Medical Rx">
              📄 View Rx
            </button>
          `;
        } else {
          actionBtns += `<span style="font-size: 0.8rem; color: var(--navy-muted); font-weight: 500;">Closed</span>`;
        }

        actionBtns += `</div>`;

        return `
          <tr>
            <td>
              <span style="font-family: monospace; font-weight: 700; color: var(--primary); font-size: 0.85rem;">
                ${apt.appointmentId || apt._id.slice(-6)}
              </span>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <img src="${patient.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
                <div>
                  <div style="font-weight: 700; color: var(--navy-dark);">${patient.name || 'Patient'}</div>
                  <div style="font-size: 0.75rem; color: var(--navy-muted);">${patient.gender || ''} ${patient.age ? `• ${patient.age} yrs` : ''}</div>
                </div>
              </div>
            </td>
            <td>
              <div style="font-weight: 600; color: var(--navy-dark);">${apt.appointmentDate}</div>
              <div style="font-size: 0.8rem; color: var(--navy-muted);">${apt.startTime}</div>
            </td>
            <td>${modeBadge}</td>
            <td><span style="font-size: 0.85rem; color: var(--navy-slate);">${apt.reason || 'General'}</span></td>
            <td>${statusBadge}</td>
            <td>${actionBtns}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Error fetching doctor appointments:', err);
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

// Update Appointment Status (Accept, Reject, Complete, Cancel)
window.updateStatus = async (appointmentId, newStatus, extraData = {}) => {
  try {
    await window.apiFetch(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus, ...extraData }),
    });

    window.showToast(`Appointment status updated to ${newStatus}.`, 'success');
    loadDoctorAppointments();
  } catch (err) {
    window.showToast(err.message || 'Error updating status', 'error');
  }
};

// Web Audio API Hospital Electronic OPD Token Chime (Pure Synthesizer, 0 External Dependencies)
function playHospitalChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Hospital Dual-Tone Ding-Dong Chime: E5 (659Hz) followed by C5 (523Hz)
    playTone(659.25, 0, 0.45);
    playTone(523.25, 0.35, 0.75);
  } catch (e) {
    console.warn('AudioContext not allowed or supported', e);
  }
}

let opdQueueIndex = 1;
const sampleQueuePatients = [
  'Rahul Sharma (10:00 AM)',
  'Anita Roy (10:30 AM)',
  'Amit Verma (11:00 AM)',
  'Pooja Nair (11:30 AM)',
  'Vikram Malhotra (12:00 PM)',
  'Sunita Patel (12:30 PM)',
];

// Live OPD Queue: Call Next Patient Chime & Token Advance
window.callNextOPDPatient = () => {
  playHospitalChime();

  const curEl = document.getElementById('queue-current-patient');
  const nextEl = document.getElementById('queue-next-patient');

  const currentPatient = sampleQueuePatients[opdQueueIndex - 1] || `Patient #${opdQueueIndex}`;
  const nextPatient = sampleQueuePatients[opdQueueIndex] || 'No more waiting patients';

  if (curEl) {
    curEl.innerText = `Token #${String(opdQueueIndex).padStart(2, '0')} — ${currentPatient}`;
    curEl.style.transform = 'scale(1.05)';
    curEl.style.transition = 'transform 0.25s ease';
    setTimeout(() => { curEl.style.transform = 'scale(1)'; }, 300);
  }
  if (nextEl) {
    nextEl.innerText = nextPatient !== 'No more waiting patients' 
      ? `Token #${String(opdQueueIndex + 1).padStart(2, '0')} — ${nextPatient}`
      : 'No more waiting patients';
  }

  window.showToast(`🔔 Electronic OPD Chime: Calling Token #${String(opdQueueIndex).padStart(2, '0')} (${currentPatient}) to Cabin 304!`, 'success');
  opdQueueIndex++;
  if (opdQueueIndex > sampleQueuePatients.length) {
    opdQueueIndex = 1; // loop back
  }
};

// Export Doctor Consultations to CSV / Excel
window.exportDoctorAppointmentsCSV = () => {
  const apts = window.currentDoctorAppointments || [];
  if (apts.length === 0) {
    window.showToast('No consultations available to export.', 'warning');
    return;
  }

  const headers = ['Booking ID', 'Patient Name', 'Phone', 'Date', 'Time', 'Mode', 'Fee (INR)', 'Reason', 'Status', 'Diagnosis Notes', 'Prescription'];
  const rows = apts.map((apt) => {
    const p = apt.patientId || {};
    return [
      `"${apt.appointmentId || apt._id}"`,
      `"${p.name || 'Patient'}"`,
      `"${p.phone || ''}"`,
      `"${apt.appointmentDate || ''}"`,
      `"${apt.startTime || ''}"`,
      `"${apt.consultationType || 'In-Clinic'}"`,
      `"${apt.fee || 0}"`,
      `"${(apt.reason || '').replace(/"/g, '""')}"`,
      `"${apt.status || ''}"`,
      `"${(apt.notes || '').replace(/"/g, '""')}"`,
      `"${(apt.prescription || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `DoctorP_Consultations_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.showToast('✅ Consultations Report (.CSV) downloaded successfully!', 'success');
};

// Prescription Modal Logic
window.openPrescribeModal = (appointmentId, patientName) => {
  activeAppointmentForRx = appointmentId;
  const modal = document.getElementById('doctor-prescribe-modal');
  const nameEl = document.getElementById('rx-patient-name');
  if (nameEl) nameEl.innerText = patientName;

  // Pre-fill realistic clinical template if inputs are currently empty
  const notesInput = document.getElementById('doc-notes-input');
  const rxInput = document.getElementById('doc-prescription-input');
  if (notesInput && !notesInput.value) {
    notesInput.value = 'Diagnosis: Clinical recovery verified. Vitals recorded: BP 120/80 mmHg, Pulse 74 bpm. Patient advised adequate rest and hydration.';
  }
  if (rxInput && !rxInput.value) {
    rxInput.value = '1. Tab. Ecosprin 75mg — 0 - 1 - 0 (After Lunch) — 30 Days\n2. Tab. Telmisartan 40mg — 1 - 0 - 0 (After Breakfast) — 30 Days\n3. Tab. Atorvastatin 20mg — 0 - 0 - 1 (At Bedtime) — 30 Days';
  }

  if (modal) modal.classList.add('active');
};

function setupRxModal() {
  const form = document.getElementById('prescribe-form');
  const closeBtn = document.getElementById('btn-close-prescribe-modal');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('doctor-prescribe-modal')?.classList.remove('active');
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeAppointmentForRx) return;

    const notes = document.getElementById('doc-notes-input').value.trim();
    const prescription = document.getElementById('doc-prescription-input').value.trim();

    try {
      await updateStatus(activeAppointmentForRx, 'completed', { notes, prescription });
      document.getElementById('doctor-prescribe-modal')?.classList.remove('active');
      form.reset();
      window.showToast('Consultation marked completed with clinical notes & prescription saved!', 'success');
    } catch (err) {
      window.showToast(err.message || 'Error saving prescription', 'error');
    }
  });
}

// Manage Availability Form
function setupAvailabilityForm() {
  const form = document.getElementById('doctor-availability-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedDays = Array.from(document.querySelectorAll('input[name="avail-days"]:checked')).map((cb) => cb.value);
    const slotsRaw = document.getElementById('avail-slots-input').value.trim();
    const timeSlots = slotsRaw ? slotsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

    try {
      await window.apiFetch('/doctors/availability', {
        method: 'PUT',
        body: JSON.stringify({ availableDays: selectedDays, timeSlots }),
      });

      window.showToast('Availability and time slots updated successfully!', 'success');
    } catch (err) {
      window.showToast(err.message || 'Failed to update availability', 'error');
    }
  });
}

// Manage Profile Form
function setupProfileForm() {
  const form = document.getElementById('doctor-profile-form');
  if (!form) return;

  const docProfile = window.Auth.getDoctorProfile();
  if (docProfile) {
    if (document.getElementById('edit-fee')) document.getElementById('edit-fee').value = docProfile.consultationFee || 600;
    if (document.getElementById('edit-clinic')) document.getElementById('edit-clinic').value = docProfile.clinicName || '';
    if (document.getElementById('edit-city')) document.getElementById('edit-city').value = docProfile.location?.city || '';
    if (document.getElementById('edit-reg')) document.getElementById('edit-reg').value = docProfile.medicalRegNumber || 'MCI-84920';
    if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = docProfile.bio || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const consultationFee = Number(document.getElementById('edit-fee').value);
    const clinicName = document.getElementById('edit-clinic').value.trim();
    const city = document.getElementById('edit-city').value.trim();
    const medicalRegNumber = document.getElementById('edit-reg').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    try {
      const data = await window.apiFetch('/doctors/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          consultationFee,
          clinicName,
          medicalRegNumber,
          location: { city },
          bio,
        }),
      });

      if (data.doctor) {
        localStorage.setItem('doctorp_doctor_profile', JSON.stringify(data.doctor));
      }

      window.showToast('Profile updated successfully!', 'success');
    } catch (err) {
      window.showToast(err.message || 'Error updating profile', 'error');
    }
  });
}

// Doctor View Patient Medical Records
window.viewPatientRecords = async (patientId, patientName) => {
  const modal = document.getElementById('doctor-patient-records-modal');
  const nameEl = document.getElementById('doc-rec-patient-name');
  const listEl = document.getElementById('doc-patient-records-list');

  if (nameEl) nameEl.innerText = patientName;
  if (listEl) listEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">Loading health records...</div>';
  if (modal) modal.classList.add('active');

  try {
    const data = await window.apiFetch(`/patients/${patientId}/records`);
    const records = data.records || [];

    if (records.length === 0) {
      if (listEl) listEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b;">No medical reports uploaded by patient yet.</div>';
      return;
    }

    if (listEl) {
      listEl.innerHTML = records.map((rec) => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
            <div>
              <span style="font-size: 0.72rem; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 9999px; font-weight: 700; text-transform: uppercase;">${rec.recordType || 'Lab Report'}</span>
              <h4 style="margin: 0.35rem 0 0.15rem; color: #0f172a; font-size: 1rem;">${rec.title}</h4>
              <div style="font-size: 0.8rem; color: #64748b;">Facility: <strong>${rec.doctorOrLab || 'Diagnostic Lab'}</strong> • Date: ${rec.recordDate || 'Recent'}</div>
            </div>
            <a href="${rec.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.65rem;">
              👁️ View Report
            </a>
          </div>
          <p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: #334155; line-height: 1.4; background: #f8fafc; padding: 0.6rem; border-radius: 8px;">
            <strong>Key Findings:</strong> ${rec.summary || 'Normal physiological markers observed.'}
          </p>
        </div>
      `).join('');
    }
  } catch (err) {
    if (listEl) listEl.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">${err.message || 'Error loading records'}</div>`;
  }
};

window.closeDoctorRecordsModal = () => {
  const modal = document.getElementById('doctor-patient-records-modal');
  if (modal) modal.classList.remove('active');
};

// Recurring Batch Slot Generator Wizard Form
function setupWizardForm() {
  const form = document.getElementById('doctor-wizard-form');
  const startInput = document.getElementById('wizard-start-date');
  const endInput = document.getElementById('wizard-end-date');

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  if (startInput && !startInput.value) startInput.value = todayStr;
  if (endInput && !endInput.value) endInput.value = nextTwoWeeks;

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const startDate = document.getElementById('wizard-start-date').value;
    const endDate = document.getElementById('wizard-end-date').value;
    const slotDuration = Number(document.getElementById('wizard-duration').value || 30);
    const shift1Start = document.getElementById('wizard-shift1-start').value || '09:00';
    const shift1End = document.getElementById('wizard-shift1-end').value || '13:00';
    const shift2Start = document.getElementById('wizard-shift2-start').value || '17:00';
    const shift2End = document.getElementById('wizard-shift2-end').value || '20:00';

    const selectedDays = Array.from(document.querySelectorAll('input[name="avail-days"]:checked')).map((cb) => cb.value);
    const daysOfWeek = selectedDays.length > 0 ? selectedDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const shifts = [
      { start: shift1Start, end: shift1End },
      { start: shift2Start, end: shift2End },
    ];

    try {
      const data = await window.apiFetch('/doctors/slots/batch-generate', {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate,
          daysOfWeek,
          shifts,
          slotDuration,
        }),
      });

      window.showToast(`⚡ ${data.message || 'Batch slots generated!'}`, 'success');
      loadDoctorAppointments('all');
    } catch (err) {
      window.showToast(err.message || 'Error generating batch slots', 'error');
    }
  });
}
