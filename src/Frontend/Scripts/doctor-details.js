// Doctor Details & Real-Time Booking Page Logic with Realistic Consultation Modes & Printable Pass

let currentDoctor = null;
let selectedDate = new Date().toISOString().slice(0, 10);
let selectedTime = null;
let selectedMode = 'In-Clinic Visit';
let slotCountdownTimer = null;
let lastConfirmedAppointment = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const doctorId = params.get('id');

  if (!doctorId) {
    window.showToast('No doctor specified.', 'error');
    setTimeout(() => {
      window.location.href = 'doctors.html';
    }, 1500);
    return;
  }

  setupDatePicker();
  setupModeToggle();
  loadDoctorDetails(doctorId);
  setupBookingForm(doctorId);
});

// Configure minimum date as today and set default
function setupDatePicker() {
  const dateInput = document.getElementById('booking-date');
  if (!dateInput) return;

  const today = new Date().toISOString().slice(0, 10);
  dateInput.min = today;
  dateInput.value = today;
  selectedDate = today;

  dateInput.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    selectedTime = null;
    clearSlotSelection();
    if (currentDoctor) {
      loadDoctorAvailability(currentDoctor._id, selectedDate);
    }
  });
}

// In-Clinic vs Video Consultation Mode Toggle
function setupModeToggle() {
  const inClinicBtn = document.getElementById('mode-btn-clinic');
  const videoBtn = document.getElementById('mode-btn-video');

  if (inClinicBtn) {
    inClinicBtn.addEventListener('click', () => {
      selectedMode = 'In-Clinic Visit';
      inClinicBtn.classList.add('active');
      videoBtn?.classList.remove('active');
      updateSelectedSlotSummary();
    });
  }

  if (videoBtn) {
    videoBtn.addEventListener('click', () => {
      selectedMode = 'Video Consultation';
      videoBtn.classList.add('active');
      inClinicBtn?.classList.remove('active');
      updateSelectedSlotSummary();
    });
  }
}

