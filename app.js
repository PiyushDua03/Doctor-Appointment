/**
 * PulseCare OS — Core Application & Interactive Orchestration Logic
 * Incorporates multi-role dashboards, credential-protected access control,
 * hospital directory, interactive stage previews, scheduling & telehealth.
 */

// Global State
const state = {
  activeRole: 'patient', // 'patient' | 'doctor' | 'hospital'
  currentUser: null, // { name: string, email: string, role: 'doctor' | 'hospital', hospital: string }
  hospitalFilter: null, // string | null (filters doctors by hospital name)
  hospitals: [
    {
      id: 'hosp-mayo',
      name: 'Mayo Clinic Health System',
      city: 'Rochester, MN',
      image: 'images/hospital-1.jpg',
      beds: 1260,
      doctorsCount: 420,
      emergencyWait: '8 mins',
      rating: 4.98,
      badges: ['#1 US Hospital', 'JCI Accredited', 'Level 1 Trauma'],
      departments: ['Cardiology', 'Neurology', 'Oncology', 'Organ Transplant'],
      description: 'Internationally recognized health network pioneering diagnostic precision, multidisciplinary clinical teamwork, and cardiac surgery excellence.',
      phone: '+1 (507) 284-2511'
    },
    {
      id: 'hosp-hopkins',
      name: 'Johns Hopkins Medicine',
      city: 'Baltimore, MD',
      image: 'images/hospital-2.jpg',
      beds: 1150,
      doctorsCount: 380,
      emergencyWait: '12 mins',
      rating: 4.96,
      badges: ['Academic Leader', 'Magnet Recognized', 'Comprehensive Cancer'],
      departments: ['Neurology', 'Neurosurgery', 'Pediatrics', 'Immunology'],
      description: 'Premier academic medical center combining patient-first clinical delivery with biomedical discoveries.',
      phone: '+1 (410) 955-5000'
    },
    {
      id: 'hosp-cleveland',
      name: 'Cleveland Clinic',
      city: 'Cleveland, OH',
      image: 'images/clinic.jpg',
      beds: 1400,
      doctorsCount: 450,
      emergencyWait: '10 mins',
      rating: 4.95,
      badges: ['Heart Care #1', 'Robotic Surgery', 'JCI Accredited'],
      departments: ['Cardiovascular', 'Orthopedics', 'Urology', 'Digestive Disease'],
      description: 'Global nonprofit academic medical center renowned for cardiovascular excellence and surgical innovations.',
      phone: '+1 (216) 444-2200'
    },
    {
      id: 'hosp-sinai',
      name: 'Mount Sinai Health System',
      city: 'New York, NY',
      image: 'images/hospital-1.jpg',
      beds: 1134,
      doctorsCount: 310,
      emergencyWait: '15 mins',
      rating: 4.92,
      badges: ['Metro Flagship', 'Genomics Pioneer', 'Level 1 Trauma'],
      departments: ['Dermatology', 'Geriatrics', 'Cardiology', 'Psychiatry'],
      description: 'New York City’s premier integrated healthcare delivery system with groundbreaking clinical trials.',
      phone: '+1 (212) 241-6500'
    },
    {
      id: 'hosp-kaiser',
      name: 'Kaiser Permanente Regional',
      city: 'San Francisco, CA',
      image: 'images/hospital-2.jpg',
      beds: 890,
      doctorsCount: 260,
      emergencyWait: '11 mins',
      rating: 4.91,
      badges: ['Integrated EHR', 'Preventative Care', 'Green Healthcare'],
      departments: ['Family Medicine', 'Endocrinology', 'Women’s Health', 'Preventative'],
      description: 'Leader in value-based care, integrated digital medical records, and continuous preventative health monitoring.',
      phone: '+1 (415) 833-2000'
    },
    {
      id: 'hosp-mgb',
      name: 'Mass General Brigham',
      city: 'Boston, MA',
      image: 'images/clinic.jpg',
      beds: 1040,
      doctorsCount: 390,
      emergencyWait: '9 mins',
      rating: 4.94,
      badges: ['Harvard Teaching', 'Biomedical Hub', 'Emergency Leader'],
      departments: ['Internal Medicine', 'Emergency Trauma', 'Neurology', 'Pulmonology'],
      description: 'Harvard Medical School teaching affiliate with world-class clinical expertise across acute and chronic diseases.',
      phone: '+1 (617) 726-2000'
    }
  ],
  doctors: [
    {
      id: 'doc-1',
      name: 'Dr. Sarah Chen, MD',
      specialty: 'Cardiology',
      hospital: 'Mayo Clinic Health System',
      experience: '14 years',
      rating: 4.95,
      reviewsCount: 312,
      fee: '$180',
      avatar: 'images/doctor-1.jpg',
      slots: ['09:00 AM', '10:30 AM', '02:00 PM', '04:15 PM'],
      bio: 'Board-certified cardiovascular specialist focusing on preventative cardiology, advanced echocardiography, and arrhythmia management.',
      insurances: ['Blue Cross', 'Aetna', 'UnitedHealthcare', 'Medicare']
    },
    {
      id: 'doc-2',
      name: 'Dr. Marcus Vance, MD',
      specialty: 'Neurology',
      hospital: 'Johns Hopkins Medicine',
      experience: '18 years',
      rating: 4.98,
      reviewsCount: 420,
      fee: '$220',
      avatar: 'images/doctor-2.jpg',
      slots: ['11:00 AM', '01:30 PM', '03:45 PM'],
      bio: 'Leading clinical neurologist specializing in complex migraine disorders, neurovascular health, and neuropathies.',
      insurances: ['Cigna', 'Blue Cross', 'Humana', 'Medicare']
    },
    {
      id: 'doc-3',
      name: 'Dr. Elena Rostova, MD',
      specialty: 'Dermatology',
      hospital: 'Mount Sinai Health System',
      experience: '11 years',
      rating: 4.92,
      reviewsCount: 284,
      fee: '$160',
      avatar: 'images/doctor-3.jpg',
      slots: ['09:30 AM', '11:15 AM', '01:00 PM', '03:30 PM'],
      bio: 'Expert dermatologist with advanced fellowship training in medical dermatology, cutaneous oncology, and laser therapies.',
      insurances: ['Aetna', 'UnitedHealthcare', 'Kaiser', 'Cigna']
    },
    {
      id: 'doc-4',
      name: 'Dr. Julian Thorne, MD',
      specialty: 'Orthopedics',
      hospital: 'Cleveland Clinic',
      experience: '16 years',
      rating: 4.96,
      reviewsCount: 360,
      fee: '$210',
      avatar: 'images/doctor-4.jpg',
      slots: ['10:00 AM', '02:15 PM', '04:30 PM'],
      bio: 'Sub-specialized orthopedic surgeon with extensive experience in sports injuries, arthroscopic reconstruction, and joint preservation.',
      insurances: ['Blue Cross', 'Aetna', 'Medicare', 'Kaiser']
    },
    {
      id: 'doc-5',
      name: 'Dr. Amara Okafor, MD',
      specialty: 'Pediatrics',
      hospital: 'Johns Hopkins Medicine',
      experience: '9 years',
      rating: 4.97,
      reviewsCount: 195,
      fee: '$150',
      avatar: 'images/doctor-5.jpg',
      slots: ['08:45 AM', '10:00 AM', '01:15 PM'],
      bio: 'Compassionate pediatric physician dedicated to developmental screenings, preventative child health, and family health education.',
      insurances: ['Medicaid', 'Blue Cross', 'UnitedHealthcare', 'Cigna']
    },
    {
      id: 'doc-6',
      name: 'Dr. David Lindqvist, MD',
      specialty: 'General Medicine',
      hospital: 'Mass General Brigham',
      experience: '20 years',
      rating: 4.89,
      reviewsCount: 510,
      fee: '$130',
      avatar: 'images/doctor-6.jpg',
      slots: ['09:15 AM', '11:45 AM', '02:30 PM', '05:00 PM'],
      bio: 'Senior internal medicine physician experienced in managing chronic conditions, diagnostic evaluations, and holistic health.',
      insurances: ['All Major Insurances', 'Medicare']
    },
    {
      id: 'doc-7',
      name: 'Dr. Sophia Patel, MD',
      specialty: 'Endocrinology',
      hospital: 'Kaiser Permanente Regional',
      experience: '13 years',
      rating: 4.94,
      reviewsCount: 230,
      fee: '$190',
      avatar: 'images/doctor-7.jpg',
      slots: ['10:15 AM', '01:45 PM', '04:00 PM'],
      bio: 'Specialist in metabolic health, thyroid conditions, neuroendocrinology, and personalized hormone therapy.',
      insurances: ['Kaiser', 'Blue Cross', 'Aetna']
    },
    {
      id: 'doc-8',
      name: 'Dr. Robert Sterling, MD',
      specialty: 'Cardiology',
      hospital: 'Mayo Clinic Health System',
      experience: '22 years',
      rating: 4.99,
      reviewsCount: 680,
      fee: '$250',
      avatar: 'images/doctor-8.jpg',
      slots: ['11:30 AM', '02:45 PM'],
      bio: 'Pioneering interventional cardiologist with international recognition in structural heart interventions and heart rhythm optimization.',
      insurances: ['Blue Cross', 'Aetna', 'Medicare', 'UnitedHealthcare']
    }
  ],
  appointments: [
    {
      id: 'PC-89421',
      patientName: 'Alexandra Hayes',
      patientEmail: 'alexandra.h@example.com',
      patientPhone: '+1 (555) 234-8901',
      doctorId: 'doc-1',
      doctorName: 'Dr. Sarah Chen, MD',
      specialty: 'Cardiology',
      hospital: 'Mayo Clinic Health System',
      date: 'Tomorrow, Oct 10',
      time: '10:30 AM',
      type: 'Telehealth',
      status: 'Confirmed',
      symptoms: 'Mild tachycardia episodes during workout and follow-up on echocardiogram report.',
      vitals: 'BP: 122/78 • HR: 74 bpm • SpO2: 98%'
    },
    {
      id: 'PC-78219',
      patientName: 'Jonathan Davis',
      patientEmail: 'j.davis@example.com',
      patientPhone: '+1 (555) 345-6712',
      doctorId: 'doc-1',
      doctorName: 'Dr. Sarah Chen, MD',
      specialty: 'Cardiology',
      hospital: 'Mayo Clinic Health System',
      date: 'Today, Oct 9',
      time: '02:00 PM',
      type: 'In-Clinic',
      status: 'Confirmed',
      symptoms: 'Routine 6-month hypertension review and statin prescription calibration.',
      vitals: 'BP: 130/84 • HR: 68 bpm • SpO2: 99%'
    },
    {
      id: 'PC-63914',
      patientName: 'Claire Morgan',
      patientEmail: 'claire.m@example.com',
      patientPhone: '+1 (555) 872-9011',
      doctorId: 'doc-3',
      doctorName: 'Dr. Elena Rostova, MD',
      specialty: 'Dermatology',
      hospital: 'Mount Sinai Health System',
      date: 'Oct 12, 2026',
      time: '01:00 PM',
      type: 'In-Clinic',
      status: 'Pending',
      symptoms: 'Full-body annual mole screening and acute dermatitis rash evaluation.',
      vitals: 'BP: 118/74 • HR: 70 bpm • SpO2: 100%'
    }
  ],
  hospitalStats: {
    totalAppointments: 248,
    occupancyRate: 84,
    activeDoctors: 32,
    dailyRevenue: 42800,
    satisfactionScore: 4.9
  },
  selectedDoctorForBooking: null,
  activeStage1Tab: 'directory',
  activeStage2Tab: 'calendar',
  activeStage3Tab: 'patient-hub'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadPersistedState();
  initNavigation();
  initHeroInteractions();
  initOrchestrationHub();
  initStageSelectors();
  initRolePortals();
  initBookingModal();
  initTelehealthSimulator();
  initFaqAccordion();
  initAuthModal();
  renderHospitals();
  renderAllViews();
  updateAuthHeader();

  // Check URL hash for direct tab navigation from sign-in pages
  function handleHashNavigation() {
    if (window.location.hash === '#doctor') {
      switchRole('doctor');
      const portalSec = document.getElementById('product-portals');
      if (portalSec) {
        setTimeout(() => portalSec.scrollIntoView({ behavior: 'smooth' }), 200);
      }
    } else if (window.location.hash === '#hospital') {
      switchRole('hospital');
      const portalSec = document.getElementById('product-portals');
      if (portalSec) {
        setTimeout(() => portalSec.scrollIntoView({ behavior: 'smooth' }), 200);
      }
    }
  }

  handleHashNavigation();
  window.addEventListener('hashchange', handleHashNavigation);
});

