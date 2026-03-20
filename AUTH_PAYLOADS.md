# Authentication Payloads - Complete Guide

## ⚠️ IMPORTANT: Updated Authentication Flow

As of the latest update, the authentication system follows this restricted model:

1. **Patients** - Can self-register via public endpoint
2. **Admins** - Created only by other admins via admin-only endpoint
3. **Doctors** - Created only by admins via admin-only endpoint
4. **All Users** - Can login if their account is active (isActive=true)

For admin and doctor account creation, see the **ADMIN_OPERATIONS_API.md** file.

---

## 📝 Registration & Login Payloads

### Patient Registration (Public Endpoint)

**Endpoint:** `POST /api/auth/register`
**Description:** Allows patients to self-register

**Request:**
```bash
POST /api/auth/register
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "patient@example.com",
  "password": "PatientPass123",
  "firstName": "John",
  "lastName": "Doe",
  "age": 35,
  "medicalHistory": "No known allergies, diabetic"
}
```

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWYxYzIzNGE1YjZjZDAwMTAwMzAwMDEiLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTcxMDM1MTIwMCwiZXhwIjoxNzEwOTU2MDAwfQ.abc123xyz789",
    "user": {
      "id": "65f1c234a5b6cd00100300001",
      "email": "patient@example.com",
      "username": "patient_1704067200000",
      "role": "patient",
      "firstName": "John",
      "lastName": "Doe",
      "age": 35,
      "medicalHistory": "No known allergies, diabetic",
      "isActive": true
    }
  }
}
```

**Error Response (400 - Age < 18):**
```json
{
  "success": false,
  "message": "Patient must be at least 18 years old"
}
```

**Error Response (403 - Non-Patient Registration):**
```json
{
  "success": false,
  "message": "Only patients can self-register. Contact admin to create other accounts"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "PatientPass123",
    "firstName": "John",
    "lastName": "Doe",
    "age": 35,
    "medicalHistory": "No known allergies"
  }'
```

---

### Admin Creates Admin Account (Admin-Only Endpoint)

**Endpoint:** `POST /api/admin/create-admin`
**Description:** Only existing admins can create new admin accounts
**Required:** Admin JWT token

**Request:**
```bash
POST /api/admin/create-admin
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "newadmin@hospital.com",
  "password": "AdminPass123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1-555-555-5555"
}
```

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "data": {
    "admin": {
      "id": "65f1c234a5b6cd00100300002",
      "email": "newadmin@hospital.com",
      "username": "newadmin@hospital_admin_1704067200000",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "admin",
      "isActive": true
    }
  }
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/admin/create-admin \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@hospital.com",
    "password": "AdminPass123",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1-555-555-5555"
  }'
```

---

### Admin Creates Doctor Account (Admin-Only Endpoint)

**Endpoint:** `POST /api/admin/create-doctor`
**Description:** Only admins can create doctor accounts (starts as inactive)
**Required:** Admin JWT token

