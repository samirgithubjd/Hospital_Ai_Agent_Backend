# All API URLs - Quick Reference

## 🔐 Authentication APIs

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/register` | Register new user (admin/doctor/patient) |
| POST | `/api/auth/login` | Login user |

---

## 📅 Appointment APIs

### General
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/appointments` | Get all appointments (backward compatible) |
| GET | `/api/appointments/:id` | Get appointment details by ID |
| PUT | `/api/appointments/:id` | Update appointment (doctor/admin) |
| PUT | `/api/appointments/:id/cancel` | Cancel appointment |
| PUT | `/api/appointments/:id/reschedule` | Reschedule appointment |

### Patient Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/appointments/patient/book` | Book new appointment (patient only) |
| GET | `/api/appointments/patient/my-appointments` | View my appointments (patient) |
| GET | `/api/appointments/patient/stats` | Patient dashboard statistics |

### Doctor Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/appointments/doctor/my-appointments` | View my appointments (doctor) |
| GET | `/api/appointments/doctor/stats` | Doctor dashboard statistics |

### Admin Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/appointments/admin/all` | View all appointments (admin only) |
| GET | `/api/appointments/admin/stats` | Admin dashboard statistics |

---

## 📞 Call APIs

### General Calls
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/calls` | Get all calls with pagination & filters |
| GET | `/api/calls/:id` | Get call by ID |
| GET | `/api/calls/:id/status` | Get call status |
| GET | `/api/calls/:id/details` | Get detailed call information |
| POST | `/api/calls/initiate` | Initiate outbound call |

### Webhook (From VAPI)
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/calls/webhook/incoming` | Handle incoming call from VAPI (no auth needed) |

### Call to Appointment
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/calls/:callId/book-appointment` | Book appointment from call (doctor/admin) |
| PUT | `/api/calls/:id/appointment` | Update call with appointment info (doctor/admin) |

---

## 🏥 Health Check

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/health` | Server health check (public) |

---

## 📋 Complete API Listing by Base URL

### Base URL: `http://localhost:5000`

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/health

GET    /api/appointments
POST   /api/appointments/patient/book
GET    /api/appointments/patient/my-appointments
GET    /api/appointments/patient/stats
GET    /api/appointments/doctor/my-appointments
GET    /api/appointments/doctor/stats
GET    /api/appointments/admin/all
GET    /api/appointments/admin/stats
GET    /api/appointments/:id
PUT    /api/appointments/:id
PUT    /api/appointments/:id/cancel
PUT    /api/appointments/:id/reschedule

GET    /api/calls
POST   /api/calls/initiate
POST   /api/calls/webhook/incoming
GET    /api/calls/:id
GET    /api/calls/:id/status
GET    /api/calls/:id/details
POST   /api/calls/:callId/book-appointment
PUT    /api/calls/:id/appointment
```

---

## 🔑 Authentication Required

All endpoints EXCEPT the following require `Authorization: Bearer <token>` header:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`
- `POST /api/calls/webhook/incoming` (webhook from VAPI)

---

## 🎯 Common Use Cases with URLs

### Patient Journey

**1. Register as Patient**
```
POST /api/auth/register
```

**2. Login**
```
POST /api/auth/login
```

**3. View Available Doctors** (you need to create this endpoint)
```
GET /api/doctors  [TO BE CREATED]
```

**4. Book Appointment**
```
POST /api/appointments/patient/book
```

**5. View My Appointments**
```
GET /api/appointments/patient/my-appointments
```

**6. Get Dashboard Stats**
```
GET /api/appointments/patient/stats
```

**7. Reschedule Appointment**
```
PUT /api/appointments/:id/reschedule
```

**8. Cancel Appointment**
```
PUT /api/appointments/:id/cancel
```

---

### Doctor Journey

**1. Register as Doctor**
```
POST /api/auth/register
```
(Status: isActive = false, awaiting admin approval)

