// Universal Navbar, Emergency SOS, and Demo Switcher Injector

function initNavbar() {
  renderNavbar();
  renderFooter();
  renderDemoSwitcher();
  renderEmergencyModal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavbar);
} else {
  initNavbar();
}

// Tab switching helpers for Doctor & Admin dashboard integration
window.switchDoctorTab = function (targetSection) {
  // Auto-close mobile menu if open
  if (typeof window.closeMobileNav === 'function') {
    window.closeMobileNav();
  }

  if (window.location.pathname.includes('doctor-dashboard.html')) {
    const tab = document.querySelector(`.dash-menu-link[data-target="${targetSection}"]`);
    if (tab) {
      tab.click();
    } else {
      document.querySelectorAll('.dash-section').forEach((sec) => (sec.style.display = 'none'));
      const activeSec = document.getElementById(targetSection);
      if (activeSec) activeSec.style.display = 'block';
    }
    // Update active class in navbar
    document.querySelectorAll('#desktop-nav-links a, .mobile-dropdown-menu a').forEach((a) => a.classList.remove('active'));
    const matchingNavLink = document.querySelector(`#desktop-nav-links a[data-section="${targetSection}"], .mobile-dropdown-menu a[data-section="${targetSection}"]`);
    if (matchingNavLink) matchingNavLink.classList.add('active');
  } else {
    window.location.href = `doctor-dashboard.html#${targetSection}`;
  }
};

window.switchAdminTab = function (targetSection) {
  // Auto-close mobile menu if open
  if (typeof window.closeMobileNav === 'function') {
    window.closeMobileNav();
  }

  if (window.location.pathname.includes('admin-dashboard.html')) {
    const tab = document.querySelector(`.dash-menu-link[data-target="${targetSection}"]`);
    if (tab) {
      tab.click();
    } else {
      document.querySelectorAll('.admin-section').forEach((sec) => (sec.style.display = 'none'));
      const activeSec = document.getElementById(targetSection);
      if (activeSec) activeSec.style.display = 'block';
    }
    // Update active class in navbar
    document.querySelectorAll('#desktop-nav-links a, .mobile-dropdown-menu a').forEach((a) => a.classList.remove('active'));
    const matchingNavLink = document.querySelector(`#desktop-nav-links a[data-section="${targetSection}"], .mobile-dropdown-menu a[data-section="${targetSection}"]`);
    if (matchingNavLink) matchingNavLink.classList.add('active');
  } else {
    window.location.href = `admin-dashboard.html#${targetSection}`;
  }
};

