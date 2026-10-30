// Patient Dashboard Logic (Appointments, Digital Pass, Prescriptions, Vitals & Reviews)

let activeAppointmentForReview = null;
let currentAppointmentsList = [];

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard: Require patient role
  if (!window.Auth.requireAuth('patient')) return;

  const user = window.Auth.getUser();
  const welcomeEl = document.getElementById('patient-welcome-name');
  if (welcomeEl) welcomeEl.innerText = user.name;

  loadPatientStats();
  loadPatientAppointments();
  loadPatientVitals();
  loadPatientMedicalRecords();
  setupUploadRecordForm();
  setupReviewModal();

  // Auto-open Rx Explainer if URL has demo=rx or rx=true
  if (window.location.search.includes('rx=true') || window.location.search.includes('demo=rx')) {
    setTimeout(() => {
      if (typeof window.openAiRxExplainerDemo === 'function') {
        window.openAiRxExplainerDemo();
      }
    }, 600);
  }
});

// Load patient overview stats
async function loadPatientStats() {
  try {
    const data = await window.apiFetch('/patients/stats');
    const stats = data.stats;

    if (document.getElementById('stat-upcoming')) document.getElementById('stat-upcoming').innerText = stats.upcoming || 0;
    if (document.getElementById('stat-completed')) document.getElementById('stat-completed').innerText = stats.completed || 0;
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = stats.total || 0;
  } catch (err) {
    console.error('Error loading patient stats:', err);
  }
}

// Load patient vitals from localStorage
function loadPatientVitals() {
  const vitalsRaw = localStorage.getItem('doctorp_patient_vitals');
  if (vitalsRaw) {
    try {
      const v = JSON.parse(vitalsRaw);
      if (document.getElementById('vital-blood-group')) document.getElementById('vital-blood-group').innerText = v.bloodGroup || 'O+';
      if (document.getElementById('vital-bp')) document.getElementById('vital-bp').innerText = v.bp || '120/80';
      if (document.getElementById('vital-pulse')) document.getElementById('vital-pulse').innerText = v.pulse ? `${v.pulse} bpm` : '72 bpm';
      if (document.getElementById('vital-sugar')) document.getElementById('vital-sugar').innerText = v.sugar || '98 mg/dL';
      if (document.getElementById('vital-allergies')) document.getElementById('vital-allergies').innerText = v.allergies || 'None Known';

      // Pre-fill modal
      if (document.getElementById('edit-blood-group')) document.getElementById('edit-blood-group').value = v.bloodGroup || 'O+';
      if (document.getElementById('edit-bp')) document.getElementById('edit-bp').value = v.bp || '120/80';
      if (document.getElementById('edit-pulse')) document.getElementById('edit-pulse').value = v.pulse || '72';
      if (document.getElementById('edit-sugar')) document.getElementById('edit-sugar').value = v.sugar || '98 mg/dL';
      if (document.getElementById('edit-allergies')) document.getElementById('edit-allergies').value = v.allergies || 'None';
    } catch (e) {
      console.error(e);
    }
  }

  // Setup vitals form submit listener
  const form = document.getElementById('vitals-form');
  if (form && !form.dataset.attached) {
    form.dataset.attached = 'true';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        bloodGroup: document.getElementById('edit-blood-group').value,
        bp: document.getElementById('edit-bp').value.trim() || '120/80',
        pulse: document.getElementById('edit-pulse').value.trim() || '72',
        sugar: document.getElementById('edit-sugar').value.trim() || '98 mg/dL',
        allergies: document.getElementById('edit-allergies').value.trim() || 'None',
      };
      localStorage.setItem('doctorp_patient_vitals', JSON.stringify(updated));
      loadPatientVitals();
      closeVitalsModal();
      window.showToast('Health vitals saved successfully!', 'success');
    });
  }
}

window.openVitalsModal = () => {
  document.getElementById('vitals-modal')?.classList.add('active');
};

window.closeVitalsModal = () => {
  document.getElementById('vitals-modal')?.classList.remove('active');
};

let currentAppointmentsFilter = 'all';
let currentSearchKeyword = '';