// Load state from localStorage if available
function loadPersistedState() {
  const savedAppointments = localStorage.getItem('pulsecare_appointments');
  if (savedAppointments) {
    try {
      state.appointments = JSON.parse(savedAppointments);
    } catch (e) {
      console.error('Error loading saved appointments', e);
    }
  }

  const savedUser = localStorage.getItem('pulsecare_user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
    } catch (e) {
      console.error('Error loading saved user session', e);
    }
  }
}

function saveState() {
  try {
    localStorage.setItem('pulsecare_appointments', JSON.stringify(state.appointments));
  } catch (e) {
    console.error('Error saving appointments', e);
  }
}

function saveUserSession() {
  try {
    if (state.currentUser) {
      localStorage.setItem('pulsecare_user', JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem('pulsecare_user');
    }
  } catch (e) {
    console.error('Error saving user session', e);
  }
}

// Navigation scroll blur and mobile drawer
function initNavigation() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  const mobileToggle = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-drawer');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
  }

  // Header role switcher buttons
  document.querySelectorAll('.role-pill-switch .role-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const role = e.currentTarget.dataset.role;
      switchRole(role);
      const portalSec = document.getElementById('product-portals');
      if (portalSec) {
        portalSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Hero 3D Card tilt and micro-interactions
function initHeroInteractions() {
  const heroNotifStage = document.querySelector('.hero-notif-stage');
  if (heroNotifStage) {
    heroNotifStage.addEventListener('mousemove', (e) => {
      const rect = heroNotifStage.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotY = (x / rect.width) * 12;
      const rotX = -(y / rect.height) * 12;

      document.querySelectorAll('.floating-glass-card').forEach((card, idx) => {
        const factor = (idx + 1) * 0.4;
        card.style.transform = `rotateY(${rotY * factor}deg) rotateX(${rotX * factor}deg) translateY(-${idx * 4}px)`;
      });
    });

    heroNotifStage.addEventListener('mouseleave', () => {
      document.querySelectorAll('.floating-glass-card').forEach((card, idx) => {
        card.style.transform = 'rotateY(-6deg) rotateX(2deg)';
      });
    });
  }
}

// Orchestration Hub Interactive Map
function initOrchestrationHub() {
  const nodes = document.querySelectorAll('.care-node');
  nodes.forEach(node => {
    node.addEventListener('click', () => {
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      const target = node.dataset.node;
      showToast(`Care Hub Telemetry: ${target.toUpperCase()} node inspected`, 'info');

      const hubSub = document.querySelector('.care-hub-center .hub-sub');
      if (hubSub) {
        hubSub.textContent = `Node: ${target}`;
        setTimeout(() => {
          hubSub.textContent = 'Active Sync 99.9%';
        }, 2500);
      }
    });
  });
}

// Three Feature Stages Selectors (1.0, 2.0, 3.0)
function initStageSelectors() {
  document.querySelectorAll('[data-stage="1"] .stage-selector-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-stage="1"] .stage-selector-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      updateStage1Preview(target.dataset.view);
    });
  });

  document.querySelectorAll('[data-stage="2"] .stage-selector-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-stage="2"] .stage-selector-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      updateStage2Preview(target.dataset.view);
    });
  });

  document.querySelectorAll('[data-stage="3"] .stage-selector-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-stage="3"] .stage-selector-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      updateStage3Preview(target.dataset.view);
    });
  });
}

