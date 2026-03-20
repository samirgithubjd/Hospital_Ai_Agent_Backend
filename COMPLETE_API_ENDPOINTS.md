# Complete API Endpoints Documentation

## 📋 Authentication Endpoints

### Register User (All Roles)
```bash
POST /api/auth/register
Content-Type: application/json

# Admin Registration
{
  "email": "admin@hospital.com",
  "username": "admin_user",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "admin",
  "firstName": "John",
  "lastName": "Admin"
}

# Doctor Registration
{
  "email": "doctor@hospital.com",
  "username": "dr_smith",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "doctor",
  "firstName": "Dr.",
  "lastName": "Smith",
  "phone": "+1234567890",
  "specialization": "Cardiology",
  "department": "Cardiology",
  "licenseNumber": "LIC123456789"
}

# Patient Registration
{
  "email": "patient@example.com",
  "username": "patient_john",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "patient",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "age": 45,
  "medicalHistory": "No known allergies"
}

Response:
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "email": "patient@example.com",
      "username": "patient_john",
      "role": "patient",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

### Login (All Roles)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_id",
      "email": "patient@example.com",
      "username": "patient_john",
      "role": "patient",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    }
  }
}
```

---

## 📅 Appointment Endpoints

### Patient: Book an Appointment
```bash
POST /api/appointments/patient/book
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctorId": "doctor_id",
  "appointmentDate": "2026-03-25T10:00:00Z",
  "appointmentTime": "10:00 AM",
  "symptoms": "Chest pain and shortness of breath",
  "duration": 30,
  "isEmergency": false
}

Response:
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "_id": "appointment_id",
    "patientId": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "patient@example.com",
      "username": "patient_john"
    },
    "doctorId": {
      "firstName": "Dr.",
      "lastName": "Smith",
      "specialization": "Cardiology",
      "department": "Cardiology"
    },
    "appointmentDate": "2026-03-25T10:00:00.000Z",
    "appointmentTime": "10:00 AM",
    "symptoms": "Chest pain and shortness of breath",
    "status": "scheduled",
    "priority": "medium",
    "createdAt": "2026-03-20T12:00:00.000Z"
  }
}
```

### Patient: View My Appointments
```bash
GET /api/appointments/patient/my-appointments?page=1&limit=10&status=scheduled
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Your appointments retrieved",
  "data": [
    {
      "_id": "appointment_id",
      "doctorId": {
        "firstName": "Dr.",
        "lastName": "Smith",
        "specialization": "Cardiology",
        "department": "Cardiology",
        "email": "doctor@hospital.com"
      },
      "appointmentDate": "2026-03-25T10:00:00.000Z",
      "appointmentTime": "10:00 AM",
      "symptoms": "Chest pain",
      "diagnosis": "Stable angina",
      "status": "scheduled",
      "priority": "medium"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### Patient: Cancel Appointment
```bash
PUT /api/appointments/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Schedule conflict",
  "cancelledBy": "patient"
}

Response:
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "_id": "appointment_id",
    "status": "cancelled",
    "cancellationReason": "Schedule conflict",
    "cancelledBy": "patient"
  }
}
```

### Patient: Reschedule Appointment
```bash
PUT /api/appointments/:id/reschedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "newDate": "2026-03-26T10:00:00Z",
  "newTime": "10:00 AM"
}

