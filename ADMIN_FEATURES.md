# Admin Features & Management Endpoints

## 🎯 Admin Dashboard Features

The admin dashboard provides comprehensive oversight of:
- All appointments and their statuses
- Doctor management (approval, deactivation)
- Patient management
- Call management
- System statistics and analytics

---

## 👨‍⚕️ Doctor Management

### View All Doctors
```bash
GET /api/admin/doctors
Authorization: Bearer <token>

Response:
{
  "doctors": [
    {
      "_id": "doctor_id",
      "email": "dr_smith@hospital.com",
      "username": "dr_smith",
      "firstName": "Dr.",
      "lastName": "Smith",
      "specialization": "Cardiology",
      "department": "Cardiology",
      "licenseNumber": "LIC123456",
      "phone": "+1234567890",
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

### Approve Doctor Registration
```bash
PUT /api/admin/doctors/:doctorId/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "approved": true
}

Response:
{
  "success": true,
  "message": "Doctor approved successfully",
  "data": {
    "doctorId": "doctor_id",
    "isActive": true,
    "approvedAt": "2026-03-20T12:00:00.000Z"
  }
}
```

### Deactivate Doctor Account
```bash
PUT /api/admin/doctors/:doctorId/deactivate
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "License expired"
}

Response:
  "success": true,
  "message": "Doctor deactivated successfully",
  "data": {
    "doctorId": "doctor_id",
    "isActive": false
  }
}
```

### Update Doctor Information
```bash
PUT /api/admin/doctors/:doctorId
Authorization: Bearer <token>
Content-Type: application/json

{
  "specialization": "Cardiology",
  "department": "Cardiology",
  "phone": "+1234567890"
}

Response:
{
  "success": true,
  "message": "Doctor updated successfully",
  "data": {
    "_id": "doctor_id",
    "specialization": "Cardiology",
    "department": "Cardiology",
    "phone": "+1234567890"
  }
}
```

### Get Pending Doctor Approvals
```bash
GET /api/admin/doctors/pending
Authorization: Bearer <token>

Response:
{
  "pending": [
    {
      "_id": "doctor_id",
      "email": "dr_jones@hospital.com",
      "firstName": "Dr.",
      "lastName": "Jones",
      "specialization": "Neurology",
      "licenseNumber": "LIC789012",
      "registeredAt": "2026-03-20T10:00:00.000Z"
    }
  ],
  "count": 3
}
```

---

## 👥 Patient Management

### View All Patients
```bash
GET /api/admin/patients?page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "patients": [
    {
      "_id": "patient_id",
      "email": "patient@example.com",
      "username": "patient_john",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "age": 45,
      "createdAt": "2026-02-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 234,
    "page": 1,
    "limit": 20,
    "pages": 12
  }
}
```

### Get Patient Details
```bash
GET /api/admin/patients/:patientId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "_id": "patient_id",
    "email": "patient@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "age": 45,
    "medicalHistory": "No known allergies",
    "appointments": [
      {
        "_id": "appointment_id",
        "doctorId": "doctor_id",
        "appointmentDate": "2026-03-25T10:00:00.000Z",
        "status": "scheduled"
      }
    ]
  }
}
```

---

## 📅 Appointment Management

### View All Appointments (with filters)
```bash
GET /api/appointments/admin/all?page=1&limit=20&status=scheduled&doctorId=doctor_id&startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <token>

Response:
{
  "success": true,
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
      "appointmentTime": "10:00 AM",
      "status": "scheduled",
      "priority": "medium",
      "symptoms": "Chest pain",
      "isEmergency": false
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1
  }
}
```

### Cancel Appointment (Admin)
```bash
PUT /api/appointments/:appointmentId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Doctor unable to attend",
  "cancelledBy": "admin"
}

Response:
{
  "success": true,
  "message": "Appointment cancelled",
  "data": {
    "_id": "appointment_id",
    "status": "cancelled",
    "cancellationReason": "Doctor unable to attend"
  }
}
```

### Get Appointments by Status
```bash
GET /api/appointments/admin/all?status=emergency&status=urgent
Authorization: Bearer <token>

Shows all emergency and urgent appointments
```

### Get Appointments by Date Range
```bash
GET /api/appointments/admin/all?startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <token>

Shows all appointments in March 2026
```

---

## 📞 Call Management

### View All Incoming Calls
```bash
GET /api/calls?page=1&limit=20&status=completed&emergency=true
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "call_id",
      "patientName": "John Doe",
      "phoneNumber": "+1234567890",
      "callStatus": "completed",
      "duration": 300,
      "symptoms": "Severe headache",
      "isEmergency": true,
      "appointmentBooked": true,
      "createdAt": "2026-03-20T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 567,
    "page": 1
  }
}
```

### View Emergency Calls
```bash
GET /api/calls?emergency=true&status=completed
Authorization: Bearer <token>