function updateStage1Preview(view) {
  const container = document.getElementById('stage1-preview-dynamic');
  if (!container) return;

  if (view === 'directory') {
    container.innerHTML = `
      <div class="preview-search-row">
        <input type="text" class="preview-search-input" placeholder="Search cardiology, dermatology, doctor name..." value="Cardiology">
      </div>
      <div class="preview-filter-chips">
        <button class="chip-btn active">All Specialists</button>
        <button class="chip-btn">Next 24h</button>
        <button class="chip-btn">Top Rated (4.9+)</button>
        <button class="chip-btn">Telehealth Ready</button>
      </div>
      <div class="doctor-preview-cards">
        <div class="mini-doctor-card">
          <div class="mini-doc-left">
            <img src="images/doctor-1.jpg" alt="Dr. Sarah Chen" class="mini-doc-avatar">
            <div>
              <div class="mini-doc-name">Dr. Sarah Chen, MD</div>
              <div class="mini-doc-spec">Cardiology • Mayo Clinic</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="mini-doc-badge">★ 4.95 (312 reviews)</div>
            <button class="mini-doc-action-btn" onclick="openBookingModal('doc-1')">Book Slot</button>
          </div>
        </div>
        <div class="mini-doctor-card">
          <div class="mini-doc-left">
            <img src="images/doctor-8.jpg" alt="Dr. Robert Sterling" class="mini-doc-avatar">
            <div>
              <div class="mini-doc-name">Dr. Robert Sterling, MD</div>
              <div class="mini-doc-spec">Cardiology • Stanford Health</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="mini-doc-badge">★ 4.99 (680 reviews)</div>
            <button class="mini-doc-action-btn" onclick="openBookingModal('doc-8')">Book Slot</button>
          </div>
        </div>
      </div>
    `;
  } else if (view === 'availability') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h4 style="font-size:14px; font-weight:700;">Live Real-Time Clinic Openings</h4>
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--accent-emerald);">● 14 slots open today</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#fff; border-radius:8px; border:1px solid var(--ink-border);">
            <div>
              <strong style="font-size:13px;">Dr. Elena Rostova (Dermatology)</strong>
              <div style="font-size:11px; color:var(--ink-faint);">Today at 01:00 PM • Room 204B</div>
            </div>
            <button class="mini-doc-action-btn" style="padding:4px 10px; font-size:12px;" onclick="openBookingModal('doc-3')">Instant Claim</button>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#fff; border-radius:8px; border:1px solid var(--ink-border);">
            <div>
              <strong style="font-size:13px;">Dr. Julian Thorne (Orthopedics)</strong>
              <div style="font-size:11px; color:var(--ink-faint);">Today at 02:15 PM • Suite 410</div>
            </div>
            <button class="mini-doc-action-btn" style="padding:4px 10px; font-size:12px;" onclick="openBookingModal('doc-4')">Instant Claim</button>
          </div>
        </div>
      </div>
    `;
  } else if (view === 'insurance') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <h4 style="font-size:14px; font-weight:700; margin-bottom:8px;">Instant In-Network Insurance Verification</h4>
        <p style="font-size:12.5px; color:var(--ink-secondary); margin-bottom:14px;">Select your provider to calculate exact copay before booking:</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
          <div style="padding:10px; border:1px solid var(--accent-teal); border-radius:8px; background:rgba(13,148,136,0.06);">
            <div style="font-weight:600; font-size:12.5px;">Blue Cross Blue Shield</div>
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--accent-teal); margin-top:2px;">Copay: $25.00 (In-Network)</div>
          </div>
          <div style="padding:10px; border:1px solid var(--ink-border); border-radius:8px; background:#fff;">
            <div style="font-weight:600; font-size:12.5px;">Aetna Health</div>
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--ink-secondary); margin-top:2px;">Copay: $30.00 (In-Network)</div>
          </div>
        </div>
        <div style="font-size:11.5px; color:var(--ink-faint); display:flex; align-items:center; gap:6px;">
          <span>🔒 256-Bit HIPAA Encrypted Insurance API Check</span>
        </div>
      </div>
    `;
  }
}