**Request:**
```bash
POST /api/admin/create-doctor
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "dr.sarah@hospital.com",
  "password": "DoctorPass123",
  "firstName": "Sarah",
  "lastName": "Williams",
  "phone": "+1-555-555-5555",
  "specialization": "Cardiology",
  "department": "Cardiology Department",
  "licenseNumber": "MD87654321"
}
```

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "Doctor account created successfully",
  "data": {
    "doctor": {
      "id": "65f1c234a5b6cd00100300003",
      "email": "dr.sarah@hospital.com",
      "username": "dr.sarah1704067200000",
      "firstName": "Sarah",
      "lastName": "Williams",
      "specialization": "Cardiology",
      "department": "Cardiology Department",
      "licenseNumber": "MD87654321",
      "role": "doctor",
      "isActive": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Note:** Doctor account is created with `isActive: false` and must be approved by admin before the doctor can login.

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/admin/create-doctor \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.sarah@hospital.com",
    "password": "DoctorPass123",
    "firstName": "Sarah",
    "lastName": "Williams",
    "phone": "+1-555-555-5555",
    "specialization": "Cardiology",
    "department": "Cardiology Department",
    "licenseNumber": "MD87654321"
  }'
```

---

### Admin Approves Doctor

**Endpoint:** `PUT /api/admin/doctors/:doctorId/approve`
**Description:** Approve a pending doctor (set isActive=true)
**Required:** Admin JWT token

**Request:**
```bash
PUT /api/admin/doctors/65f1c234a5b6cd00100300003/approve
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Doctor approved successfully",
  "data": {
    "id": "65f1c234a5b6cd00100300003",
    "email": "dr.sarah@hospital.com",
    "firstName": "Sarah",
    "lastName": "Williams",
    "specialization": "Cardiology",
    "isActive": true,
    "approvedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Curl Example:**
```bash
curl -X PUT http://localhost:5000/api/admin/doctors/65f1c234a5b6cd00100300003/approve \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

---

### Patient Registration (Public Endpoint)

**Endpoint:** `POST /api/auth/register`
**Description:** Patients can self-register publicly

**Request:**
```bash
POST /api/auth/register
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "patient@example.com",
  "password": "PatientPass123",
  "firstName": "John",
  "lastName": "Doe",
  "age": 35,
  "medicalHistory": "No known allergies"
}
```

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWYxYzIzNGE1YjZjZDAwMTAwMzAwMDMiLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTcxMDM1MTIwMCwiZXhwIjoxNzEwOTU2MDAwfQ.ghi789jkl012",
    "user": {
      "id": "65f1c234a5b6cd00100300003",
      "email": "patient@example.com",
      "username": "patient_1704067200000",
      "role": "patient",
      "firstName": "John",
      "lastName": "Doe",
      "age": 35,
      "medicalHistory": "No known allergies",
      "isActive": true
    }
  }
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "PatientPass123",
    "firstName": "John",
    "lastName": "Doe",
    "age": 35,
    "medicalHistory": "No known allergies"
  }'
```

**Note:** Patient account is created with `isActive: true` and can immediately book appointments without waiting for admin approval.

---

## 🔐 Login Payloads

All registered users (Patient, Doctor, Admin) login using the same endpoint:



**New Flow:** Doctors are created only by admins via `POST /api/admin/create-doctor`

See **ADMIN_OPERATIONS_API.md** → **Section 2.1** for complete doctor creation details.

**Quick Note:**
- Doctors do NOT self-register
- Only admins can create doctor accounts
- Newly created doctors have `isActive: false`
- Admins must approve doctors before they can login
- Once approved, doctors login using `POST /api/auth/login` with their email & password

---

### ⚠️ Admin Registration (Admin-Only - See ADMIN_OPERATIONS_API.md)

**New Flow:** Admins are created only by other admins via `POST /api/admin/create-admin`

See **ADMIN_OPERATIONS_API.md** → **Section 1.1** for complete admin creation details.

**Quick Note:**
- Admins do NOT self-register
- Only existing admins can create new admin accounts
- New admins have `isActive: true` immediately
- Admins login using `POST /api/auth/login` with their email & password

---

## 🔐 Login Payloads

### Admin Login

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "admin@hospital.com",
  "password": "AdminPass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWYxYzIzNGE1YjZjZDAwMTAwMzAwMDEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MTA0NzM2MDAsImV4cCI6MTcxMTA3ODQwMH0.mno345pqr678",
    "user": {
      "id": "65f1c234a5b6cd00100300001",
      "email": "admin@hospital.com",
      "username": "admin_user",
      "role": "admin",
      "firstName": "John",
      "lastName": "Administrator",
      "phone": "+1-914-555-0001"
    }
  }
}
```

**Response (Failure - Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "AdminPass123!"
  }'
```

---