// Fetch complete doctor details
async function loadDoctorDetails(doctorId) {
  const headerContainer = document.getElementById('doctor-profile-header-container');
  const bioContainer = document.getElementById('doctor-bio-container');
  const reviewsContainer = document.getElementById('doctor-reviews-container');

  try {
    const data = await window.apiFetch(`/doctors/${doctorId}`);
    const doctor = data.doctor;
    const reviews = data.reviews || [];
    currentDoctor = doctor;

    document.title = `${doctor.name} — Appointment Booking | DoctorP`;

    // Render Doctor Profile Header
    if (headerContainer) {
      headerContainer.innerHTML = `
        <div class="doctor-profile-header">
          <img src="${doctor.profileImage || doctor.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80'}" alt="${doctor.name}" class="doctor-avatar-large">
          <div style="flex: 1;">
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <span class="doctor-specialty-chip">${doctor.specialization}</span>
              <span style="font-size: 0.8rem; background: #d1fae5; color: #065f46; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 700;">✓ Medical Council Verified</span>
              <span style="font-size: 0.75rem; color: #64748b; font-family: monospace;">Reg: ${doctor.medicalRegNumber || 'MCI-84920-IND'}</span>
            </div>
            <h1 style="font-size: 1.85rem; margin-bottom: 0.35rem; color: var(--navy-dark);">${doctor.name}</h1>
            <p style="color: var(--navy-muted); font-size: 0.95rem; margin-bottom: 0.65rem;">
              ${doctor.qualifications ? (Array.isArray(doctor.qualifications) ? doctor.qualifications.join(', ') : doctor.qualifications) : 'MBBS, MD'}
            </p>
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem; color: var(--navy-slate);">
              <div>🩺 <strong>${doctor.experience || 5}+</strong> Years Clinical Practice</div>
              <div>🏥 <strong>${doctor.clinicName || 'Clinic'}</strong>, ${doctor.location?.city || 'New Delhi'}</div>
              <div>⭐ <strong>${doctor.rating ? doctor.rating.toFixed(1) : '4.9'}</strong> (${doctor.totalReviews || 35}+ Patient Reviews)</div>
            </div>
          </div>
        </div>
      `;
    }

    // Render Bio & Clinic Details
    if (bioContainer) {
      bioContainer.innerHTML = `
        <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem;">About Doctor</h3>
        <p style="color: var(--navy-slate); line-height: 1.7; margin-bottom: 1.5rem;">
          ${doctor.bio || 'Distinguished medical practitioner committed to providing evidence-based healthcare and compassionate patient treatment.'}
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: var(--navy-light); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
            <div style="font-size: 0.8rem; color: var(--navy-muted); font-weight: 600; text-transform: uppercase;">Spoken Languages</div>
            <div style="font-weight: 700; color: var(--navy-dark); margin-top: 0.25rem;">
              🗣️ ${(doctor.languages && doctor.languages.length) ? doctor.languages.join(', ') : 'English, Hindi'}
            </div>
          </div>

          <div style="background: var(--navy-light); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
            <div style="font-size: 0.8rem; color: var(--navy-muted); font-weight: 600; text-transform: uppercase;">Consultation Modes</div>
            <div style="font-weight: 700; color: var(--navy-dark); margin-top: 0.25rem;">
              🏥 In-Clinic Visit &nbsp;•&nbsp; 💻 Video Call
            </div>
          </div>
        </div>

        <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem;">Hospital Address & Clinical Location</h3>
        <div style="background: var(--navy-light); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); margin-bottom: 1.5rem;">
          <p style="font-weight: 700; color: var(--navy-dark); font-size: 1rem; margin-bottom: 0.25rem;">${doctor.clinicName || 'Super Speciality Hospital'}</p>
          <p style="font-size: 0.9rem; color: var(--navy-muted);">${doctor.location?.address || 'Medical Enclave'}, ${doctor.location?.city || 'New Delhi'} - ${doctor.location?.pincode || '110001'}</p>
        </div>

        <h3 style="font-size: 1.25rem; margin-bottom: 0.75rem;">Weekly Consultation Days</h3>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
          ${(doctor.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
            .map((day) => `<span style="background: var(--primary-light); color: var(--primary-hover); padding: 0.35rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 700;">${day}</span>`)
            .join('')}
        </div>
      `;
    }

    // Render Patient Reviews
    if (reviewsContainer) {
      if (reviews.length === 0) {
        reviewsContainer.innerHTML = `<p style="color: var(--navy-muted); font-size: 0.9rem;">No patient reviews yet. Be the first to share your experience after consultation!</p>`;
      } else {
        reviewsContainer.innerHTML = reviews
          .map(
            (rev) => `
            <div style="border-bottom: 1px solid var(--border-light); padding: 1rem 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <img src="${rev.patientId?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
                  <div>
                    <span style="font-weight: 700; font-size: 0.9rem; color: var(--navy-dark); display: block;">${rev.patientId?.name || 'Verified Patient'}</span>
                    <span style="font-size: 0.75rem; color: #059669;">✓ Verified Consultation</span>
                  </div>
                </div>
                <div style="color: #f59e0b; font-size: 0.9rem;">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</div>
              </div>
              <p style="font-size: 0.9rem; color: var(--navy-slate); line-height: 1.6; margin-top: 0.4rem;">${rev.review}</p>
            </div>
          `
          )
          .join('');
      }
    }

    // Set Sidebar Fee
    const feeEl = document.getElementById('sidebar-fee');
    if (feeEl) feeEl.innerText = `₹${doctor.consultationFee || 500}`;

    // Load Live Slot Availability
    loadDoctorAvailability(doctorId, selectedDate);
  } catch (err) {
    console.error('Error loading doctor details:', err);
    window.showToast(err.message || 'Error loading doctor profile', 'error');
  }
}

