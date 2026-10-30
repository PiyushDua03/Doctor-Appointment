const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/Backend/Config/db');
const app = require('../server');

let server;
const PORT = 5001; // Test port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedCount++;
    }
  };

  try {
    await connectDB();
    server = app.listen(PORT);
    console.log(`\n🧪 Running Comprehensive API Test Suite on ${BASE_URL}...\n`);

    // 1. Health check
    console.log('1. Testing GET /health');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns 200 OK');
    assert(healthData.status === 'ok', 'Health status is ok');

    // 2. Patient Registration
    console.log('\n2. Testing POST /auth/register');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const regPayload = {
      name: `Test Patient ${randomSuffix}`,
      email: `testpatient${randomSuffix}@doctorp.com`,
      password: 'Password@123',
      role: 'patient',
      phone: '+91 99999 88888',
      gender: 'Male',
      age: 26,
    };
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Patient registration returns 201 Created');
    assert(regData.success === true, 'Registration response indicates success');
    assert(Boolean(regData.token), 'Registration returns JWT token');

    // 3. Successful Login
    console.log('\n3. Testing POST /auth/login with valid credentials');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@doctorp.com', password: 'Patient@123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login returns 200 OK');
    assert(Boolean(loginData.token), 'Login response contains JWT token');
    const patientToken = loginData.token;

    // Login as Admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@doctorp.com', password: 'Admin@123' }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');

    // Login as Doctor
    const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dr.sharma@doctorp.com', password: 'Doctor@123' }),
    });
    const docData = await docLoginRes.json();
    const docToken = docData.token;
    assert(docLoginRes.status === 200, 'Doctor login returns 200 OK');

    // 4. Invalid credentials
    console.log('\n4. Testing POST /auth/login with invalid password');
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@doctorp.com', password: 'WrongPassword' }),
    });
    assert(badLoginRes.status === 401, 'Invalid credentials return 401 Unauthorized');

    // 5. Fetching Doctors List
    console.log('\n5. Testing GET /doctors');
    const doctorsRes = await fetch(`${BASE_URL}/doctors`);
    const doctorsData = await doctorsRes.json();
    assert(doctorsRes.status === 200, 'GET /doctors returns 200 OK');
    assert(doctorsData.doctors && doctorsData.doctors.length > 0, 'Doctor list is not empty');
    const sampleDoctor = doctorsData.doctors[0];
    const sampleDoctorId = sampleDoctor._id;

    // 6. Fetching single doctor
    console.log(`\n6. Testing GET /doctors/${sampleDoctorId}`);
    const singleDocRes = await fetch(`${BASE_URL}/doctors/${sampleDoctorId}`);
    const singleDocData = await singleDocRes.json();
    assert(singleDocRes.status === 200, 'GET /doctors/:id returns 200 OK');
    assert(singleDocData.doctor && singleDocData.doctor._id === sampleDoctorId, 'Doctor ID matches requested ID');

    // 7. Fetching Doctor Availability
    console.log(`\n7. Testing GET /doctors/${sampleDoctorId}/availability`);
    const today = new Date().toISOString().slice(0, 10);
    const availRes = await fetch(`${BASE_URL}/doctors/${sampleDoctorId}/availability?date=${today}`);
    const availData = await availRes.json();
    assert(availRes.status === 200, 'GET /doctors/:id/availability returns 200 OK');
    assert(Array.isArray(availData.slots), 'Availability contains slots array');

    // 8. Booking an Appointment
    console.log('\n8. Testing POST /appointments (Booking)');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const testDate = futureDate.toISOString().slice(0, 10);
    const testTime = '11:00';

    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctorId: sampleDoctorId,
        appointmentDate: testDate,
        startTime: testTime,
        reason: 'Integration test consultation',
      }),
    });
    const bookData = await bookRes.json();
    assert(bookRes.status === 201, 'Booking returns 201 Created');
    assert(Boolean(bookData.appointment && bookData.appointment.appointmentId), 'Appointment has generated unique ID');
    const appointmentId = bookData.appointment._id;

    // 9. Preventing Duplicate Bookings (Double Booking Protection)
    console.log('\n9. Testing Double Booking Conflict Protection');
    const dupRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctorId: sampleDoctorId,
        appointmentDate: testDate,
        startTime: testTime,
        reason: 'Attempt duplicate booking',
      }),
    });
    assert(dupRes.status === 409, 'Duplicate booking returns 409 Conflict');

    // 10. Fetching Authenticated User Appointments
    console.log('\n10. Testing GET /appointments/my');
    const myAptsRes = await fetch(`${BASE_URL}/appointments/my`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const myAptsData = await myAptsRes.json();
    assert(myAptsRes.status === 200, 'GET /appointments/my returns 200 OK');
    assert(myAptsData.appointments && myAptsData.appointments.length > 0, 'User appointments list is returned');

    // 11. Cancelling an Appointment
    console.log(`\n11. Testing PATCH /appointments/${appointmentId}/cancel`);
    const cancelRes = await fetch(`${BASE_URL}/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ reason: 'Testing cancellation flow' }),
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200, 'Appointment cancellation returns 200 OK');
    assert(cancelData.appointment.status === 'cancelled', 'Appointment status is marked cancelled');

    // 12. Doctor-Only Endpoint Authorization
    console.log('\n12. Testing Doctor-only endpoint with Patient token (Expect 403)');
    const patientDoctorAttempt = await fetch(`${BASE_URL}/doctors/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ experience: 10 }),
    });
    assert(patientDoctorAttempt.status === 403, 'Patient forbidden on doctor endpoint returns 403');

    // 13. Admin-Only Endpoint Authorization
    console.log('\n13. Testing Admin-only endpoint with Patient token (Expect 403) and Admin token (Expect 200)');
    const patientAdminAttempt = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(patientAdminAttempt.status === 403, 'Patient forbidden on admin dashboard returns 403');

    const adminDashboardRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDashboardData = await adminDashboardRes.json();
    assert(adminDashboardRes.status === 200, 'Admin can access admin dashboard (200 OK)');
    assert(adminDashboardData.stats && adminDashboardData.stats.totalDoctors > 0, 'Admin stats contain doctor counts');

    // 14. AI Symptom Checker API
    console.log('\n14. Testing POST /symptoms/check');
    const symptomRes = await fetch(`${BASE_URL}/symptoms/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'I have severe chest pain and heart palpitations' }),
    });
    const symptomData = await symptomRes.json();
    assert(symptomRes.status === 200, 'Symptom check returns 200 OK');
    assert(symptomData.recommendation.specialty === 'Cardiology', 'Matches Cardiology specialty');
    assert(symptomData.recommendation.urgency === 'high', 'Urgency correctly identified as high');

    // 15. Request Validation
    console.log('\n15. Testing Invalid Request Validation');
    const badRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail', password: '12' }),
    });
    assert(badRegRes.status === 400, 'Malformed input returns 400 Bad Request');

    // 16. Payment Gateway Configuration & Order Creation
    console.log('\n16. Testing Payment Gateway API (Config & Order Creation)');
    const payConfigRes = await fetch(`${BASE_URL}/payments/config`);
    const payConfigData = await payConfigRes.json();
    assert(payConfigRes.status === 200, 'GET /payments/config returns 200 OK');
    assert(Boolean(payConfigData.currency === 'INR'), 'Payment config returns INR currency');

    const orderRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        amount: 850,
        doctorId: sampleDoctorId,
        currency: 'INR',
      }),
    });
    const orderData = await orderRes.json();
    assert(orderRes.status === 201, 'POST /payments/create-order returns 201 Created');
    assert(Boolean(orderData.order && orderData.order.orderId), 'Payment order returns valid orderId');

    // 17. Direct Payment Processing & User Payment History
    console.log('\n17. Testing Payment Processing & Transaction History');
    const payProcessRes = await fetch(`${BASE_URL}/payments/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        orderId: orderData.order.orderId,
        doctorId: sampleDoctorId,
        amount: 850,
        paymentMethod: 'UPI / QR',
        paymentDetails: { upiId: 'testpatient@okhdfcbank' },
      }),
    });
    const payProcessData = await payProcessRes.json();
    assert(payProcessRes.status === 200, 'POST /payments/process returns 200 OK');
    assert(payProcessData.payment.status === 'paid', 'Processed payment status is marked paid');
    assert(Boolean(payProcessData.receipt && payProcessData.receipt.receiptNumber), 'Payment generates receipt');

    const myPaymentsRes = await fetch(`${BASE_URL}/payments/my`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const myPaymentsData = await myPaymentsRes.json();
    assert(myPaymentsRes.status === 200, 'GET /payments/my returns 200 OK');
    assert(Array.isArray(myPaymentsData.payments) && myPaymentsData.payments.length > 0, 'User payment history is returned');

    console.log('\n──────────────────────────────────────────────────');
    console.log(`📊 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('──────────────────────────────────────────────────');

    if (failedCount === 0) {
      console.log('🎉 ALL API TESTS PASSED SUCCESSFULLY!\n');
    }
  } catch (err) {
    console.error('❌ Test Runner Exception:', err);
    failedCount++;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(failedCount > 0 ? 1 : 0);
  }
};

runTests();
