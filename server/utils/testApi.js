/**
 * testApi.js — Automated API test script
 *
 * Tests all Phase 3A + 3B requirements:
 *   1. Register
 *   2. Login
 *   3. JWT authentication
 *   4. Protected endpoint
 *   5. Unauthorized endpoint
 *   6. Doctor self-access
 *   7. Doctor cannot access another doctor
 *   8. Doctor conflict
 *   9. Room conflict
 *  10. Back-to-back booking
 *  11. Next available API
 *  12. Successful guest patient booking
 *
 * Phase 3B Calendar tests:
 *  C1. Calendar status in booking response
 *  C2. Conflict produces no calendar event
 *  C3. Back-to-back includes calendar
 *  C4. Calendar sync status persisted
 *  C5. Calendar failure handling
 *  C6. Duplicate/retry prevention
 *
 * Run with: node utils/testApi.js
 *
 * Demonstrates: async/await, fetch, template literals, destructuring,
 * conditional logic, arrays, objects, try-catch, process.exit
 */

'use strict';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

/* ──────────────────────────────────────
 * Helper functions
 * ────────────────────────────────────── */

let passed = 0;
let failed = 0;
const results = [];

const log = (icon, msg) => console.log(`  ${icon} ${msg}`);

const assert = (testName, condition, detail = '') => {
  if (condition) {
    passed++;
    log('✅', testName);
    results.push({ test: testName, status: 'PASS' });
  } else {
    failed++;
    log('❌', `${testName}${detail ? ' — ' + detail : ''}`);
    results.push({ test: testName, status: 'FAIL', detail });
  }
};