Response:
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "data": {
    "_id": "appointment_id",
    "appointmentDate": "2026-03-26T10:00:00.000Z",
    "appointmentTime": "10:00 AM",
    "status": "rescheduled",
    "rescheduleCount": 1
  }
}
```

### Patient: Dashboard Stats
```bash
GET /api/appointments/patient/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "myAppointments": 5,
    "upcomingAppointments": 3,
    "completedAppointments": 2,
    "cancelledAppointments": 0
  }
}
```

### Doctor: View My Appointments
```bash
GET /api/appointments/doctor/my-appointments?page=1&limit=10&status=scheduled
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Your appointments retrieved",
  "data": [
    {
      "_id": "appointment_id",
      "patientId": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "patient@example.com",
        "phone": "+1234567890",
        "age": 45
      },
      "appointmentDate": "2026-03-25T10:00:00.000Z",
      "appointmentTime": "10:00 AM",
      "symptoms": "Chest pain",
      "status": "scheduled",
      "priority": "medium"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

### Doctor: Update Appointment (After Consultation)
```bash
PUT /api/appointments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "diagnosis": "Stable angina",
  "prescriptions": "Aspirin 100mg daily, Beta-blocker",
  "notes": "Patient advised to exercise regularly and reduce stress",
  "status": "completed"
}

Response:
{
  "success": true,
  "message": "Appointment updated successfully",
  "data": {
    "_id": "appointment_id",
    "diagnosis": "Stable angina",
    "prescriptions": "Aspirin 100mg daily, Beta-blocker",
    "notes": "Patient advised to exercise...",
    "status": "completed",
    "completedAt": "2026-03-20T12:30:00.000Z"
  }
}
```

### Doctor: Dashboard Stats
```bash
GET /api/appointments/doctor/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "myAppointments": 12,
    "todayAppointments": 3,
    "completedAppointments": 8,
    "cancelledAppointments": 1,
    "upcomingAppointments": 3
  }
}
```

### Admin: View All Appointments
```bash
GET /api/appointments/admin/all?page=1&limit=20&status=scheduled&doctorId=doctor_id&startDate=2026-03-01
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Appointments retrieved",
  "data": [
    {
      "_id": "appointment_id",
      "patientId": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "patient@example.com"
      },
      "doctorId": {
        "firstName": "Dr.",
        "lastName": "Smith",
        "specialization": "Cardiology"
      },
      "appointmentDate": "2026-03-25T10:00:00.000Z",
      "status": "scheduled",
      "priority": "medium"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### Admin: Dashboard Stats
```bash
GET /api/appointments/admin/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "totalAppointments": 156,
    "scheduledAppointments": 45,
    "completedAppointments": 98,
    "cancelledAppointments": 13,
    "emergencyAppointments": 8,
    "totalDoctors": 12,
    "inactiveDoctors": 2,
    "totalPatients": 234,
    "totalCalls": 567,
    "emergencyCalls": 15
  }
}
```

---

## 📞 Call Management Endpoints

### Receive Incoming Call (Webhook)
```bash
POST /api/calls/webhook/incoming
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "patientName": "John Doe",
  "callId": "vapi_call_id_123",
  "symptoms": "Severe headache and fever",
  "message": "Patient called for consultation",
  "vapiCallData": {
    // Full VAPI call data
  }
}

Response:
{
  "success": true,
  "message": "Incoming call recorded",
  "data": {
    "callId": "call_id",
    "patientId": "patient_id or null",
    "phoneNumber": "+1234567890",
    "patientName": "John Doe",
    "status": "connected",
    "timestamp": "2026-03-20T12:00:00.000Z"
  }
}
```

### Initiate Outbound Call
```bash
POST /api/calls/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "message": "Hello, this is a reminder about your appointment tomorrow"
}

Response:
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "callId": "call_id",
    "vapiCallId": "vapi_call_id",
    "phoneNumber": "+1234567890",
    "status": "initiated"
  }
}
```

### Book Appointment from Call
```bash
POST /api/calls/:callId/book-appointment
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "patient_id",
  "doctorId": "doctor_id",
  "appointmentDate": "2026-03-25T10:00:00Z",
  "appointmentTime": "10:00 AM",
  "symptoms": "Severe headache and fever",
  "diagnosis": "Possible viral infection"
}

