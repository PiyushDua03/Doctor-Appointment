// Registration Page Logic (Patient & Doctor)

document.addEventListener('DOMContentLoaded', () => {
  setupRoleToggle();
  setupRegisterForm();
});

// Toggle additional doctor fields when "doctor" role is selected
function setupRoleToggle() {
  const roleSelect = document.getElementById('reg-role');
  const doctorFields = document.getElementById('doctor-specific-fields');

  if (!roleSelect || !doctorFields) return;

  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'doctor') {
      doctorFields.style.display = 'block';
    } else {
      doctorFields.style.display = 'none';
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('btn-submit-register');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const phone = document.getElementById('reg-phone').value.trim();
    const gender = document.getElementById('reg-gender').value;
    const age = document.getElementById('reg-age').value;

    if (!name || !email || !password) {
      window.showToast('Please fill out all required fields.', 'warning');
      return;
    }

    if (password.length < 6) {
      window.showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    const payload = {
      name,
      email,
      password,
      role,
      phone,
      gender,
      age: age ? Number(age) : null,
    };

    if (role === 'doctor') {
      payload.specialization = document.getElementById('reg-specialty')?.value || 'General Medicine';
      payload.qualifications = document.getElementById('reg-qualifications')?.value || 'MBBS';
      payload.experience = Number(document.getElementById('reg-experience')?.value) || 2;
      payload.consultationFee = Number(document.getElementById('reg-fee')?.value) || 500;
      payload.clinicName = document.getElementById('reg-clinic')?.value || 'City Clinic';
      payload.city = document.getElementById('reg-city')?.value || 'New Delhi';
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Creating Account...</span>`;

    try {
      const data = await window.apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      window.Auth.setSession(data.token, data.user, data.doctorProfile);
      window.showToast('Account created successfully! Welcome to DoctorP.', 'success');

      setTimeout(() => {
        window.location.href = window.Auth.getDashboardUrl();
      }, 700);
    } catch (err) {
      window.showToast(err.message || 'Registration failed.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Account</span>`;
    }
  });
}