### Doctor Login

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "dr.smith@hospital.com",
  "password": "DoctorPass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWYxYzIzNGE1YjZjZDAwMTAwMzAwMDIiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzEwNDczNjAwLCJleHAiOjE3MTEwNzg0MDB9.stu901vwx234",
    "user": {
      "id": "65f1c234a5b6cd00100300002",
      "email": "dr.smith@hospital.com",
      "username": "dr_smith",
      "role": "doctor",
      "firstName": "Dr.",
      "lastName": "Smith",
      "phone": "+1-914-555-0002",
      "specialization": "Cardiology",
      "department": "Cardiology"
    }
  }
}
```

**Response (Failure - Account Inactive):**
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact admin."
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.smith@hospital.com",
    "password": "DoctorPass123!"
  }'
```

---

### Patient Login

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json
```

**Payload:**
```json
{
  "email": "john.doe@example.com",
  "password": "PatientPass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWYxYzIzNGE1YjZjZDAwMTAwMzAwMDMiLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTcxMDQ3MzYwMCwiZXhwIjoxNzExMDc4NDAwfQ.yza567bcd890",
    "user": {
      "id": "65f1c234a5b6cd00100300003",
      "email": "john.doe@example.com",
      "username": "john_doe_99",
      "role": "patient",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1-914-555-0100"
    }
  }
}
```

**Response (Failure - Wrong Password):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "PatientPass123!"
  }'
```

---

## 📊 Comparison Table

| Field | Admin | Doctor | Patient |
|-------|-------|--------|---------|
| **Creation Method** | Admin-only endpoint | Admin-only endpoint | Public registration |
| email | ✅ Required | ✅ Required | ✅ Required |
| password | ✅ Required | ✅ Required | ✅ Required |
| firstName | ✅ Required | ✅ Required | ✅ Required |
| lastName | ✅ Required | ✅ Required | ✅ Required |
| phone | ✅ Optional | ✅ Optional | ✅ Optional |
| specialization | ❌ N/A | ✅ Required | ❌ N/A |
| department | ❌ N/A | ✅ Optional | ❌ N/A |
| licenseNumber | ❌ N/A | ✅ Required | ❌ N/A |
| age | ❌ N/A | ❌ N/A | ✅ Optional |
| medicalHistory | ❌ N/A | ❌ N/A | ✅ Optional |
| **Initial Status** | `isActive: true` | `isActive: false` (needs approval) | `isActive: true` |
| **Can login immediately?** | ✅ Yes | ❌ No (wait for approval) | ✅ Yes |

---

## ⚠️ Validation Rules

### Password Requirements
- Minimum 6 characters
- Must match confirmPassword
- Recommended: Mix of uppercase, lowercase, numbers, special characters

### Username Requirements
- Minimum 3 characters
- Must be unique
- Lowercase conversion applied automatically
- No spaces allowed

### Email Requirements
- Must be valid email format
- Must be unique across all users
- Lowercase conversion applied automatically
- Can contain: letters, numbers, dots, hyphens, underscores

### Doctor-Specific Requirements
- specialization: Non-empty string (e.g., "Cardiology", "Neurology")
- licenseNumber: Non-empty string (e.g., "LIC-NY-2024-001234")
- Must provide these or registration will fail with 400 error

### Specializations (Recommended List)
```
- Cardiology
- Neurology
- Dermatology
- Orthopedics
- Pediatrics
- General Medicine
- Internal Medicine
- Surgery
- Psychiatry
- Oncology
- ENT
- Ophthalmology
- Gynecology
- Urology
- Gastroenterology
```

---

## 🔄 Error Responses

### Registration Errors (Public Patient Registration)

**1. Missing Required Fields**
```json
{
  "success": false,
  "message": "Email, password, firstName, and lastName are required"
}
```

**2. Password Too Short**
```json
{
  "success": false,
  "message": "Password must be at least 6 characters"
}
```

**3. Age Less Than 18**
```json
{
  "success": false,
  "message": "Patient must be at least 18 years old"
}
```

**4. Email Already Exists**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

