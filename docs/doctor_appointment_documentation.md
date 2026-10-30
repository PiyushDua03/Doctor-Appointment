# 🏥 DoctorP — Full-Stack Doctor Appointment Website
## Complete Project Documentation v2.0

> **Project Name:** DoctorP  
> **Version:** 2.0.0  
> **Type:** Full-Stack Web Application  
> **Frontend:** Next.js → Deployed on **Vercel**  
> **Backend:** Node.js + Express → Deployed on **Render**  
> **Database:** MongoDB Atlas  
> **Authentication:** JWT (JSON Web Tokens)

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Final Tech Stack](#2-final-tech-stack)
3. [Deployment Architecture](#3-deployment-architecture)
4. [⭐ 5 Standout Interactive Features](#4--5-standout-interactive-features)
5. [Pages & Structure](#5-pages--structure)
6. [REST API Reference](#6-rest-api-reference)
7. [MongoDB Data Models](#7-mongodb-data-models)
8. [User Roles & Authentication](#8-user-roles--authentication)
9. [User Flows](#9-user-flows)
10. [File & Folder Structure](#10-file--folder-structure)
11. [Design System](#11-design-system)
12. [Responsiveness](#12-responsiveness)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Project Overview

**DoctorP** is a modern, full-stack doctor appointment booking platform. It connects patients with the right doctors through intelligent features like an AI Symptom Checker and a real-time interactive map. The platform is secured with JWT authentication, backed by MongoDB Atlas, and deployed on Vercel (frontend) + Render (backend).

### Goals
- Allow patients to find, filter, and book doctors seamlessly
- Prevent double bookings using real-time slot locking
- Help patients identify the right specialist with AI assistance
- Provide a visual health dashboard for post-login experience
- Enable an honest review ecosystem for doctor accountability

---

## 2. Final Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR/SSG pages, routing, UI |
| **Styling** | Tailwind CSS + Framer Motion | Design system + animations |
| **State Management** | React Context + SWR | Global auth state, data fetching |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | MongoDB Atlas + Mongoose | Data storage & schemas |
| **Authentication** | JWT + bcryptjs | Secure login/register |
| **Real-time** | Polling (setInterval) | Live slot availability |
| **Maps** | Leaflet.js | Interactive doctor location map |
| **Charts** | Chart.js + react-chartjs-2 | Health dashboard visualizations |
| **Icons** | Lucide React + React Icons | UI icons |
| **Fonts** | Google Fonts (Inter + Poppins) | Typography |

---

## 3. Deployment Architecture

```
┌─────────────────────────────────────────────┐
│                  USER BROWSER                │
└──────────────────────┬──────────────────────┘
                       │ HTTPS
          ┌────────────▼────────────┐
          │     VERCEL (Frontend)   │
          │      Next.js App        │
          │  doctorp.vercel.app     │
          └────────────┬────────────┘
                       │ REST API calls
          ┌────────────▼────────────┐
          │    RENDER (Backend)     │
          │  Node.js + Express API  │
          │  api.doctorp.render.com │
          └────────────┬────────────┘
                       │ Mongoose ODM
          ┌────────────▼────────────┐
          │    MONGODB ATLAS        │
          │   Cloud Database        │
          │   (Free M0 Cluster)     │
          └─────────────────────────┘
```

### Environment Variables

#### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/doctorp
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://doctorp.vercel.app
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.doctorp.render.com
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## 4. ⭐ 5 Standout Interactive Features

---

### 🤖 Feature 1: AI Symptom Checker

**What it does:**  
Patient types their symptoms in a conversational chat-style UI. The system matches keywords against a specialist mapping stored in MongoDB and suggests the most relevant medical specialist, with a direct link to filtered doctors.

**How it works:**
```
Patient types: "I have chest pain and shortness of breath"
        ↓
Keyword extraction: ["chest pain", "shortness of breath"]
        ↓
MongoDB lookup: symptoms collection → match → "Cardiology"
        ↓
Response: "Based on your symptoms, we recommend seeing a Cardiologist"
        ↓
CTA Button: "Find Cardiologists Near You" → /doctors?specialty=cardiology
```

**MongoDB Collection:** `symptoms`
```json
{
  "keywords": ["chest pain", "heart pain", "palpitations"],
  "specialty": "Cardiology",
  "description": "Your symptoms may be related to heart conditions.",
  "urgency": "high",
  "icon": "heart-pulse"
}
```

**UI Design:**
- Chat bubble interface (like WhatsApp)
- Typing animation while "AI" processes
- Color-coded urgency (red = high, yellow = medium, green = low)
- Symptom history saved to localStorage

---

### 📅 Feature 2: Real-time Slot Booking with Live Availability

**What it does:**  
Time slots show live availability. When a user clicks a slot, it gets temporarily reserved (locked) for 5 minutes. Other users see it as "Pending" and cannot select it. Prevents double bookings entirely.

**How it works:**
```
User A selects slot "10:00 AM on Oct 25"
        ↓
POST /api/slots/lock → slot status = "locked", lockedBy = userA, lockedUntil = +5min
        ↓
Polling every 5s for all users viewing same doctor
        ↓
User B sees slot as "Pending" (greyed out)
        ↓
User A confirms booking → slot status = "booked"
        ↓
If User A abandons → slot auto-releases after 5 min (cron job)
```

**MongoDB Slot Schema:**
```json
{
  "doctorId": "ObjectId",
  "date": "2026-10-25",
  "time": "10:00",
  "status": "available | locked | booked",
  "lockedBy": "userId | null",
  "lockedUntil": "ISODate | null",
  "bookedBy": "userId | null"
}
```

**UI Design:**
- Green = Available, Yellow = Pending (locked), Red = Booked
- Live countdown timer on locked slots ("Reserved for 4:32")
- Pulse animation on available slots
- Auto-refresh without page reload

---

### 🗺️ Feature 3: Doctor Finder Map

**What it does:**  
An interactive Leaflet.js map showing all doctors as pins. Clicking a pin reveals an animated popup with the doctor's card (photo, rating, specialty, fee). Users can filter pins by specialty and book directly from the map popup.

**How it works:**
```
Page loads → GET /api/doctors?fields=name,specialty,location,coords
        ↓
Leaflet map renders with custom marker pins (color-coded by specialty)
        ↓
User clicks filter: "Cardiologist"
        ↓
Non-matching pins fade out, only Cardiologist pins remain
        ↓
User clicks a pin → popup with doctor card appears
        ↓
"Book Now" button → /booking?doctorId=xxx
```

**Doctor Location Data in MongoDB:**
```json
{
  "location": {
    "address": "Apollo Hospital, New Delhi",
    "city": "New Delhi",
    "coordinates": {
      "lat": 28.6139,
      "lng": 77.2090
    }
  }
}
```

**UI Design:**
- Custom SVG map pins color-coded by specialty
- Smooth zoom animation on pin click
- Glassmorphism popup card with doctor info
- Specialty legend/filter panel on the side
- "Use My Location" button to center map

---

### ⭐ Feature 4: Smart Review System

**What it does:**  
After an appointment is marked **"Completed"** by the doctor, the patient receives an in-app prompt on their dashboard to rate and review the doctor. Reviews are stored in MongoDB and the doctor's overall rating is recalculated live.

**How it works:**
```
Doctor marks appointment as "Completed"
        ↓
Patient's dashboard shows: "How was your visit with Dr. X?" banner
        ↓
Patient submits: 5-star rating + written review
        ↓
POST /api/reviews → save review
        ↓
PATCH /api/doctors/:id/rating → recalculate avg rating
        ↓
Doctor profile page shows updated rating immediately
```

**MongoDB Review Schema:**
```json
{
  "doctorId": "ObjectId",
  "patientId": "ObjectId",
  "appointmentId": "ObjectId",
  "rating": 4.5,
  "review": "Dr. Sarah was very thorough and kind.",
  "tags": ["Professional", "On-Time", "Clear Explanation"],
  "createdAt": "ISODate"
}
```

**UI Design:**
- Interactive star rating (hover + click animation)
- Quick tag pills ("Professional", "Friendly", "On-Time", etc.)
- Textarea for written review
- Review cards on doctor profile with patient first name + date
- "Verified Patient" badge on all reviews

---

### 📊 Feature 5: Patient Health Dashboard

**What it does:**  
A personalized, visually rich dashboard for logged-in patients. Shows upcoming appointments with countdown timers, past visit history timeline, specialists consulted, and health stats visualized with Chart.js.

**Sections:**
```
┌─────────────────────────────────────────────┐
│  👋 Welcome back, John!                      │
├─────────────┬───────────────────────────────┤
│  UPCOMING   │  📅 Dr. Sarah – Oct 25, 10AM  │
│ APPOINTMENT │  ⏱ In 2 days, 14 hours        │
│             │  [Reschedule] [Cancel]         │
├─────────────┴───────────────────────────────┤
│  📊 HEALTH STATS (Chart.js)                  │
│  • Total visits: 8    • Specialties: 4       │
│  • Bar chart: visits per month               │
├─────────────────────────────────────────────┤
│  📋 PAST VISITS TIMELINE                     │
│  ● Oct 10 – Cardiology – Dr. Smith          │
│  ● Sep 22 – Dental – Dr. Priya              │
│  ● Aug 5  – Neurology – Dr. Khan            │
├─────────────────────────────────────────────┤
│  ⭐ PENDING REVIEWS                          │
│  "Rate your visit with Dr. Priya"           │
└─────────────────────────────────────────────┘
```

**UI Design:**
- Animated number counters on stats
- Chart.js bar + doughnut charts
- Timeline with connecting line and dot markers
- Countdown timer with live ticking
- Skeleton loading state for all sections

---

## 5. Pages & Structure

| Page | Route | Description |
|---|---|---|
| Home / Landing | `/` | Hero, stats, specialties, featured doctors, how it works, testimonials |
| Doctors Listing | `/doctors` | Filterable, searchable doctor cards grid |
| Doctor Profile | `/doctors/[id]` | Full profile, reviews, real-time slot picker |
| Symptom Checker | `/symptom-checker` | AI chat interface for specialist recommendation |
| Doctor Map | `/map` | Interactive Leaflet map with all doctors |
| Booking | `/booking/[doctorId]` | Patient form + slot confirmation |
| Confirmation | `/confirmation/[appointmentId]` | Booking success screen |
| Patient Dashboard | `/dashboard` | Health stats, appointments, reviews (protected) |
| Login | `/auth/login` | JWT login form |
| Register | `/auth/register` | Patient / Doctor registration |

---

## 6. REST API Reference

### 🔐 Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register patient or doctor |
| POST | `/login` | ❌ | Login & receive JWT token |
| GET | `/me` | ✅ | Get current logged-in user |
| POST | `/logout` | ✅ | Invalidate token |

### 👨‍⚕️ Doctor Routes — `/api/doctors`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ❌ | Get all doctors (supports filters: specialty, city, rating, fee) |
| GET | `/:id` | ❌ | Get single doctor by ID |
| POST | `/` | ✅ Admin | Add new doctor |
| PUT | `/:id` | ✅ Doctor | Update own profile |
| PATCH | `/:id/rating` | ✅ System | Recalculate doctor rating |

### 📅 Appointment Routes — `/api/appointments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ Patient | Book a new appointment |
| GET | `/my` | ✅ Patient | Get my appointments |
| GET | `/doctor/:id` | ✅ Doctor | Get appointments for a doctor |
| PATCH | `/:id/status` | ✅ Doctor | Update status (confirm/complete/cancel) |
| DELETE | `/:id` | ✅ Patient | Cancel appointment |

### 🕐 Slot Routes — `/api/slots`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/doctor/:id?date=YYYY-MM-DD` | ❌ | Get all slots for a doctor on a date |
| POST | `/lock` | ✅ Patient | Temporarily lock a slot (5 min) |
| POST | `/release` | ✅ Patient | Release a locked slot |
| POST | `/generate` | ✅ Doctor | Generate available slots for a date range |

### ⭐ Review Routes — `/api/reviews`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ Patient | Submit a review after completed appointment |
| GET | `/doctor/:id` | ❌ | Get all reviews for a doctor |
| DELETE | `/:id` | ✅ Admin | Remove inappropriate review |

### 🤖 Symptom Routes — `/api/symptoms`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/check` | ❌ | Submit symptoms, get specialist recommendation |
| GET | `/` | ✅ Admin | List all symptom mappings |
| POST | `/` | ✅ Admin | Add new symptom-specialty mapping |

---

## 7. MongoDB Data Models

### `users` Collection
```json
{
  "_id": "ObjectId",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password",
  "role": "patient | doctor | admin",
  "phone": "9876543210",
  "gender": "Male",
  "age": 35,
  "avatar": "url_to_image",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### `doctors` Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "name": "Dr. Sarah Mitchell",
  "specialty": "Cardiology",
  "experience": 12,
  "rating": 4.8,
  "totalReviews": 124,
  "fee": 800,
  "bio": "Expert in cardiovascular diseases...",
  "qualifications": ["MBBS", "MD - Cardiology", "FACC"],
  "languages": ["English", "Hindi"],
  "hospital": "Apollo Hospital",
  "location": {
    "address": "Apollo Hospital, Saket",
    "city": "New Delhi",
    "coordinates": { "lat": 28.6139, "lng": 77.2090 }
  },
  "avatar": "url_to_image",
  "availableDays": ["Monday", "Wednesday", "Friday"],
  "slotDuration": 60,
  "isVerified": true,
  "createdAt": "ISODate"
}
```

### `appointments` Collection
```json
{
  "_id": "ObjectId",
  "appointmentId": "APT-20261022-001",
  "doctorId": "ObjectId (ref: doctors)",
  "patientId": "ObjectId (ref: users)",
  "date": "2026-10-25",
  "time": "10:00",
  "reason": "Chest pain and breathlessness",
  "status": "pending | confirmed | completed | cancelled",
  "fee": 800,
  "notes": "Doctor's notes after visit",
  "bookedAt": "ISODate"
}
```

### `slots` Collection
```json
{
  "_id": "ObjectId",
  "doctorId": "ObjectId (ref: doctors)",
  "date": "2026-10-25",
  "time": "10:00",
  "status": "available | locked | booked",
  "lockedBy": "ObjectId | null",
  "lockedUntil": "ISODate | null",
  "bookedBy": "ObjectId | null"
}
```

### `reviews` Collection
```json
{
  "_id": "ObjectId",
  "doctorId": "ObjectId (ref: doctors)",
  "patientId": "ObjectId (ref: users)",
  "appointmentId": "ObjectId (ref: appointments)",
  "rating": 4.5,
  "review": "Dr. Sarah was very thorough and kind.",
  "tags": ["Professional", "On-Time", "Friendly"],
  "createdAt": "ISODate"
}
```

### `symptoms` Collection
```json
{
  "_id": "ObjectId",
  "keywords": ["chest pain", "heart pain", "palpitations", "shortness of breath"],
  "specialty": "Cardiology",
  "description": "Your symptoms may be related to heart conditions.",
  "urgency": "high | medium | low",
  "icon": "heart-pulse",
  "color": "#EF4444"
}
```

---

## 8. User Roles & Authentication

### Roles

| Role | Permissions |
|---|---|
| **Patient** | Register, login, search doctors, book appointments, view dashboard, write reviews |
| **Doctor** | Login, manage own profile, view own appointments, mark as complete, generate slots |
| **Admin** | Full access — manage all users, doctors, reviews, symptom data |

### JWT Flow
```
1. User logs in → POST /api/auth/login
2. Server validates credentials → signs JWT with userId + role
3. JWT returned → stored in httpOnly cookie (secure)
4. Every protected request → middleware verifies JWT
5. Role checked → access granted or 403 Forbidden
```

---

## 9. User Flows

### Primary Flow — Patient Books Appointment
```
Home → Symptom Checker → Suggested Specialty
    → Doctors Listing (filtered) → Doctor Profile
    → Select Date → Select Time Slot (locks in real-time)
    → Booking Form → Submit → Confirmation Page ✅
    → Dashboard (upcoming appointment shows with countdown)
    → After visit: Review Prompt → Submit Review ⭐
```

### Secondary Flow — Map Discovery
```
Home → "Find Doctors Near Me" → Map Page
    → Click Doctor Pin → Popup Card → "Book Now"
    → Booking Flow → Confirmation ✅
```

### Doctor Flow
```
Register as Doctor → Profile Setup → Generate Slots
    → View Incoming Appointments → Mark as Completed
```

---

## 10. File & Folder Structure

```
doctorp/
│
├── 📁 frontend/                        ← Next.js 14 App
│   ├── app/
│   │   ├── page.jsx                    ← Home page
│   │   ├── layout.jsx                  ← Root layout (navbar, footer)
│   │   ├── doctors/
│   │   │   ├── page.jsx                ← Doctors listing
│   │   │   └── [id]/page.jsx           ← Doctor profile
│   │   ├── booking/
│   │   │   └── [doctorId]/page.jsx     ← Booking form
│   │   ├── confirmation/
│   │   │   └── [appointmentId]/page.jsx
│   │   ├── symptom-checker/page.jsx    ← AI Symptom Checker
│   │   ├── map/page.jsx                ← Doctor Finder Map
│   │   ├── dashboard/page.jsx          ← Patient Dashboard
│   │   └── auth/
│   │       ├── login/page.jsx
│   │       └── register/page.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── DoctorCard.jsx
│   │   ├── SlotPicker.jsx
│   │   ├── SymptomChat.jsx
│   │   ├── DoctorMap.jsx
│   │   ├── ReviewCard.jsx
│   │   ├── Dashboard/
│   │   │   ├── StatsCard.jsx
│   │   │   ├── AppointmentTimeline.jsx
│   │   │   └── HealthChart.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Badge.jsx
│   │       ├── Modal.jsx
│   │       └── Skeleton.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   ├── useDoctors.js
│   │   ├── useSlots.js
│   │   └── useAuth.js
│   ├── lib/
│   │   └── api.js                      ← Axios instance
│   └── public/assets/
│
└── 📁 backend/                         ← Node.js + Express
    ├── server.js                        ← Entry point
    ├── config/
    │   └── db.js                        ← MongoDB connection
    ├── models/
    │   ├── User.js
    │   ├── Doctor.js
    │   ├── Appointment.js
    │   ├── Slot.js
    │   ├── Review.js
    │   └── Symptom.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── doctor.routes.js
    │   ├── appointment.routes.js
    │   ├── slot.routes.js
    │   ├── review.routes.js
    │   └── symptom.routes.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── doctor.controller.js
    │   ├── appointment.controller.js
    │   ├── slot.controller.js
    │   ├── review.controller.js
    │   └── symptom.controller.js
    ├── middleware/
    │   ├── auth.middleware.js           ← JWT verification
    │   └── role.middleware.js           ← Role-based access
    ├── utils/
    │   ├── generateToken.js
    │   ├── slotCleaner.js              ← Cron: release expired locks
    │   └── errorHandler.js
    └── .env
```

---

## 11. Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#2563EB` | Brand blue — CTAs, links |
| `--primary-light` | `#EFF6FF` | Light blue backgrounds |
| `--secondary` | `#10B981` | Success green — confirmations |
| `--accent` | `#6366F1` | Indigo — highlights |
| `--warning` | `#F59E0B` | Pending/locked slots |
| `--danger` | `#EF4444` | Errors, high urgency |
| `--neutral-900` | `#0F172A` | Headings |
| `--neutral-600` | `#475569` | Body text |
| `--neutral-100` | `#F1F5F9` | Card backgrounds |

### Animations

| Animation | Where Used |
|---|---|
| `fadeInUp` | Section entry on scroll |
| `pulse` | Available slot indicators |
| `counterSpin` | Stats counter on home |
| `checkmarkDraw` | Confirmation page success |
| `chatTyping` | Symptom checker AI typing |
| `mapPinDrop` | Leaflet map pin animation |
| `skeletonShimmer` | Loading states |

---

## 12. Responsiveness

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Single column, hamburger nav, stacked cards |
| Tablet | 768px – 1023px | 2-column grid, collapsed sidebar |
| Desktop | ≥ 1024px | Full 3-column grid, expanded sidebar |

---

## 13. Future Enhancements

| Feature | Priority |
|---|---|
| Online Payment (Razorpay/Stripe) | High |
| Video Consultation (WebRTC) | High |
| Email/SMS Appointment Reminders | Medium |
| Admin Dashboard & CMS | Medium |
| Doctor Availability Recurring Schedule | Medium |
| Multi-language Support (Hindi, Tamil, etc.) | Low |
| Mobile App (React Native) | Low |
| AI-powered Doctor Recommendation (ML model) | Low |

---

> ✅ **Documentation Complete — Ready for Development**  
> **Next Step:** Start building the backend (`/backend`) with Express + MongoDB, followed by the Next.js frontend.