// Filter appointments by status tab
window.filterAppointments = (filter, btn) => {
  currentAppointmentsFilter = filter;
  document.querySelectorAll('.tab-filter-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAppointmentsTable();
};

// Search appointments in real time
window.searchAppointments = (keyword) => {
  currentSearchKeyword = (keyword || '').toLowerCase().trim();
  renderAppointmentsTable();
};

// Direct AI Rx Explainer for a specific appointment
window.openAiRxExplainerForApt = (appointmentId) => {
  window.viewPrescription(appointmentId);
  const card = document.getElementById('rx-ai-explainer-card');
  if (card) {
    card.style.display = 'block';
    window.renderAiExplainerContent();
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  }
};

// Render Appointments Table according to active tab filter & search
function renderAppointmentsTable() {
  const container = document.getElementById('patient-appointments-table-body');
  if (!container) return;

  const all = currentAppointmentsList || [];

  // Update tab counts
  const countAll = all.length;
  const countUpcoming = all.filter((a) => a.status === 'confirmed' || a.status === 'pending').length;
  const countCompleted = all.filter((a) => a.status === 'completed').length;
  const countCancelled = all.filter((a) => a.status === 'cancelled').length;

  if (document.getElementById('count-all')) document.getElementById('count-all').innerText = countAll;
  if (document.getElementById('count-upcoming')) document.getElementById('count-upcoming').innerText = countUpcoming;
  if (document.getElementById('count-completed')) document.getElementById('count-completed').innerText = countCompleted;
  if (document.getElementById('count-cancelled')) document.getElementById('count-cancelled').innerText = countCancelled;

  // Filter list
  let filtered = all.filter((apt) => {
    if (currentAppointmentsFilter === 'upcoming') {
      return apt.status === 'confirmed' || apt.status === 'pending';
    }
    if (currentAppointmentsFilter === 'completed') {
      return apt.status === 'completed';
    }
    if (currentAppointmentsFilter === 'cancelled') {
      return apt.status === 'cancelled';
    }
    return true; // 'all'
  });

  // Apply search query
  if (currentSearchKeyword) {
    filtered = filtered.filter((apt) => {
      const doc = apt.doctorId || {};
      const searchTarget = [
        apt.appointmentId || '',
        doc.name || '',
        doc.clinicName || '',
        doc.specialization || '',
        apt.reason || '',
        apt.status || '',
      ].join(' ').toLowerCase();
      return searchTarget.includes(currentSearchKeyword);
    });
  }

  if (filtered.length === 0) {
    const emptyMsg = currentSearchKeyword
      ? `No appointments matching "${currentSearchKeyword}".`
      : currentAppointmentsFilter !== 'all'
      ? `No ${currentAppointmentsFilter} appointments found.`
      : 'No appointments booked yet.';

    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--navy-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h4 style="color: var(--navy-dark);">${emptyMsg}</h4>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Find a certified specialist and book your clinical consultation.</p>
          <a href="doctors.html" class="btn btn-primary btn-sm">Find a Doctor</a>
        </td>
      </tr>
    `;
    return;
  }

  const currentUser = window.Auth ? window.Auth.getUser() : null;
  const isDoctorRole = currentUser && currentUser.role === 'doctor';

  // Adapt table header if doctor is viewing
  const colHeader = document.querySelector('table.custom-table thead th:nth-child(2)');
  if (colHeader) {
    colHeader.innerText = isDoctorRole ? 'Patient Details' : 'Doctor & Hospital';
  }

  container.innerHTML = filtered
    .map((apt) => {
      const doc = apt.doctorId || {};
      const pat = apt.patientId || {};
      const partnerName = isDoctorRole ? (pat.name || 'Patient') : (doc.name || 'Doctor');
      const partnerSub = isDoctorRole 
        ? `${pat.gender || 'Patient'} ${pat.age ? `• ${pat.age} yrs` : ''} ${pat.phone ? `• ${pat.phone}` : ''}`
        : (doc.clinicName || doc.specialization || 'Medicine');
      const partnerImg = isDoctorRole
        ? (pat.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80')
        : (doc.profileImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=100&q=80');

      const statusBadge = `<span class="badge badge-${apt.status}">${apt.status}</span>`;
      const modeBadge = `<span style="font-size: 0.75rem; background: var(--navy-light); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-light); font-weight: 600;">${apt.consultationType || 'In-Clinic'}</span>`;

      let actionHtml = `<div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">`;

      // Telehealth video button
      if (apt.consultationType === 'Video Consultation' && (apt.status === 'confirmed' || apt.status === 'pending')) {
        actionHtml += `
          <button onclick="joinVideoConsultation('${apt.appointmentId || apt._id}')" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; background: #0284c7; font-weight: 600;" title="Join Live Telehealth Consultation">
            💻 Join Call
          </button>
        `;
      }

      // Always show Pass button
      actionHtml += `
        <button onclick="viewPassModal('${apt._id}')" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="View & Print Official Hospital Pass">
          🖨️ Pass
        </button>
      `;

      // Calendar sync buttons for active appointments
      if (apt.status === 'confirmed' || apt.status === 'pending') {
        actionHtml += `
          <button onclick="window.downloadIcsFile(currentAppointmentsList.find(a => (a._id === '${apt._id}' || a.appointmentId === '${apt.appointmentId}')))" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Download .ICS Calendar Event">
            📅 Cal
          </button>
        `;
      }

      // Rx / Notes button, Official Printable Prescription, & direct AI Explainer button
      if (apt.prescription || apt.notes) {
        actionHtml += `
          <button onclick="window.openPrescriptionViewer(currentAppointmentsList.find(a => (a._id === '${apt._id}' || a.appointmentId === '${apt.appointmentId}')))" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-color: #0d9488; color: #0d9488; font-weight: 700;" title="Download Official Doctor Prescription (PDF)">
            📄 Download Rx
          </button>
          <button onclick="viewPrescription('${apt._id}')" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; border-color: #059669; color: #059669;" title="View Doctor Prescription">
            💊 Rx Slip
          </button>
          <button onclick="openAiRxExplainerForApt('${apt._id}')" class="btn btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; border: none; font-weight: 700; border-radius: 4px; box-shadow: 0 2px 6px rgba(124,58,237,0.25);" title="Explain Prescription in Simple Words (AI)">
            ✨ Explain Rx
          </button>
        `;
      }

      // Review button
      if (apt.status === 'completed' && !apt.isReviewed && !isDoctorRole) {
        actionHtml += `
          <button onclick="openReviewModal('${apt._id}', '${doc.name || 'Doctor'}')" class="btn btn-primary btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
            ★ Review
          </button>
        `;
      } else if (apt.isReviewed && !isDoctorRole) {
        actionHtml += `<span style="font-size: 0.75rem; color: #059669; font-weight: 700;">✓ Reviewed</span>`;
      }

      // Cancel button for active appointments
      if (apt.status === 'pending' || apt.status === 'confirmed') {
        actionHtml += `
          <button onclick="cancelAppointment('${apt._id}')" class="btn btn-danger btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
            Cancel
          </button>
        `;
      }

      actionHtml += `</div>`;

      return `
        <tr>
          <td>
            <span style="font-family: monospace; font-weight: 700; color: var(--primary); font-size: 0.85rem;">
              ${apt.appointmentId || apt._id.slice(-6)}
            </span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${partnerImg}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
              <div>
                <div style="font-weight: 700; color: var(--navy-dark);">${partnerName}</div>
                <div style="font-size: 0.75rem; color: var(--navy-muted);">${partnerSub}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--navy-dark);">${apt.appointmentDate}</div>
            <div style="font-size: 0.8rem; color: var(--navy-muted);">${apt.startTime}</div>
          </td>
          <td>${modeBadge}</td>
          <td><strong>₹${apt.fee}</strong></td>
          <td>${statusBadge}</td>
          <td>${actionHtml}</td>
        </tr>
      `;
    })
    .join('');
}

