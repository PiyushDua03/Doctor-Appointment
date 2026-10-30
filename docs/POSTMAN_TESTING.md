# 🧪 Postman & Thunder Client API Testing Guide

This guide walks through testing the **DoctorP** REST API using Postman, Thunder Client, or the automated Node test runner.

---

## 📦 Test Suite Verification
The complete test suite has been executed with Node.js and verified:
```
📊 Test Summary: 31 PASSED, 0 FAILED
🎉 ALL API TESTS PASSED SUCCESSFULLY!
```

---

## 🚀 Quick Automated Test Run

You can execute all 31 automated tests locally in one command:
```bash
cd backend
npm test
```
This tests:
1. Health check (`GET /api/health`)
2. Patient registration with JWT return
3. Successful login (Patient, Doctor, Admin)
4. Invalid credentials rejection (401 Unauthorized)
5. Fetching doctors list & pagination
6. Fetching single doctor with reviews
7. Fetching doctor slot availability
8. Booking appointment with unique Appointment ID
9. Server-side conflict check (preventing duplicate bookings, 409 Conflict)
10. Fetching authenticated user appointments
11. Cancelling appointment & verifying slot release
12. Doctor-only endpoint authorization (403 for patient)
13. Admin-only dashboard authorization (403 for patient, 200 for admin)
14. AI Symptom Checker keyword matching
15. Request input validation (400 Bad Request)

---

## 📥 Importing Postman Collection

1. Open **Postman** (or VS Code **Thunder Client**).
2. Click **Import**.
3. Select the file:
   `docs/doctor_appointment.postman_collection.json`
4. The collection **"DoctorP - Doctor Appointment Booking API Collection"** will appear in your workspace.

---

## ⚙️ Environment Variables Setup

Configure the following variables in your Postman Environment or Collection Variables:

| Variable | Initial / Current Value | Description |
|---|---|---|
| `baseUrl` | `http://localhost:5000/api` | API Base URL (Change to Render URL when deployed) |
| `patientToken` | *(auto-set on login)* | JWT token for patient role |
| `doctorToken` | *(auto-set on login)* | JWT token for doctor role |
| `adminToken` | *(auto-set on login)* | JWT token for admin role |
| `doctorId` | *(auto-set on get doctors)* | ID of doctor under test |
| `appointmentId`| *(auto-set on booking)* | ID of booked appointment |

---

## 📋 Recommended Test Execution Sequence

Follow this exact sequence in Postman to test the full lifecycle:

### Step 1: Health Check
- **Request:** `GET {{baseUrl}}/health`
- **Expected:** Status `200 OK`, JSON `{ status: "ok" }`.

### Step 2: Patient Registration
- **Request:** `POST {{baseUrl}}/auth/register`
- **Body:**
```json
{
  "name": "Test User",
  "email": "test.user@doctorp.com",
  "password": "Password@123",
  "role": "patient",
  "phone": "+91 99999 00000"
}
```
- **Expected:** Status `201 Created`, returns `token` and `user`.

### Step 3: Login to Collect Tokens
- **Patient Login:** `POST {{baseUrl}}/auth/login` with `patient@doctorp.com` / `Patient@123`
  - *Saves `patientToken`*
- **Doctor Login:** `POST {{baseUrl}}/auth/login` with `dr.sharma@doctorp.com` / `Doctor@123`
  - *Saves `doctorToken`*
- **Admin Login:** `POST {{baseUrl}}/auth/login` with `admin@doctorp.com` / `Admin@123`
  - *Saves `adminToken`*

### Step 4: Invalid Credentials Negative Test
- **Request:** `POST {{baseUrl}}/auth/login` with invalid password
- **Expected:** Status `401 Unauthorized`, `{ success: false, message: "Invalid email or password credentials." }`.

### Step 5: Get Doctors & Select Doctor ID
- **Request:** `GET {{baseUrl}}/doctors?specialty=Cardiology`
- **Expected:** Status `200 OK`, returns array of verified doctors.
- *Postman test script automatically stores the first doctor's `_id` into `{{doctorId}}`.*

### Step 6: Check Availability
- **Request:** `GET {{baseUrl}}/doctors/{{doctorId}}/availability?date=2026-10-30`
- **Expected:** Status `200 OK`, returns slots array with `available: true/false`.

### Step 7: Book Appointment
- **Request:** `POST {{baseUrl}}/appointments`
- **Headers:** `Authorization: Bearer {{patientToken}}`
- **Body:**
```json
{
  "doctorId": "{{doctorId}}",
  "appointmentDate": "2026-10-30",
  "startTime": "10:00",
  "reason": "Cardiac consultation"
}
```
- **Expected:** Status `201 Created`, returns appointment with generated `appointmentId`.
- *Saves `{{appointmentId}}`.*

### Step 8: Test Double Booking Conflict
- **Request:** Re-send the exact same booking request as Step 7.
- **Expected:** Status `409 Conflict`, error message indicating slot is already booked.

### Step 9: Verify My Appointments
- **Request:** `GET {{baseUrl}}/appointments/my`
- **Headers:** `Authorization: Bearer {{patientToken}}`
- **Expected:** Status `200 OK`, returns the newly booked appointment.

### Step 10: Cancel Appointment
- **Request:** `PATCH {{baseUrl}}/appointments/{{appointmentId}}/cancel`
- **Headers:** `Authorization: Bearer {{patientToken}}`
- **Expected:** Status `200 OK`, status updated to `cancelled`, slot freed.

### Step 11: Role Authorization Checks
- **Patient on Doctor Route:** `PATCH {{baseUrl}}/doctors/profile` using `{{patientToken}}`
  - **Expected:** `403 Forbidden`
- **Patient on Admin Dashboard:** `GET {{baseUrl}}/admin/dashboard` using `{{patientToken}}`
  - **Expected:** `403 Forbidden`
- **Admin on Admin Dashboard:** `GET {{baseUrl}}/admin/dashboard` using `{{adminToken}}`
  - **Expected:** `200 OK`

### Step 12: AI Symptom Checker
- **Request:** `POST {{baseUrl}}/symptoms/check`
- **Body:** `{ "text": "I have severe chest pain and heart palpitations" }`
- **Expected:** Status `200 OK`, `{ recommendation: { specialty: "Cardiology", urgency: "high" } }`.

---

## 🌐 Running Tests Against Deployed Render Backend
To test your deployed live API:
1. In Postman, switch the `baseUrl` variable from `http://localhost:5000/api` to `https://<your-render-service>.onrender.com/api`.
2. Run the collection using the **Postman Runner**.
3. All requests will automatically execute against the cloud server.
