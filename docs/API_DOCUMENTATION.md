# 🏥 DoctorP — Complete REST API Documentation

This document provides complete, production-grade technical specifications for all REST API endpoints implemented in the **DoctorP** Doctor Appointment Booking System.

---

## 📌 Base URL
- **Local Development:** `http://localhost:5000/api`
- **Production (Render):** `https://<your-render-app>.onrender.com/api`

---

## 🔐 Authentication & Headers
Protected endpoints require an `Authorization` header containing a valid JSON Web Token:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 📑 Endpoints Summary Table

| Category | Method | Endpoint | Access | Description |
|---|---|---|---|---|
| **Health** | `GET` | `/health` | Public | System uptime & health status |
| **Auth** | `POST` | `/auth/register` | Public | Register new patient or doctor |
| **Auth** | `POST` | `/auth/login` | Public | Authenticate user & get JWT |
| **Auth** | `GET` | `/auth/me` | Protected | Current user session & profile |
| **Auth** | `POST` | `/auth/logout` | Public | Invalidate / acknowledge logout |
| **Doctors** | `GET` | `/doctors` | Public | Search & filter doctors with pagination |
| **Doctors** | `GET` | `/doctors/:id` | Public | Doctor profile & patient reviews |
| **Doctors** | `GET` | `/doctors/:id/availability` | Public | Live available & locked time slots |
| **Doctors** | `POST` | `/doctors/slots/lock` | Protected | Hold slot for 5 mins during booking |
| **Doctors** | `PATCH` | `/doctors/profile` | Doctor | Update doctor clinical profile & fee |
| **Doctors** | `PUT` | `/doctors/availability` | Doctor | Configure consultation days & slots |
| **Appointments** | `POST` | `/appointments` | Protected | Book appointment (Conflict protected) |
| **Appointments** | `GET` | `/appointments/my` | Protected | Logged-in patient/doctor appointments |
| **Appointments** | `GET` | `/appointments/:id` | Protected | View single appointment details |
| **Appointments** | `PATCH` | `/appointments/:id/cancel` | Protected | Cancel scheduled appointment |
| **Appointments** | `PATCH` | `/appointments/:id/status` | Doctor/Admin | Confirm, complete, or reject booking |
| **Patients** | `GET` | `/patients/profile` | Patient | Get patient profile details |
| **Patients** | `PATCH` | `/patients/profile` | Patient | Update patient profile |
| **Patients** | `GET` | `/patients/stats` | Patient | Patient dashboard metrics |
| **Symptoms** | `POST` | `/symptoms/check` | Public | AI symptom evaluator & triage |
| **Reviews** | `POST` | `/reviews` | Patient | Review doctor after completed visit |
| **Reviews** | `GET` | `/reviews/doctor/:id` | Public | Get verified doctor reviews |
| **Payments** | `GET` | `/payments/config` | Public | Supported payment gateway config & modes |
| **Payments** | `POST` | `/payments/create-order` | Protected | Create order & transaction intent |
| **Payments** | `POST` | `/payments/process` | Protected | Process payment (UPI, Card, Net Banking, Clinic) |
| **Payments** | `POST` | `/payments/verify` | Protected | Signature verification & status update |
| **Payments** | `GET` | `/payments/my` | Protected | User payment history & receipts |
| **Payments** | `GET` | `/payments/:id` | Protected | Single payment receipt details |
| **Payments** | `POST` | `/payments/:id/refund` | Doctor/Admin | Process refund on cancellation |
| **Telehealth** | `POST` | `/telehealth/signal` | Public | Store WebRTC offer/answer/ICE candidate |
| **Telehealth** | `GET` | `/telehealth/signal/:appointmentId` | Public | Poll active WebRTC peer signals |
| **Telehealth** | `DELETE` | `/telehealth/signal/:appointmentId` | Public | Clear signaling session on call end |
| **Admin** | `GET` | `/admin/dashboard` | Admin | Total platform statistics & volume |
| **Admin** | `GET` | `/admin/doctors` | Admin | Review all registered doctors |
| **Admin** | `PATCH` | `/admin/doctors/:id/approval`| Admin | Approve / reject doctor registration |
| **Admin** | `GET` | `/admin/patients` | Admin | Directory of registered patients |
| **Admin** | `GET` | `/admin/appointments` | Admin | Global appointment registry |

---

## 🔍 Detailed Endpoint Specifications

