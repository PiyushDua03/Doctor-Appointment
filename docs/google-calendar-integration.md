# Google Calendar Integration — Phase 3B

## Architecture

```
POST /api/appointments
        ↓
  Scheduling Engine (SOURCE OF TRUTH)
    ↓ Doctor exists?
    ↓ Doctor available?
    ↓ Doctor conflict?
    ↓ Room assigned?
    ↓ Room conflict?
        ↓
  VALID → MongoDB Save
        ↓
  Google Calendar Event (downstream consumer)
        ↓
  Store eventId + syncStatus
        ↓
  Return appointment + calendar status
```

**Critical rule**: Google Calendar is a downstream consumer. It NEVER decides whether an appointment can be booked. The scheduling engine validates first, MongoDB saves the appointment, and only then does Google Calendar receive the event.

---

## Authentication Approach

The integration uses **OAuth2 with a pre-authorized refresh token**.

### How it works

1. A Google Cloud project is created with the Calendar API enabled.
2. OAuth2 credentials (client ID + client secret) are generated.
3. A one-time authorization flow generates a refresh token granting calendar access.
4. The server uses the refresh token to obtain access tokens automatically — no user consent flow at runtime.

### Why this approach

- **Simple**: No service account setup, no domain-wide delegation.
- **Secure**: All credentials stay on the server.
- **Appropriate**: Suitable for a clinic application where one Google Calendar is used for all appointments.

### What the browser NEVER receives

- Google client secret
- Refresh token
- Access token
- Any Google API credentials

---

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | OAuth2 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret (NEVER expose to browser) |
| `GOOGLE_REDIRECT_URI` | OAuth2 redirect URI (e.g., `http://localhost:5000/api/auth/google/callback`) |
| `GOOGLE_REFRESH_TOKEN` | Pre-authorized refresh token for calendar access |
| `GOOGLE_CALENDAR_ID` | Calendar ID to create events in (default: `primary`) |
| `CLINIC_TIMEZONE` | Timezone for calendar events (e.g., `Asia/Kolkata`) |

All values are set in `server/.env` (gitignored). The `.env.example` template documents the required keys without real values.

---

## Calendar Event Structure

When an appointment is created, a Google Calendar event is built with:

```javascript
{
  summary: "Doctor Appointment — Dr. Sharma",
  description: "Patient: Rahul Sharma\nSpecialty: Cardiology\nDoctor: Dr. Sharma\nRoom: Room 101\nDuration: 30 minutes",
  start: {
    dateTime: "2026-08-21T10:00:00",
    timeZone: "Asia/Kolkata"
  },
  end: {
    dateTime: "2026-08-21T10:30:00",
    timeZone: "Asia/Kolkata"
  },
  reminders: {
    useDefault: false,
    overrides: [{ method: "popup", minutes: 30 }]
  }
}
```

---

## Timezone Handling

The `CLINIC_TIMEZONE` environment variable (default: `Asia/Kolkata`) is passed directly to the Google Calendar API as the `timeZone` property on both `start` and `end`.

This means:
- Application shows: `21 Aug 2026, 10:00–10:30`
- Google Calendar shows: `21 Aug 2026, 10:00–10:30 IST`

No UTC conversion happens. The Google Calendar API handles the timezone correctly when `timeZone` is explicitly specified.

---

## Synchronization Flow

### Success path

```
Appointment saved to MongoDB (calendarSyncStatus = 'pending')
        ↓
createCalendarEvent() called
        ↓
Google Calendar API returns event.id
        ↓
appointment.googleCalendarEventId = event.id
appointment.calendarSyncStatus = 'synced'
        ↓
API response:
  { calendar: { synced: true, status: 'synced' } }
```

### Not configured path

```
Google Calendar credentials not set in .env
        ↓
isConfigured() returns false
        ↓
appointment.calendarSyncStatus = 'not_configured'
        ↓
API response:
  { calendar: { synced: false, status: 'not_configured',
    message: 'Google Calendar is not configured.' } }
```

### Failure path

```
Appointment saved to MongoDB
        ↓
Google Calendar API call fails (network, auth, quota)
        ↓
appointment.calendarSyncStatus = 'failed'
        ↓
API response:
  { calendar: { synced: false, status: 'failed',
    message: 'Appointment booked, but calendar synchronization failed.' } }
```

---

## Failure Handling

**The appointment is NEVER rolled back if Google Calendar fails.**

The scheduling engine's validation is the source of truth. If a valid appointment passes all checks and is saved to MongoDB, it remains valid regardless of Google Calendar's status.

The `calendarSyncStatus` field tracks the sync state:

| Status | Meaning |
|--------|---------|
| `pending` | Initial state (before sync attempt) |
| `synced` | Successfully created Google Calendar event |
| `failed` | Google Calendar API call failed |
| `not_configured` | Google Calendar credentials not set |

The `googleCalendarEventId` field stores the event ID from Google for future reference (update/delete operations).

---

## Duplicate Prevention

Duplicate appointments are prevented by the scheduling engine's conflict detection — NOT by Google Calendar:

1. Patient submits booking request.
2. Scheduling engine checks for doctor conflicts (`newStart < existingEnd && newEnd > existingStart`).
3. If a matching appointment already exists → **409 Conflict** returned, NO calendar event created.
4. Only if the appointment passes all validation does it get saved and synced to Calendar.

This means retrying a successful booking always results in a 409 conflict, never a duplicate calendar event.

---

## Testing Procedure

### Without Google Calendar credentials

1. Start MongoDB: `brew services start mongodb-community`
2. Seed database: `cd server && node utils/seed.js`
3. Start server: `node server.js`
4. Run tests: `TEST_URL=http://localhost:5050 node utils/testApi.js`

All tests pass. Calendar tests verify that `calendarSyncStatus = 'not_configured'` and that appointments are still created successfully.

### With Google Calendar credentials

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Create **OAuth 2.0 credentials** (Web application)
4. Set redirect URI to `http://localhost:5000/api/auth/google/callback`
5. Generate a refresh token using the OAuth Playground or a one-time script
6. Add credentials to `server/.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   GOOGLE_CALENDAR_ID=primary
   ```
7. Restart server and book an appointment
8. Verify the event appears in Google Calendar

---

## Files

| File | Change |
|------|--------|
| `server/services/googleCalendarService.js` | **NEW** — Google Calendar service |
| `server/models/Appointment.js` | **MODIFIED** — added `googleCalendarEventId` + `calendarSyncStatus` |
| `server/services/appointmentService.js` | **MODIFIED** — added calendar sync after MongoDB save |
| `server/controllers/appointmentController.js` | **MODIFIED** — added `calendar` field to response |
| `server/config/env.js` | **MODIFIED** — added Google Calendar config values |
| `server/.env.example` | **MODIFIED** — added Google Calendar variable names |
| `server/utils/testApi.js` | **MODIFIED** — added 6 calendar integration tests |