// Load patient appointments list
async function loadPatientAppointments() {
  const container = document.getElementById('patient-appointments-table-body');
  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--navy-muted);">
        <div style="display: inline-block; width: 28px; height: 28px; border: 2.5px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p style="margin-top: 0.5rem; font-size: 0.85rem;">Loading your appointments...</p>
      </td>
    </tr>
  `;

  try {
    const data = await window.apiFetch('/appointments/my');
    currentAppointmentsList = data.appointments || [];
    renderAppointmentsTable();
  } catch (err) {
    console.error('Error fetching patient appointments:', err);
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">Error: ${err.message}</td></tr>`;
  }
}

// Cancel Appointment
window.cancelAppointment = async (appointmentId) => {
  if (!confirm('Are you sure you want to cancel this appointment? The reserved slot will be released.')) {
    return;
  }

  try {
    await window.apiFetch(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason: 'Cancelled by patient from dashboard' }),
    });

    window.showToast('Appointment cancelled successfully.', 'success');
    loadPatientStats();
    loadPatientAppointments();
  } catch (err) {
    window.showToast(err.message || 'Failed to cancel appointment', 'error');
  }
};

// View Digital Hospital Pass
window.currentActivePassAppointment = null;
window.currentActiveRxAppointment = null;
window.currentAiExplainerLang = 'en';

window.viewPassModal = (appointmentId) => {
  const apt = currentAppointmentsList.find((a) => a._id === appointmentId);
  if (!apt) return;

  window.currentActivePassAppointment = apt;

  const modal = document.getElementById('hospital-pass-modal');
  if (!modal) return;

  const user = window.Auth.getUser() || { name: 'Patient' };
  const doc = apt.doctorId || {};

  document.getElementById('pass-apt-id').innerText = apt.appointmentId || apt._id;
  document.getElementById('pass-patient-name').innerText = user.name;
  document.getElementById('pass-patient-demographics').innerText = `${user.gender || 'Not specified'} • ${user.age || 'N/A'} yrs`;
  document.getElementById('pass-doc-name').innerText = doc.name || 'Dr. Specialist';
  document.getElementById('pass-doc-reg').innerText = `Specialty: ${doc.specialization || 'Clinical'}`;
  document.getElementById('pass-hospital-name').innerText = doc.clinicName || 'Apollo / Max Hospital';
  document.getElementById('pass-hospital-address').innerText = `${doc.location?.address || ''}, ${doc.location?.city || 'New Delhi'}`;
  document.getElementById('pass-schedule').innerText = `${apt.appointmentDate} at ${apt.startTime}`;
  document.getElementById('pass-mode').innerText = apt.consultationType || 'In-Clinic Visit';
  document.getElementById('pass-fee').innerText = `₹${apt.fee} (Confirmed)`;

  modal.classList.add('active');
};

window.closePassModal = () => {
  document.getElementById('hospital-pass-modal')?.classList.remove('active');
};

