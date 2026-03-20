# Authentication Flow Summary

## 🎯 Three Separate Authentication Flows

The Hospital AI Agent system uses a restricted authentication model with three distinct flows:

---

## 1️⃣ PATIENT FLOW (Public Self-Registration)

```
┌─────────────────────────────────────────────────┐
│   Patient Registration (Public)                 │
│   POST /api/auth/register                       │
├─────────────────────────────────────────────────┤
│ Request Body:                                   │
│ {                                               │
│   "email": "patient@example.com",               │
│   "password": "PatientPass123",                 │
│   "firstName": "John",                          │
│   "lastName": "Doe",                            │
│   "age": 35,                                    │
│   "medicalHistory": "No allergies"              │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ ✅ Account Created with:                        │
│   - role: "patient"                             │
│   - isActive: true                              │
│   - JWT Token Generated                         │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Patient Can Immediately:                        │
│ 1. Login with POST /api/auth/login              │
│ 2. Book appointments                            │
│ 3. View their appointments                      │
│ 4. Access patient features                      │
└─────────────────────────────────────────────────┘
```

### Patient Login
```bash
POST /api/auth/login
{
  "email": "patient@example.com",
  "password": "PatientPass123"
}

Response: JWT Token + User Data (role: "patient")
```

---

## 2️⃣ DOCTOR FLOW (Admin Creates → Approve → Login)

```
┌─────────────────────────────────────────────────┐
│   Admin Creates Doctor Account                  │
│   POST /api/admin/create-doctor                 │
│   (Admin JWT Token Required)                    │
├─────────────────────────────────────────────────┤
│ Request Body:                                   │
│ {                                               │
│   "email": "dr.sarah@hospital.com",             │
│   "password": "DoctorPass123",                  │
│   "firstName": "Sarah",                         │
│   "lastName": "Williams",                       │
│   "specialization": "Cardiology",               │
│   "licenseNumber": "MD87654321",                │
│   "department": "Cardiology"                    │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ ✅ Doctor Account Created with:                 │
│   - role: "doctor"                              │
│   - isActive: false  ⚠️  PENDING APPROVAL       │
│   - NO Token Yet (Can't login)                  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   Admin Approves Doctor                         │
│   PUT /api/admin/doctors/:doctorId/approve      │
│   (Admin JWT Token Required)                    │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ ✅ Doctor Account Updated:                      │
│   - isActive: true                              │
│   - Can Now Login                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   Doctor Login                                  │
│   POST /api/auth/login                          │
├─────────────────────────────────────────────────┤
│ {                                               │
│   "email": "dr.sarah@hospital.com",             │
│   "password": "DoctorPass123"                   │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ ✅ Doctor Can Now:                              │
│ 1. Access doctor dashboard                      │
│ 2. View assigned appointments                   │
│ 3. Manage patient consultations                 │
│ 4. Update appointment details                   │
└─────────────────────────────────────────────────┘
```

### Creation Steps in Terminal
```bash
# Step 1: Admin gets token
ADMIN_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"AdminPass123"}' \
  | jq -r '.data.token')

# Step 2: Admin creates doctor
DOCTOR_ID=$(curl -X POST http://localhost:5000/api/admin/create-doctor \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.sarah@hospital.com",
    "password": "DoctorPass123",
    "firstName": "Sarah",
    "lastName": "Williams",
    "specialization": "Cardiology",
    "licenseNumber": "MD87654321"
  }' | jq -r '.data.doctor.id')

# Step 3: Admin approves doctor
curl -X PUT http://localhost:5000/api/admin/doctors/$DOCTOR_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Step 4: Doctor logs in
DOCTOR_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.sarah@hospital.com","password":"DoctorPass123"}' \
  | jq -r '.data.token')
```

---

## 3️⃣ ADMIN FLOW (Admin Creates → Immediate Access)

```
┌─────────────────────────────────────────────────┐
│   Existing Admin Creates New Admin              │
│   POST /api/admin/create-admin                  │
│   (Admin JWT Token Required)                    │
├─────────────────────────────────────────────────┤
│ Request Body:                                   │
│ {                                               │
│   "email": "newadmin@hospital.com",             │
│   "password": "AdminPass123",                   │
│   "firstName": "Jane",                          │
│   "lastName": "Smith",                          │
│   "phone": "+1-555-555-5555"                    │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ ✅ Admin Account Created with:                  │
│   - role: "admin"                               │
│   - isActive: true  ✅ ACTIVE IMMEDIATELY       │
│   - Can Login Right Away                        │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   New Admin Login                               │
│   POST /api/auth/login                          │
├─────────────────────────────────────────────────┤
│ {                                               │
│   "email": "newadmin@hospital.com",             │
│   "password": "AdminPass123"                    │
│ }                                               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ ✅ New Admin Can Immediately:                   │
│ 1. Create other admin accounts                  │
│ 2. Create doctor accounts                       │
│ 3. Approve doctors                              │
│ 4. View all system statistics                   │
│ 5. Manage users                                 │
└─────────────────────────────────────────────────┘
```

### Creation Steps in Terminal
```bash
# Step 1: Existing admin gets token
ADMIN1_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"AdminPass123"}' \
  | jq -r '.data.token')

# Step 2: Admin creates new admin
curl -X POST http://localhost:5000/api/admin/create-admin \
  -H "Authorization: Bearer $ADMIN1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@hospital.com",
    "password": "AdminPass123",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1-555-555-5555"
  }'

# Step 3: New admin can login immediately
ADMIN2_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"newadmin@hospital.com","password":"AdminPass123"}' \
  | jq -r '.data.token')

# Step 4: New admin can create/manage doctors
curl -X GET http://localhost:5000/api/admin/all-doctors \
  -H "Authorization: Bearer $ADMIN2_TOKEN"
```