**2. Login**
```
POST /api/auth/login
```

**3. View My Appointments**
```
GET /api/appointments/doctor/my-appointments
```

**4. Get Dashboard Stats**
```
GET /api/appointments/doctor/stats
```

**5. Add Diagnosis to Appointment**
```
PUT /api/appointments/:id
```

**6. Get Call Details**
```
GET /api/calls/:id/details
```

**7. Book Appointment from Call**
```
POST /api/calls/:callId/book-appointment
```

---

### Admin Journey

**1. Login as Admin**
```
POST /api/auth/login
```

**2. View Pending Doctor Approvals** (to be created)
```
GET /api/admin/doctors/pending  [TO BE CREATED]
```

**3. Approve Doctor** (to be created)
```
PUT /api/admin/doctors/:doctorId/approve  [TO BE CREATED]
```

**4. View All Appointments**
```
GET /api/appointments/admin/all
```

**5. Get Admin Dashboard Stats**
```
GET /api/appointments/admin/stats
```

**6. View All Calls**
```
GET /api/calls
```

**7. Get Call Details**
```
GET /api/calls/:id/details
```

**8. Cancel Appointment**
```
PUT /api/appointments/:id/cancel
```

**9. Force Reschedule Appointment** (to be created)
```
PUT /api/admin/appointments/:id/force-reschedule  [TO BE CREATED]
```

---

### Incoming Call Journey

**1. VAPI Sends Incoming Call** (webhook)
```
POST /api/calls/webhook/incoming
```

**2. Get Call Details**
```
GET /api/calls/:id/details
```

**3. Book Appointment from Call**
```
POST /api/calls/:callId/book-appointment
```

**4. Update Call with Appointment Info**
```
PUT /api/calls/:id/appointment
```

---

## 📊 Query Parameters

### Appointments Filter
```
GET /api/appointments/admin/all?page=1&limit=10&status=scheduled&doctorId=doctor_id&startDate=2026-03-01&endDate=2026-03-31
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status (scheduled, confirmed, completed, cancelled, etc.)
- `doctorId` - Filter by doctor
- `patientId` - Filter by patient
- `startDate` - Filter from date (ISO format)
- `endDate` - Filter to date (ISO format)

### Calls Filter
```
GET /api/calls?page=1&limit=10&status=completed&appointmentBooked=true&emergency=false
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Call status (initiated, connected, completed, missed, failed)
- `appointmentBooked` - Boolean (true/false)
- `emergency` - Boolean (true/false)

### Patient Appointments Filter
```
GET /api/appointments/patient/my-appointments?page=1&limit=10&status=scheduled
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status

### Doctor Appointments Filter
```
GET /api/appointments/doctor/my-appointments?page=1&limit=10&status=scheduled&startDate=2026-03-01
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status
- `startDate` - Filter from date
- `endDate` - Filter to date

---

## 📝 Request/Response Examples

### Example: Register Patient
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "john_patient",
    "password": "Password123",
    "confirmPassword": "Password123",
    "role": "patient",
    "firstName": "John",
    "lastName": "Doe",
    "age": 45,
    "phone": "+1234567890"
  }'
```

### Example: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

### Example: Book Appointment
```bash
curl -X POST http://localhost:5000/api/appointments/patient/book \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doctor_id_here",
    "appointmentDate": "2026-03-25T10:00:00Z",
    "appointmentTime": "10:00 AM",
    "symptoms": "Chest pain"
  }'
```

### Example: Get My Appointments
```bash
curl -X GET "http://localhost:5000/api/appointments/patient/my-appointments?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example: Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/appointments/patient/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example: Handle Incoming Call (Webhook)
```bash
curl -X POST http://localhost:5000/api/calls/webhook/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "patientName": "John Doe",
    "callId": "vapi_call_123",
    "symptoms": "Severe headache"
  }'
```

---

