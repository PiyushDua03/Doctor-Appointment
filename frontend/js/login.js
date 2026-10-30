// Login Page Logic with One-Click Demo Credentials

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect directly to user's dashboard
  if (window.Auth && window.Auth.isLoggedIn()) {
    window.location.href = window.Auth.getDashboardUrl();
    return;
  }

  setupDemoCredentialsTabs();
  setupLoginForm();
});

// Demo Credentials Autofill
function setupDemoCredentialsTabs() {
  const tabs = document.querySelectorAll('.demo-tab-btn');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  const demoAccounts = {
    patient: { email: 'patient@doctorp.com', password: 'Patient@123' },
    doctor: { email: 'dr.sharma@doctorp.com', password: 'Doctor@123' },
    admin: { email: 'admin@doctorp.com', password: 'Admin@123' },
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const role = tab.dataset.role;
      if (demoAccounts[role]) {
        emailInput.value = demoAccounts[role].email;
        passwordInput.value = demoAccounts[role].password;
        window.showToast(`Autofilled ${role.toUpperCase()} demo credentials!`, 'info');
      }
    });
  });
}

// Login Form Submission
function setupLoginForm() {
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('btn-submit-login');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      window.showToast('Please enter both email and password.', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Signing In...</span>`;

    try {
      const data = await window.apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      window.Auth.setSession(data.token, data.user, data.doctorProfile);
      window.showToast(`Welcome back, ${data.user.name}!`, 'success');

      // Check redirect param
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');

      setTimeout(() => {
        if (redirect && !redirect.includes('login.html')) {
          window.location.href = redirect;
        } else {
          window.location.href = window.Auth.getDashboardUrl();
        }
      }, 700);
    } catch (err) {
      window.showToast(err.message || 'Invalid email or password.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In</span>`;
    }
  });
}