---

## 📋 Endpoint Summary

| Flow | Endpoint | Method | Auth Required | Immediate Access |
|------|----------|--------|---------------|------------------|
| **Patient** | `/api/auth/register` | POST | ❌ No | ✅ Yes |
| **Doctor Create** | `/api/admin/create-doctor` | POST | ✅ Yes (Admin) | ❌ No |
| **Doctor Approve** | `/api/admin/doctors/:id/approve` | PUT | ✅ Yes (Admin) | - |
| **Doctor Login** | `/api/auth/login` | POST | ❌ No | ✅ Yes (after approval) |
| **Admin Create** | `/api/admin/create-admin` | POST | ✅ Yes (Admin) | ✅ Yes |
| **Admin Login** | `/api/auth/login` | POST | ❌ No | ✅ Yes |

---

## 🔑 Key Points

### Patient Registration
- ✅ **Public** - No authentication required
- ✅ **Immediate** - Account active immediately
- ✅ **Can login** - Right after registration
- ✅ **Self-service** - Patients manage their own registration

### Doctor Creation
- 🔒 **Admin-only** - Requires admin JWT token
- ⏳ **Pending** - Account inactive until approval
- ❌ **Cannot login** - Until admin approves
- ✅ **Admin controlled** - Admins maintain quality/credentials

### Admin Creation
- 🔒 **Admin-only** - Requires admin JWT token
- ✅ **Immediate** - Account active immediately
- ✅ **Can login** - Right after creation
- 🛡️ **Controlled growth** - Prevents unauthorized admin access

---

## 🚫 What's NOT Allowed

| Attempt | Endpoint | Result |
|---------|----------|--------|
| Patient tries to register as doctor | `/api/auth/register` with role="doctor" | ❌ 403 Forbidden |
| Patient tries to register as admin | `/api/auth/register` with role="admin" | ❌ 403 Forbidden |
| Inactive doctor tries to login | `/api/auth/login` | ❌ Error: Account deactivated |
| Non-admin tries to create doctor | `/api/admin/create-doctor` | ❌ 401 Unauthorized |
| Non-admin tries to approve doctor | `/api/admin/doctors/:id/approve` | ❌ 401 Unauthorized |

---

## 📚 Related Documentation

- [ADMIN_OPERATIONS_API.md](ADMIN_OPERATIONS_API.md) - Complete admin operations reference
- [AUTH_PAYLOADS.md](AUTH_PAYLOADS.md) - Detailed payload examples
- [COMPLETE_API_ENDPOINTS.md](COMPLETE_API_ENDPOINTS.md) - All endpoints
- [API_URLS_QUICK_REFERENCE.md](API_URLS_QUICK_REFERENCE.md) - Quick URL reference

---

## 🎓 Testing the Complete Flow

### Scenario: New doctor joins hospital

1. **Admin creates doctor account**
   ```bash
   POST /api/admin/create-doctor
   ```

2. **Doctor account exists but inactive**
   - Doctor cannot login yet
   - Gets notification about pending approval

3. **Admin receives approval request**
   - Admin reviews doctor credentials
   - Admin approves doctor
   ```bash
   PUT /api/admin/doctors/:doctorId/approve
   ```

4. **Doctor receives approval notification**
   - Doctor can now login
   - Doctor accesses dashboard

5. **Patient books appointment with doctor**
   - Patient searches for available doctors
   - Patient books with approved doctor

6. **Doctor views appointment and manages patient**
   - Doctor sees booked appointment
   - Doctor manages consultation

---

## ⚙️ System Configuration

### Initial Setup Requirements

1. **Bootstrap Admin Account**
   - Must be created manually in database or seed script
   - OR first admin created via special endpoint (if implemented)

2. **Database Initialization**
   ```javascript
   // Example seed (if using seed script)
   const Admin = require('./models/User');
   
   await User.create({
     email: 'admin@hospital.com',
     username: 'admin',
     password: 'AdminPass123', // Will be hashed
     role: 'admin',
     firstName: 'System',
     lastName: 'Admin',
     isActive: true
   });
   ```

3. **Environment Variables**
   - Set in `.env` file
   - JWT_SECRET for token generation
   - DATABASE_URL for MongoDB connection

---

## 🔐 Security Best Practices

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** (HttpOnly cookies recommended)
3. **Validate all input** on backend
4. **Never expose admin endpoints** to unauthenticated users
5. **Regular password requirements** (6+ chars minimum)
6. **Review pending doctor approvals** regularly
7. **Audit admin account creation** in logs
8. **Implement rate limiting** on login/registration endpoints

---

## 🆘 Troubleshooting

### "Only patients can self-register" Error
**Issue**: Trying to register as doctor/admin via public endpoint
**Solution**: Use `/api/admin/create-doctor` endpoint (admin-only)

### "Your account has been deactivated" Error
**Issue**: Newly created doctor trying to login before approval
**Solution**: Admin must approve doctor first using `/api/admin/doctors/:id/approve`

### "Unauthorized" Error on Admin Endpoints
**Issue**: Not including JWT token or token lacks admin role
**Solution**: 
1. Login as admin to get admin JWT token
2. Include token in Authorization header: `Bearer <token>`

### Doctor Can't Keep Login Session
**Issue**: JWT token expired after 7 days
**Solution**: Re-login to get new token, or implement token refresh flow

---

Generated: 2024-01-01  
Updated for: Restricted Auth Model v1.0