**5. Non-Patient Registration Attempt**
```json
{
  "success": false,
  "message": "Only patients can self-register. Contact admin to create other accounts"
}
```

### Admin-Only Creation Errors (Creating Admin/Doctor)

**1. Missing Required Fields**
```json
{
  "success": false,
  "message": "Email, password, firstName, and lastName are required"
}
```

**2. Missing Doctor Fields**
```json
{
  "success": false,
  "message": "Specialization and license number are required"
}
```

**3. Email Already Exists**
```json
{
  "success": false,
  "message": "Admin with this email already exists" // or "Doctor with this email already exists"
}
```

**4. Not Authorized**
```json
{
  "success": false,
  "message": "Unauthorized - Admin role required"
}
```

### Login Errors

**1. Invalid Email or Password**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**2. Doctor Account Inactive**
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact admin."
}
```

**3. Missing Credentials**
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

---

## 🔐 JWT Token Structure

The token returned in response contains the following claims:

```json
{
  "userId": "65f1c234a5b6cd00100300001",
  "role": "admin",
  "iat": 1710473600,
  "exp": 1711078400
}
```

### Token Details
- **userId**: The database ID of the user
- **role**: User's role (admin, doctor, or patient)
- **iat**: Issued at timestamp
- **exp**: Expiration timestamp (7 days from issue)

### Token Usage
Include the token in all subsequent requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💾 Storing Token (Frontend)

### Secure Storage Options

**Option 1: localStorage (Simple)**
```javascript
const token = response.data.token;
localStorage.setItem('authToken', token);

// Retrieve later
const token = localStorage.getItem('authToken');
```

**Option 2: sessionStorage (Session-only)**
```javascript
sessionStorage.setItem('authToken', token);
```

**Option 3: HttpOnly Cookie (Most Secure - Recommended)**
```javascript
// Backend sets this header:
// Set-Cookie: authToken=<token>; HttpOnly; Secure; SameSite=Strict

// Frontend automatically includes in requests
```

### Using Token in Requests

**JavaScript/Fetch Example:**
```javascript
const token = localStorage.getItem('authToken');

fetch('http://localhost:5000/api/appointments/patient/my-appointments', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

**Axios Example:**
```javascript
const token = localStorage.getItem('authToken');

axios.get('http://localhost:5000/api/appointments/patient/my-appointments', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => console.log(response.data));
```

---

## 📝 Sample Test Flow

### 1. Register as Patient (Public)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient1@test.com",
    "password": "Test@1234",
    "firstName": "Test",
    "lastName": "Patient",
    "age": 30,
    "medicalHistory": "No allergies"
  }'
```

### 2. Admin Creates Doctor (Admin-Only)
```bash
# First, admin must login to get token
ADMIN_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hospital.com", "password": "admin123"}' \
  | jq -r '.data.token')

# Then create doctor
curl -X POST http://localhost:5000/api/admin/create-doctor \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor1@hospital.com",
    "password": "Doc@1234",
    "firstName": "Dr.",
    "lastName": "Test",
    "specialization": "Cardiology",
    "licenseNumber": "LIC-TEST-001"
  }'
```

### 3. Admin Approves Doctor
```bash
curl -X PUT http://localhost:5000/api/admin/doctors/DOCTOR_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Login as Each Role
```bash
# Patient Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "patient1@test.com", "password": "Test@1234"}'

# Doctor Login (after approval)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "doctor1@hospital.com", "password": "Doc@1234"}'

# Admin Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hospital.com", "password": "admin123"}'
```

---

## ✨ Quick Reference

| Use Case | Endpoint | Method | Auth Required |
|----------|----------|--------|---------------|
| Create Account | `/api/auth/register` | POST | ❌ No |
| Login | `/api/auth/login` | POST | ❌ No |
| Use Services | Any other endpoint | GET/POST/PUT | ✅ Yes |

---

For more information, see [COMPLETE_API_ENDPOINTS.md](COMPLETE_API_ENDPOINTS.md)
