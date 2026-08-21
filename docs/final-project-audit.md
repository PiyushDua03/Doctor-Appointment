# Final Project Audit

**Multi-Doctor Appointment Conflict Scheduler**

---

## Frontend

### HTML Files

| File | Purpose | Route |
|------|---------|-------|
| `booking-api.html` | Patient booking page | `/booking` |
| `doctor-login.html` | Doctor login page | `/doctor/login` |
| `doctor-dashboard.html` | Doctor dashboard | `/doctor/dashboard` |

### CSS Files

| File | Purpose |
|------|---------|
| `css/booking-api.css` | Booking page styles |
| `css/doctor.css` | Doctor login + dashboard styles |

### JavaScript Files

| File | Phase | Purpose |
|------|-------|---------|
| `js/booking/bookingApi.js` | 4A | Patient booking form, API communication, conflict display, suggestions |
| `js/doctor/doctorLogin.js` | 4B | Doctor authentication, JWT storage, role validation |
| `js/doctor/doctorDashboard.js` | 4B | Doctor dashboard, appointments, weekly calendar, detail modal |

---

## Backend

### Routes

| File | Endpoints |
|------|-----------|
| `routes/auth.js` | `POST /api/auth/register`, `POST /api/auth/login` |
| `routes/doctors.js` | `GET /api/doctors`, `GET /api/doctors/:id`, `GET /api/doctors/:id/appointments`, `GET /api/doctors/:id/next-available` |
| `routes/appointments.js` | `GET /api/appointments`, `POST /api/appointments` |

### Models

| File | Purpose |
|------|---------|
| `models/User.js` | User schema (name, email, password, role, doctorId) |
| `models/Doctor.js` | Doctor schema (doctorId, name, specialty, availableSlots) |
| `models/Room.js` | Room schema (roomId, name, type, floor) |
| `models/Appointment.js` | Appointment schema (doctorId, patientName, date, startTime, endTime, roomId, status) |

### Services

| File | Purpose |
|------|---------|
| `services/appointmentService.js` | Appointment creation with 12-step validation |
| `services/conflictService.js` | Doctor and room conflict detection |
| `services/roomService.js` | Automatic room assignment |
| `services/slotService.js` | Next available slot algorithm |
| `services/timeUtils.js` | Time conversion utilities |
| `services/googleCalendarService.js` | Google Calendar API integration |

### Middleware

| File | Purpose |
|------|---------|
| `middleware/auth.js` | JWT authentication, role authorization, self-access enforcement |
| `middleware/errorHandler.js` | Global error handler |
| `middleware/validate.js` | Request body validation |

---

## Features

| Feature | Status |
|---------|--------|
| Patient booking | Working |
| Conflict detection | Working |
| Room assignment | Working |
| Next available slot | Working |
| Google Calendar | Working |
| Doctor login | Working |
| Doctor dashboard | Working |
| JWT authentication | Working |

---

## Authentication — Doctor JWT Flow

1. Doctor visits `/doctor/login`
2. Enters email + password
3. JavaScript validates form (client-side)
4. `POST /api/auth/login` with JSON body
5. Server validates via `bcrypt.compare()`
6. Server returns JWT token + user object
7. Frontend checks `user.role === 'doctor'`
8. Token stored in `sessionStorage`
9. Redirect to `/doctor/dashboard`
10. Dashboard reads token from `sessionStorage`
11. All API calls include `Authorization: Bearer <token>`
12. If 401 received: clear session, redirect to login
13. Logout: `sessionStorage.clear()`, redirect to login

---

## Scope

### Features Required by Assignment — Included

- Patient booking page (`/booking`)
- Doctor login (`/doctor/login`)
- Doctor dashboard (`/doctor/dashboard`)
- Multi-doctor conflict detection
- Room assignment
- Next available slot
- Google Calendar integration
- JWT authentication

### Features Removed — Not Required

| Feature | Reason |
|---------|--------|
| `admin-login.html` | Not required by assignment scope |
| `admin-dashboard.html` | Not required by assignment scope |
| `css/admin.css` | Admin UI removed |
| `js/admin/adminDashboard.js` | Admin UI removed |
| `landing.html` | Not required — `/booking` is the patient entry point |
| `css/landing.css` | Landing page removed |
| Admin routes in `app.js` | Admin UI removed |

---

## Syllabus Compliance

All frontend JavaScript features are within the syllabus.

### Changes Made During Audit

| Change | Reason |
|--------|--------|
| Removed optional chaining (`?.`) | Replaced with `(obj && obj.property)` |
| Removed admin UI files | Out of project scope |
| Removed landing page files | Out of project scope |
| Re-seeded database | Clean test state with 6 doctors |

---

## Tests

```
Results: 59 passed, 0 failed, 59 total
```

### How to Run

```bash
cd server
node utils/seed.js
PORT=5050 node server.js
TEST_URL=http://localhost:5050 npm test
```

---

## Confirmation

1. Frontend uses HTML + CSS + Vanilla JavaScript only
2. No frontend framework introduced
3. All frontend JavaScript uses only syllabus-allowed concepts
4. Backend functionality preserved
5. All 59 tests pass from clean seed state
6. Unnecessary scope removed
7. Code is viva-friendly