### 1. Health Endpoint
- **Method:** `GET`
- **Endpoint:** `/health`
- **Access:** Public
- **Headers:** None
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "status": "ok",
  "service": "Doctor Appointment API",
  "uptime": "120s",
  "timestamp": "2026-10-25T12:00:00.000Z",
  "environment": "development"
}
```

---

### 2. Patient Registration
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul.sharma@example.com",
  "password": "Password@123",
  "role": "patient",
  "phone": "+91 98765 43210",
  "gender": "Male",
  "age": 28
}
```
- **Expected Status:** `201 Created`
- **Response:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "_id": "671...",
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "role": "patient",
    "phone": "+91 98765 43210"
  }
}
```

---

### 3. User Login
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "patient@doctorp.com",
  "password": "Patient@123"
}
```
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "_id": "671...",
    "name": "Rahul Sharma",
    "email": "patient@doctorp.com",
    "role": "patient"
  }
}
```

---

### 4. Invalid Credentials Test
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Request Body:**
```json
{
  "email": "patient@doctorp.com",
  "password": "WrongPassword"
}
```
- **Expected Status:** `401 Unauthorized`
- **Response:**
```json
{
  "success": false,
  "message": "Invalid email or password credentials."
}
```

---

### 5. Fetch Doctors List
- **Method:** `GET`
- **Endpoint:** `/doctors?specialty=Cardiology&sortBy=rating&page=1&limit=10`
- **Access:** Public
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "total": 2,
  "page": 1,
  "pages": 1,
  "doctors": [
    {
      "_id": "6adda0afa603247e6ff3548d",
      "name": "Dr. Rajesh Sharma",
      "specialization": "Cardiology",
      "qualifications": ["MBBS", "MD", "DM"],
      "experience": 16,
      "consultationFee": 800,
      "rating": 4.9,
      "totalReviews": 38,
      "clinicName": "Heart Care Institute",
      "location": { "city": "New Delhi" }
    }
  ]
}
```

---

### 6. Doctor Availability & Slots
- **Method:** `GET`
- **Endpoint:** `/doctors/:id/availability?date=2026-10-30`
- **Access:** Public
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "doctorId": "6adda0afa603247e6ff3548d",
  "date": "2026-10-30",
  "availableDays": ["Monday", "Tuesday", "Wednesday"],
  "slots": [
    { "time": "09:00", "status": "available", "available": true },
    { "time": "10:00", "status": "booked", "available": false },
    { "time": "11:00", "status": "locked", "available": false, "lockedUntil": "2026-10-25T12:05:00.000Z" }
  ]
}
```

---

### 7. Book Appointment (With Conflict Protection)
- **Method:** `POST`
- **Endpoint:** `/appointments`
- **Access:** Protected (`Bearer <patientToken>`)
- **Request Body:**
```json
{
  "doctorId": "6adda0afa603247e6ff3548d",
  "appointmentDate": "2026-10-30",
  "startTime": "11:00",
  "reason": "Cardiovascular consultation"
}
```
- **Expected Status:** `201 Created`
- **Response:**
```json
{
  "success": true,
  "message": "Appointment booked successfully!",
  "appointment": {
    "_id": "671...",
    "appointmentId": "APT-20261025-4819",
    "doctorId": "6adda0afa603247e6ff3548d",
    "appointmentDate": "2026-10-30",
    "startTime": "11:00",
    "endTime": "11:30",
    "status": "pending",
    "fee": 800
  }
}
```

---

### 8. Double Booking Prevention Test
- **Method:** `POST`
- **Endpoint:** `/appointments`
- **Request Body:** Same doctor, same date, same time slot
- **Expected Status:** `409 Conflict`
- **Response:**
```json
{
  "success": false,
  "message": "Conflict: This appointment time slot has already been booked. Please choose another slot."
}
```

---

### 9. Cancel Appointment
- **Method:** `PATCH`
- **Endpoint:** `/appointments/:id/cancel`
- **Access:** Protected
- **Request Body:**
```json
{
  "reason": "Family emergency"
}
```
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully.",
  "appointment": {
    "_id": "671...",
    "status": "cancelled"
  }
}
```

---

### 10. Role Authorization Enforcements
- **Test:** Patient token used on `PATCH /doctors/profile`
- **Expected Status:** `403 Forbidden`
- **Response:**
```json
{
  "success": false,
  "message": "Forbidden: User role 'patient' is not authorized to access this resource. Required: [doctor]"
}
```