function updateStage2Preview(view) {
  const container = document.getElementById('stage2-preview-dynamic');
  if (!container) return;

  if (view === 'calendar') {
    container.innerHTML = `
      <div class="booking-calendar-preview">
        <div>
          <span style="font-size:12px; font-weight:600; color:var(--ink-secondary); margin-bottom:8px; display:block;">Select Date (October 2026):</span>
          <div class="date-slider-preview">
            <div class="date-pill active"><div class="day-name">Thu</div><div class="day-num">09</div></div>
            <div class="date-pill"><div class="day-name">Fri</div><div class="day-num">10</div></div>
            <div class="date-pill"><div class="day-name">Sat</div><div class="day-num">11</div></div>
            <div class="date-pill"><div class="day-name">Mon</div><div class="day-num">13</div></div>
            <div class="date-pill"><div class="day-name">Tue</div><div class="day-num">14</div></div>
          </div>
        </div>
        <div>
          <span style="font-size:12px; font-weight:600; color:var(--ink-secondary); margin-bottom:8px; display:block;">Available Slots with Dr. Sarah Chen:</span>
          <div class="slot-pills-grid">
            <div class="slot-pill active">09:00 AM</div>
            <div class="slot-pill">10:30 AM</div>
            <div class="slot-pill booked">12:00 PM (Booked)</div>
            <div class="slot-pill">02:00 PM</div>
            <div class="slot-pill">04:15 PM</div>
            <div class="slot-pill booked">05:00 PM (Booked)</div>
          </div>
        </div>
      </div>
    `;
  } else if (view === 'telehealth') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <h4 style="font-size:14px; font-weight:700; margin-bottom:12px;">Consultation Medium Selection</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
          <div style="padding:14px; border:2px solid var(--accent-teal); border-radius:10px; background:#ffffff;">
            <div style="font-size:18px; margin-bottom:4px;">📹</div>
            <strong style="font-size:13.5px; display:block;">Encrypted HD Telehealth</strong>
            <p style="font-size:11.5px; color:var(--ink-secondary); margin-top:4px;">Join from your phone or browser. Instant audio/video room with secure document upload.</p>
          </div>
          <div style="padding:14px; border:1px solid var(--ink-border); border-radius:10px; background:#ffffff;">
            <div style="font-size:18px; margin-bottom:4px;">🏥</div>
            <strong style="font-size:13.5px; display:block;">In-Clinic Consultation</strong>
            <p style="font-size:11.5px; color:var(--ink-secondary); margin-top:4px;">Visit doctor in clinic suite. Automated QR check-in & directions sent to SMS.</p>
          </div>
        </div>
        <button class="mini-doc-action-btn" style="width:100%;" onclick="openBookingModal('doc-1')">Continue with Telehealth</button>
      </div>
    `;
  } else if (view === 'intake') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <h4 style="font-size:14px; font-weight:700; margin-bottom:8px;">Zero-Wait Digital Intake Form</h4>
        <p style="font-size:12px; color:var(--ink-secondary); margin-bottom:12px;">Patients fill symptoms once. Form pre-populates the physician’s EHR notes.</p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <input type="text" class="form-input" style="font-size:12px;" value="Chief Complaint: Elevated heart rate after cardio exercise" readonly>
          <input type="text" class="form-input" style="font-size:12px;" value="Allergies: Penicillin, Sulfa drugs" readonly>
          <input type="text" class="form-input" style="font-size:12px;" value="Current Medications: Metoprolol 25mg daily" readonly>
        </div>
        <div style="margin-top:12px; display:flex; align-items:center; gap:6px; font-size:11px; color:var(--accent-emerald);">
          <span>✓ Pre-consultation intake verified and formatted for clinical review</span>
        </div>
      </div>
    `;
  }
}

function updateStage3Preview(view) {
  const container = document.getElementById('stage3-preview-dynamic');
  if (!container) return;

  if (view === 'patient-hub') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-size:14px; font-weight:700;">Patient Care Dashboard</h4>
          <span style="font-family:var(--font-mono); font-size:11px; background:rgba(16,185,129,0.12); color:var(--accent-emerald); padding:2px 8px; border-radius:4px;">1 Upcoming</span>
        </div>
        <div style="background:#ffffff; border:1px solid var(--ink-border); border-radius:10px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between;">
            <strong style="font-size:13px;">Dr. Sarah Chen, MD</strong>
            <span style="font-family:var(--font-mono); font-size:11px; color:var(--accent-teal);">Tomorrow 10:30 AM</span>
          </div>
          <p style="font-size:12px; color:var(--ink-secondary); margin-top:4px;">Cardiology Telehealth Consultation</p>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="mini-doc-action-btn" style="padding:4px 10px; font-size:12px;" onclick="openTelehealthSimulator('Alexandra Hayes')">Join Video Call</button>
            <button style="padding:4px 10px; font-size:12px; background:#f1f1ee; border-radius:6px;" onclick="showToast('Calendar invite re-sent to email', 'info')">Sync Calendar</button>
          </div>
        </div>
      </div>
    `;
  } else if (view === 'doctor-queue') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-size:14px; font-weight:700;">Dr. Sarah Chen's Live Schedule</h4>
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--accent-emerald);">● On Duty</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--ink-border); border-radius:8px; padding:10px;">
            <div>
              <span style="font-family:var(--font-mono); font-size:11px; color:var(--ink-faint);">10:30 AM • Video</span>
              <div style="font-size:13px; font-weight:600;">Alexandra Hayes</div>
            </div>
            <button class="mini-doc-action-btn" style="padding:4px 10px; font-size:12px;" onclick="openTelehealthSimulator('Alexandra Hayes')">Start</button>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--ink-border); border-radius:8px; padding:10px;">
            <div>
              <span style="font-family:var(--font-mono); font-size:11px; color:var(--ink-faint);">02:00 PM • Clinic</span>
              <div style="font-size:13px; font-weight:600;">Jonathan Davis</div>
            </div>
            <span style="font-size:11px; color:var(--ink-faint); font-family:var(--font-mono);">Suite 302</span>
          </div>
        </div>
      </div>
    `;
  } else if (view === 'hospital-ops') {
    container.innerHTML = `
      <div style="background:#fcfcfb; border:1px solid var(--ink-border); border-radius:12px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="font-size:14px; font-weight:700;">Mayo Clinic Operations Overview</h4>
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--accent-emerald);">Real-time Telemetry</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div style="background:#fff; border:1px solid var(--ink-border); border-radius:8px; padding:10px;">
            <div style="font-size:11px; color:var(--ink-faint); font-family:var(--font-mono);">BED OCCUPANCY</div>
            <div style="font-size:20px; font-weight:700; color:var(--ink);">84.2%</div>
          </div>
          <div style="background:#fff; border:1px solid var(--ink-border); border-radius:8px; padding:10px;">
            <div style="font-size:11px; color:var(--ink-faint); font-family:var(--font-mono);">TODAY APPOINTMENTS</div>
            <div style="font-size:20px; font-weight:700; color:var(--ink);">248</div>
          </div>
        </div>
        <div style="font-size:11.5px; color:var(--ink-secondary);">Department status: Cardiology (92%), Ortho (78%), ER (96% Peak).</div>
      </div>
    `;
  }
}