// 1-Click Calendar Sync (.ics) generator
window.downloadIcsCalendar = (customApt) => {
  const apt = customApt || window.currentActivePassAppointment || (currentAppointmentsList && currentAppointmentsList[0]);
  if (!apt) {
    window.showToast('No appointment selected for calendar sync.', 'warning');
    return;
  }

  const user = window.Auth.getUser() || { name: 'Patient' };
  const doc = apt.doctorId || {};
  const aptId = apt.appointmentId || apt._id || 'APT';
  const docName = doc.name || 'Dr. Specialist';
  const specialty = doc.specialization || 'Clinical Specialist';
  const clinicName = doc.clinicName || 'DoctorP Hospital';
  const address = `${doc.location?.address || ''}, ${doc.location?.city || 'New Delhi'}`.replace(/^,\s*/, '');
  const mode = apt.consultationType || 'In-Clinic Visit';
  const isVideo = mode.toLowerCase().includes('video');

  const dateStr = apt.appointmentDate || new Date().toISOString().slice(0, 10);
  const timeStr = apt.startTime || '10:00';

  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  let [h, min] = timeStr.split(':').map((v) => parseInt(v, 10));
  if (isNaN(h)) h = 10;
  if (isNaN(min)) min = 0;

  const pad = (n) => String(n).padStart(2, '0');
  const dtStart = `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;

  let endHour = h;
  let endMin = min + 30;
  if (endMin >= 60) {
    endHour += 1;
    endMin -= 60;
  }
  const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(endHour)}${pad(endMin)}00`;
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const summary = `Doctor Consultation: ${docName} (${specialty})`;
  const location = isVideo ? 'DoctorP Secure Telehealth Room' : `${clinicName}, ${address}`;
  const videoUrl = `${window.location.origin}/patient-dashboard.html?telehealth=${aptId}`;
  const description = `DoctorP Digital OPD Consultation\\nPatient: ${user.name}\\nAppointment ID: ${aptId}\\nDoctor: ${docName} (${specialty})\\nMode: ${mode}\\nFacility: ${clinicName}\\n${isVideo ? 'Telehealth Room: ' + videoUrl : 'Address: ' + address}\\nStatus: Confirmed`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DoctorP Healthcare System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:doctorp-${aptId}@doctorp.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: Consultation with ${docName} in 30 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsBlob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(icsBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `DoctorP-Appointment-${aptId}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  window.showToast('✅ Calendar invitation (.ics) downloaded! Open to sync with Google Calendar or Apple Calendar.', 'success');
};

// Instant WhatsApp Digital OPD Pass share
window.sharePassToWhatsApp = (customApt) => {
  const apt = customApt || window.currentActivePassAppointment || (currentAppointmentsList && currentAppointmentsList[0]);
  if (!apt) {
    window.showToast('No appointment selected for WhatsApp sharing.', 'warning');
    return;
  }

  const user = window.Auth.getUser() || { name: 'Patient' };
  const doc = apt.doctorId || {};
  const aptId = apt.appointmentId || apt._id || 'APT';
  const docName = doc.name || 'Dr. Specialist';
  const specialty = doc.specialization || 'Clinical Specialist';
  const clinicName = doc.clinicName || 'DoctorP Hospital';
  const address = `${doc.location?.address || ''}, ${doc.location?.city || 'New Delhi'}`.replace(/^,\s*/, '');
  const mode = apt.consultationType || 'In-Clinic Visit';
  const isVideo = mode.toLowerCase().includes('video');
  const videoUrl = `${window.location.origin}/patient-dashboard.html?telehealth=${aptId}`;

  const message = `🏥 *DOCTORP DIGITAL OPD PASS & TOKEN*
━━━━━━━━━━━━━━━━━━━━
🆔 *Appointment ID:* ${aptId}
👤 *Patient:* ${user.name}
👨‍⚕️ *Doctor:* ${docName} (${specialty})
🏥 *Hospital/Clinic:* ${clinicName}
📍 *Address:* ${address || 'Main Campus'}
📅 *Schedule:* ${apt.appointmentDate} at ${apt.startTime}
🩺 *Consultation Mode:* ${mode}
💳 *Fee Status:* ₹${apt.fee} (Confirmed)
${isVideo ? `💻 *Video Telehealth Room:* ${videoUrl}\n` : '🏢 *Check-in Desk:* Present this pass at reception 15 min prior.\n'}━━━━━━━━━━━━━━━━━━━━
⚡ Verified Digital Healthcare Token • DoctorP Smart OPD`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
  window.showToast('📲 Opening WhatsApp with your verified Digital OPD Pass...', 'info');
};

// Telehealth Video Call Simulation
window.joinVideoConsultation = (appointmentId) => {
  const apt = currentAppointmentsList.find((a) => a._id === appointmentId || a.appointmentId === appointmentId);
  const doc = apt?.doctorId || {};
  if (typeof window.startTelehealthCall === 'function') {
    window.startTelehealthCall(apt?.appointmentId || appointmentId, 'patient', {
      doctorName: doc.name || 'Dr. Specialist',
      specialty: doc.specialization || 'Clinical Specialist',
      doctorAvatar: doc.profileImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    });
  } else {
    window.showToast('Connecting to encrypted telehealth room...', 'info');
  }
};

// View Prescription Modal (Populates Authentic Hospital Slip)
window.viewPrescription = (appointmentId) => {
  const apt = currentAppointmentsList.find((a) => a._id === appointmentId);
  if (!apt) return;

  window.currentActiveRxAppointment = apt;

  const modal = document.getElementById('rx-modal');
  if (!modal) return;

  const user = window.Auth.getUser() || { name: 'Rahul Sharma', gender: 'Male', age: 28 };
  const doc = apt.doctorId || {};

  if (document.getElementById('rx-hospital-header')) {
    document.getElementById('rx-hospital-header').innerText = doc.clinicName || 'Max Super Speciality Hospital';
  }
  if (document.getElementById('rx-hospital-addr')) {
    document.getElementById('rx-hospital-addr').innerText = `${doc.location?.address || 'Medical Enclave'}, ${doc.location?.city || 'New Delhi'}`;
  }
  if (document.getElementById('rx-doc-name')) {
    document.getElementById('rx-doc-name').innerText = doc.name || 'Dr. Specialist';
  }
  if (document.getElementById('rx-doc-qual')) {
    document.getElementById('rx-doc-qual').innerText = doc.qualifications ? (Array.isArray(doc.qualifications) ? doc.qualifications.join(', ') : doc.qualifications) : 'MBBS, MD';
  }
  if (document.getElementById('rx-doc-reg')) {
    document.getElementById('rx-doc-reg').innerText = `Reg: ${doc.medicalRegNumber || 'DMC-24819-A'}`;
  }
  if (document.getElementById('rx-patient-name-val')) {
    document.getElementById('rx-patient-name-val').innerText = user.name || 'Patient';
  }
  if (document.getElementById('rx-patient-age-val')) {
    document.getElementById('rx-patient-age-val').innerText = `${user.age || 28} Yrs / ${user.gender || 'Male'}`;
  }
  if (document.getElementById('rx-slip-date-val')) {
    document.getElementById('rx-slip-date-val').innerText = apt.appointmentDate || new Date().toISOString().slice(0, 10);
  }
  if (document.getElementById('rx-notes-text')) {
    document.getElementById('rx-notes-text').innerText = apt.notes || 'Essential Hypertension • Retrosternal Chest Discomfort on Exertion';
  }
  if (document.getElementById('rx-prescription-text')) {
    document.getElementById('rx-prescription-text').innerText = apt.prescription || '1. Tab. Ecosprin 75mg — 0 - 1 - 0 (After Lunch) — 30 Days\n2. Tab. Telmisartan 40mg — 1 - 0 - 0 (After Breakfast) — 30 Days\n3. Tab. Atorvastatin 20mg — 0 - 0 - 1 (At Bedtime) — 30 Days';
  }

  // Reset or hide explainer card on initial open
  const card = document.getElementById('rx-ai-explainer-card');
  if (card) {
    card.style.display = 'none';
  }

  modal.classList.add('active');
};

window.closeRxModal = () => {
  document.getElementById('rx-modal')?.classList.remove('active');
};

// Standout Feature 1: AI Prescription & Lab Explainer in Simple Words
window.openAiRxExplainerDemo = () => {
  // Find completed appointment with prescription, or first available appointment
  let targetApt = currentAppointmentsList.find((a) => a.prescription || a.notes || a.status === 'completed');
  if (!targetApt && currentAppointmentsList.length > 0) {
    targetApt = currentAppointmentsList[0];
  }

  if (targetApt) {
    window.viewPrescription(targetApt._id);
  } else {
    // Open default sample hospital slip
    const modal = document.getElementById('rx-modal');
    if (modal) modal.classList.add('active');
  }

  // Auto-expand the AI Explainer card immediately
  const card = document.getElementById('rx-ai-explainer-card');
  if (card) {
    card.style.display = 'block';
    window.renderAiExplainerContent();
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  }
};

window.toggleAiRxExplainer = () => {
  const card = document.getElementById('rx-ai-explainer-card');
  if (!card) return;

  if (card.style.display === 'none' || !card.style.display) {
    card.style.display = 'block';
    window.renderAiExplainerContent();
    card.scrollIntoView({ behavior: 'smooth' });
  } else {
    card.style.display = 'none';
  }
};

window.setAiExplainerLang = (lang) => {
  window.currentAiExplainerLang = lang;
  const btnEn = document.getElementById('btn-ai-lang-en');
  const btnHi = document.getElementById('btn-ai-lang-hi');

  if (btnEn && btnHi) {
    if (lang === 'en') {
      btnEn.style.background = '#7c3aed';
      btnEn.style.color = '#fff';
      btnHi.style.background = '#e2e8f0';
      btnHi.style.color = '#334155';
    } else {
      btnHi.style.background = '#7c3aed';
      btnHi.style.color = '#fff';
      btnEn.style.background = '#e2e8f0';
      btnEn.style.color = '#334155';
    }
  }

  window.renderAiExplainerContent();
};

window.renderAiExplainerContent = () => {
  const container = document.getElementById('ai-explainer-content');
  if (!container) return;

  const isHindi = window.currentAiExplainerLang === 'hi';

  if (isHindi) {
    container.innerHTML = `
      <div style="background: #ffffff; border-radius: 8px; padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div style="font-weight: 700; color: #4c1d95; font-size: 0.95rem; margin-bottom: 0.4rem;">
          🩺 1. आपकी बीमारी का सरल मतलब (Diagnosis Explained)
        </div>
        <p style="margin: 0; color: #334155;">
          <strong>Essential Hypertension (High Blood Pressure):</strong> इसका सीधा मतलब है कि नसों में खून का दबाव सामान्य से ज्यादा चल रहा है। अगर यह बढ़ा रहे तो दिल, आंखों और किडनी पर असर पड़ता है। 
          <br><span style="color: #059669; font-weight: 600;">घबराने की बात नहीं है:</span> रोजाना दवाई लेने और नमक कम करने से यह पूरी तरह कंट्रोल में रहता है।
        </p>
      </div>

      <div style="background: #ffffff; border-radius: 8px; padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div style="font-weight: 700; color: #4c1d95; font-size: 0.95rem; margin-bottom: 0.6rem;">
          💊 2. दवाइयों की जानकारी और लेने का सही समय (Medication Guide)
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <div style="font-weight: 700; color: #1e293b;">Tab. Telmisartan 40mg (1 - 0 - 0)</div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
              <strong>काम:</strong> BP की दवा • <strong>कब लें:</strong> रोज सुबह <strong>नाश्ते के ठीक बाद</strong> 1 गोली पानी के साथ।
              <br><span style="color: #b91c1c; font-weight: 600;">खास ध्यान:</span> अगर BP ठीक लगे तब भी इसे बिना डॉक्टर से पूछे कभी बंद न करें।
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 4px solid #eab308;">
            <div style="font-weight: 700; color: #1e293b;">Tab. Ecosprin 75mg (0 - 1 - 0)</div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
              <strong>काम:</strong> खून पतला करने वाली दवा (Aspirin) • <strong>कब लें:</strong> रोज दोपहर <strong>लंच के बाद</strong>।
              <br><span style="color: #b91c1c; font-weight: 600;">खास ध्यान:</span> इसे कभी भी खाली पेट न लें, हमेशा खाना खाने के बाद ही लें।
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 4px solid #8b5cf6;">
            <div style="font-weight: 700; color: #1e293b;">Tab. Atorvastatin 20mg (0 - 0 - 1)</div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
              <strong>काम:</strong> कोलेस्ट्रॉल कम करने की दवा • <strong>कब लें:</strong> रोज <strong>रात को सोने से पहले</strong>।
              <br><span style="color: #059669; font-weight: 600;">फायदा:</span> यह नसों में चर्बी जमने से रोकती है और दिल का दौरा पड़ने के खतरे को घटाती है।
            </div>
          </div>
        </div>
      </div>

      <div style="background: #ffffff; border-radius: 8px; padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div style="font-weight: 700; color: #4c1d95; font-size: 0.95rem; margin-bottom: 0.4rem;">
          🔬 3. डॉक्टर ने ये टेस्ट क्यों लिखे हैं? (Lab Tests Explained)
        </div>
        <ul style="margin: 0; padding-left: 1.2rem; color: #475569; font-size: 0.8rem; line-height: 1.6;">
          <li><strong>Lipid Profile:</strong> खून में अच्छे और बुरे कोलेस्ट्रॉल (Bad Fats) की जांच। इसके लिए 10-12 घंटे खाली पेट रहना है।</li>
          <li><strong>12-Lead ECG:</strong> दिल की धड़कन और ताल (Electrical Rhythm) को चेक करने की दर्दरहित जांच।</li>
          <li><strong>Serum Creatinine:</strong> यह देखने के लिए कि आपकी किडनियां खून को पूरी तरह ठीक से साफ कर रही हैं।</li>
        </ul>
      </div>

      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.85rem; font-size: 0.8rem; color: #065f46;">
        💡 <strong>डॉक्टर की जरूरी सलाह:</strong> दिन भर में 1 चम्मच से ज्यादा नमक न खाएं। आचार, पापड़ और चिप्स से परहेज करें। रोजाना 30 मिनट तेज सैर (brisk walk) करें।
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="background: #ffffff; border-radius: 8px; padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div style="font-weight: 700; color: #4c1d95; font-size: 0.95rem; margin-bottom: 0.4rem;">
          🩺 1. Your Diagnosis in Plain Language
        </div>
        <p style="margin: 0; color: #334155;">
          <strong>Essential Hypertension (High Blood Pressure):</strong> Blood exerts elevated physical force against the arterial walls. Over time, untreated hypertension increases stress on your heart vessels and kidneys.
          <br><span style="color: #059669; font-weight: 600;">Good News:</span> Easily manageable with low-sodium nutrition, regular activity, and timely daily medication.
        </p>
      </div>

      <div style="background: #ffffff; border-radius: 8px; padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div style="font-weight: 700; color: #4c1d95; font-size: 0.95rem; margin-bottom: 0.6rem;">
          💊 2. Your Prescribed Medicines & Precise Timing
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <div style="font-weight: 700; color: #1e293b;">Tab. Telmisartan 40mg (1 - 0 - 0)</div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
              <strong>Purpose:</strong> Primary Blood Pressure Controller • <strong>Timing:</strong> 1 tablet every morning <strong>after breakfast</strong> with water.
              <br><span style="color: #b91c1c; font-weight: 600;">Safety Rule:</span> Do not skip even if your blood pressure feels normal.
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 4px solid #eab308;">
            <div style="font-weight: 700; color: #1e293b;">Tab. Ecosprin 75mg (0 - 1 - 0)</div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
              <strong>Purpose:</strong> Blood Thinner (Antiplatelet) • <strong>Timing:</strong> 1 tablet once daily <strong>right after lunch</strong>.
              <br><span style="color: #b91c1c; font-weight: 600;">Safety Rule:</span> Strictly avoid taking on an empty stomach to prevent gastric irritation.
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 6px; border-left: 4px solid #8b5cf6;">
            <div style="font-weight: 700; color: #1e293b;">Tab. Atorvastatin 20mg (0 - 0 - 1)</div>
            <div style="font-size: 0.8rem; color: #475569; margin-top: 0.15rem;">
              <strong>Purpose:</strong> Cholesterol Reducer • <strong>Timing:</strong> 1 tablet daily <strong>at bedtime</strong>.
              <br><span style="color: #059669; font-weight: 600;">Benefit:</span> Clears LDL cholesterol deposits and stabilizes arterial blood flow.
            </div>
          </div>
        </div>
      </div>

      <div style="background: #ffffff; border-radius: 8px; padding: 1rem; border: 1px solid #e2e8f0; margin-bottom: 0.85rem;">
        <div style="font-weight: 700; color: #4c1d95; font-size: 0.95rem; margin-bottom: 0.4rem;">
          🔬 3. Why Did The Doctor Order These Lab Tests?
        </div>
        <ul style="margin: 0; padding-left: 1.2rem; color: #475569; font-size: 0.8rem; line-height: 1.6;">
          <li><strong>Lipid Profile:</strong> Measures Good (HDL) vs Bad (LDL) cholesterol. Requires 10-12 hours overnight fasting.</li>
          <li><strong>12-Lead ECG:</strong> Electrical tracing recording heart rhythm, chamber rate, and heart muscle safety.</li>
          <li><strong>Serum Creatinine:</strong> Verifies kidney clearance rate while you are on antihypertensive medication.</li>
        </ul>
      </div>

      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.85rem; font-size: 0.8rem; color: #065f46;">
        💡 <strong>Doctor's Lifestyle Directive:</strong> Limit daily table salt to under 5 grams (< 1 teaspoon). Avoid pickles, papads, and processed snacks. 30 minutes of aerobic walking daily.
      </div>
    `;
  }

  // Quick Chips
  container.innerHTML += `
    <div style="margin-top: 0.85rem;">
      <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Quick Questions:</span>
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.35rem;">
        <button type="button" onclick="window.askAiQuickChip('missed_dose')" style="background: #e0e7ff; color: #3730a3; border: none; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 12px; cursor: pointer;">Missed dose?</button>
        <button type="button" onclick="window.askAiQuickChip('diet_salt')" style="background: #e0e7ff; color: #3730a3; border: none; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 12px; cursor: pointer;">Salt & Diet rule</button>
        <button type="button" onclick="window.askAiQuickChip('with_milk')" style="background: #e0e7ff; color: #3730a3; border: none; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 12px; cursor: pointer;">Take with milk or water?</button>
      </div>
    </div>
    <div id="ai-chat-thread" style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;"></div>
  `;
};

window.askAiQuickChip = (type) => {
  const input = document.getElementById('ai-user-rx-question');
  if (!input) return;

  if (type === 'missed_dose') {
    input.value = window.currentAiExplainerLang === 'hi' ? 'Agar main goli lena bhool jaun to kya karun?' : 'What should I do if I miss a dose of Telmisartan?';
  } else if (type === 'diet_salt') {
    input.value = window.currentAiExplainerLang === 'hi' ? 'BP mein namak aur khane-peene ka kya parhez rakhna hai?' : 'What dietary and sodium restrictions should I follow for BP?';
  } else if (type === 'with_milk') {
    input.value = window.currentAiExplainerLang === 'hi' ? 'Kya yeh tablet doodh ke sath le sakte hain ya paani ke sath?' : 'Can I take these tablets with milk or plain water?';
  }
  window.askAiRxQuestion();
};

window.askAiRxQuestion = () => {
  const input = document.getElementById('ai-user-rx-question');
  const thread = document.getElementById('ai-chat-thread');
  if (!input || !thread) return;

  const question = input.value.trim();
  if (!question) return;

  const isHindi = window.currentAiExplainerLang === 'hi';
  const qLower = question.toLowerCase();

  // Create user bubble
  const userDiv = document.createElement('div');
  userDiv.style.cssText = 'align-self: flex-end; background: #7c3aed; color: #fff; padding: 0.45rem 0.75rem; border-radius: 8px 8px 0 8px; font-size: 0.8rem; max-width: 85%;';
  userDiv.innerText = question;
  thread.appendChild(userDiv);
  input.value = '';

  let aiReply = '';
  if (qLower.includes('miss') || qLower.includes('bhool') || qLower.includes('chhoot')) {
    aiReply = isHindi
      ? '⏰ **Missed Dose Rule:** Agar aap Telmisartan subah lena bhool gaye hain, toh jaise hi yaad aaye turant le lein. Lekin agar agle din ki goli ka waqt ho gaya hai, to pichli goli chhod dein. Ek sath do goli (double dose) bilkul na lein.'
      : '⏰ **Missed Dose Rule:** Take the missed dose as soon as you remember that same day. If it is already close to your next scheduled dose, skip the missed tablet. Never take two doses together to compensate.';
  } else if (qLower.includes('milk') || qLower.includes('doodh') || qLower.includes('water') || qLower.includes('paani')) {
    aiReply = isHindi
      ? '🥛 **Doodh ya Paani:** BP aur blood thinner ki dawai hamesha **taaze saade paani** ke sath lein. Doodh mein calcium hota hai jo kuch dawaiyon ke asar ko kam kar sakta hai.'
      : '🥛 **Liquid Guidance:** Always swallow blood pressure (Telmisartan) and Aspirin tablets with a full glass of **plain room-temperature water**. Avoid dairy milk or grapefruit juice as calcium and citrus enzymes can interfere with drug absorption.';
  } else if (qLower.includes('salt') || qLower.includes('namak') || qLower.includes('diet') || qLower.includes('food') || qLower.includes('khana')) {
    aiReply = isHindi
      ? '🥗 **Diet Parhez:** Namak din bhar mein 1 chammach (5g) se kam rakhein. Achar, papad, processed cheese, aur packaged chips bilkul band karein. Thali mein hari sabziyan, daal, oats aur dahi shamil karein.'
      : '🥗 **DASH Sodium Rule:** Restrict salt to < 5g (1 flat teaspoon) daily. Completely eliminate processed pickles, namkeens, and instant noodles. Boost potassium with leafy greens, bananas, lentils, and oats.';
  } else if (qLower.includes('side effect') || qLower.includes('chakkar') || qLower.includes('dizziness')) {
    aiReply = isHindi
      ? '⚠️ **Chakkar ya Thakan:** Telmisartan shuru karne ke shuruaati 3-4 dino mein achanak khade hone par halka chakkar mehsoos ho sakta hai (Orthostatic effect). Hamesha bistar se aaram se uthein. Agar zyada lage to BP check karein.'
      : '⚠️ **Tolerance:** Mild lightheadedness upon standing up quickly can occur during the first few days as arteries relax. Stand up slowly. If dizziness persists, recheck your seated blood pressure and consult Dr. Sharma.';
  } else {
    aiReply = isHindi
      ? `🤖 **AI Copilot:** Aapki prescription ke mutabiq yeh dawa regular routine mein lena zaroori hai. Dawai khane ke theek baad lein aur BP ki reading weekly note karein. Zaroori samay par doctor se consult karein.`
      : `🤖 **AI Copilot:** According to your clinical prescription, adherence to morning Telmisartan and post-lunch Ecosprin ensures optimal vascular protection. Log your seated BP once weekly and consult Dr. Sharma for any persistent concerns.`;
  }

  const aiDiv = document.createElement('div');
  aiDiv.style.cssText = 'align-self: flex-start; background: #f8fafc; border: 1px solid #e2e8f0; color: #1e293b; padding: 0.55rem 0.85rem; border-radius: 8px 8px 8px 0; font-size: 0.8rem; max-width: 90%; line-height: 1.5;';
  aiDiv.innerHTML = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  thread.appendChild(aiDiv);
  thread.scrollIntoView({ behavior: 'smooth' });
};


// Standout Feature 4: Review Modal Logic
window.openReviewModal = (appointmentId, doctorName) => {
  activeAppointmentForReview = appointmentId;
  const modal = document.getElementById('review-modal');
  const docNameEl = document.getElementById('review-doc-name');

  if (docNameEl) docNameEl.innerText = doctorName;
  if (modal) modal.classList.add('active');
};

function setupReviewModal() {
  const form = document.getElementById('review-form');
  const closeBtn = document.getElementById('btn-close-review-modal');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('review-modal')?.classList.remove('active');
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeAppointmentForReview) return;

    const rating = document.getElementById('review-rating').value;
    const review = document.getElementById('review-text').value.trim();

    try {
      await window.apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: activeAppointmentForReview,
          rating: Number(rating),
          review,
        }),
      });

      window.showToast('Review submitted successfully! Thank you for your feedback.', 'success');
      document.getElementById('review-modal')?.classList.remove('active');
      form.reset();
      loadPatientAppointments();
    } catch (err) {
      window.showToast(err.message || 'Error submitting review', 'error');
    }
  });
}

// ==========================================================================
// Patient Medical Records & Diagnostic Vault Logic
// ==========================================================================

let allPatientRecords = [];
let currentRecordCategoryFilter = 'all';

async function loadPatientMedicalRecords() {
  const grid = document.getElementById('patient-records-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748b;">Loading medical records...</div>';

  try {
    const data = await window.apiFetch('/patients/records');
    allPatientRecords = data.records || [];
    renderPatientRecords(allPatientRecords);
  } catch (err) {
    if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ef4444;">${err.message || 'Error loading records'}</div>`;
  }
}

