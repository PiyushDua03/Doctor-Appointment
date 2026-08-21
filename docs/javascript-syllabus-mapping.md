# JavaScript Syllabus Mapping

Maps real project code to JavaScript syllabus concepts.
Only meaningful implementations are included — no fabricated examples.

---

## Phase 1–2: Frontend (Existing — Untouched)

| Concept | File | Example |
|---------|------|---------|
| Variables (`const`, `let`) | All JS files | `const GRANULARITY = 15;` in slotSearch.js |
| Data types (string, number, boolean, null) | data/doctors.js | Doctor objects with string, number, nested types |
| Type conversion | utils/time.js | `timeStr.split(':').map(Number)` — string to number |
| Arithmetic operators | utils/time.js | `hours * 60 + minutes` |
| Comparison operators | core/conflict.js | `startA < endB && startB < endA` |
| Logical operators (&&, \|\|, !) | core/conflict.js | `isDoctorFree` and `isRoomFree` |
| Template literals | models/appointment.js | `` `Missing required fields: ${missing.join(', ')}` `` |
| Conditionals (if/else) | core/validation.js | Full form validation chain |
| Ternary operator | utils/id.js | `typeof crypto !== 'undefined' ? ... : ...` |
| for loop | utils/time.js | `for (let i = 0; i < days; i++)` |
| for...of loop | core/slotSearch.js | `for (const date of dateRange)` |
| while loop | core/slotSearch.js | `while (cursor + duration <= windowEndMins)` |
| Function declarations | All modules | IIFE pattern throughout |
| Arrow functions | All modules | `const timeToMinutes = (timeStr) => { ... }` |
| Parameters & arguments | core/conflict.js | `findDoctorConflicts(doctorId, date, startTime, endTime, appointments)` |
| Default parameters | models/appointment.js | `status = 'confirmed'` |
| Return values | core/roomAssign.js | `return room.id;` / `return null;` |
| Scope & closures | core/slotSearch.js | `cursor` variable inside while loop |
| Arrays | data/doctors.js | Array of doctor objects |
| `.push()` | core/validation.js | `errors.push('Please select a doctor.')` |
| `.filter()` | core/conflict.js | `appointments.filter((apt) => ...)` |
| `.map()` | utils/time.js | `.split(':').map(Number)` |
| `.find()` | data/doctors.js | `all.find((doc) => doc.id === id)` |
| `.some()` | utils/time.js | `windows.some(({ start, end }) => ...)` |
| `.sort()` | storage/storage.js | `.sort((a, b) => ...)` |
| `.forEach()` | dom/render.js | `dates.forEach((dateStr) => { ... })` |
| `.includes()` | core/validation.js | `validDurations.includes(durationMins)` |
| `.join()` | core/validation.js | `errors.join(', ')` |
| Spread operator | storage/storage.js | `[...getAllAppointments(), appointment]` |
| Destructuring (objects) | core/validation.js | `const { doctorId, patientName, date, ... } = formData` |
| Destructuring (arrays) | utils/time.js | `const [hours, minutes] = timeStr.split(':')` |
| Objects | data/doctors.js | Doctor data objects with nested properties |
| Nested objects | data/doctors.js | `availableSlots: { monday: [{ start, end }] }` |
| JSON.stringify / JSON.parse | storage/storage.js | LocalStorage serialization |
| Set | data/doctors.js | `new Set(doctors.map(({ specialty }) => specialty))` |
| DOM manipulation | dom/render.js | `document.createElement()`, `.innerHTML` |
| DOM traversal | dom/traversal.js | `querySelector`, `closest`, `parentElement` |
| Event handling | events/handlers.js | `addEventListener('submit', handleFormSubmit)` |
| Event delegation | events/handlers.js | `e.target.closest('.btn-cancel')` |
| Form validation | core/validation.js | `validateAppointmentForm()` |
| LocalStorage | storage/storage.js | Full CRUD with `localStorage.setItem/getItem` |
| SessionStorage | auth/auth.js | `sessionStorage.setItem(AUTH_KEY, ...)` |
| DOMContentLoaded | app.js | `document.addEventListener('DOMContentLoaded', init)` |
| try-catch | storage/storage.js | Error-safe LocalStorage operations |
| String methods | core/validation.js | `.trim()`, `.split()`, `.padStart()` |
| Math methods | core/slotSearch.js | `Math.max()`, `Math.floor()` |
| Date object | utils/time.js | `new Date()`, `.getDay()`, `.setDate()` |
| IIFE pattern | All modules | `(function (Scheduler) { ... })(window.Scheduler)` |

