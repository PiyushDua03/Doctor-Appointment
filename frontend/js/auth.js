// Global Authentication Management

const Auth = {
  getToken() {
    return localStorage.getItem('doctorp_token');
  },

  getUser() {
    const raw = localStorage.getItem('doctorp_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getDoctorProfile() {
    const raw = localStorage.getItem('doctorp_doctor_profile');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSession(token, user, doctorProfile = null) {
    localStorage.setItem('doctorp_token', token);
    localStorage.setItem('doctorp_user', JSON.stringify(user));
    if (doctorProfile) {
      localStorage.setItem('doctorp_doctor_profile', JSON.stringify(doctorProfile));
    } else {
      localStorage.removeItem('doctorp_doctor_profile');
    }
  },

  clearSession() {
    localStorage.removeItem('doctorp_token');
    localStorage.removeItem('doctorp_user');
    localStorage.removeItem('doctorp_doctor_profile');
  },

  isLoggedIn() {
    return Boolean(this.getToken() && this.getUser());
  },

  hasRole(role) {
    const user = this.getUser();
    return Boolean(user && user.role === role);
  },

  logout() {
    this.clearSession();
    window.showToast('You have been logged out.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  },

  requireAuth(requiredRole = null) {
    if (!this.isLoggedIn()) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }

    if (requiredRole && !this.hasRole(requiredRole)) {
      const user = this.getUser();
      // Redirect to user's appropriate dashboard
      if (user.role === 'admin') window.location.href = 'admin-dashboard.html';
      else if (user.role === 'doctor') window.location.href = 'doctor-dashboard.html';
      else window.location.href = 'patient-dashboard.html';
      return false;
    }

    return true;
  },

  getDashboardUrl() {
    const user = this.getUser();
    if (!user) return 'login.html';
    if (user.role === 'admin') return 'admin-dashboard.html';
    if (user.role === 'doctor') return 'doctor-dashboard.html';
    return 'patient-dashboard.html';
  },
};

window.Auth = Auth;