Response:
{
  "success": true,
  "message": "Appointment booked successfully from call",
  "data": {
    "appointment": {
      "_id": "appointment_id",
      "patientId": { ... },
      "doctorId": { ... },
      "appointmentDate": "2026-03-25T10:00:00.000Z",
      "status": "scheduled"
    },
    "call": {
      "callId": "call_id",
      "appointmentBooked": true,
      "status": "completed"
    }
  }
}
```

### Get Call Details
```bash
GET /api/calls/:id/details
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Call details retrieved",
  "data": {
    "_id": "call_id",
    "patientId": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "patient@example.com",
      "phone": "+1234567890",
      "age": 45
    },
    "phoneNumber": "+1234567890",
    "patientName": "John Doe",
    "callStatus": "completed",
    "callType": "inbound",
    "duration": 300,
    "symptoms": "Severe headache",
    "emergencyLevel": "medium",
    "isEmergency": false,
    "appointmentBooked": true,
    "appointmentId": "appointment_id",
    "transcript": "Call transcript here...",
    "startTime": "2026-03-20T12:00:00.000Z",
    "endTime": "2026-03-20T12:05:00.000Z"
  }
}
```

### Update Call with Appointment Info
```bash
PUT /api/calls/:id/appointment
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointmentId": "appointment_id",
  "suggestedDoctor": "doctor_id",
  "symptoms": "Severe headache",
  "notes": "Patient accepts appointment suggestion"
}

Response:
{
  "success": true,
  "message": "Call updated with appointment info",
  "data": {
    "_id": "call_id",
    "appointmentId": "appointment_id",
    "suggestedDoctor": { ... },
    "status": "completed"
  }
}
```

### Get All Calls with Filters
```bash
GET /api/calls?page=1&limit=10&status=completed&appointmentBooked=true&emergency=false
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Calls retrieved",
  "data": [
    {
      "_id": "call_id",
      "patientId": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "phoneNumber": "+1234567890",
      "callStatus": "completed",
      "duration": 300,
      "appointmentBooked": true
    }
  ],
  "pagination": {
    "total": 123,
    "page": 1,
    "limit": 10,
    "pages": 13
  }
}
```

### Get Call Status
```bash
GET /api/calls/:id/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Call status retrieved",
  "data": {
    "callId": "call_id",
    "status": "completed",
    "duration": 300,
    "phoneNumber": "+1234567890",
    "transcript": "...",
    "recordingUrl": "https://..."
  }
}
```

---

## 🔑 Required Headers

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 📊 Dashboard Statistics

### Admin Dashboard Stats
- Total appointments
- Scheduled vs completed appointments
- Emergency appointments count
- Active doctors count
- Inactive doctors (pending approval)
- Total patients
- Total calls received
- Emergency calls count

### Doctor Dashboard Stats
- My appointments count
- Today's appointments
- Completed appointments
- Cancelled appointments
- Upcoming appointments

### Patient Dashboard Stats
- My appointments count
- Upcoming appointments
- Completed appointments
- Cancelled appointments

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request",
  "error": "Specific error details"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required role: admin"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error",
  "error": "Error message"
}
```

---

## ✨ Features Summary

✅ **Multi-role authentication** (Admin, Doctor, Patient)
✅ **Username-based registration**
✅ **Appointment booking, rescheduling, and cancellation**
✅ **Incoming call handling with VAPI**
✅ **Book appointments from voice calls**
✅ **Doctor-specific appointment dashboards**
✅ **Patient appointment history and status tracking**
✅ **Admin dashboard with comprehensive statistics**
✅ **Emergency appointment prioritization**
✅ **Doctor approval workflow**
✅ **Call-to-appointment tracking**
✅ **Pagination support on all list endpoints**
✅ **Comprehensive error handling**
✅ **Role-based access control**

---

## 🔄 Workflow Example

1. **Patient registers** → POST /api/auth/register
2. **Patient logs in** → POST /api/auth/login
3. **Patient receives call** → Handled by /api/calls/webhook/incoming
4. **From call, appointment booked** → POST /api/calls/:callId/book-appointment
5. **Patient views appointment** → GET /api/appointments/patient/my-appointments
6. **Doctor views patient appointment** → GET /api/appointments/doctor/my-appointments
7. **Doctor adds diagnosis** → PUT /api/appointments/:id
8. **Admin views all stats** → GET /api/appointments/admin/stats