// Load real-time slot availability grouped by morning, afternoon, evening
async function loadDoctorAvailability(doctorId, date) {
  const container = document.getElementById('slots-grid-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 1.5rem;">
      <div style="display: inline-block; width: 28px; height: 28px; border: 2.5px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="font-size: 0.8rem; color: var(--navy-muted); margin-top: 0.4rem;">Checking live schedule...</p>
    </div>
  `;

  try {
    const data = await window.apiFetch(`/doctors/${doctorId}/availability?date=${date}`);
    const slots = data.slots || [];

    if (slots.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--navy-muted); font-size: 0.85rem; padding: 1rem;">No slots scheduled for this date. Please select another date.</p>`;
      return;
    }

    // Separate slots into Morning, Afternoon, Evening
    const morningSlots = slots.filter((s) => parseInt(s.time.split(':')[0], 10) < 12);
    const afternoonSlots = slots.filter((s) => {
      const h = parseInt(s.time.split(':')[0], 10);
      return h >= 12 && h < 16;
    });
    const eveningSlots = slots.filter((s) => parseInt(s.time.split(':')[0], 10) >= 16);

    const renderSlotItem = (slot) => {
      let statusClass = 'available';
      let disabledAttr = '';
      let titleAttr = 'Available for booking';

      if (slot.status === 'booked') {
        statusClass = 'booked';
        disabledAttr = 'disabled';
        titleAttr = 'Slot already booked';
      } else if (slot.status === 'locked') {
        statusClass = 'locked';
        disabledAttr = 'disabled';
        titleAttr = 'Slot temporarily reserved by another patient';
      }

      return `
        <button type="button" class="slot-btn ${statusClass}" ${disabledAttr} title="${titleAttr}" data-time="${slot.time}">
          ${slot.time}
        </button>
      `;
    };

    let html = '';

    if (morningSlots.length > 0) {
      html += `<div class="slot-group-title">🌅 Morning</div><div class="slot-grid">${morningSlots.map(renderSlotItem).join('')}</div>`;
    }

    if (afternoonSlots.length > 0) {
      html += `<div class="slot-group-title">☀️ Afternoon</div><div class="slot-grid">${afternoonSlots.map(renderSlotItem).join('')}</div>`;
    }

    if (eveningSlots.length > 0) {
      html += `<div class="slot-group-title">🌙 Evening</div><div class="slot-grid">${eveningSlots.map(renderSlotItem).join('')}</div>`;
    }

    container.innerHTML = html;

    // Attach click listeners on available slots
    container.querySelectorAll('.slot-btn.available').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTime = btn.dataset.time;
        updateSelectedSlotSummary();
        lockSelectedSlot(doctorId, date, selectedTime);
      });
    });

    // Auto-select first available slot if nothing is selected yet
    const firstAvailable = container.querySelector('.slot-btn.available');
    if (firstAvailable && !selectedTime) {
      firstAvailable.classList.add('selected');
      selectedTime = firstAvailable.dataset.time;
      updateSelectedSlotSummary();
      lockSelectedSlot(doctorId, date, selectedTime);
    }
  } catch (err) {
    console.error('Error fetching availability:', err);
    container.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem;">Failed to load slots.</p>`;
  }
}

// Temporarily lock slot during checkout
async function lockSelectedSlot(doctorId, date, time) {
  if (!window.Auth.isLoggedIn()) return;

  try {
    await window.apiFetch('/doctors/slots/lock', {
      method: 'POST',
      body: JSON.stringify({ doctorId, date, time }),
    });

    startSlotCountdown();
  } catch (err) {
    if (err.status === 409) {
      window.showToast('This slot was just selected by another patient. Please choose another slot.', 'warning');
      selectedTime = null;
      loadDoctorAvailability(doctorId, date);
    }
  }
}