function renderNavbar() {
  const header = document.getElementById('main-header');
  if (!header) return;

  const currentPath = window.location.pathname;
  const isHome = currentPath.endsWith('/') || currentPath.endsWith('index.html');
  const isDoctors = currentPath.includes('doctors.html') || currentPath.includes('doctor-details.html');
  const isDoctorDashboard = currentPath.includes('doctor-dashboard.html');
  const isAdminDashboard = currentPath.includes('admin-dashboard.html');
  const isPatientDashboard = currentPath.includes('patient-dashboard.html') || currentPath.includes('my-appointments.html');
  const isLogin = currentPath.includes('login.html');
  const isRegister = currentPath.includes('register.html');

  const user = window.Auth ? window.Auth.getUser() : null;
  const role = user ? user.role : 'guest';
  const avatar = (user && user.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
  const rawName = user && user.name ? user.name : '';
  const firstName = rawName ? rawName.replace(/^Dr\.\s*/i, '').trim().split(' ')[0] : 'User';

  // Apply role-specific body class for navbar theming
  document.body.classList.remove('role-doctor', 'role-admin', 'role-patient');
  if (role === 'doctor') {
    document.body.classList.add('role-doctor');
  } else if (role === 'admin') {
    document.body.classList.add('role-admin');
  } else if (role === 'patient') {
    document.body.classList.add('role-patient');
  }

  // 1. TOP HELPLINE / STATUS BANNER
  let topBannerHtml = '';
  if (isDoctorDashboard) {
    topBannerHtml = `
      <div class="emergency-top-banner doctor-top-banner">
        <span>👨‍⚕️ <strong>Doctor Workspace</strong> &bull; OPD Cabin Active &bull; Dr. ${rawName ? rawName.replace(/^Dr\.\s*/i, '') : 'Physician'} &bull; <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></span> Online</span></span>
        <button type="button" class="emergency-sos-link" onclick="if(window.callNextOPDPatient){window.callNextOPDPatient()}else{window.location.href='doctor-dashboard.html'}">
          🔔 Call Next Token
        </button>
      </div>
    `;
  } else if (isAdminDashboard) {
    topBannerHtml = `
      <div class="emergency-top-banner admin-top-banner">
        <span>🛡️ <strong>System Administration Console</strong> &bull; Platform Health: 100% Operational &bull; Security Guard Active</span>
        <button type="button" class="emergency-sos-link" onclick="window.location.reload()">
          ⚡ Refresh Metrics
        </button>
      </div>
    `;
  } else if (role === 'doctor') {
    topBannerHtml = `
      <div class="emergency-top-banner doctor-top-banner">
        <span>👨‍⚕️ Signed in as <strong>Dr. ${rawName ? rawName.replace(/^Dr\.\s*/i, '') : 'Physician'}</strong> &bull; Doctor Workspace Available</span>
        <a href="doctor-dashboard.html" class="emergency-sos-link" style="text-decoration:none; display:inline-block;">
          👨‍⚕️ Go to Dashboard
        </a>
      </div>
    `;
  } else if (role === 'admin') {
    topBannerHtml = `
      <div class="emergency-top-banner admin-top-banner">
        <span>🛡️ Signed in as <strong>Administrator</strong> &bull; System Controls Available</span>
        <a href="admin-dashboard.html" class="emergency-sos-link" style="text-decoration:none; display:inline-block;">
          🛡️ Go to Admin Console
        </a>
      </div>
    `;
  } else {
    topBannerHtml = `
      <div class="emergency-top-banner">
        <span>🚨 24x7 Emergency / Ambulance Hotline: <strong>108 / 112</strong></span>
        <button type="button" class="emergency-sos-link" onclick="window.openEmergencyModal()">
          ⚡ Instant Ambulance SOS
        </button>
      </div>
    `;
  }

  // 2. BRAND LOGO & ROLE PORTAL BADGE
  let brandLogoHtml = '';
  let homeLink = 'index.html';
  let portalBadge = '';

  if (role === 'doctor') {
    homeLink = isDoctorDashboard ? 'doctor-dashboard.html' : 'index.html';
    portalBadge = '<span class="nav-portal-badge doctor-badge">👨‍⚕️ Doctor Workspace</span>';
  } else if (role === 'admin') {
    homeLink = isAdminDashboard ? 'admin-dashboard.html' : 'index.html';
    portalBadge = '<span class="nav-portal-badge admin-badge">🛡️ Admin Console</span>';
  } else if (role === 'patient') {
    portalBadge = '<span class="nav-portal-badge patient-badge">👤 Patient Care</span>';
  }

  brandLogoHtml = `
    <a href="${homeLink}" class="brand-logo" title="DoctorP Healthcare">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
      Doctor<span class="brand-badge">P</span>
      ${portalBadge}
    </a>
  `;

  // 3. NAVIGATION LINKS (DESKTOP & MOBILE)
  let navLinksHtml = '';
  let mobileLinksHtml = '';

  if (isDoctorDashboard) {
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const activeSec = hash || 'sec-doctor-appointments';

    navLinksHtml = `
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-doctor-appointments' ? 'active' : ''}" data-section="sec-doctor-appointments" onclick="window.switchDoctorTab('sec-doctor-appointments')">📅 Appointments</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-doctor-availability' ? 'active' : ''}" data-section="sec-doctor-availability" onclick="window.switchDoctorTab('sec-doctor-availability')">⏰ Manage Slots</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-doctor-profile' ? 'active' : ''}" data-section="sec-doctor-profile" onclick="window.switchDoctorTab('sec-doctor-profile')">⚙️ Clinic Profile</a></li>
      <li><a href="doctors.html" target="_blank" style="color: var(--navy-muted); font-size: 0.9rem;" title="View directory as seen by patients">👁️ Public Directory ↗</a></li>
    `;
    mobileLinksHtml = `
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-doctor-appointments' ? 'active' : ''}" onclick="window.switchDoctorTab('sec-doctor-appointments')">📅 Scheduled Appointments</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-doctor-availability' ? 'active' : ''}" onclick="window.switchDoctorTab('sec-doctor-availability')">⏰ Clinic Working Hours & Slots</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-doctor-profile' ? 'active' : ''}" onclick="window.switchDoctorTab('sec-doctor-profile')">⚙️ Profile & Credentials</a></li>
      <li><a href="index.html">🏠 Home Page</a></li>
      <li><a href="doctors.html" target="_blank">👁️ Find Doctors Directory</a></li>
      <li><a href="javascript:void(0)" onclick="window.Auth.logout()" style="color: #ef4444; font-weight: 700;">🚪 Sign Out</a></li>
    `;
  } else if (isAdminDashboard) {
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const activeSec = hash || 'sec-admin-doctors';

    navLinksHtml = `
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-admin-doctors' ? 'active' : ''}" data-section="sec-admin-doctors" onclick="window.switchAdminTab('sec-admin-doctors')">👨‍⚕️ Manage Doctors</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-admin-patients' ? 'active' : ''}" data-section="sec-admin-patients" onclick="window.switchAdminTab('sec-admin-patients')">👥 Patients</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-admin-appointments' ? 'active' : ''}" data-section="sec-admin-appointments" onclick="window.switchAdminTab('sec-admin-appointments')">📊 All Bookings</a></li>
      <li><a href="index.html" target="_blank" style="color: var(--navy-muted); font-size: 0.9rem;" title="Preview live patient portal">🌐 Live Site ↗</a></li>
    `;
    mobileLinksHtml = `
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-admin-doctors' ? 'active' : ''}" onclick="window.switchAdminTab('sec-admin-doctors')">👨‍⚕️ Doctor Verification</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-admin-patients' ? 'active' : ''}" onclick="window.switchAdminTab('sec-admin-patients')">👥 Registered Patients</a></li>
      <li><a href="javascript:void(0)" class="${activeSec === 'sec-admin-appointments' ? 'active' : ''}" onclick="window.switchAdminTab('sec-admin-appointments')">📊 Platform Appointments</a></li>
      <li><a href="index.html" target="_blank">🌐 Live Patient Site</a></li>
      <li><a href="javascript:void(0)" onclick="window.Auth.logout()" style="color: #ef4444; font-weight: 700;">🚪 Sign Out</a></li>
    `;
  } else if (role === 'doctor') {
    // Doctor viewing public pages
    navLinksHtml = `
      <li><a href="index.html" class="${isHome ? 'active' : ''}">Home</a></li>
      <li><a href="doctors.html" class="${isDoctors ? 'active' : ''}">Find Doctors</a></li>
      <li><a href="doctor-dashboard.html" style="font-weight: 700; color: #0d9488;">👨‍⚕️ Doctor Dashboard</a></li>
      <li><a href="index.html#symptom-checker">🤖 AI Symptom Checker</a></li>
    `;
    mobileLinksHtml = `
      <li><a href="index.html">Home</a></li>
      <li><a href="doctors.html">Find Doctors</a></li>
      <li><a href="doctor-dashboard.html" style="font-weight: 700; color: #0d9488;">👨‍⚕️ Doctor Dashboard</a></li>
      <li><a href="index.html#symptom-checker">🤖 AI Symptom Checker</a></li>
      <li><a href="javascript:void(0)" onclick="window.Auth.logout()" style="color: #ef4444; font-weight: 700;">🚪 Sign Out</a></li>
    `;
  } else if (role === 'admin') {
    // Admin viewing public pages
    navLinksHtml = `
      <li><a href="index.html" class="${isHome ? 'active' : ''}">Home</a></li>
      <li><a href="doctors.html" class="${isDoctors ? 'active' : ''}">Find Doctors</a></li>
      <li><a href="admin-dashboard.html" style="font-weight: 700; color: #d97706;">🛡️ Admin Console</a></li>
      <li><a href="index.html#symptom-checker">🤖 AI Symptom Checker</a></li>
    `;
    mobileLinksHtml = `
      <li><a href="index.html">Home</a></li>
      <li><a href="doctors.html">Find Doctors</a></li>
      <li><a href="admin-dashboard.html" style="font-weight: 700; color: #d97706;">🛡️ Admin Console</a></li>
      <li><a href="index.html#symptom-checker">🤖 AI Symptom Checker</a></li>
      <li><a href="javascript:void(0)" onclick="window.Auth.logout()" style="color: #ef4444; font-weight: 700;">🚪 Sign Out</a></li>
    `;
  } else if (role === 'patient') {
    // Patient
    navLinksHtml = `
      <li><a href="index.html" class="${isHome ? 'active' : ''}">Home</a></li>
      <li><a href="doctors.html" class="${isDoctors ? 'active' : ''}">Find Doctors</a></li>
      <li><a href="patient-dashboard.html" class="${isPatientDashboard ? 'active' : ''}">📅 My Bookings</a></li>
      <li><a href="patient-dashboard.html?demo=rx" style="color: #7c3aed; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">✨ AI Rx Explainer</a></li>
      <li><a href="index.html#symptom-checker">🤖 Symptom Checker</a></li>
    `;
    mobileLinksHtml = `
      <li><a href="index.html">Home</a></li>
      <li><a href="doctors.html">Find Doctors</a></li>
      <li><a href="patient-dashboard.html">📅 My Bookings & Passes</a></li>
      <li><a href="patient-dashboard.html?demo=rx" style="color: #7c3aed; font-weight: 700;">✨ AI Rx Explainer</a></li>
      <li><a href="index.html#symptom-checker">🤖 AI Symptom Checker</a></li>
      <li><a href="javascript:void(0)" onclick="window.Auth.logout()" style="color: #ef4444; font-weight: 700;">🚪 Sign Out</a></li>
    `;
  } else {
    // Public guest
    navLinksHtml = `
      <li><a href="index.html" class="${isHome ? 'active' : ''}">Home</a></li>
      <li><a href="doctors.html" class="${isDoctors ? 'active' : ''}">Find Doctors</a></li>
      <li><a href="index.html#symptom-checker">AI Symptom Checker</a></li>
      <li><a href="index.html#how-it-works">How It Works</a></li>
    `;
    mobileLinksHtml = `
      <li><a href="index.html">Home</a></li>
      <li><a href="doctors.html">Find Doctors</a></li>
      <li><a href="index.html#symptom-checker">AI Symptom Checker</a></li>
      <li><a href="index.html#how-it-works">How It Works</a></li>
      <li><a href="login.html" class="${isLogin ? 'active' : ''}" style="font-weight: 700; color: var(--primary);">Sign In</a></li>
      <li><a href="register.html" class="${isRegister ? 'active' : ''}">Create Account</a></li>
    `;
  }

  // 4. USER ACTIONS ON RIGHT
  let authNavHtml = '';
  if (user) {
    const dashUrl = window.Auth && typeof window.Auth.getDashboardUrl === 'function'
      ? window.Auth.getDashboardUrl()
      : (role === 'doctor' ? 'doctor-dashboard.html' : role === 'admin' ? 'admin-dashboard.html' : 'patient-dashboard.html');

    if (role === 'doctor') {
      authNavHtml = `
        <div class="nav-user-cluster">
          <a href="doctor-dashboard.html" class="user-profile-menu" title="Open Doctor Workspace">
            <img src="${avatar}" alt="${rawName || 'Doctor'}">
            <div class="user-info-text">
              <div class="user-name">Dr. ${firstName}</div>
              <div class="user-role-badge" style="color: #0f766e;">Physician</div>
            </div>
          </a>
          ${!isDoctorDashboard ? '<a href="doctor-dashboard.html" class="btn btn-primary btn-sm nav-hide-mobile">Dashboard</a>' : ''}
          <button type="button" onclick="window.Auth.logout()" class="btn btn-secondary btn-sm nav-hide-mobile" title="Log Out">Logout</button>
        </div>
      `;
    } else if (role === 'admin') {
      authNavHtml = `
        <div class="nav-user-cluster">
          <a href="admin-dashboard.html" class="user-profile-menu" title="Open Admin Console">
            <img src="${avatar}" alt="${rawName || 'Admin'}">
            <div class="user-info-text">
              <div class="user-name">${firstName}</div>
              <div class="user-role-badge" style="color: #92400e;">Admin</div>
            </div>
          </a>
          ${!isAdminDashboard ? '<a href="admin-dashboard.html" class="btn btn-primary btn-sm nav-hide-mobile">Console</a>' : ''}
          <button type="button" onclick="window.Auth.logout()" class="btn btn-secondary btn-sm nav-hide-mobile" title="Log Out">Logout</button>
        </div>
      `;
    } else {
      // Patient
      authNavHtml = `
        <div class="nav-user-cluster">
          <a href="${dashUrl}" class="user-profile-menu" title="Open Patient Portal">
            <img src="${avatar}" alt="${rawName || 'Patient'}">
            <div class="user-info-text">
              <div class="user-name">${firstName}</div>
              <div class="user-role-badge" style="color: #0284c7;">Patient</div>
            </div>
          </a>
          <a href="doctors.html" class="btn btn-primary btn-sm nav-hide-mobile">Book Visit +</a>
          <button type="button" onclick="window.Auth.logout()" class="btn btn-secondary btn-sm nav-hide-mobile" title="Log Out">Logout</button>
        </div>
      `;
    }
  } else {
    // Guest
    if (isLogin) {
      authNavHtml = `
        <div class="nav-user-cluster">
          <a href="register.html" class="btn btn-secondary btn-sm">Create Account</a>
          <a href="doctors.html" class="btn btn-primary btn-sm nav-hide-mobile">Book Appointment</a>
        </div>
      `;
    } else if (isRegister) {
      authNavHtml = `
        <div class="nav-user-cluster">
          <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
          <a href="doctors.html" class="btn btn-primary btn-sm nav-hide-mobile">Book Appointment</a>
        </div>
      `;
    } else {
      authNavHtml = `
        <div class="nav-user-cluster">
          <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
          <a href="doctors.html" class="btn btn-primary btn-sm nav-hide-mobile">Book Appointment</a>
        </div>
      `;
    }
  }

  header.innerHTML = `
    <!-- Dynamic Top Banner -->
    ${topBannerHtml}

    <!-- Main Navigation Bar -->
    <nav class="header-navbar">
      <div class="container nav-container">
        ${brandLogoHtml}

        <ul class="nav-links" id="desktop-nav-links">
          ${navLinksHtml}
        </ul>

        <div class="nav-actions">
          ${authNavHtml}
          <button class="mobile-nav-toggle" id="mobile-toggle" aria-label="Toggle Navigation" aria-expanded="false">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Navigation -->
      <div id="mobile-menu" class="mobile-dropdown-menu">
        <ul>
          ${mobileLinksHtml}
        </ul>
      </div>
    </nav>
  `;

  // Setup mobile navigation toggle & interaction
  const toggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  window.closeMobileNav = function () {
    const m = document.getElementById('mobile-menu');
    const t = document.getElementById('mobile-toggle');
    if (m) {
      m.classList.remove('active');
    }
    if (t) {
      t.setAttribute('aria-expanded', 'false');
      t.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
    }
  };

  window.toggleMobileNav = function () {
    const m = document.getElementById('mobile-menu');
    const t = document.getElementById('mobile-toggle');
    if (!m || !t) return;

    const isOpen = m.classList.toggle('active');
    t.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      t.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      t.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `;
    }
  };

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      window.toggleMobileNav();
    });
  }

  // Auto-close when clicking any link inside mobile menu
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        window.closeMobileNav();
      });
    });
  }

  // Close when clicking outside header
  document.addEventListener('click', (e) => {
    const hdr = document.getElementById('main-header');
    if (hdr && !hdr.contains(e.target)) {
      window.closeMobileNav();
    }
  });

  // Close on window resize if expanded beyond 1024px
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      window.closeMobileNav();
    }
  });
}


function renderFooter() {
  const footer = document.getElementById('main-footer');
  if (!footer) return;

  footer.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <h3 style="display: flex; align-items: center; gap: 0.5rem;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              Doctor<span style="color: #0d9488;">P</span>
            </h3>
            <p>Smart, seamless, and reliable healthcare appointment platform connecting patients with top hospital specialists nationwide.</p>
          </div>

          <div class="footer-col">
            <h4>Quick Links</h4>
            <ul class="footer-links">
              <li><a href="index.html">Home</a></li>
              <li><a href="doctors.html">Find a Doctor</a></li>
              <li><a href="index.html#symptom-checker">AI Symptom Checker</a></li>
              <li><a href="index.html#how-it-works">Booking Process</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Clinical Departments</h4>
            <ul class="footer-links">
              <li><a href="doctors.html?specialty=Cardiology">Cardiology</a></li>
              <li><a href="doctors.html?specialty=Dermatology">Dermatology</a></li>
              <li><a href="doctors.html?specialty=Neurology">Neurology</a></li>
              <li><a href="doctors.html?specialty=Pediatrics">Pediatrics</a></li>
              <li><a href="doctors.html?specialty=Orthopedics">Orthopedics</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Hospital Network & Support</h4>
            <ul class="footer-links">
              <li><span style="color: #cbd5e1;">📍 Medical Enclave, New Delhi</span></li>
              <li><span style="color: #cbd5e1;">📞 +91 1800-DOCTORP</span></li>
              <li><span style="color: #cbd5e1;">✉️ support@doctorp.com</span></li>
              <li><span style="color: #10b981;">● System Operational (24/7)</span></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2026 DoctorP Healthcare Platform. Built with MVC Architecture & MERN Stack.</p>
          <p style="color: #64748b;">College Full-Stack Capstone Project</p>
        </div>
      </div>
    </footer>
  `;
}

// ==========================================================================
// UNIVERSAL 1-CLICK DEMO PERSONA SWITCHER WIDGET
// Allows examiners, recruiters, and evaluators to switch roles in 1 click
// ==========================================================================
function renderDemoSwitcher() {
  if (document.getElementById('demo-switcher-widget')) return;

  const user = window.Auth ? window.Auth.getUser() : null;
  const currentRole = user ? user.role : 'none';

  const widget = document.createElement('div');
  widget.id = 'demo-switcher-widget';
  widget.className = 'demo-switcher-widget';

  widget.innerHTML = `
    <div class="demo-switcher-card" id="demo-switcher-box">
      <div class="demo-switcher-title">
        <span>⚡ Quick Demo:</span>
      </div>

      <button type="button" class="demo-btn-pill ${currentRole === 'patient' ? 'active' : ''}" onclick="window.switchDemoUser('patient@doctorp.com', 'Patient@123', 'Patient (Rahul Sharma)', 'patient-dashboard.html')">
        👤 Patient
      </button>

      <button type="button" class="demo-btn-pill ${currentRole === 'doctor' ? 'active' : ''}" onclick="window.switchDemoUser('dr.sharma@doctorp.com', 'Doctor@123', 'Dr. Rajesh Sharma (Cardiology)', 'doctor-dashboard.html')">
        👨‍⚕️ Doctor
      </button>

      <button type="button" class="demo-btn-pill ${currentRole === 'admin' ? 'active' : ''}" onclick="window.switchDemoUser('admin@doctorp.com', 'Admin@123', 'System Administrator', 'admin-dashboard.html')">
        🛡️ Admin
      </button>

      ${user ? `<button type="button" class="demo-btn-pill" onclick="window.Auth.logout()" title="Logout">🚪</button>` : ''}

      <button type="button" class="demo-switcher-collapse-btn" onclick="toggleDemoSwitcher()" title="Minimize / Expand">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(widget);
}

window.toggleDemoSwitcher = function () {
  const box = document.getElementById('demo-switcher-box');
  if (!box) return;
  const isCollapsed = box.classList.toggle('collapsed');
  if (isCollapsed) {
    box.innerHTML = `<button type="button" class="demo-btn-pill" onclick="window.toggleDemoSwitcher()" style="background: var(--primary);">⚡ Demo Roles</button>`;
  } else {
    document.getElementById('demo-switcher-widget')?.remove();
    renderDemoSwitcher();
  }
};

window.switchDemoUser = async function (email, password, roleName, targetDashboard) {
  try {
    const data = await window.apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    window.Auth.setSession(data.token, data.user);
    if (data.doctor) {
      localStorage.setItem('doctorp_doctor_profile', JSON.stringify(data.doctor));
    }

    window.showToast(`Switched persona to: ${roleName}`, 'success');
    setTimeout(() => {
      window.location.href = targetDashboard;
    }, 400);
  } catch (err) {
    window.showToast(err.message || 'Error logging into demo account', 'error');
  }
};

// ==========================================================================
// 24x7 EMERGENCY SOS & AMBULANCE DISPATCH MODAL
// ==========================================================================
function renderEmergencyModal() {
  if (document.getElementById('emergency-sos-modal')) return;

  const modalHtml = `
    <div id="emergency-sos-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 520px;">
        <button class="modal-close-btn" onclick="window.closeEmergencyModal()">✕</button>

        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.6rem;">
            🚑
          </div>
          <div>
            <h3 style="font-size: 1.35rem; color: #991b1b; margin: 0;">Emergency Trauma & SOS Support</h3>
            <p style="font-size: 0.85rem; color: var(--navy-muted); margin: 0;">24/7 Immediate Critical Healthcare Response</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
          <button type="button" onclick="window.handleEmergencyCall('108')" class="btn btn-primary" style="background: #dc2626; border-color: #b91c1c; font-size: 0.95rem; cursor: pointer;">
            📞 Call Ambulance (108)
          </button>
          <button type="button" onclick="window.handleEmergencyCall('112')" class="btn btn-secondary" style="font-size: 0.95rem; cursor: pointer;">
            🚨 National SOS (112)
          </button>
        </div>

        <!-- In-Modal Dialing Alert Box (Prevents desktop terminal spawning) -->
        <div id="emergency-call-status-box" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1.25rem;"></div>

        <!-- Fast-Track Ambulance Dispatch -->
        <div style="background: var(--navy-light); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.95rem; color: var(--navy-dark); margin-bottom: 0.4rem;">Fast-Track Ambulance Dispatch</h4>
          <p style="font-size: 0.8rem; color: var(--navy-muted); margin-bottom: 0.75rem;">GPS-coordinated ALS (Advanced Life Support) response unit nearest to your current location.</p>
          
          <div id="ambulance-dispatch-result" style="display: none; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-sm); padding: 0.75rem; margin-bottom: 0.75rem;">
            <div style="font-weight: 700; color: #065f46; font-size: 0.85rem;">✓ Ambulance Dispatched!</div>
            <div style="font-size: 0.8rem; color: #047857; margin-top: 0.2rem;">
              Unit #DL-01-ALS-8942 en route from AIIMS Emergency Centre. <br>
              <strong>Estimated Arrival Time: 6 minutes (Distance: 1.8 km)</strong>
            </div>
          </div>

          <button type="button" id="btn-request-ambulance" class="btn btn-outline" style="width: 100%; font-size: 0.85rem;" onclick="window.dispatchEmergencyAmbulance()">
            📍 Request Ambulance at Current GPS Location
          </button>
        </div>

        <!-- Live GPS Casualty & Trauma Hospital Locator -->
        <div style="border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 1.25rem; background: #fff5f5; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <h4 style="font-size: 0.95rem; color: #991b1b; margin: 0;">Nearest 24/7 Casualty & Trauma Centers</h4>
              <p style="font-size: 0.75rem; color: #7f1d1d; margin: 0;">Live distance & hospital routing</p>
            </div>
            <button type="button" onclick="window.locateNearestHospitalsGPS()" class="btn btn-sm" style="background: #dc2626; color: #ffffff; border: none; font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 0.3rem 0.65rem;">
              📡 Use My GPS
            </button>
          </div>

          <div id="gps-hospitals-list" style="display: flex; flex-direction: column; gap: 0.65rem;">
            <div style="background: #ffffff; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">🏥 AIIMS Apex Trauma Centre</div>
                <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">● 24/7 ER • 18 ICU Beds • Blood Bank</div>
                <div style="font-size: 0.75rem; color: #64748b;" id="aiims-dist-label">📍 ~1.8 km (Safdarjung Enclave, Ring Rd)</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <a href="https://www.google.com/maps/search/?api=1&query=AIIMS+Apex+Trauma+Centre+New+Delhi" target="_blank" class="btn btn-sm" style="background: #0284c7; color: #ffffff; font-size: 0.7rem; padding: 0.2rem 0.5rem; text-decoration: none; text-align: center;">
                  🗺️ Route
                </a>
                <button type="button" onclick="window.handleEmergencyCall('01126731000')" class="btn btn-sm" style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                  📞 ER Desk
                </button>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">🏥 Max Super Speciality Hospital (ER)</div>
                <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">● Level-1 Trauma • Cardiac Ambulance Active</div>
                <div style="font-size: 0.75rem; color: #64748b;" id="max-dist-label">📍 ~3.2 km (Press Enclave Marg, Saket)</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <a href="https://www.google.com/maps/search/?api=1&query=Max+Super+Speciality+Hospital+Saket+Emergency" target="_blank" class="btn btn-sm" style="background: #0284c7; color: #ffffff; font-size: 0.7rem; padding: 0.2rem 0.5rem; text-decoration: none; text-align: center;">
                  🗺️ Route
                </a>
                <button type="button" onclick="window.handleEmergencyCall('01126515050')" class="btn btn-sm" style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                  📞 ER Desk
                </button>
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">🏥 Apollo Hospital Critical Care Unit</div>
                <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">● 24x7 Stroke & Chest Pain Fast-Track</div>
                <div style="font-size: 0.75rem; color: #64748b;" id="apollo-dist-label">📍 ~4.9 km (Mathura Rd, Sarita Vihar)</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                <a href="https://www.google.com/maps/search/?api=1&query=Indraprastha+Apollo+Hospital+Emergency+New+Delhi" target="_blank" class="btn btn-sm" style="background: #0284c7; color: #ffffff; font-size: 0.7rem; padding: 0.2rem 0.5rem; text-decoration: none; text-align: center;">
                  🗺️ Route
                </a>
                <button type="button" onclick="window.handleEmergencyCall('1066')" class="btn btn-sm" style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; font-size: 0.7rem; padding: 0.2rem 0.5rem;">
                  📞 ER Desk
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.openEmergencyModal = function () {
  document.getElementById('emergency-sos-modal')?.classList.add('active');
};

window.closeEmergencyModal = function () {
  document.getElementById('emergency-sos-modal')?.classList.remove('active');
};

// Safe Emergency Dialing Handler (prevents Windows spawning terminal for tel: links on desktop)
window.handleEmergencyCall = function (number) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `tel:${number}`;
    return;
  }

  // On Desktop/Laptop: Display clear in-app hotline banner
  const callStatusBox = document.getElementById('emergency-call-status-box');
  if (callStatusBox) {
    callStatusBox.style.display = 'block';
    callStatusBox.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
        <div>
          <strong style="color: #991b1b; font-size: 0.95rem;">🚨 Emergency Ambulance Helpline: ${number}</strong>
          <div style="font-size: 0.8rem; color: #7f1d1d; margin-top: 0.2rem;">
            Toll-Free 24x7 Ambulance Control Room: <strong>${number}</strong>
          </div>
        </div>
        <button type="button" onclick="navigator.clipboard?.writeText('${number}'); if(window.showToast) window.showToast('Copied ${number} to clipboard', 'info');" class="btn btn-sm" style="background: #ffffff; color: #991b1b; border: 1px solid #f87171; font-size: 0.75rem; padding: 0.25rem 0.6rem; cursor: pointer;">
          📋 Copy
        </button>
      </div>
      <div style="font-size: 0.75rem; color: #b91c1c; margin-top: 0.4rem; line-height: 1.4;">
        Direct line active. Please dial <strong>${number}</strong> from your phone or use <strong>"Request Ambulance at Current GPS Location"</strong> below for auto-dispatch.
      </div>
    `;
  }
  if (window.showToast) window.showToast(`🚨 Dial ${number} for Immediate Emergency Ambulance`, 'error');
};

window.dispatchEmergencyAmbulance = function () {
  const resultDiv = document.getElementById('ambulance-dispatch-result');
  const btn = document.getElementById('btn-request-ambulance');
  if (resultDiv && btn) {
    btn.disabled = true;
    btn.innerText = 'Connecting to Nearest Hospital Dispatch...';
    setTimeout(() => {
      btn.style.display = 'none';
      resultDiv.style.display = 'block';
      if (window.showToast) window.showToast('Emergency Ambulance Dispatched! Paramedic contacted.', 'success');
    }, 1200);
  }
};

// 24/7 Casualty & Trauma Hospital GPS Distance Calculator
window.locateNearestHospitalsGPS = function () {
  if (!navigator.geolocation) {
    if (window.showToast) window.showToast('Geolocation is not supported by your browser.', 'warning');
    return;
  }

  if (window.showToast) window.showToast('Acquiring high-accuracy GPS satellite fix...', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Hospital reference coordinates (Delhi NCR / Major Hubs)
      const hospitals = [
        { id: 'aiims-dist-label', name: 'AIIMS Apex Trauma', lat: 28.5672, lng: 77.2100, addr: 'Safdarjung Enclave, Ring Rd' },
        { id: 'max-dist-label', name: 'Max Super Speciality', lat: 28.5284, lng: 77.2185, addr: 'Press Enclave Marg, Saket' },
        { id: 'apollo-dist-label', name: 'Apollo Critical Care', lat: 28.5367, lng: 77.2842, addr: 'Mathura Rd, Sarita Vihar' },
      ];

      // Calculate Haversine distance in km
      hospitals.forEach((h) => {
        const R = 6371; // Earth radius in km
        const dLat = ((h.lat - lat) * Math.PI) / 180;
        const dLng = ((h.lng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) * Math.cos((h.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = (R * c).toFixed(1);

        const el = document.getElementById(h.id);
        if (el) {
          el.innerHTML = `📍 <strong>${d} km away</strong> (${h.addr}) • Live GPS Fix`;
          el.style.color = '#0284c7';
        }
      });

      if (window.showToast) window.showToast('Live GPS distances updated for nearest trauma hospitals!', 'success');
    },
    (err) => {
      console.warn('GPS location request declined or timed out:', err);
      if (window.showToast) window.showToast('Location permission denied. Showing primary metropolitan trauma centers.', 'info');
    },
    { timeout: 7000 }
  );
};