Shows all emergency calls that have completed
```

### Get Call with Full Details
```bash
GET /api/calls/:callId/details
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "_id": "call_id",
    "patientId": { ... },
    "phoneNumber": "+1234567890",
    "callStatus": "completed",
    "symptoms": "Details...",
    "transcript": "Full call transcript...",
    "appointmentId": "appointment_id if booked",
    "startTime": "2026-03-20T12:00:00.000Z",
    "endTime": "2026-03-20T12:05:00.000Z",
    "duration": 300
  }
}
```

---

## 📊 Admin Dashboard Analytics

### Get Comprehensive Dashboard Stats
```bash
GET /api/appointments/admin/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
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

## 🎛️ Suggested Additional Admin Endpoints

### Reschedule Appointment (Admin Force)
```bash
PUT /api/admin/appointments/:id/force-reschedule
Authorization: Bearer <token>

{
  "newDate": "2026-03-26",
  "newTime": "14:00",
  "reason": "Doctor scheduling conflict"
}
```

### Reassign Patient to Different Doctor
```bash
PUT /api/admin/appointments/:id/reassign-doctor
Authorization: Bearer <token>

{
  "newDoctorId": "doctor_id_2",
  "reason": "Patient requested"
}
```

### Send Appointment Reminders
```bash
POST /api/admin/appointments/:id/send-reminder
Authorization: Bearer <token>

{
  "method": "sms", // or email, call
  "daysBeforeAppointment": 1
}
```

### Generate Reports
```bash
GET /api/admin/reports?type=appointments&format=pdf&startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <token>

Types: appointments, calls, patients, doctors
Formats: pdf, csv, json
```

### Manage System Settings
```bash
PUT /api/admin/settings
Authorization: Bearer <token>

{
  "appointmentDuration": 30,
  "maxReschedules": 3,
  "cancellationWindow": 24, // hours before appointment
  "emergencyThreshold": "high"
}
```

### Audit Logs
```bash
GET /api/admin/audit-logs?action=appointment_created&userId=user_id&startDate=2026-03-01
Authorization: Bearer <token>

Shows all admin and user actions for audit trails
```

---

## 🔐 Admin-Only Features

✅ View all appointments system-wide
✅ Approve/deactivate doctor accounts
✅ Cancel appointments with reason
✅ Force reschedule appointments
✅ Reassign patients to different doctors
✅ View real-time analytics dashboard
✅ Generate reports and exports
✅ Manage system settings
✅ View audit logs
✅ Manage emergency escalations
✅ Bulk operations on appointments
✅ Export call transcripts and recordings

---

## 📈 Key Admin Metrics

### Daily Metrics
- Appointments scheduled today
- Calls received today
- Emergency cases today
- Doctor availability status

### Weekly Metrics
- Total appointments this week
- Completed appointments
- Cancellation rate
- Average call duration

### Monthly Metrics
- Revenue by department (if applicable)
- Most popular doctors
- Common symptoms
- Patient satisfaction trends

### System Health
- Average appointment duration
- System uptime
- Call success rate
- API response times

---

## 💡 Dashboard Widget Ideas

### Real-time Widgets
- Active appointments today
- Incoming calls (live)
- Emergency alerts
- Doctor availability status

### Quick Stats
- Total patients
- Total doctors
- Pending doctor approvals
- Appointments this week

### Quick Actions
- Approve pending doctors
- View emergency cases
- Send bulk reminders
- Generate reports

### Charts & Reports
- Appointments by status
- Calls by hour/day
- Top specializations
- Patient demographics
- Call duration trends

---

## 🔧 Configuration Options

### Appointment Settings
```javascript
{
  appointmentDuration: 30, // minutes
  maxReschedules: 3,
  cancellationWindow: 24, // hours before appointment
  reminderTiming: [24, 2], // hours before appointment
  emergencyPriority: true,
  autoConfirmation: false
}
```

### Call Settings
```javascript
{
  recordCalls: true,
  enableTranscription: true,
  maxCallDuration: 30, // minutes
  emergencyEscalationTime: 5, // minutes
  autoBookAppointment: false
}
```

### Notification Settings
```javascript
{
  appointmentReminders: true,
  callNotifications: true,
  emergencyAlerts: true,
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: true
}
```

---

For more information, see [COMPLETE_API_ENDPOINTS.md](COMPLETE_API_ENDPOINTS.md)