// Hospitals Directory Render
function renderHospitals() {
  const container = document.getElementById('hospitals-directory-grid');
  if (!container) return;

  container.innerHTML = state.hospitals.map(hosp => `
    <div class="hospital-card" id="${hosp.id}">
      <div class="hospital-card-img-wrap">
        <img src="${hosp.image}" alt="${hosp.name}" class="hospital-card-img" onerror="this.src='images/clinic.jpg'">
        <div class="hospital-card-overlay-badge">
          <span>🏥</span><span>${hosp.badges[0]}</span>
        </div>
        <div class="hospital-rating-badge">
          ★ ${hosp.rating}
        </div>
      </div>

      <div class="hospital-card-body">
        <div class="hospital-header-line">
          <h3 class="hospital-card-title">${hosp.name}</h3>
        </div>
        <div class="hospital-card-location">
          <span>📍</span><span>${hosp.city}</span>
        </div>
        <p class="hospital-card-desc">${hosp.description}</p>

        <div class="hospital-metrics-row">
          <div class="hospital-metric-col">
            <div class="hospital-metric-val">${hosp.beds}</div>
            <div class="hospital-metric-lbl">Total Beds</div>
          </div>
          <div class="hospital-metric-col">
            <div class="hospital-metric-val">${hosp.doctorsCount}+</div>
            <div class="hospital-metric-lbl">Physicians</div>
          </div>
          <div class="hospital-metric-col">
            <div class="hospital-metric-val" style="color: var(--accent-emerald);">${hosp.emergencyWait}</div>
            <div class="hospital-metric-lbl">ER Wait</div>
          </div>
        </div>

        <div class="dept-pills-wrap">
          ${hosp.departments.map(d => `<span class="dept-pill">${d}</span>`).join('')}
        </div>

        <div class="hospital-actions-row">
          <button class="btn-filter-doctors" onclick="filterDoctorsByHospital('${hosp.name}')">
            <span>View Doctors (${getHospitalDoctorsCount(hosp.name)})</span>
            <span>→</span>
          </button>
          <button class="btn-hospital-details" onclick="openHospitalModal('${hosp.id}')">
            Facility Info
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function getHospitalDoctorsCount(hospName) {
  return state.doctors.filter(d => d.hospital === hospName).length || 2;
}

window.filterDoctorsByHospital = function(hospitalName) {
  state.hospitalFilter = hospitalName;
  switchRole('patient');

  const portalSection = document.getElementById('product-portals');
  if (portalSection) {
    portalSection.scrollIntoView({ behavior: 'smooth' });
  }

  renderPatientPortal();
  showToast(`Showing doctors affiliated with: ${hospitalName}`, 'info');
};

window.clearHospitalFilter = function() {
  state.hospitalFilter = null;
  renderPatientPortal();
  showToast('Hospital filter cleared. Showing all verified specialists.', 'info');
};

// Hospital Facility Modal
window.openHospitalModal = function(hospitalId) {
  const hosp = state.hospitals.find(h => h.id === hospitalId) || state.hospitals[0];
  const overlay = document.getElementById('hospital-modal-overlay');
  if (!overlay) return;

  document.getElementById('modal-hosp-name').textContent = hosp.name;
  document.getElementById('modal-hosp-city').textContent = `${hosp.city} • Verified Healthcare Campus`;
  document.getElementById('modal-hosp-desc').textContent = hosp.description;
  document.getElementById('modal-hosp-phone').textContent = hosp.phone;
  document.getElementById('modal-hosp-beds').textContent = `${hosp.beds} Certified Inpatient Beds`;
  document.getElementById('modal-hosp-rating').textContent = `★ ${hosp.rating} Overall Quality Index`;
  document.getElementById('modal-hosp-er').textContent = `Emergency Department Triage: ${hosp.emergencyWait}`;

  overlay.classList.add('open');
};

window.closeHospitalModal = function() {
  const overlay = document.getElementById('hospital-modal-overlay');
  if (overlay) overlay.classList.remove('open');
};

// Role Switching with Credential-Protected Access Control
function initRolePortals() {
  document.querySelectorAll('.portal-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const role = e.currentTarget.dataset.role;
      switchRole(role);
    });
  });
}

function switchRole(role) {
  state.activeRole = role;

  // Update nav buttons
  document.querySelectorAll('.role-pill-switch .role-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.role === role);
  });

  document.querySelectorAll('.portal-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.role === role);
  });

  // Toggle visible portal view
  document.querySelectorAll('.portal-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${role}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Enforce Credential Access for Doctor & Hospital roles
  if (role === 'doctor') {
    enforceDoctorAccess();
  } else if (role === 'hospital') {
    enforceHospitalAccess();
  } else {
    showToast(`Switched view to: PATIENT PORTAL`, 'info');
  }
}

// Authentication Gates Enforcement
function enforceDoctorAccess() {
  const isDoctorAuth = state.currentUser && state.currentUser.role === 'doctor';
  const gate = document.getElementById('doctor-auth-gate');
  const content = document.getElementById('doctor-authenticated-content');

  if (isDoctorAuth) {
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';
    renderDoctorDashboard();
    showToast(`Physician Session Active: Dr. Sarah Chen, MD`, 'success');
  } else {
    if (gate) gate.style.display = 'block';
    if (content) content.style.display = 'none';
    showToast(`Restricted Access: Physician credentials required`, 'info');
  }
}

function enforceHospitalAccess() {
  const isHospitalAuth = state.currentUser && state.currentUser.role === 'hospital';
  const gate = document.getElementById('hospital-auth-gate');
  const content = document.getElementById('hospital-authenticated-content');

  if (isHospitalAuth) {
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';
    renderHospitalDashboard();
    showToast(`Administrator Session Active: Mayo Clinic Operations`, 'success');
  } else {
    if (gate) gate.style.display = 'block';
    if (content) content.style.display = 'none';
    showToast(`Restricted Access: Hospital Owner credentials required`, 'info');
  }
}

// Authentication Modal Logic
function initAuthModal() {
  const form = document.getElementById('clinical-auth-form');
  const closeBtn = document.getElementById('auth-modal-close');
  const overlay = document.getElementById('auth-modal-overlay');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuthSubmit(form);
    });
  }

  // Auth Tabs (Doctor vs Hospital Admin)
  document.querySelectorAll('.auth-tab-btn').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.auth-tab-btn').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const targetRole = e.currentTarget.dataset.role;
      setAuthModalRole(targetRole);
    });
  });
}

window.openAuthModal = function(targetRole = 'doctor') {
  const overlay = document.getElementById('auth-modal-overlay');
  if (!overlay) return;

  setAuthModalRole(targetRole);
  overlay.classList.add('open');
};

function setAuthModalRole(role) {
  document.querySelectorAll('.auth-tab-btn').forEach(t => {
    t.classList.toggle('active', t.dataset.role === role);
  });

  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const roleTitle = document.getElementById('auth-modal-role-title');
  const targetRoleInput = document.getElementById('auth-target-role');

  if (targetRoleInput) targetRoleInput.value = role;

  if (role === 'doctor') {
    if (roleTitle) roleTitle.textContent = 'Physician Portal Login';
    if (emailInput) emailInput.value = 'dr.chen@mayoclinic.org';
    if (passInput) passInput.value = 'doctor123';
  } else {
    if (roleTitle) roleTitle.textContent = 'Hospital Owner & Admin Login';
    if (emailInput) emailInput.value = 'admin@mayoclinic.org';
    if (passInput) passInput.value = 'hospital123';
  }
}

window.quickDemoLogin = function(role) {
  if (role === 'doctor') {
    state.currentUser = {
      name: 'Dr. Sarah Chen, MD',
      email: 'dr.chen@mayoclinic.org',
      role: 'doctor',
      hospital: 'Mayo Clinic Health System'
    };
  } else {
    state.currentUser = {
      name: 'Mayo Clinic Operations',
      email: 'admin@mayoclinic.org',
      role: 'hospital',
      hospital: 'Mayo Clinic Health System'
    };
  }

  saveUserSession();
  updateAuthHeader();

  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.classList.remove('open');

  switchRole(role);
  showToast(`Authenticated successfully as ${state.currentUser.name}`, 'success');
};

function handleAuthSubmit(form) {
  const role = document.getElementById('auth-target-role').value;
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();

  if (role === 'doctor') {
    state.currentUser = {
      name: 'Dr. Sarah Chen, MD',
      email: email || 'dr.chen@mayoclinic.org',
      role: 'doctor',
      hospital: 'Mayo Clinic Health System'
    };
  } else {
    state.currentUser = {
      name: 'Mayo Clinic Operations',
      email: email || 'admin@mayoclinic.org',
      role: 'hospital',
      hospital: 'Mayo Clinic Health System'
    };
  }

  saveUserSession();
  updateAuthHeader();

  document.getElementById('auth-modal-overlay').classList.remove('open');
  switchRole(role);
  showToast(`Welcome back, ${state.currentUser.name}! Dashboard unlocked.`, 'success');
}

window.logout = function() {
  state.currentUser = null;
  saveUserSession();
  updateAuthHeader();
  switchRole('patient');
  showToast('You have been safely signed out. Dashboards locked.', 'info');
};

window.toggleStaffDropdown = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const menu = document.getElementById('staff-dropdown-menu');
  if (menu) {
    menu.classList.toggle('show');
  }
};

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('auth-header-dropdown');
  const menu = document.getElementById('staff-dropdown-menu');
  if (dropdown && menu && !dropdown.contains(e.target)) {
    menu.classList.remove('show');
  }
});

function updateAuthHeader() {
  const container = document.getElementById('header-auth-status');
  if (!container) return;

  if (state.currentUser) {
    const isDoctor = state.currentUser.role === 'doctor';
    const portalLink = isDoctor ? 'doctor-portal.html' : 'owner-dashboard.html';
    const portalText = isDoctor ? 'Doctor Portal ↗' : 'Owner Portal ↗';
    const portalColor = isDoctor ? 'var(--accent-teal-light)' : '#60a5fa';

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <a href="${portalLink}" class="glass-single-pill" style="height: 38px; font-size: 12px; font-weight: 600; text-decoration: none; color: ${portalColor}; display: inline-flex; align-items: center; gap: 4px;">
          <span>${isDoctor ? '🩺' : '🏥'}</span>
          <span>${portalText}</span>
        </a>
        <div class="auth-active-user-strip">
          <span style="color: var(--accent-emerald);">●</span>
          <span>${state.currentUser.name}</span>
          <span class="auth-user-badge-role">${state.currentUser.role.toUpperCase()}</span>
          <button type="button" class="btn-signout" onclick="logout()" title="Sign Out">Sign Out</button>
        </div>
      </div>
    `;
    container.innerHTML = '';
  }
}

