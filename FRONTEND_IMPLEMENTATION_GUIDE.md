# Implementation Guide - Frontend Developer

## 🏗️ Project Architecture Overview

```
Hospital AI Agent Backend
├── Authentication (Multi-role)
│   ├── Admin
│   ├── Doctor (Hospital Staff)
│   └── Patient
├── Appointment Management
│   ├── Booking
│   ├── Rescheduling
│   ├── Cancellation
│   └── Status Tracking
├── Call Management
│   ├── Incoming Calls (Webhook)
│   ├── Outbound Calls
│   └── Call-to-Appointment Integration
└── Dashboards (Role-based)
    ├── Admin Dashboard
    ├── Doctor Dashboard
    └── Patient Dashboard
```

---

## 🗄️ Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  
  // Authentication
  email: String (unique, lowercase),
  username: String (unique, lowercase),
  password: String (hashed),
  
  // Role Management
  role: String (enum: ['admin', 'doctor', 'patient']),
  isActive: Boolean (default: true),
  
  // Common Information
  firstName: String,
  lastName: String,
  phone: String,
  
  // Doctor-Specific
  specialization: String,
  licenseNumber: String,
  department: String,
  
  // Patient-Specific
  age: Number,
  medicalHistory: String,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Appointment Collection
```javascript
{
  _id: ObjectId,
  
  // References
  patientId: ObjectId (ref: User),
  doctorId: ObjectId (ref: User),
  callId: ObjectId (ref: Call, optional),
  
  // Appointment Details
  appointmentDate: Date,
  appointmentTime: String,
  duration: Number (default: 30 minutes),
  
  // Medical Information
  symptoms: String,
  diagnosis: String,
  prescriptions: String,
  notes: String,
  
  // Status Management
  status: String (enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled']),
  priority: String (enum: ['low', 'medium', 'high', 'urgent']),
  isEmergency: Boolean (default: false),
  
  // Cancellation Details
  cancellationReason: String,
  cancelledBy: String (enum: ['patient', 'doctor', 'admin']),
  
  // Timestamps
  confirmedAt: Date,
  completedAt: Date,
  rescheduleCount: Number (default: 0),
  
  // Reminders
  reminderSent: Boolean,
  reminderSentAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Call Collection
```javascript
{
  _id: ObjectId,
  
  // Patient Information
  patientId: ObjectId (ref: User, optional),
  phoneNumber: String,
  patientName: String,
  
  // Call Details
  callStatus: String (enum: ['initiated', 'ringing', 'connected', 'completed', 'missed', 'failed', 'rejected']),
  callType: String (enum: ['inbound', 'outbound', 'callback']),
  duration: Number (seconds),
  
  // VAPI Integration
  vapiCallId: String,
  vapiCallData: Mixed,
  fromNumber: String (default: '+1-914-465-1284'),
  areaCode: String (default: '914'),
  
  // Medical Information
  symptoms: String,
  diagnosis: String,
  emergencyLevel: String (enum: ['low', 'medium', 'high', 'critical']),
  isEmergency: Boolean,
  
  // Appointment Booking
  appointmentBooked: Boolean,
  appointmentId: ObjectId (ref: Appointment, optional),
  suggestedDoctor: ObjectId (ref: User, optional),
  
  // Call Content
  transcript: String,
  recordingUrl: String,
  
  // Follow-up
  followUpRequired: Boolean,
  followUpDate: Date,
  
  // Additional Info
  notes: String,
  startTime: Date,
  endTime: Date,
  
  createdAt: Date,
  updatedAt: Optional
}
```

---

## 🔐 Authentication Flow

### Registration Flow
```
1. User selects role (admin/doctor/patient)
2. Enters: email, username, password
3. Role-specific fields validation
4. Password hashing (bcryptjs - 10 rounds)
5. Generate JWT token
6. Return token + user info
```

### Login Flow
```
1. User enters email + password
2. Verify credentials
3. Check if user is active (doctors/admins only)
4. Generate JWT token
5. Return token + user role + details
```

### JWT Token Structure
```javascript
{
  userId: "user_id",
  role: "admin|doctor|patient",
  iat: 1234567890,
  exp: 1234654290 // 7 days from iat
}
```

---

## 🎨 Frontend Implementation Checklist

### Registration Page
- [ ] Role selector (radio buttons / dropdown)
- [ ] Email input with validation
- [ ] Username input with validation (3+ chars, unique check)
- [ ] Password input with strength indicator
- [ ] Confirm password field
- [ ] Role-specific fields:
  - **Doctor**: Specialization, License Number, Department
  - **Patient**: Age, Medical History, Optional Emergency Contact
- [ ] Error handling and validation messages
- [ ] Loading state during registration
- [ ] Success message and redirect

### Login Page
- [ ] Email input
- [ ] Password input
- [ ] "Remember Me" option (optional)
- [ ] Error handling
- [ ] Loading state
- [ ] Link to registration

### Patient Dashboard
- [ ] Upcoming appointments list
- [ ] Appointment cards with:
  - Doctor name & specialization
  - Date & time
  - Status badge
  - Action buttons (confirm, reschedule, cancel)
- [ ] Statistics widget
- [ ] Quick book appointment button
- [ ] Call history notification (if call resulted in appointment)

### Doctor Dashboard
- [ ] Today's appointments list
- [ ] Appointment cards with:
  - Patient name & info
  - Time & duration
  - Symptoms
  - Status
  - Update diagnosis button
- [ ] Statistics widget
- [ ] Upcoming week view
- [ ] Quick patient search

### Admin Dashboard
- [ ] System statistics (key metrics)
- [ ] All appointments table with filters
- [ ] Doctor management section
- [ ] Pending doctor approvals list
- [ ] Recent calls list
- [ ] Emergency alerts section
- [ ] Charts & analytics

---

## 💾 Local Storage / Session Storage

### Store After Login
```javascript
{
  // Essential
  "auth_token": "eyJhbGciOiJIUzI1NiIs...",
  "user_id": "user_id",
  "user_role": "doctor", // admin|doctor|patient
  
  // User Info
  "user_name": "Dr. Smith",
  "user_email": "dr_smith@hospital.com",
  "user_specialization": "Cardiology", // if doctor
  
  // App Settings
  "app_theme": "light",
  "notification_enabled": true
}
```

### Clear on Logout
```javascript
localStorage.clear(); // or clear specific items
sessionStorage.clear();
```

---

## 🔄 API Integration Patterns

### Authentication Header
```javascript
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
  'Content-Type': 'application/json'
};
```

### Request Helper
```javascript
async function apiCall(endpoint, method = 'GET', data = null) {
  const headers = {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`/api${endpoint}`, options);
    
    if (response.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}
```

### Usage Example
```javascript
// Book appointment
const result = await apiCall('/appointments/patient/book', 'POST', {
  doctorId: 'doctor_id',
  appointmentDate: '2026-03-25T10:00:00Z',
  appointmentTime: '10:00 AM',
  symptoms: 'Chest pain'
});

if (result.success) {
  // Handle success
} else {
  // Show error message
}
```

---

## 🎯 State Management Pattern

### Redux / Context API Structure
```javascript
{
  auth: {
    isAuthenticated: boolean,
    token: string,
    user: {
      id: string,
      role: string,
      firstName: string,
      lastName: string,
      email: string
    },
    loading: boolean,
    error: string
  },
  
  appointments: {
    list: [],
    current: {},
    filters: {
      status: null,
      startDate: null,
      endDate: null
    },
    loading: boolean,
    error: string
  },
  
  calls: {
    list: [],
    current: {},
    loading: boolean,
    error: string
  },
  
  dashboard: {
    stats: {},
    loading: boolean
  }
}
```

---

## 🔔 Notification Patterns

### Toast Notifications
```javascript
// Success
showToast('Appointment booked successfully', 'success');

// Error
showToast('Failed to book appointment', 'error');

// Info
showToast('Appointment cancelled', 'info');
```

### Modal Dialogs
```javascript
// Confirm Cancel Appointment
showConfirmDialog(
  'Are you sure you want to cancel?',
  'This action cannot be undone',
  () => cancelAppointment(id),
  'Cancel Appointment'
);
```

---

## 📱 Responsive Design Breakpoints

```css
/* Mobile */
@media (max-width: 639px) { }

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }
```

---

## 🎨 UI Component Library Suggestion

### Recommended Components
- **Form Components**: Input, Select, MultiSelect, DatePicker, TimePicker
- **Table Components**: DataTable with pagination, sorting, filtering
- **Cards**: AppointmentCard, DoctorCard, CallCard
- **Buttons**: Primary, Secondary, Danger, Loading states
- **Modal**: Dialog, Confirmation, Alert
- **Badges**: Status badges (scheduled, completed, cancelled)
- **Charts**: Bar charts, Line charts for analytics

---

## 📊 Page Wireframes

### Patient Dashboard
```
┌─────────────────────────────────┐
│ Header (Profile, Logout)        │
├─────────────────────────────────┤
│ Welcome, [Patient Name]         │
├─────────────────────────────────┤
│ Quick Stats                     │
│ ┌──────┐┌──────┐┌──────────┐   │
│ │Upcom │Created│Completed │   │
│ └──────┘└──────┘└──────────┘   │
├─────────────────────────────────┤
│ Upcoming Appointments           │
│ ┌─────────────────────────────┐ │
│ │ Dr. Smith | 10:00 AM        │ │
│ │ Cardiology | March 25, 2026 │ │
│ │ [Confirm] [Reschedule]      │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [Book New Appointment]          │
└─────────────────────────────────┘
```

### Doctor Dashboard
```
┌─────────────────────────────────┐
│ Header (Profile, Logout)        │
├─────────────────────────────────┤
│ DR. SMITH - CARDIOLOGY          │
├─────────────────────────────────┤
│ Quick Stats                     │
│ ┌──────┐┌──────┐┌──────────┐   │
│ │My Apt │Today │Completed │   │
│ └──────┘└──────┘└──────────┘   │
├─────────────────────────────────┤
│ Today's Appointments            │
│ ┌─────────────────────────────┐ │
│ │ John Doe | 10:00 AM         │ │
│ │ Chest pain | Scheduled      │ │
│ │ [Add Diagnosis] [Complete]  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Admin Dashboard
```
┌──────────────────────────────────────┐
│ Header                               │
├──────────────────────────────────────┤
│ System Statistics                    │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐     │
│ │Tot │Sch │Com │Can │Emg │ ...  │     │
│ └────┘└────┘└────┘└────┘└────┘     │
├──────────────────────────────────────┤
│ Doctor Management                    │
│ ┌─ Pending Approvals: 3 ─────────┐   │
│ │ [View All]                      │   │
│ └─────────────────────────────────┘   │
├──────────────────────────────────────┤
│ All Appointments Table               │
│ [Filters: Status, Doctor, Date]      │
│ ┌─────────────────────────────────┐   │
│ │ Patient | Doctor | Time | Status│   │
│ ├─────────────────────────────────┤   │
│ │ ...                             │   │
│ └─────────────────────────────────┘   │
└──────────────────────────────────────┘
```

---

## 🚀 Getting Started Checklist

### Phase 1: Setup
- [ ] Install dependencies (axios, react-query, zustand/redux)
- [ ] Setup routing (React Router)
- [ ] Setup state management
- [ ] Create API client/helpers
- [ ] Setup environment variables

### Phase 2: Authentication
- [ ] Create login page
- [ ] Create registration page (with role selection)
- [ ] Implement token storage
- [ ] Create protected route wrapper
- [ ] Handle token expiration

### Phase 3: Core Features
- [ ] Patient: View appointments
- [ ] Patient: Book appointment
- [ ] Patient: Reschedule appointment
- [ ] Doctor: View my appointments
- [ ] Doctor: Add diagnosis/notes
- [ ] Admin: View all appointments

### Phase 4: Advanced Features
- [ ] Real-time call notifications
- [ ] Call-to-appointment flow
- [ ] Dashboard analytics
- [ ] Doctor approval workflow
- [ ] Appointment reminders

---

For API endpoints, see [COMPLETE_API_ENDPOINTS.md](COMPLETE_API_ENDPOINTS.md)
For admin features, see [ADMIN_FEATURES.md](ADMIN_FEATURES.md)
