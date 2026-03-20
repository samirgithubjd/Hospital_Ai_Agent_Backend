# Multi-Role Authentication Guide

## Overview

The backend now supports three distinct roles:
- **Admin**: Hospital administrators with full access to system configuration and management
- **Doctor**: Hospital staff/physicians with access to patient data and call management
- **Patient**: Patients who can manage their appointments and medical records

## Updated Features

### 1. User Model (`models/User.js`)

The new unified User model replaces the previous Admin model and supports:

```javascript
{
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ['admin', 'doctor', 'patient']),
  
  // Common fields
  firstName: String,
  lastName: String,
  phone: String,
  
  // Doctor-specific fields
  specialization: String,
  licenseNumber: String,
  department: String,
  
  // Patient-specific fields
  age: Number,
  medicalHistory: String,
  
  isActive: Boolean (default: true)
}
```

### 2. Authentication Endpoints

#### Admin Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@hospital.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "role": "admin",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Doctor Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "doctor@hospital.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "role": "doctor",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "specialization": "Cardiology",
  "licenseNumber": "LIC123456",
  "department": "Cardiology"
}
```
**Note**: Doctors registered this way will have `isActive: false` and need admin approval.

#### Patient Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "role": "patient",
  "firstName": "Robert",
  "lastName": "Johnson",
  "phone": "+1234567890",
  "age": 45,
  "medicalHistory": "No known allergies"
}
```

#### Login (Works for all roles)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@hospital.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "email": "admin@hospital.com",
      "role": "admin",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    }
  }
}
```

### 3. Updated Authentication Middleware

#### Basic Authentication
Use the `authMiddleware` to protect routes that require authentication:

```javascript
const { authMiddleware } = require('../middleware/auth');

router.get('/protected', authMiddleware, controller);
```

The middleware will:
- Verify JWT token from the `Authorization: Bearer <token>` header
- Attach user info to `req.user` with properties: `userId`, `role`
- Attach `req.userId` and `req.userRole` for easy access

#### Role-Based Access Control
Use the `roleMiddleware` to restrict routes to specific roles:

```javascript
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Only admins can access
router.delete('/admin/users/:id', 
  authMiddleware, 
  roleMiddleware('admin'), 
  controller
);

// Admins and doctors can access
router.get('/patients', 
  authMiddleware, 
  roleMiddleware('admin', 'doctor'), 
  controller
);

// All authenticated users can access
router.get('/profile', 
  authMiddleware, 
  controller
);
```

### 4. Usage Examples

#### Creating Admin Routes
```javascript
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Only admins can approve doctors
router.put('/admin/doctors/:id/approve', 
  authMiddleware, 
  roleMiddleware('admin'),
  approveDoctor
);

// Only admins can view all users
router.get('/admin/users',
  authMiddleware,
  roleMiddleware('admin'),
  getAllUsers
);
```

#### Creating Doctor Routes
```javascript
// Doctors and admins can view patients
router.get('/doctors/patients',
  authMiddleware,
  roleMiddleware('doctor', 'admin'),
  getPatients
);

// Only doctors can manage their schedule
router.post('/doctors/schedule',
  authMiddleware,
  roleMiddleware('doctor'),
  manageSchedule
);
```

#### Creating Patient Routes
```javascript
// Patients can view their appointments
router.get('/patients/appointments',
  authMiddleware,
  roleMiddleware('patient'),
  getMyAppointments
);
```

### 5. Token Claims

JWT tokens now include:
```javascript
{
  userId: "user_id",
  role: "admin" // or "doctor" or "patient",
  iat: 1234567890,
  exp: 1234654290
}
```

Access these in request handlers via:
```javascript
const userId = req.userId;
const userRole = req.userRole;
const fullUser = req.user;
```

### 6. Important Notes

- **Doctor Activation**: When doctors register, their `isActive` status is set to `false`. Admins must approve them before they can perform operations.
- **Password Hashing**: All passwords are hashed using bcryptjs (10 salt rounds) before storage.
- **Token Expiration**: Tokens expire after 7 days.
- **Unique Email**: Email addresses are unique per user across all roles.
- **Case Insensitive**: Email addresses are automatically converted to lowercase for consistency.

### 7. Migration from Old Admin Model

If you have existing Admin records:

```javascript
// Option 1: Convert existing admins
const Admin = require('./models/Admin');
const User = require('./models/User');

const admins = await Admin.find();
for (const admin of admins) {
  await User.create({
    email: admin.email,
    password: admin.password,
    role: 'admin',
    firstName: 'To Update',
    isActive: true
  });
}
```

### 8. Security Considerations

- Always validate role before performing sensitive operations
- Store tokens securely on the client (preferably in httpOnly cookies)
- Implement token refresh mechanism for extended sessions
- Consider adding role hierarchies if needed (e.g., super-admin > admin > doctor)
- Audit log all role-based access for compliance

### 9. Error Responses

#### Authentication Failure
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

#### Authorization Failure
```json
{
  "success": false,
  "message": "Access denied. Required role: admin"
}
```

#### Validation Failure
```json
{
  "success": false,
  "message": "Specialization and license number are required for doctors"
}
```

## Next Steps

1. Update client applications to handle new role-based responses
2. Create admin endpoints to manage doctor approvals
3. Implement role-specific dashboards on the frontend
4. Add audit logging for security compliance
5. Consider implementing role hierarchies or permissions system