// Render All Dynamic Views
function renderAllViews() {
  renderPatientPortal();
  renderDoctorDashboard();
  renderHospitalDashboard();
}

// Render Patient Portal
function renderPatientPortal() {
  const grid = document.getElementById('patient-doctor-cards-grid');
  const filterBanner = document.getElementById('patient-hospital-filter-banner');
  if (!grid) return;

  let doctorsToDisplay = state.doctors;
  if (state.hospitalFilter) {
    doctorsToDisplay = state.doctors.filter(d => d.hospital === state.hospitalFilter);
    if (filterBanner) {
      filterBanner.style.display = 'flex';
      filterBanner.innerHTML = `
        <span>Filtered by Hospital: <strong>${state.hospitalFilter}</strong> (${doctorsToDisplay.length} Doctors)</span>
        <button style="margin-left: 12px; font-size: 12px; color: var(--accent-rose); font-weight: 600;" onclick="clearHospitalFilter()">✕ Clear Filter</button>
      `;
    }
  } else {
    if (filterBanner) filterBanner.style.display = 'none';
  }

  grid.innerHTML = doctorsToDisplay.map(doc => `
    <div class="doc-full-card">
      <div class="doc-card-top">
        <img src="${doc.avatar}" alt="${doc.name}" class="doc-card-avatar" onerror="this.src='images/doctor-1.jpg'">
        <div class="doc-card-info">
          <h4>${doc.name}</h4>
          <p class="spec">${doc.specialty}</p>
          <p class="hosp">${doc.hospital}</p>
        </div>
      </div>
      <p style="font-size: 12.5px; color: var(--ink-secondary); margin-bottom: 12px; line-height: 1.45;">${doc.bio}</p>
      <div class="doc-meta-row">
        <div class="doc-meta-item">
          <span class="label">RATING</span>
          <span class="val">★ ${doc.rating} (${doc.reviewsCount})</span>
        </div>
        <div class="doc-meta-item">
          <span class="label">FEE</span>
          <span class="val">${doc.fee}</span>
        </div>
        <div class="doc-meta-item">
          <span class="label">NEXT SLOT</span>
          <span class="val">${doc.slots[0] || 'Tomorrow'}</span>
        </div>
      </div>
      <button class="doc-book-btn" onclick="openBookingModal('${doc.id}')">
        <span>Book Appointment</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  `).join('');

  renderUpcomingAppointments();
}