---

## Phase 3A: Backend (New)

| Concept | File | Example |
|---------|------|---------|
| CommonJS modules (`require`/`module.exports`) | All server files | `const express = require('express');` |
| async/await | controllers/authController.js | `const user = await User.findOne(...)` |
| Promises | models/User.js | `bcrypt.compare(candidatePassword, this.password)` |
| try-catch (async) | controllers/*.js | `try { await ... } catch (err) { next(err); }` |
| Arrow functions | services/conflictService.js | `const hasOverlap = (intervalA, intervalB) => { ... }` |
| Destructuring (parameters) | controllers/appointmentController.js | `const { date, status, doctorId } = req.query` |
| Destructuring (nested) | services/timeUtils.js | `const [hours, minutes] = timeStr.split(':').map(Number)` |
| Default parameters | controllers/doctorController.js | `const { date = getTodayISO(), duration = '30' } = req.query` |
| Spread operator | controllers/appointmentController.js | `{ ...req.body, createdBy: ... }` |
| Template literals | services/appointmentService.js | `` `Doctor with ID '${doctorId}' not found.` `` |
| Objects (construction) | controllers/authController.js | JWT payload object construction |
| Nested objects | models/Doctor.js | Mongoose schema with nested `availableSlots` |
| Arrays | services/appointmentService.js | `const errors = []; errors.push(...)` |
| `.filter()` | services/conflictService.js | `appointments.filter((apt) => ...)` |
| `.find()` | services/slotService.js | `doctors.find((d) => d.doctorId === doctorId)` |
| `.map()` | middleware/errorHandler.js | `Object.values(err.errors).map(...)` |
| `.some()` | services/timeUtils.js | `windows.some(...)` |
| `.includes()` | middleware/auth.js | `roles.includes(req.user.role)` |
| `.join()` | middleware/validate.js | `errors.join(' ')` |
| `.forEach()` | utils/seed.js | `doctorUsers.forEach(...)` |
| for...of loop | services/roomService.js | `for (const room of rooms)` |
| while loop | services/slotService.js | `while (cursor + duration <= windowEndMins)` |
| Comparison operators | services/conflictService.js | `startA < endB && startB < endA` |
| Logical operators | middleware/auth.js | `!authHeader \|\| !authHeader.startsWith('Bearer ')` |
| Conditionals | services/appointmentService.js | 12-step validation chain |
| Ternary operator | controllers/appointmentController.js | `req.user ? req.user.id : null` |
| parseInt | services/appointmentService.js | `parseInt(duration, 10)` |
| Regex | middleware/validate.js | `/^\d{4}-\d{2}-\d{2}$/` date format validation |
| String methods | models/User.js | `.toLowerCase()`, `.trim()`, `.startsWith()` |
| Math methods | services/slotService.js | `Math.max()`, `Math.floor()` |
| Object.entries | services/appointmentService.js | Error detail construction |
| Object.keys | middleware/errorHandler.js | `Object.keys(err.keyPattern)` |
| Object.values | middleware/errorHandler.js | `Object.values(err.errors)` |
| JSON (API responses) | All controllers | `res.status(200).json({ success: true, ... })` |
| Error handling (custom) | services/appointmentService.js | `const err = new Error(...); err.status = 409;` |
| Middleware pattern | middleware/auth.js | `(req, res, next) => { ... next(); }` |
| Higher-order functions | middleware/auth.js | `authorize(...roles)` returns middleware function |
| Closure | middleware/auth.js | `authorize` closes over `roles` parameter |
| REST API design | routes/*.js | RESTful endpoint design |
| Environment variables | config/env.js | `process.env.MONGODB_URI` |
| Process events | server.js | `process.on('SIGTERM', ...)` |
| NaN check | middleware/validate.js | `isNaN(durationNum)` |
| delete operator | models/User.js | `delete obj.password` |
---

## Phase 3B: Google Calendar Integration (New)

| Concept | File | Example |
|---------|------|---------|
| External API integration | services/googleCalendarService.js | `google.calendar({ version: 'v3', auth })` |
| async/await (API calls) | services/googleCalendarService.js | `await calendar.events.insert(...)` |
| try-catch (external API) | services/googleCalendarService.js | Graceful handling of Google API failures |
| Object construction | services/googleCalendarService.js | `buildEventResource()` builds calendar event from appointment |
| Template literals | services/googleCalendarService.js | `` `Doctor Appointment — ${doctorName}` `` |
| Array `.join()` | services/googleCalendarService.js | `description: [...].join('\n')` |
| Conditional logic | services/googleCalendarService.js | `isConfigured()` checks all 4 env vars |
| Logical operators (`!!`, `&&`) | services/googleCalendarService.js | `return !!(clientId && clientSecret && ...)` |
| Destructuring | services/appointmentService.js | `const { createCalendarEvent, isConfigured } = require(...)` |
| Default values | services/googleCalendarService.js | `process.env.GOOGLE_CALENDAR_ID \|\| 'primary'` |
| Module pattern | services/googleCalendarService.js | Isolated service with clean exports |
| Function composition | services/appointmentService.js | `syncCalendarEvent()` composes calendar service calls |
| Error handling (graceful) | services/appointmentService.js | Calendar failure sets status without rolling back |
| Optional chaining (`?.`) | utils/testApi.js | `guestBooking.data.calendar?.status` |
| `.includes()` | utils/testApi.js | `validStatuses.includes(calStatus)` |
| Enum-like values | models/Appointment.js | `enum: ['pending', 'synced', 'failed', 'not_configured']` |
| Return objects | services/googleCalendarService.js | `return { success: true, eventId }` |
| console.warn / console.error | services/googleCalendarService.js | Structured logging for different severity levels |
| Environment variable checks | services/googleCalendarService.js | Runtime config validation via `isConfigured()` |

---

## Phase 4A: Patient Booking Page & API Integration (New)

| Concept | File | Example |
|---------|------|---------|
| Fetch API (frontend) | js/booking/bookingApi.js | `await fetch(url, config)` in `apiFetch()` |
| async/await (frontend) | js/booking/bookingApi.js | `const { status, data } = await apiFetch('/doctors')` |
| DOM manipulation | js/booking/bookingApi.js | `document.createElement('option')`, `insertAdjacentHTML()` |
| `filter()` | js/booking/bookingApi.js | `allDoctors.filter((d) => d.specialty === selectedSpec)` |
| `map()` | js/booking/bookingApi.js | `allDoctors.map((d) => d.specialty)` |
| `sort()` | js/booking/bookingApi.js | `[...filtered].sort((a, b) => a.name.localeCompare(b.name))` |
| `Set` (unique values) | js/booking/bookingApi.js | `[...new Set(allDoctors.map(d => d.specialty))]` |
| Spread operator | js/booking/bookingApi.js | `[...new Set(...)].sort()`, `[...filtered].sort()` |
| Destructuring | js/booking/bookingApi.js | `const { status, data } = await apiFetch(...)` |
| Template literals | js/booking/bookingApi.js | Confirmation modal HTML with `${doctorName}`, `${formatTime12(startTime)}` |
| Arrow functions | js/booking/bookingApi.js | All functions use arrow syntax |
| IIFE / Module pattern | js/booking/bookingApi.js | `const BookingApp = (() => { ... return { init }; })()` |
| Event handling | js/booking/bookingApi.js | `form.addEventListener('submit', ...)`, `specSelect.addEventListener('change', ...)` |
| `preventDefault()` | js/booking/bookingApi.js | `e.preventDefault()` on form submit |
| Form validation | js/booking/bookingApi.js | `validateForm()` checks all fields before API call |
| Regex | js/booking/bookingApi.js | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` email validation |
| JSON.stringify | js/booking/bookingApi.js | `body: JSON.stringify(payload)` in booking request |
| Conditional rendering | js/booking/bookingApi.js | Calendar status display based on `calendar.synced` / `calendar.status` |
| Error handling (HTTP) | js/booking/bookingApi.js | Status code branching: 201, 409, 400, 404, network errors |
| Closure | js/booking/bookingApi.js | `isSubmitting` flag captured in IIFE closure |
| `find()` | js/booking/bookingApi.js | `allDoctors.find((d) => d.doctorId === doctorId)` |
| `forEach()` | js/booking/bookingApi.js | `windows.forEach(({ start, end }) => ...)` |
| `padStart()` | js/booking/bookingApi.js | `String(m).padStart(2, '0')` in time formatting |
| `parseInt()` | js/booking/bookingApi.js | `parseInt($('#duration').value, 10)` |
| `setTimeout` | js/booking/bookingApi.js | Auto-hide notification after 8 seconds |
| `dataset` | js/booking/bookingApi.js | `useBtn.dataset.date` to pass data from suggestion |
| `remove()` | js/booking/bookingApi.js | `modal.remove()` to close confirmation |
| `insertAdjacentHTML` | js/booking/bookingApi.js | Dynamic modal insertion into DOM |
| Keyboard events | js/booking/bookingApi.js | Escape key closes modal |
| `classList` | js/booking/bookingApi.js | `show()`/`hide()` toggle `.hidden` class |
| `localeCompare` | js/booking/bookingApi.js | `a.name.localeCompare(b.name)` for doctor sorting |
| `toLocaleDateString` | js/booking/bookingApi.js | `formatDateLong()` for user-friendly dates |

---

## Phase 4B: Doctor Login & Dashboard (New)

| Concept | File | Example |
|---------|------|---------|
| `reduce()` | js/doctor/doctorDashboard.js | `allAppointments.reduce((acc, apt) => { ... }, { today: 0, upcoming: 0, completed: 0 })` |
| `filter()` (dashboard) | js/doctor/doctorDashboard.js | `allAppointments.filter((a) => a.date === today && a.status !== 'cancelled')` |
| `sort()` (appointments) | js/doctor/doctorDashboard.js | `filtered.sort((a, b) => a.date.localeCompare(b.date))` |
| `map()` (rendering) | js/doctor/doctorDashboard.js | `sorted.map((apt) => \`<div class="apt-card">\`)` |
| `find()` | js/doctor/doctorDashboard.js | `allAppointments.find((a) => a._id === aptId)` |
| `forEach()` | js/doctor/doctorDashboard.js | `$$('.tab-btn').forEach((btn) => ...)` |
| `Array.from()` | js/doctor/doctorDashboard.js | `Array.from({ length: 5 }, (_, i) => ...)` for week dates |
| `Promise.all()` | js/doctor/doctorDashboard.js | `await Promise.all([loadDoctorInfo(), loadAppointments()])` |
| `sessionStorage` | js/doctor/doctorLogin.js | `sessionStorage.setItem('doctorToken', token)` |
| JWT / Bearer auth | js/doctor/doctorDashboard.js | `'Authorization': \`Bearer \${token}\`` |
| Role-based access | js/doctor/doctorLogin.js | `if (user.role !== 'doctor') showError(...)` |
| Auth redirect | js/doctor/doctorDashboard.js | `if (!token) window.location.href = 'doctor-login.html'` |
| Fetch with headers | js/doctor/doctorDashboard.js | `fetch(url, { headers: { Authorization: ... } })` |
| `insertAdjacentHTML` | js/doctor/doctorDashboard.js | Dynamic appointment detail modal |
| `dataset` | js/doctor/doctorDashboard.js | `card.dataset.aptId`, `btn.dataset.filter`, `link.dataset.view` |
| `classList` toggle | js/doctor/doctorDashboard.js | Tab switching, sidebar active state |
| Template literals (complex) | js/doctor/doctorDashboard.js | Multi-line HTML for calendar grid, appointment cards |
| Closure (state) | js/doctor/doctorDashboard.js | `weekOffset`, `activeView`, `activeFilter` in IIFE |
| Destructuring (API) | js/doctor/doctorLogin.js | `const { token, user } = data` |
| Regex (email) | js/doctor/doctorLogin.js | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` |
| Event delegation | js/doctor/doctorDashboard.js | Click handlers on dynamically created appointment cards |
| Keyboard accessibility | js/doctor/doctorDashboard.js | `card.addEventListener('keydown', ...)` for Enter/Space |
| `Date` operations | js/doctor/doctorDashboard.js | Week calculation, day-of-week, ISO formatting |
| `charAt` / `slice` | js/doctor/doctorDashboard.js | `s.charAt(0).toUpperCase() + s.slice(1)` status label |
| Ternary | js/doctor/doctorDashboard.js | `isToday ? ' today-col' : ''` |
| `join()` | js/doctor/doctorDashboard.js | `.map(...).join('')` to build HTML string |
| Null checks (conditional) | js/doctor/doctorDashboard.js | `(doctorInfo && doctorInfo.specialty)` replaces `?.` for syllabus compliance |
| `encodeURIComponent` | js/booking/bookingApi.js | Google Calendar URL construction |

---

## Syllabus Compliance Audit

### Concepts removed for syllabus compliance:

- **Optional chaining (`?.`)** — Replaced in all frontend JS files with standard null checks
- No **nullish coalescing (`??`)** used anywhere
- No **React/Vue/Angular/TypeScript/Tailwind** introduced
- All frontend is **HTML + CSS + Vanilla JavaScript**

### Concepts used that are required by external APIs (cannot be avoided):

- `async/await` — Required by Fetch API
- `Promise.all()` — Required for parallel API calls
- `JSON.stringify/parse` — Required for HTTP API communication

---

## All Syllabus Concepts Covered

All planned JavaScript syllabus concepts have been demonstrated across the four phases:

| Category | Concepts | Phases |
|----------|----------|--------|
| Variables & types | `let`, `const`, primitives, objects | 1, 2, 3A |
| Arrays | `filter`, `map`, `sort`, `reduce`, `find`, `forEach`, `includes`, `push`, `some`, `findIndex` | 1–4B |
| Objects | destructuring, spread, property access, computed keys | 2, 3A, 4A, 4B |
| Functions | arrow functions, IIFE, closures, callbacks, parameters, return values | 1–4B |
| Async | `async/await`, `Promise.all`, `fetch`, `JSON.stringify/parse` | 3A–4B |
| DOM | `querySelector`, `createElement`, `classList`, `dataset`, `insertAdjacentHTML`, event delegation | 1, 2, 4A, 4B |
| Storage | `localStorage`, `sessionStorage` | 2, 4B |
| Error handling | `try/catch`, HTTP status codes, validation | 3A–4B |
| Advanced | `Set`, `Array.from`, `padStart`, `localeCompare`, `toLocaleDateString`, `RegExp` | 3A–4B |

