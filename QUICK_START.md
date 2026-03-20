# Multi-Role Authentication - Quick Start

## What's New?

Your backend now supports **3 user roles**:

1. **👨‍💼 Admin** - Full system access and management
2. **👨‍⚕️ Doctor** - Access to patients and appointments  
3. **👤 Patient** - Personal appointments and medical records

## Key Changes

- ✅ New `User` model (replaced `Admin` model)
- ✅ Role-based authentication (`admin`, `doctor`, `patient`)
- ✅ Role-based access control middleware
- ✅ Updated routes to use new auth middleware
- ✅ Role information included in JWT tokens

## Quick API Reference

### 1️⃣ Register as Different Roles

**Register Admin:**
```bash
POST /api/auth/register
{
  "email": "admin@hospital.com",
  "password": "pass123",
  "confirmPassword": "pass123",
  "role": "admin",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Register Doctor:**
```bash
POST /api/auth/register
{
  "email": "doctor@hospital.com",
  "password": "pass123",
  "confirmPassword": "pass123",
  "role": "doctor",
  "firstName": "Jane",
  "lastName": "Smith",
  "specialization": "Cardiology",
  "licenseNumber": "LIC123456"
}
```

**Register Patient:**
```bash
POST /api/auth/register
{
  "email": "patient@example.com",
  "password": "pass123",
  "confirmPassword": "pass123",
  "role": "patient",
  "firstName": "Bob",
  "lastName": "Patient",
  "age": 45
}
```

### 2️⃣ Login (Works for All Roles)

```bash
POST /api/auth/login
{
  "email": "admin@hospital.com",
  "password": "pass123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "email": "admin@hospital.com",
      "role": "admin"
    }
  }
}
```

### 3️⃣ Use Token in Requests

All protected endpoints require the token:

```bash
GET /api/health (no auth needed)
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Building Role-Specific Routes

```javascript
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// ✅ All authenticated users
router.get('/profile', authMiddleware, controller);

// ✅ Only admins
router.get('/admin/users', 
  authMiddleware, 
  roleMiddleware('admin'), 
  controller
);

// ✅ Admins and doctors
router.get('/staff/patients',
  authMiddleware,
  roleMiddleware('admin', 'doctor'),
  controller
);

// ✅ Only patients
router.get('/my-appointments',
  authMiddleware,
  roleMiddleware('patient'),
  controller
);
```

## How to Access User Info in Routes

```javascript
app.get('/example', authMiddleware, (req, res) => {
  console.log(req.userId);      // "user_id_123"
  console.log(req.userRole);    // "admin", "doctor", or "patient"
  console.log(req.user);        // Full token payload
});
```

## Important Features

| Feature | Details |
|---------|---------|
| **Password Hashing** | bcryptjs (10 rounds) |
| **Token Duration** | 7 days |
| **Doctor Status** | Set to inactive on registration (needs admin approval) |
| **Email** | Must be unique, case-insensitive |
| **Validation** | Role-specific field validation |

## Files to Know About

| File | Purpose |
|------|---------|
| [models/User.js](models/User.js) | Unified user model with role support |
| [controllers/authController.js](controllers/authController.js) | Login & register logic |
| [middleware/auth.js](middleware/auth.js) | Authentication & role checking |
| [MULTI_ROLE_AUTH_GUIDE.md](MULTI_ROLE_AUTH_GUIDE.md) | Full API documentation |
| [ROLE_BASED_ROUTES_EXAMPLE.js](ROLE_BASED_ROUTES_EXAMPLE.js) | Route examples |

## Common Tasks

### ✅ Create Admin-Only Route
```javascript
router.delete('/admin/user/:id',
  authMiddleware,
  roleMiddleware('admin'),
  deleteUserController
);
```

### ✅ Create Doctor+Admin Route
```javascript
router.get('/staff/patients',
  authMiddleware,
  roleMiddleware('doctor', 'admin'),
  getPatientsController
);
```

### ✅ Create Patient Route
```javascript
router.get('/my-appointments',
  authMiddleware,
  roleMiddleware('patient'),
  getMyAppointmentsController
);
```

### ✅ Create Public Route (No Auth)
```javascript
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

## Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "Email and password are required" | Missing fields |
| 401 | "Invalid email or password" | Wrong credentials |
| 401 | "Invalid or expired token" | Bad token |
| 403 | "Access denied. Required role: admin" | Wrong role |
| 409 | "User with this email already exists" | Duplicate email |

## Testing Checklist

- [ ] Admin registration works
- [ ] Doctor registration works
- [ ] Patient registration works
- [ ] All users can login
- [ ] Login returns correct role
- [ ] Protected routes require token
- [ ] roleMiddleware blocks wrong roles
- [ ] Doctor starts with isActive: false

## Next Steps

1. Test the new authentication
2. Update your frontend to handle `role` in login response
3. Implement role-specific routes
4. Add admin approval endpoint for doctors
5. Update client to include role-based UI logic

## Questions?

Check these files for more details:
- 📖 [MULTI_ROLE_AUTH_GUIDE.md](MULTI_ROLE_AUTH_GUIDE.md) - Complete guide
- 💻 [ROLE_BASED_ROUTES_EXAMPLE.js](ROLE_BASED_ROUTES_EXAMPLE.js) - Code examples  
- ⚙️ [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) - Setup instructions
- 📋 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What changed

---

**Ready to use?** Start the server and test the new authentication! 🚀
