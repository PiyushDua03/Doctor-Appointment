# 🏥 DoctorP — Full-Stack Doctor Appointment Booking Platform

> **A modern, responsive, and secure healthcare appointment platform built with the MERN stack following clear MVC architecture.**  
> College Capstone Full-Stack Web Development Project.

---

## 🌟 Live Demo & Deployment Links
- **Frontend App:** [https://doctorp.vercel.app](https://doctorp.vercel.app) *(Replace with your deployed URL)*
- **Backend API:** [https://doctorp-api.onrender.com/api](https://doctorp-api.onrender.com/api) *(Replace with your deployed Render URL)*
- **API Health Check:** [https://doctorp-api.onrender.com/api/health](https://doctorp-api.onrender.com/api/health)

---

## 📌 Project Overview
**DoctorP** connects patients with verified medical practitioners. Patients can explore doctors by department, check real-time clinic schedules, temporarily reserve slots to avoid booking conflicts, and confirm visits with unique appointment tracking IDs. Doctors can manage incoming requests and configure their clinic availability, while administrators maintain oversight of clinician credentials and platform analytics.

### ✨ Key Standout Features
1. **🤖 AI Symptom Checker & Triage:** Conversational symptom analysis that maps patient-reported keywords to appropriate clinical specialists with categorized urgency levels (High, Medium, Low).
2. **📅 Real-Time Slot Locking & Double-Booking Prevention:** Interactive visual slot selection (Green = Available, Yellow = Held for 5 mins, Red = Booked) enforced with server-side atomic conflict validation.
3. **⭐ Smart Patient Review Ecosystem:** Patients review completed consultations with 1-5 star ratings, automatically recalculating the doctor's average rating in MongoDB.
4. **📊 Role-Based Dashboards:** Dedicated workspaces for Patients (history & cancellation), Doctors (status workflow & slot schedule), and Administrators (approvals & platform volume).
5. **⚡ 1-Click Demo Login Tabs:** Dedicated demo tabs on the login screen for instantaneous presentation to college evaluators without manual typing.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | HTML5, Modern Vanilla CSS (Design System & Custom Properties), Vanilla JavaScript (ES6+), Google Fonts (Plus Jakarta Sans & Inter) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas / Local MongoDB, Mongoose ODM |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs password hashing |
| **Security** | Helmet HTTP security headers, CORS origin restriction, express-rate-limit |
| **Validation** | express-validator, custom date & slot conflict validators |
| **Testing** | Node test runner, Postman, Thunder Client (31 Automated Tests Passed) |
| **Deployment** | Render (Backend API), Vercel / Netlify / Render (Frontend) |

---

## 🏛️ MVC Architecture

DoctorP strictly implements the **Model-View-Controller (MVC)** architectural pattern:

```
                  ┌─────────────────────────────────────────┐
                  │                 BROWSER                 │
                  │   HTML5 / CSS3 / JavaScript (The Views) │
                  └────────────────────┬────────────────────┘
                                       │ HTTP / JSON
                                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS ROUTERS & MIDDLEWARE                    │
│   authRoutes.js   doctorRoutes.js   appointmentRoutes.js   adminRoutes.js │
│             ▲                        ▲                        ▲           │
│      authMiddleware           roleMiddleware           validateRequest    │
└──────────────────────────────────────┬────────────────────────────────────┘
                                       │ Delegated Request
                                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                CONTROLLERS                                │
│   authController  doctorController  appointmentController  adminController│
│   (Encapsulates business rules, conflict checks, status transitions)      │
└──────────────────────────────────────┬────────────────────────────────────┘
                                       │ Mongoose Queries
                                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                  MODELS                                   │
│   User.js     DoctorProfile.js     Appointment.js     Slot.js     Review  │
│   (Data schemas, compound unique indexes, password hashing, virtuals)     │
└──────────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ MONGODB ATLAS│
                                └──────────────┘
```

- **Models (`backend/models/`):** Define MongoDB schemas, validation rules, relationships (`ref`), and unique compound indexes to ensure data integrity and prevent duplicate slot bookings.
- **Views (`frontend/`):** Responsive, accessible HTML5 templates styled with modern CSS custom properties and driven by modular client-side JavaScript.
- **Controllers (`backend/controllers/`):** Contain all application business logic, validation rules, conflict checking, and database operations.
- **Routes (`backend/routes/`):** Map incoming HTTP verbs and URIs to controller functions without containing database queries.
- **Middleware (`backend/middleware/`):** Centralized JWT verification, role-based authorization (`patient`, `doctor`, `admin`), rate limiting, request validation, and global error handling.

---

## 📁 Repository Structure

```
doctorp/
├── frontend/                     # Frontend Client
│   ├── css/
│   │   └── style.css             # Healthcare Design System & Components
│   ├── js/
│   │   ├── config.js             # Dynamic API URL resolution
│   │   ├── api.js                # Unified API client & Toast system
│   │   ├── auth.js               # Auth state & route guards
│   │   ├── navbar.js             # Dynamic header & footer injector
│   │   ├── home.js               # Hero search, categories, AI symptom checker
│   │   ├── doctors.js            # Directory filtering & pagination
│   │   ├── doctor-details.js     # Live slots & booking modal
│   │   ├── login.js              # Login with 1-click demo tabs
│   │   ├── register.js           # Patient & doctor registration
│   │   ├── patient-dashboard.js  # Patient bookings & review modal
│   │   ├── doctor-dashboard.js   # Doctor appointments & slots
│   │   └── admin-dashboard.js    # Platform metrics & approvals
│   ├── index.html                # Home Landing Page
│   ├── doctors.html              # Find Doctors Directory
│   ├── doctor-details.html       # Doctor Profile & Slot Picker
│   ├── login.html                # User Sign In
│   ├── register.html             # User Registration
│   ├── patient-dashboard.html    # Patient Portal
│   ├── doctor-dashboard.html     # Doctor Workspace
│   ├── admin-dashboard.html      # Administrative Console
│   ├── my-appointments.html      # Quick Appointment Tracker
│   ├── .env.example
│   └── package.json
│
├── backend/                      # Backend REST API
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── models/
│   │   ├── User.js               # User accounts & auth
│   │   ├── DoctorProfile.js      # Doctor credentials & clinical data
│   │   ├── Appointment.js        # Scheduled appointments & status
│   │   ├── Slot.js               # Live slot locking & status
│   │   ├── Review.js             # Patient ratings & comments
│   │   └── Symptom.js            # AI symptom taxonomy
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── doctorController.js
│   │   ├── appointmentController.js
│   │   ├── patientController.js
│   │   ├── adminController.js
│   │   ├── symptomController.js
│   │   └── reviewController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── symptomRoutes.js
│   │   └── reviewRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT token verification
│   │   ├── roleMiddleware.js     # Role-based access control
│   │   ├── errorMiddleware.js    # Centralized 404 & error handler
│   │   └── validateRequest.js    # Request validation checker
│   ├── utils/
│   │   └── generateToken.js      # JWT generator
│   ├── scripts/
│   │   └── seedDoctors.js        # Realistic seed data script
│   ├── tests/
│   │   └── api.test.js           # Automated 31-point API test runner
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Server entry & port binding
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── docs/                         # Project Documentation
│   ├── API_DOCUMENTATION.md      # Complete REST API reference
│   ├── POSTMAN_TESTING.md        # Postman & Thunder Client testing guide
│   └── doctor_appointment.postman_collection.json # Postman v2.1 collection
│
├── .gitignore                    # Root gitignore
└── README.md                     # Project Master Guide
```

---

## ⚡ Local Installation & Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **MongoDB** (Local MongoDB Community Server running or a free MongoDB Atlas connection string)

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd doctorp
```

### 2. Configure Environment Variables
Inside `backend/`, copy the example file to `.env`:
```bash
cd backend
cp .env.example .env
```
Ensure your `backend/.env` contains:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/doctorp
JWT_SECRET=super_secret_jwt_doctor_appointment_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```
*(If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas SRV connection string).*

### 3. Install Dependencies
```bash
# In backend directory:
npm install
```

### 4. Seed the Database
Populate verified doctors across all specialties, AI symptoms, and demo accounts:
```bash
npm run seed
```

### 5. Run the Application
Start the backend server:
```bash
npm run dev
# Or production mode:
npm start
```
The server will output:
```
✅ MongoDB Connected: 127.0.0.1/doctorp
🚀 Server running in development mode on port 5000
🏥 Health Check: http://localhost:5000/api/health
🌐 Application UI: http://localhost:5000/
```
Open **[http://localhost:5000](http://localhost:5000)** in your web browser. The Express server serves both the REST API and the frontend application together!

---

## 🔑 Demo Login Credentials

For quick evaluation during college demos, use these accounts (or click the **1-Click Demo Buttons** on the sign-in page):

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| 👑 **Admin** | `admin@doctorp.com` | `Admin@123` | Full dashboard, doctor verification, all appointments |
| 👨‍⚕️ **Doctor** | `dr.sharma@doctorp.com` | `Doctor@123` | Accept/reject visits, slot scheduler, profile settings |
| 👤 **Patient** | `patient@doctorp.com` | `Patient@123` | Book slots, cancel visits, submit reviews |

---

## ☁️ MongoDB Atlas Cloud Setup

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new free **M0 Sandbox** cluster.
3. Under **Security → Database Access**, create a user (e.g. `doctorp_admin`) with password.
4. Under **Security → Network Access**, add IP address `0.0.0.0/0` (Allow access from anywhere) so Render can connect.
5. Under **Clusters → Connect → Drivers**, copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/doctorp?retryWrites=true&w=majority
   ```
6. Add this string as `MONGODB_URI` in your Render Environment Variables.

---

## 🚀 Deployment Guide

### Deploying Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add Environment Variables in the Render dashboard:
   - `PORT`: `5000` (or leave default, Render sets `PORT` automatically)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<Your MongoDB Atlas SRV URI>`
   - `JWT_SECRET`: `<Your secure random string>`
   - `CLIENT_URL`: `https://<your-frontend>.vercel.app`
5. Click **Deploy Web Service**. Verify `GET https://<your-render-url>.onrender.com/api/health` returns `200 OK`.

### Deploying Frontend to Vercel / Netlify
1. Create a new site on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Connect your GitHub repository.
3. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** *(Leave empty, static site)*
   - **Output Directory:** `.`
4. In `frontend/js/config.js`, set your deployed Render backend URL or inject `window.DOCTORP_API_URL = "https://<your-render-url>.onrender.com/api";`.
5. Deploy and verify seamless communication with your cloud API.

---

## 🧪 Testing Summary

To run all automated API tests:
```bash
cd backend
npm test
```
Result:
```
  ✅ PASS: Health endpoint returns 200 OK
  ✅ PASS: Patient registration returns 201 Created
  ✅ PASS: Login returns 200 OK & JWT
  ✅ PASS: Invalid credentials return 401 Unauthorized
  ✅ PASS: GET /doctors returns 200 OK
  ✅ PASS: Doctor ID matches requested ID
  ✅ PASS: GET /doctors/:id/availability returns 200 OK
  ✅ PASS: Booking returns 201 Created
  ✅ PASS: Duplicate booking returns 409 Conflict
  ✅ PASS: GET /appointments/my returns 200 OK
  ✅ PASS: Appointment cancellation returns 200 OK
  ✅ PASS: Patient forbidden on doctor endpoint returns 403
  ✅ PASS: Patient forbidden on admin dashboard returns 403
  ✅ PASS: Admin can access admin dashboard (200 OK)
  ✅ PASS: Symptom check returns 200 OK (Cardiology, High Urgency)
  ✅ PASS: Malformed input returns 400 Bad Request
──────────────────────────────────────────────────
📊 Test Summary: 31 PASSED, 0 FAILED
🎉 ALL API TESTS PASSED SUCCESSFULLY!
```

---

## 🔮 Future Enhancements
- Video Consultation integration using WebRTC / Daily.co.
- Automated SMS / Email appointment reminders using Twilio / SendGrid.
- Online payment gateway integration (Razorpay / Stripe) for consultation fees.
- Telemedicine electronic medical prescription (EHR) PDF generation.

---

## 📄 License
This project is developed as an academic capstone project. Feel free to reference and build upon it!