function startSlotCountdown() {
  const timerBadge = document.getElementById('slot-lock-countdown');
  if (!timerBadge) return;

  if (slotCountdownTimer) clearInterval(slotCountdownTimer);

  let seconds = 300; // 5 minutes
  timerBadge.style.display = 'block';

  slotCountdownTimer = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(slotCountdownTimer);
      timerBadge.innerText = 'Reservation expired. Re-select slot.';
      selectedTime = null;
      clearSlotSelection();
      if (currentDoctor) loadDoctorAvailability(currentDoctor._id, selectedDate);
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerBadge.innerText = `🔒 Slot held for ${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }, 1000);
}

function clearSlotSelection() {
  selectedTime = null;
  const timerBadge = document.getElementById('slot-lock-countdown');
  if (timerBadge) timerBadge.style.display = 'none';
  if (slotCountdownTimer) clearInterval(slotCountdownTimer);
  updateSelectedSlotSummary();
}

function updateSelectedSlotSummary() {
  const summaryEl = document.getElementById('booking-slot-summary');
  const btn = document.getElementById('btn-confirm-booking');

  if (!summaryEl || !btn) return;

  const fee = currentDoctor?.consultationFee || 500;
  if (selectedTime) {
    summaryEl.innerHTML = `
      <div><strong>${selectedDate}</strong> at <strong>${selectedTime}</strong></div>
      <div style="font-size: 0.78rem; color: #0d9488; font-weight: 700; margin-top: 0.2rem;">${selectedMode === 'In-Clinic Visit' ? '🏥 In-Clinic Hospital Visit' : '💻 Video Telehealth Consultation'}</div>
    `;
    btn.disabled = false;
    btn.innerHTML = `<span>💳 Proceed to Payment (₹${fee}) →</span>`;
  } else {
    summaryEl.innerHTML = `<span style="color: var(--navy-muted);">⚠️ No slot selected yet</span>`;
    btn.disabled = false;
    btn.innerHTML = `<span>Confirm & Book Appointment</span>`;
  }
}

// Setup Booking Form Submission
function setupBookingForm(doctorId) {
  const form = document.getElementById('appointment-booking-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      window.showToast('Please pick an available time slot above to proceed.', 'warning');
      const slotsContainer = document.getElementById('slots-grid-container');
      if (slotsContainer) {
        slotsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!window.Auth || !window.Auth.isLoggedIn()) {
      window.showToast('Please sign in or select a demo persona to book your appointment.', 'info');
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
      }, 1000);
      return;
    }

    const reason = document.getElementById('consultation-reason')?.value.trim() || 'General Consultation';
    const submitBtn = document.getElementById('btn-confirm-booking');

    // Trigger Simulated Razorpay / UPI Payment Gateway
    if (window.openPaymentGateway) {
      window.openPaymentGateway({
        doctor: currentDoctor,
        fee: currentDoctor?.consultationFee || 500,
        date: selectedDate,
        time: selectedTime,
        consultationType: selectedMode,
        onSuccess: async (paymentResult) => {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>Securing Appointment...</span>`;

          try {
            const data = await window.apiFetch('/appointments', {
              method: 'POST',
              body: JSON.stringify({
                doctorId,
                appointmentDate: selectedDate,
                startTime: selectedTime,
                consultationType: selectedMode,
                reason,
                paymentMethod: paymentResult.paymentMethod,
                paymentStatus: paymentResult.paymentStatus,
                transactionId: paymentResult.transactionId,
              }),
            });

            const appointment = data.appointment;
            lastConfirmedAppointment = appointment;
            showBookingConfirmationModal(appointment);
            window.showToast('🎉 Appointment Confirmed & Payment Receipt Issued!', 'success');
          } catch (err) {
            window.showToast(err.message || 'Error booking appointment', 'error');
            if (err.status === 409) {
              loadDoctorAvailability(doctorId, selectedDate);
            }
          } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Confirm & Book Appointment</span>`;
          }
        },
        onCancel: () => {
          window.showToast('Payment window closed.', 'info');
        },
      });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Booking Appointment...</span>`;

    try {
      const data = await window.apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctorId,
          appointmentDate: selectedDate,
          startTime: selectedTime,
          consultationType: selectedMode,
          reason,
        }),
      });

      const appointment = data.appointment;
      lastConfirmedAppointment = appointment;
      showBookingConfirmationModal(appointment);
    } catch (err) {
      window.showToast(err.message || 'Error booking appointment', 'error');
      if (err.status === 409) {
        loadDoctorAvailability(doctorId, selectedDate);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Confirm & Book Appointment</span>`;
    }
  });
}

// Show Confirmation Modal
function showBookingConfirmationModal(appointment) {
  const modal = document.getElementById('confirmation-modal');
  if (!modal) return;

  const idEl = document.getElementById('confirmed-apt-id');
  const docEl = document.getElementById('confirmed-doc-name');
  const dateEl = document.getElementById('confirmed-datetime');
  const modeEl = document.getElementById('confirmed-mode');
  const feeEl = document.getElementById('confirmed-fee');

  if (idEl) idEl.innerText = appointment.appointmentId || appointment._id;
  if (docEl) docEl.innerText = currentDoctor ? currentDoctor.name : 'Your Doctor';
  if (dateEl) dateEl.innerText = `${appointment.appointmentDate} at ${appointment.startTime}`;
  if (modeEl) modeEl.innerText = appointment.consultationType || selectedMode;
  if (feeEl) feeEl.innerText = `₹${appointment.fee}`;

  modal.classList.add('active');
}

window.closeModal = () => {
  const modal = document.getElementById('confirmation-modal');
  if (modal) modal.classList.remove('active');
};

// Printable Digital Hospital Appointment Pass
window.openHospitalPass = () => {
  if (!lastConfirmedAppointment) {
    window.location.href = 'my-appointments.html';
    return;
  }
  const modal = document.getElementById('hospital-pass-modal');
  if (!modal) return;

  const apt = lastConfirmedAppointment;
  const user = window.Auth.getUser() || { name: 'Patient' };

  document.getElementById('pass-apt-id').innerText = apt.appointmentId || apt._id;
  document.getElementById('pass-patient-name').innerText = user.name;
  document.getElementById('pass-patient-demographics').innerText = `${user.gender || 'Not specified'} • ${user.age || 'N/A'} yrs`;
  document.getElementById('pass-doc-name').innerText = currentDoctor?.name || 'Dr. Specialist';
  document.getElementById('pass-doc-reg').innerText = `Reg No: ${currentDoctor?.medicalRegNumber || 'MCI-84920'}`;
  document.getElementById('pass-hospital-name').innerText = currentDoctor?.clinicName || 'Apollo / Max Hospital';
  document.getElementById('pass-hospital-address').innerText = `${currentDoctor?.location?.address || ''}, ${currentDoctor?.location?.city || 'New Delhi'}`;
  document.getElementById('pass-schedule').innerText = `${apt.appointmentDate} at ${apt.startTime}`;
  document.getElementById('pass-mode').innerText = apt.consultationType || 'In-Clinic Visit';
  document.getElementById('pass-fee').innerText = `₹${apt.fee} (Confirmed)`;

  modal.classList.add('active');
};

window.closePassModal = () => {
  const modal = document.getElementById('hospital-pass-modal');
  if (modal) modal.classList.remove('active');
};

window.printPass = () => {
  window.print();
};

// 1-Click Calendar Sync (.ics) for Doctor Details booking
window.downloadIcsCalendar = () => {
  const apt = lastConfirmedAppointment;
  if (!apt) {
    window.showToast('No confirmed appointment found to sync.', 'warning');
    return;
  }

  const user = window.Auth.getUser() || { name: 'Patient' };
  const doc = currentDoctor || apt.doctorId || {};
  const aptId = apt.appointmentId || apt._id || 'APT';
  const docName = doc.name || 'Dr. Specialist';
  const specialty = doc.specialization || 'Clinical Specialist';
  const clinicName = doc.clinicName || 'DoctorP Hospital';
  const address = `${doc.location?.address || ''}, ${doc.location?.city || 'New Delhi'}`.replace(/^,\s*/, '');
  const mode = apt.consultationType || selectedMode || 'In-Clinic Visit';
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

// Instant WhatsApp Digital OPD Pass share for Doctor Details booking
window.sharePassToWhatsApp = () => {
  const apt = lastConfirmedAppointment;
  if (!apt) {
    window.showToast('No confirmed appointment found to share.', 'warning');
    return;
  }

  const user = window.Auth.getUser() || { name: 'Patient' };
  const doc = currentDoctor || apt.doctorId || {};
  const aptId = apt.appointmentId || apt._id || 'APT';
  const docName = doc.name || 'Dr. Specialist';
  const specialty = doc.specialization || 'Clinical Specialist';
  const clinicName = doc.clinicName || 'DoctorP Hospital';
  const address = `${doc.location?.address || ''}, ${doc.location?.city || 'New Delhi'}`.replace(/^,\s*/, '');
  const mode = apt.consultationType || selectedMode || 'In-Clinic Visit';
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