## ✨ Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - No/invalid token |
| 403 | Forbidden - Access denied (wrong role) |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate (email/username) |
| 500 | Server Error |

---

## 🔄 Role-Based Access Control

### Public Endpoints (No Auth Required)
```
POST /api/auth/register
POST /api/auth/login
GET  /api/health
POST /api/calls/webhook/incoming
```

### Patient-Only Endpoints
```
POST /api/appointments/patient/book
GET  /api/appointments/patient/my-appointments
GET  /api/appointments/patient/stats
```

### Doctor-Only Endpoints
```
GET /api/appointments/doctor/my-appointments
GET /api/appointments/doctor/stats
```

### Doctor & Admin Endpoints
```
POST /api/calls/:callId/book-appointment
PUT  /api/calls/:id/appointment
PUT  /api/appointments/:id (update diagnosis)
```

### Admin-Only Endpoints
```
GET /api/appointments/admin/all
GET /api/appointments/admin/stats
```

### All Authenticated Users
```
GET  /api/appointments
GET  /api/appointments/:id
PUT  /api/appointments/:id/cancel
PUT  /api/appointments/:id/reschedule
GET  /api/calls
POST /api/calls/initiate
GET  /api/calls/:id
GET  /api/calls/:id/status
GET  /api/calls/:id/details
```

---

## 🚀 Environment Configuration

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hospital_ai_agent
JWT_SECRET=your_secret_key_here
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER=+1-914-465-1284
VAPI_AREA_CODE=415
```

---

## 📚 Additional Features to Implement

The following endpoints are suggested but not yet implemented. Create them for better functionality:

```
GET    /api/doctors                           - List all active doctors
GET    /api/doctors/:id                       - Get doctor details
GET    /api/admin/doctors                     - List all doctors (admin)
GET    /api/admin/doctors/pending             - List pending approvals
PUT    /api/admin/doctors/:id/approve         - Approve doctor
PUT    /api/admin/doctors/:id/deactivate      - Deactivate doctor
PUT    /api/admin/doctors/:id                 - Update doctor info

GET    /api/admin/patients                    - List all patients (admin)
GET    /api/admin/patients/:id                - Get patient details (admin)

PUT    /api/admin/appointments/:id/force-reschedule - Force reschedule (admin)
PUT    /api/admin/appointments/:id/reassign-doctor  - Reassign doctor (admin)

POST   /api/admin/appointments/:id/send-reminder    - Send reminder

GET    /api/notifications                     - Get user notifications
POST   /api/notifications/mark-read           - Mark notification as read

GET    /api/reports                           - Generate reports
GET    /api/audit-logs                        - View audit logs
```

---

## 💡 Tips for Frontend Implementation

1. **Always include Authorization header** with Bearer token
2. **Handle 401 responses** - Redirect to login when token expires
3. **Show loading states** during API calls
4. **Display error messages** from the API response
5. **Use pagination** for lists (page, limit parameters)
6. **Store token** in secure storage (localStorage or secure cookie)
7. **Parse dates** properly for appointment display
8. **Display user role** in UI based on login response

---

## 📞 Call Flow Integration

```
Patient Calls → VAPI Routes to Backend
                      ↓
        POST /api/calls/webhook/incoming
                      ↓
             Call Recorded in DB
                      ↓
        Doctor/Admin Reviews Call
                      ↓
    POST /api/calls/:callId/book-appointment
                      ↓
         Appointment Created
                      ↓
    Patient/Doctor Receives Notification
                      ↓
   Patient Confirms Appointment
```

---

For detailed documentation, see:
- [COMPLETE_API_ENDPOINTS.md](COMPLETE_API_ENDPOINTS.md) - Full endpoint details
- [ADMIN_FEATURES.md](ADMIN_FEATURES.md) - Admin-specific features
- [FRONTEND_IMPLEMENTATION_GUIDE.md](FRONTEND_IMPLEMENTATION_GUIDE.md) - Frontend guide