window.filterRecordsByCategory = (category, btn) => {
  currentRecordCategoryFilter = category;
  document.querySelectorAll('.rec-filter-btn').forEach((b) => {
    b.style.background = '#f1f5f9';
    b.style.color = '#334155';
    b.classList.remove('active');
  });
  if (btn) {
    btn.style.background = '#0284c7';
    btn.style.color = '#ffffff';
    btn.classList.add('active');
  }

  const filtered = category === 'all'
    ? allPatientRecords
    : allPatientRecords.filter((r) => r.recordType === category);

  renderPatientRecords(filtered);
};

function renderPatientRecords(records) {
  const grid = document.getElementById('patient-records-grid');
  if (!grid) return;

  if (records.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: #64748b;">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📁</div>
        <h4 style="margin: 0; color: #0f172a;">No medical documents found</h4>
        <p style="font-size: 0.85rem; margin: 0.25rem 0 1rem;">Click 'Upload Medical Record' to save test reports, scans, and past prescriptions.</p>
        <button type="button" onclick="openUploadRecordModal()" class="btn btn-primary btn-sm" style="background: #0284c7;">➕ Upload First Document</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = records.map((rec) => {
    const isLab = rec.recordType === 'Lab Report';
    const isScan = rec.recordType === 'Radiology / Scan';
    const isRx = rec.recordType === 'Prescription';
    const icon = isLab ? '🧪' : (isScan ? '🩻' : (isRx ? '💊' : '📄'));
    const badgeBg = isLab ? '#e0f2fe' : (isScan ? '#f3e8ff' : '#dcfce7');
    const badgeColor = isLab ? '#0369a1' : (isScan ? '#7e22ce' : '#15803d');

    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, box-shadow 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <span style="font-size: 0.72rem; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase;">
              ${icon} ${rec.recordType || 'Medical Report'}
            </span>
            <button type="button" onclick="window.deleteMedicalRecord('${rec._id}')" style="background: none; border: none; color: #94a3b8; font-size: 0.85rem; cursor: pointer; padding: 2px;" title="Delete Record">✕</button>
          </div>

          <h4 style="margin: 0 0 0.25rem; font-size: 1.05rem; color: #0f172a; font-weight: 700;">${rec.title}</h4>
          <div style="font-size: 0.82rem; color: #64748b; margin-bottom: 0.75rem;">
            Facility: <strong>${rec.doctorOrLab || 'Diagnostic Lab'}</strong><br>
            Date: <strong>${rec.recordDate || 'Recent'}</strong>
          </div>

          <div style="background: #f8fafc; border-left: 3px solid #0284c7; padding: 0.65rem 0.85rem; border-radius: 0 8px 8px 0; font-size: 0.84rem; color: #334155; line-height: 1.45; margin-bottom: 1rem;">
            ${rec.summary || 'Clinical observation logged.'}
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 0.75rem;">
          <a href="${rec.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; border-color: #0284c7; color: #0284c7; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
            👁️ View Document
          </a>
        </div>
      </div>
    `;
  }).join('');
}

window.openUploadRecordModal = () => {
  const modal = document.getElementById('upload-record-modal');
  const dateInput = document.getElementById('rec-date');
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  if (modal) modal.classList.add('active');
};

window.closeUploadRecordModal = () => {
  const modal = document.getElementById('upload-record-modal');
  if (modal) modal.classList.remove('active');
};

window.deleteMedicalRecord = async (recordId) => {
  if (!confirm('Are you sure you want to remove this medical document?')) return;
  try {
    await window.apiFetch(`/patients/records/${recordId}`, { method: 'DELETE' });
    window.showToast('Medical record deleted successfully', 'success');
    loadPatientMedicalRecords();
  } catch (err) {
    window.showToast(err.message || 'Error deleting record', 'error');
  }
};

function setupUploadRecordForm() {
  const form = document.getElementById('form-upload-record');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('rec-title').value.trim();
    const recordType = document.getElementById('rec-type').value;
    const recordDate = document.getElementById('rec-date').value;
    const doctorOrLab = document.getElementById('rec-facility').value.trim() || 'Apollo Diagnostics & Health Labs';
    const summary = document.getElementById('rec-summary').value.trim() || 'Report uploaded by patient.';

    try {
      await window.apiFetch('/patients/records', {
        method: 'POST',
        body: JSON.stringify({
          title,
          recordType,
          recordDate,
          doctorOrLab,
          summary,
        }),
      });

      window.showToast('✅ Medical record successfully added to your vault!', 'success');
      window.closeUploadRecordModal();
      form.reset();
      loadPatientMedicalRecords();
    } catch (err) {
      window.showToast(err.message || 'Error uploading record', 'error');
    }
  });
}