- **Test:** Patient token used on `GET /admin/dashboard`
- **Expected Status:** `403 Forbidden`
```json
{
  "success": false,
  "message": "Forbidden: User role 'patient' is not authorized to access this resource. Required: [admin]"
}
```

---

### 11. AI Symptom Checker
- **Method:** `POST`
- **Endpoint:** `/symptoms/check`
- **Access:** Public
- **Request Body:**
```json
{
  "text": "I have severe chest pain and heart palpitations"
}
```
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "recommendation": {
    "specialty": "Cardiology",
    "description": "Your symptoms might indicate cardiac strain or vascular hypertension. We strongly recommend consulting a Cardiologist promptly.",
    "urgency": "high",
    "color": "#DC2626"
  },
  "suggestedDoctors": [...]
}
```

---

### 12. Payment Gateway & Transaction APIs

#### 12.1 Gateway Public Config
- **Method:** `GET`
- **Endpoint:** `/payments/config`
- **Access:** Public
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "config": {
    "provider": "razorpay_simulator",
    "currency": "INR",
    "methods": ["UPI / QR", "Credit/Debit Card", "Net Banking", "Pay at Clinic"],
    "supportedUpiApps": ["GooglePay", "PhonePe", "Paytm", "BHIM", "Cred"]
  }
}
```

#### 12.2 Create Payment Order
- **Method:** `POST`
- **Endpoint:** `/payments/create-order`
- **Access:** Protected (`Bearer <token>`)
- **Request Body:**
```json
{
  "amount": 600,
  "doctorId": "6ae1b9f49d59257264d32b0c",
  "currency": "INR",
  "notes": "Consultation booking"
}
```
- **Expected Status:** `201 Created`
- **Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "ORD-1730294800000-8421",
    "amount": 600,
    "currency": "INR",
    "paymentId": "6ae...",
    "status": "pending"
  }
}
```

#### 12.3 Process Payment (Authorize & Execute)
- **Method:** `POST`
- **Endpoint:** `/payments/process`
- **Access:** Protected (`Bearer <token>`)
- **Request Body:**
```json
{
  "orderId": "ORD-1730294800000-8421",
  "doctorId": "6ae1b9f49d59257264d32b0c",
  "amount": 600,
  "paymentMethod": "UPI / QR",
  "paymentDetails": {
    "upiId": "rahul.sharma@okhdfcbank"
  }
}
```
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "Payment captured and receipt issued successfully",
  "payment": {
    "orderId": "ORD-1730294800000-8421",
    "transactionId": "TXN-M7G9K2-8492",
    "receiptNumber": "REC-M7G9K2",
    "amount": 600,
    "currency": "INR",
    "paymentMethod": "UPI / QR",
    "status": "paid"
  }
}
```

#### 12.4 User Payment History & Receipts
- **Method:** `GET`
- **Endpoint:** `/payments/my`
- **Access:** Protected (`Bearer <token>`)
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "count": 3,
  "payments": [
    {
      "orderId": "ORD-1730294800000-8421",
      "transactionId": "TXN-M7G9K2-8492",
      "receiptNumber": "REC-M7G9K2",
      "amount": 600,
      "paymentMethod": "UPI / QR",
      "status": "paid",
      "createdAt": "2026-10-30T10:00:00.000Z"
    }
  ]
}
```

---

### 13. Real-Time Telehealth Video Signaling APIs

#### 13.1 Send WebRTC Signal (Offer / Answer / ICE)
- **Method:** `POST`
- **Endpoint:** `/telehealth/signal`
- **Access:** Public / Session
- **Request Body:**
```json
{
  "appointmentId": "APT-20261030-0012",
  "type": "offer",
  "fromRole": "patient",
  "sdp": "v=0\r\no=..."
}
```
- **Expected Status:** `200 OK`

#### 13.2 Poll Signaling Queue for Session
- **Method:** `GET`
- **Endpoint:** `/telehealth/signal/:appointmentId?since=1730294800000`
- **Access:** Public / Session
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "signals": [
    {
      "sigId": "1730294805000-abc12",
      "appointmentId": "APT-20261030-0012",
      "type": "answer",
      "fromRole": "doctor",
      "sdp": "v=0...",
      "serverTime": 1730294805000
    }
  ]
}
```