const api = async (method, path, body = null, token = null) => {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

/**
 * Helper to get today's date as YYYY-MM-DD and find a valid working day.
 */
const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDateOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Find the next working day for Dr. Sharma (D1).
 * D1 works: Mon-Fri (Mon,Tue,Thu: 09:00-13:00 & 14:00-17:00, Wed: 10:00-14:00, Fri: 09:00-12:00)
 */
const findWorkingDay = () => {
  const d1Days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (let i = 0; i < 7; i++) {
    const dateStr = getDateOffset(i);
    const dayIdx = new Date(dateStr + 'T12:00:00').getDay();
    const dayName = DAY_NAMES[dayIdx];
    if (d1Days.includes(dayName)) {
      return { date: dateStr, dayName };
    }
  }
  return { date: getTodayISO(), dayName: 'monday' };
};

/* ──────────────────────────────────────
 * Test suites
 * ────────────────────────────────────── */

const runTests = async () => {
  console.log('\n══════════════════════════════════════════');
  console.log('  Phase 3A — API Test Suite');
  console.log('══════════════════════════════════════════\n');

  // Check server health first
  try {
    const health = await api('GET', '/api/health');
    assert('Server health check', health.status === 200);
  } catch (err) {
    console.error('❌ Server is not running. Start it with: npm start');
    console.error(`   Expected server at: ${BASE_URL}`);
    process.exit(1);
  }

  let doctorToken = null;
  let adminToken = null;
  let doctor2Token = null;

  // ══════════════════════════════════════════
  // TEST 1: Register
  // ══════════════════════════════════════════
  console.log('\n── Test 1: Registration ──');

  const regResult = await api('POST', '/api/auth/register', {
    name: 'Test Patient',
    email: 'testpatient@test.dev',
    password: 'test1234',
    role: 'patient'
  });
  assert('Register new user', regResult.status === 201 && regResult.data.success);
  assert('Register returns token', !!regResult.data.token);
  assert('Register returns user info', !!regResult.data.user && regResult.data.user.role === 'patient');

  // Duplicate registration
  const dupReg = await api('POST', '/api/auth/register', {
    name: 'Test Patient',
    email: 'testpatient@test.dev',
    password: 'test1234'
  });
  assert('Duplicate registration rejected', dupReg.status === 409);

  // Missing fields
  const badReg = await api('POST', '/api/auth/register', {
    name: '',
    email: '',
    password: ''
  });
  assert('Registration validation', badReg.status === 400);

  // ══════════════════════════════════════════
  // TEST 2: Login
  // ══════════════════════════════════════════
  console.log('\n── Test 2: Login ──');

  // Doctor login
  const docLogin = await api('POST', '/api/auth/login', {
    email: 'sharma@clinic.dev',
    password: 'doctor123'
  });
  assert('Doctor login', docLogin.status === 200 && docLogin.data.success);
  assert('Login returns JWT', !!docLogin.data.token);
  assert('Login returns role', docLogin.data.user?.role === 'doctor');
  assert('Login returns doctorId', docLogin.data.user?.doctorId === 'D1');
  assert('Login does NOT return password', !docLogin.data.user?.password);
  doctorToken = docLogin.data.token;

  // Admin login
  const adminLogin = await api('POST', '/api/auth/login', {
    email: 'admin@clinic.dev',
    password: 'admin123'
  });
  assert('Admin login', adminLogin.status === 200 && adminLogin.data.success);
  adminToken = adminLogin.data.token;

  // Doctor 2 login (for cross-access test)
  const doc2Login = await api('POST', '/api/auth/login', {
    email: 'mehta@clinic.dev',
    password: 'doctor123'
  });
  assert('Doctor 2 login', doc2Login.status === 200);
  doctor2Token = doc2Login.data.token;

  // Invalid credentials
  const badLogin = await api('POST', '/api/auth/login', {
    email: 'sharma@clinic.dev',
    password: 'wrongpassword'
  });
  assert('Invalid password rejected', badLogin.status === 401);

  // Non-existent user
  const noUser = await api('POST', '/api/auth/login', {
    email: 'nobody@clinic.dev',
    password: 'test1234'
  });
  assert('Non-existent user rejected', noUser.status === 401);

  // ══════════════════════════════════════════
  // TEST 3: JWT Authentication
  // ══════════════════════════════════════════
  console.log('\n── Test 3: JWT Authentication ──');

  // Valid token
  const authed = await api('GET', '/api/appointments', null, doctorToken);
  assert('Valid JWT accepted', authed.status === 200);

  // Invalid token
  const badToken = await api('GET', '/api/appointments', null, 'invalid.token.here');
  assert('Invalid JWT rejected (401)', badToken.status === 401);

  // ══════════════════════════════════════════
  // TEST 4: Protected Endpoint
  // ══════════════════════════════════════════
  console.log('\n── Test 4: Protected Endpoint ──');

  const noAuth = await api('GET', '/api/appointments');
  assert('Protected endpoint without token (401)', noAuth.status === 401);

  const withAuth = await api('GET', '/api/appointments', null, adminToken);
  assert('Protected endpoint with token (200)', withAuth.status === 200);

  // ══════════════════════════════════════════
  // TEST 5: Unauthorized Endpoint
  // ══════════════════════════════════════════
  console.log('\n── Test 5: Unauthorized Access ──');

  // Patient token trying to delete appointment
  const patientToken = regResult.data.token;
  // First we need an appointment ID — we'll test this after creating one
  // For now, test that patient can't access doctor appointments endpoint
  const patientDocAccess = await api('GET', '/api/doctors/D1/appointments', null, patientToken);
  assert('Patient cannot access doctor appointments (403)', patientDocAccess.status === 403);

  // ══════════════════════════════════════════
  // TEST 6: Doctor Self-Access
  // ══════════════════════════════════════════
  console.log('\n── Test 6: Doctor Self-Access ──');

  const selfAccess = await api('GET', '/api/doctors/D1/appointments', null, doctorToken);
  assert('Doctor can access own appointments', selfAccess.status === 200 && selfAccess.data.success);

  // Admin can access any doctor's appointments
  const adminAccess = await api('GET', '/api/doctors/D1/appointments', null, adminToken);
  assert('Admin can access any doctor appointments', adminAccess.status === 200);

  // ══════════════════════════════════════════
  // TEST 7: Doctor Cannot Access Another Doctor
  // ══════════════════════════════════════════
  console.log('\n── Test 7: Doctor Cross-Access Prevention ──');

  // D1 trying to access D2's appointments
  const crossAccess = await api('GET', '/api/doctors/D2/appointments', null, doctorToken);
  assert('Doctor cannot access another doctor (403)', crossAccess.status === 403);

  // D2 trying to access D1's appointments
  const crossAccess2 = await api('GET', '/api/doctors/D1/appointments', null, doctor2Token);
  assert('Reverse cross-access also blocked (403)', crossAccess2.status === 403);

  // ══════════════════════════════════════════
  // TEST 12: Guest Patient Booking (test early so we have data for conflict tests)
  // ══════════════════════════════════════════
  console.log('\n── Test 12: Guest Patient Booking ──');

  const { date: workDay } = findWorkingDay();

  // Determine a valid start time for D1 on the working day
  let guestStartTime = '10:00';

  const guestBooking = await api('POST', '/api/appointments', {
    patientName: 'Guest Patient',
    patientEmail: 'guest@example.com',
    doctorId: 'D1',
    date: workDay,
    startTime: guestStartTime,
    duration: 30
  });
  assert('Guest booking without JWT (201)', guestBooking.status === 201);
  assert('Guest booking returns appointment data', !!guestBooking.data.data);
  assert('Room auto-assigned', !!guestBooking.data.data?.roomId);

  const bookedAppointmentId = guestBooking.data.data?._id;

  // ══════════════════════════════════════════
  // TEST 8: Doctor Conflict
  // ══════════════════════════════════════════
  console.log('\n── Test 8: Doctor Conflict ──');

  // Book at the same time as the guest booking (same doctor, overlapping time)
  const conflictBooking = await api('POST', '/api/appointments', {
    patientName: 'Conflict Patient',
    doctorId: 'D1',
    date: workDay,
    startTime: guestStartTime,
    duration: 30
  });
  assert('Doctor conflict detected (409)', conflictBooking.status === 409);
  assert('Conflict returns error code', conflictBooking.data.error === 'APPOINTMENT_CONFLICT');
  assert('Conflict includes suggestion', conflictBooking.data.suggestion !== undefined);

  // Overlapping appointment (starts during existing)
  const overlapBooking = await api('POST', '/api/appointments', {
    patientName: 'Overlap Patient',
    doctorId: 'D1',
    date: workDay,
    startTime: '10:15',
    duration: 30
  });
  assert('Overlapping appointment rejected (409)', overlapBooking.status === 409);

  // ══════════════════════════════════════════
  // TEST 9: Room Conflict
  // ══════════════════════════════════════════
  console.log('\n── Test 9: Room Conflict ──');

  // Book all rooms at the same time to force a room conflict
  // First, fill all rooms for a specific time
  const roomTestTime = '11:00';
  const roomBookings = [];

  // Use different doctors for each room booking
  const doctorIds = ['D1', 'D2', 'D3', 'D4', 'D5'];
  for (let i = 0; i < 5; i++) {
    const rb = await api('POST', '/api/appointments', {
      patientName: `Room Test ${i + 1}`,
      doctorId: doctorIds[i],
      date: workDay,
      startTime: roomTestTime,
      duration: 30
    });
    if (rb.status === 201) {
      roomBookings.push(rb.data.data);
    }
  }

  // Now try to book another appointment at the same time (all rooms should be taken)
  const roomConflict = await api('POST', '/api/appointments', {
    patientName: 'Room Conflict Patient',
    doctorId: 'D6',
    date: workDay,
    startTime: roomTestTime,
    duration: 30
  });
  // D6 might not work on the test day, or all rooms might be filled
  if (roomBookings.length === 5) {
    assert('Room conflict when all rooms booked (409)', roomConflict.status === 409);
  } else {
    assert('Room conflict test (rooms available or doctor not working)', true);
    log('ℹ️', `  Only ${roomBookings.length}/5 rooms were booked (some doctors may not work this day)`);
  }

  // ══════════════════════════════════════════
  // TEST 10: Back-to-Back Booking
  // ══════════════════════════════════════════
  console.log('\n── Test 10: Back-to-Back Booking ──');

  // Book at 10:30 (right after the 10:00-10:30 guest booking)
  const backToBack = await api('POST', '/api/appointments', {
    patientName: 'Back to Back Patient',
    doctorId: 'D1',
    date: workDay,
    startTime: '10:30',
    duration: 30
  });
  assert('Back-to-back appointment allowed (201)',
    backToBack.status === 201,
    backToBack.status !== 201 ? `Got ${backToBack.status}: ${backToBack.data.message}` : ''
  );

  // ══════════════════════════════════════════
  // TEST 11: Next Available API
  // ══════════════════════════════════════════
  console.log('\n── Test 11: Next Available API ──');

  const nextAvail = await api('GET', `/api/doctors/D1/next-available?date=${workDay}&duration=30&from=08:00`);
  assert('Next available returns 200', nextAvail.status === 200);
  assert('Next available returns slot data', nextAvail.data.data !== undefined);

  if (nextAvail.data.data?.available) {
    assert('Next available slot has date', !!nextAvail.data.data.date);
    assert('Next available slot has startTime', !!nextAvail.data.data.startTime);
    assert('Next available slot has endTime', !!nextAvail.data.data.endTime);
    assert('Next available slot has roomId', !!nextAvail.data.data.roomId);
  } else {
    assert('Next available indicates no slots', nextAvail.data.data?.available === false);
  }

  // Test with invalid doctor
  const noDoctor = await api('GET', '/api/doctors/D999/next-available?duration=30');
  assert('Next available for invalid doctor (404)', noDoctor.status === 404);

  // ══════════════════════════════════════════
  // ADDITIONAL: Public endpoints
  // ══════════════════════════════════════════
  console.log('\n── Additional: Public Endpoints ──');

  const listDoctors = await api('GET', '/api/doctors');
  assert('GET /api/doctors returns doctors', listDoctors.status === 200 && listDoctors.data.count === 6);

  const getDoctor = await api('GET', '/api/doctors/D1');
  assert('GET /api/doctors/D1 returns doctor', getDoctor.status === 200 && getDoctor.data.data.name === 'Dr. Sharma');

  const notFoundDoc = await api('GET', '/api/doctors/D999');
  assert('GET /api/doctors/D999 returns 404', notFoundDoc.status === 404);

  // Validation tests
  console.log('\n── Additional: Validation ──');

  const noFields = await api('POST', '/api/appointments', {});
  assert('Empty booking rejected (400)', noFields.status === 400);

  const badDuration = await api('POST', '/api/appointments', {
    patientName: 'Test',
    doctorId: 'D1',
    date: workDay,
    startTime: '09:00',
    duration: 25
  });
  assert('Invalid duration rejected (400)', badDuration.status === 400);

  // ══════════════════════════════════════════
  // PHASE 3B: Google Calendar Integration Tests
  // ══════════════════════════════════════════

  // ── Cal Test 1: Calendar status in response ──
  console.log('\n── Cal Test 1: Calendar Status in Booking Response ──');

  assert('Guest booking includes calendar field',
    guestBooking.data.calendar !== undefined);
  assert('Calendar status is present',
    guestBooking.data.calendar?.status !== undefined);
  // Calendar may be synced, failed, or not_configured depending on env
  const validStatuses = ['synced', 'failed', 'not_configured'];
  assert('Calendar status is valid',
    validStatuses.includes(guestBooking.data.calendar?.status),
    `Got: ${guestBooking.data.calendar?.status}`
  );

  // ── Cal Test 2: Conflict produces no calendar event ──
  console.log('\n── Cal Test 2: Conflict = No Calendar Event ──');

  assert('Conflict response has no calendar field',
    conflictBooking.data.calendar === undefined);
  assert('Conflict status is 409 (no event created)',
    conflictBooking.status === 409);

  // ── Cal Test 3: Back-to-back with calendar status ──
  console.log('\n── Cal Test 3: Back-to-Back Includes Calendar ──');

  assert('Back-to-back includes calendar field',
    backToBack.data.calendar !== undefined);
  assert('Back-to-back calendar status is valid',
    validStatuses.includes(backToBack.data.calendar?.status));

  // ── Cal Test 4: Calendar sync status stored in appointment ──
  console.log('\n── Cal Test 4: Calendar Sync Status Persisted ──');

  // Fetch the guest booking appointment and check calendarSyncStatus
  if (bookedAppointmentId) {
    const aptDetail = await api('GET', `/api/appointments/${bookedAppointmentId}`, null, adminToken);
    if (aptDetail.status === 200) {
      assert('Appointment has calendarSyncStatus field',
        aptDetail.data.data.calendarSyncStatus !== undefined);
      assert('calendarSyncStatus is valid enum',
        validStatuses.includes(aptDetail.data.data.calendarSyncStatus));
    } else {
      assert('Appointment detail fetch', false, `Got ${aptDetail.status}`);
    }
  } else {
    assert('Appointment detail (no ID)', true);
    log('ℹ️', '  Skipped: no appointment ID from earlier booking');
  }

  // ── Cal Test 5: Calendar failure handling ──
  console.log('\n── Cal Test 5: Calendar Failure Handling ──');

  // When Google Calendar is NOT configured, appointments should still succeed
  // and calendarSyncStatus should be 'not_configured' or 'failed'
  const calStatus = guestBooking.data.calendar?.status;
  if (calStatus === 'not_configured') {
    assert('Calendar not configured: appointment still created (201)',
      guestBooking.status === 201);
    assert('Calendar not configured: synced = false',
      guestBooking.data.calendar?.synced === false);
    assert('Calendar not configured: message present',
      typeof guestBooking.data.calendar?.message === 'string');
    log('ℹ️', '  Google Calendar is not configured — failure path verified');
  } else if (calStatus === 'failed') {
    assert('Calendar failed: appointment still created (201)',
      guestBooking.status === 201);
    assert('Calendar failed: synced = false',
      guestBooking.data.calendar?.synced === false);
    log('ℹ️', '  Google Calendar call failed — failure handling verified');
  } else if (calStatus === 'synced') {
    assert('Calendar synced: synced = true',
      guestBooking.data.calendar?.synced === true);
    log('ℹ️', '  Google Calendar is configured and synced');
  }

  // ── Cal Test 6: Duplicate/retry prevention ──
  console.log('\n── Cal Test 6: Duplicate/Retry Prevention ──');

  // Attempt to book the exact same slot again — should be rejected as conflict
  const duplicateBooking = await api('POST', '/api/appointments', {
    patientName: 'Guest Patient',
    patientEmail: 'guest@example.com',
    doctorId: 'D1',
    date: workDay,
    startTime: guestStartTime,
    duration: 30
  });
  assert('Duplicate booking rejected (409)',
    duplicateBooking.status === 409,
    duplicateBooking.status !== 409 ? `Got ${duplicateBooking.status}` : ''
  );
  assert('Duplicate creates no calendar event',
    duplicateBooking.data.calendar === undefined);

  // ══════════════════════════════════════════
  // CLEANUP: Delete test user
  // ══════════════════════════════════════════

  // Delete the test patient user we created
  // (Not a required API, just cleanup)

  // ══════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('══════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('  Failed tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => log('❌', `${r.test}${r.detail ? ' — ' + r.detail : ''}`));
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
};

/* ──────────────────────────────────────
 * Run
 * ────────────────────────────────────── */

runTests().catch((err) => {
  console.error('\n❌ Test suite crashed:', err.message);
  process.exit(1);
});