function renderUpcomingAppointments() {
  const container = document.getElementById('patient-appointments-list');
  if (!container) return;

  if (state.appointments.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--ink-faint); font-size: 13px;">
        No appointments booked yet. Choose a specialist to schedule care.
      </div>
    `;
    return;
  }

  container.innerHTML = state.appointments.map(app => `
    <div class="appointment-item-card" id="app-card-${app.id}">
      <div class="app-card-header">
        <span class="app-status-badge ${app.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}">${app.status}</span>
        <span style="font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-faint);">${app.id}</span>
      </div>
      <div class="app-doc-name">${app.doctorName}</div>
      <div class="app-time-text">📅 ${app.date} • ⏰ ${app.time} (${app.type})</div>
      <p style="font-size: 11.5px; color: var(--ink-faint); margin-top: 4px;">Reason: ${app.symptoms.substring(0, 50)}...</p>
      <div class="app-actions-row">
        ${app.type === 'Telehealth' ? `
          <button class="app-btn-telehealth" onclick="openTelehealthSimulator('${app.patientName}')">
            <span>📹 Enter Video Room</span>
          </button>
        ` : `
          <button class="app-btn-telehealth" style="background: #191c21;" onclick="showToast('Directions & clinic pass sent to your phone!', 'success')">
            <span>🏥 Clinic Pass</span>
          </button>
        `}
        <button class="app-btn-cancel" onclick="cancelAppointment('${app.id}')">Cancel</button>
      </div>
    </div>
  `).join('');
}

// Render Doctor Dashboard
function renderDoctorDashboard() {
  const tableBody = document.getElementById('doctor-queue-tbody');
  if (!tableBody) return;

  const doctorAppointments = state.appointments.filter(a => a.doctorId === 'doc-1' || a.doctorId === 'doc-8');

  tableBody.innerHTML = doctorAppointments.map(app => `
    <tr>
      <td>
        <strong style="color: var(--ink);">${app.patientName}</strong>
        <div style="font-size: 11.5px; color: var(--ink-faint);">${app.patientPhone}</div>
      </td>
      <td>
        <span style="font-family: var(--font-mono);">${app.time}</span>
        <div style="font-size: 11px; color: var(--ink-faint);">${app.date}</div>
      </td>
      <td>
        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px;">
          ${app.type === 'Telehealth' ? '📹 Telehealth' : '🏥 In-Clinic'}
        </span>
      </td>
      <td>
        <span class="app-status-badge ${app.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}">${app.status}</span>
      </td>
      <td style="max-width: 220px;">
        <span style="font-size: 12px; color: var(--ink-secondary);">${app.symptoms}</span>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${app.type === 'Telehealth' ? `
            <button class="mini-doc-action-btn" style="padding: 5px 10px; font-size: 11.5px; background: var(--accent-teal);" onclick="openTelehealthSimulator('${app.patientName}')">Call</button>
          ` : `
            <button class="mini-doc-action-btn" style="padding: 5px 10px; font-size: 11.5px; background: #191c21;" onclick="showToast('Patient checked into Clinic Suite 302', 'success')">Check In</button>
          `}
          <button class="mini-doc-action-btn" style="padding: 5px 10px; font-size: 11.5px; background: #e5e5e0; color: #191c21;" onclick="completeAppointment('${app.id}')">Complete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Hospital Dashboard
function renderHospitalDashboard() {
  const rosterBody = document.getElementById('hospital-roster-tbody');
  if (!rosterBody) return;

  rosterBody.innerHTML = state.doctors.slice(0, 6).map(doc => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${doc.avatar}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;">
          <div>
            <strong>${doc.name}</strong>
            <div style="font-size: 11px; color: var(--ink-faint);">${doc.specialty}</div>
          </div>
        </div>
      </td>
      <td><span style="font-family: var(--font-mono); font-size: 12px;">Active (On Duty)</span></td>
      <td><span style="font-family: var(--font-mono); font-weight: 600;">${doc.slots.length} Slots</span></td>
      <td>
        <button class="mini-doc-action-btn" style="padding: 4px 8px; font-size: 11px; background: #f1f1ee; color: var(--ink);" onclick="showToast('Roster updated for ${doc.name}', 'info')">Edit Schedule</button>
      </td>
    </tr>
  `).join('');
}

// Appointment Actions
window.cancelAppointment = function(id) {
  if (confirm('Are you sure you want to cancel this appointment?')) {
    state.appointments = state.appointments.filter(a => a.id !== id);
    saveState();
    renderAllViews();
    showToast(`Appointment ${id} has been cancelled`, 'info');
  }
};

window.completeAppointment = function(id) {
  const app = state.appointments.find(a => a.id === id);
  if (app) {
    app.status = 'Completed';
    saveState();
    renderAllViews();
    showToast(`Consultation for ${app.patientName} marked completed`, 'success');
  }
};

// Booking Modal Logic
function initBookingModal() {
  const overlay = document.getElementById('booking-modal-overlay');
  const closeBtn = document.getElementById('booking-modal-close');
  const form = document.getElementById('appointment-booking-form');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleBookingSubmission(form);
    });
  }
}

window.openBookingModal = function(doctorId) {
  const doctor = state.doctors.find(d => d.id === doctorId) || state.doctors[0];
  state.selectedDoctorForBooking = doctor;

  const overlay = document.getElementById('booking-modal-overlay');
  const docNameSpan = document.getElementById('modal-doctor-name');
  const docSpecSpan = document.getElementById('modal-doctor-spec');
  const docAvatar = document.getElementById('modal-doctor-avatar');
  const doctorSelect = document.getElementById('booking-doctor-select');

  if (docNameSpan) docNameSpan.textContent = doctor.name;
  if (docSpecSpan) docSpecSpan.textContent = `${doctor.specialty} • ${doctor.hospital}`;
  if (docAvatar) docAvatar.src = doctor.avatar;
  if (doctorSelect) doctorSelect.value = doctor.id;

  const slotContainer = document.getElementById('modal-slot-selection');
  if (slotContainer) {
    slotContainer.innerHTML = doctor.slots.map((s, idx) => `
      <div class="slot-pill ${idx === 0 ? 'active' : ''}" onclick="selectModalSlot(this, '${s}')">${s}</div>
    `).join('');
  }

  overlay.classList.add('open');
};

window.selectModalSlot = function(element, slot) {
  document.querySelectorAll('#modal-slot-selection .slot-pill').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  const hiddenInput = document.getElementById('booking-selected-time');
  if (hiddenInput) hiddenInput.value = slot;
};

function handleBookingSubmission(form) {
  const doctorId = document.getElementById('booking-doctor-select').value;
  const doctor = state.doctors.find(d => d.id === doctorId) || state.selectedDoctorForBooking || state.doctors[0];
  const patientName = document.getElementById('booking-patient-name').value.trim();
  const patientEmail = document.getElementById('booking-patient-email').value.trim();
  const patientPhone = document.getElementById('booking-patient-phone').value.trim();
  const dateInput = document.getElementById('booking-date').value;
  const timeInput = document.getElementById('booking-selected-time').value || '10:30 AM';
  const typeInput = document.getElementById('booking-type').value;
  const symptoms = document.getElementById('booking-symptoms').value.trim() || 'General consultation review.';

  const newAppId = 'PC-' + Math.floor(10000 + Math.random() * 90000);

  const newAppointment = {
    id: newAppId,
    patientName,
    patientEmail,
    patientPhone,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    hospital: doctor.hospital,
    date: dateInput || 'Tomorrow, Oct 10',
    time: timeInput,
    type: typeInput,
    status: 'Confirmed',
    symptoms,
    vitals: 'BP: 120/80 • HR: 72 bpm • SpO2: 99%'
  };

  state.appointments.unshift(newAppointment);
  state.hospitalStats.totalAppointments += 1;
  saveState();
  renderAllViews();

  document.getElementById('booking-modal-overlay').classList.remove('open');
  showConfirmationPass(newAppointment);
}

function showConfirmationPass(app) {
  const overlay = document.getElementById('confirmation-pass-overlay');
  if (!overlay) {
    showToast(`Appointment confirmed: ${app.id} with ${app.doctorName}`, 'success');
    return;
  }

  document.getElementById('conf-pass-id').textContent = app.id;
  document.getElementById('conf-patient-name').textContent = app.patientName;
  document.getElementById('conf-doc-name').textContent = app.doctorName;
  document.getElementById('conf-datetime').textContent = `${app.date} at ${app.time} (${app.type})`;
  document.getElementById('conf-hospital').textContent = app.hospital;

  overlay.classList.add('open');
  showToast(`Booking Confirmed! Appointment Pass: ${app.id}`, 'success');
}

window.closeConfirmationPass = function() {
  const overlay = document.getElementById('confirmation-pass-overlay');
  if (overlay) overlay.classList.remove('open');
};

// Telehealth Simulator Logic
let callTimer = null;
let callSeconds = 0;

function initTelehealthSimulator() {
  const overlay = document.getElementById('telehealth-modal-overlay');
  const endCallBtn = document.getElementById('btn-end-call');
  const toggleMuteBtn = document.getElementById('btn-toggle-mute');
  const toggleCamBtn = document.getElementById('btn-toggle-cam');

  if (endCallBtn) {
    endCallBtn.addEventListener('click', () => {
      closeTelehealthSimulator();
    });
  }

  if (toggleMuteBtn) {
    toggleMuteBtn.addEventListener('click', () => {
      toggleMuteBtn.classList.toggle('active');
      const isMuted = toggleMuteBtn.classList.contains('active');
      toggleMuteBtn.style.background = isMuted ? '#ef4444' : 'rgba(255,255,255,0.12)';
      showToast(isMuted ? 'Microphone Muted' : 'Microphone Unmuted', 'info');
    });
  }

  if (toggleCamBtn) {
    toggleCamBtn.addEventListener('click', () => {
      toggleCamBtn.classList.toggle('active');
      const isOff = toggleCamBtn.classList.contains('active');
      toggleCamBtn.style.background = isOff ? '#ef4444' : 'rgba(255,255,255,0.12)';
      showToast(isOff ? 'Camera Disabled' : 'Camera Enabled', 'info');
    });
  }
}

window.openTelehealthSimulator = function(patientName) {
  const overlay = document.getElementById('telehealth-modal-overlay');
  if (!overlay) return;

  const nameElem = document.getElementById('telehealth-patient-name');
  if (nameElem) nameElem.textContent = patientName || 'Patient Consultation';

  callSeconds = 0;
  clearInterval(callTimer);
  const timerElem = document.getElementById('telehealth-call-timer');
  callTimer = setInterval(() => {
    callSeconds++;
    const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const secs = String(callSeconds % 60).padStart(2, '0');
    if (timerElem) timerElem.textContent = `${mins}:${secs}`;
  }, 1000);

  overlay.classList.add('open');
  showToast(`Connected to HD Telehealth Session: ${patientName}`, 'success');
};

function closeTelehealthSimulator() {
  const overlay = document.getElementById('telehealth-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  clearInterval(callTimer);
  showToast('Telehealth session concluded. Clinical notes saved.', 'info');
}

// FAQ Accordion
function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(other => other.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

// Toast System
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span style="color: ${type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-teal)'}; font-weight:700;">${icon}</span><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
