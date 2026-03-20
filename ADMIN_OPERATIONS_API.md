# Admin Operations API Guide

This guide covers all admin-only operations for managing users (admins, doctors, patients) in the Hospital AI Agent system.

## Overview

All admin endpoints require:
1. **Authentication**: Valid JWT token with admin role
2. **Authorization**: Only users with `role: 'admin'` can access these endpoints
3. **Base URL**: `http://localhost:5000/api/admin`

---

## 1. ADMIN ACCOUNT MANAGEMENT

### 1.1 Create New Admin Account

**Endpoint**: `POST /api/admin/create-admin`
**Description**: Create a new admin account (only existing admins can create other admins)
**Authentication**: Required (Admin role)

#### Request Headers
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "newadmin@hospital.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Response (201 - Success)
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "email": "newadmin@hospital.com",
      "username": "newadmin@hospital_admin_1704067200000",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "isActive": true
    }
  }
}
```

#### Error Responses

**400 - Missing Fields**
```json
{
  "success": false,
  "message": "Email, password, firstName, and lastName are required"
}
```

**400 - Weak Password**
```json
{
  "success": false,
  "message": "Password must be at least 6 characters"
}
```

**409 - Email Already Exists**
```json
{
  "success": false,
  "message": "Admin with this email already exists"
}
```

---

### 1.2 Get All Admins

**Endpoint**: `GET /api/admin/all-admins`
**Description**: Retrieve list of all admin accounts
**Authentication**: Required (Admin role)

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number for pagination |
| limit | number | 10 | Number of records per page |

#### Request
```
GET /api/admin/all-admins?page=1&limit=10
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Admins retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "admin@hospital.com",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User",
      "phone": "+1234567890",
      "role": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
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

---

## 2. DOCTOR ACCOUNT MANAGEMENT

### 2.1 Create New Doctor Account

**Endpoint**: `POST /api/admin/create-doctor`
**Description**: Create a new doctor account (account starts as inactive and needs approval)
**Authentication**: Required (Admin role)

#### Request Headers
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "doctor@hospital.com",
  "password": "doctorPass123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321",
  "specialization": "Cardiology",
  "department": "Cardiology Department",
  "licenseNumber": "MD12345678"
}
```

#### Response (201 - Success)
```json
{
  "success": true,
  "message": "Doctor account created successfully",
  "data": {
    "doctor": {
      "id": "507f1f77bcf86cd799439012",
      "email": "doctor@hospital.com",
      "username": "doctor1704067200000",
      "firstName": "Jane",
      "lastName": "Smith",
      "specialization": "Cardiology",
      "department": "Cardiology Department",
      "licenseNumber": "MD12345678",
      "role": "doctor",
      "isActive": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Validation Requirements
| Field | Requirements |
|-------|--------------|
| email | Valid email format, must be unique |
| password | Minimum 6 characters |
| firstName | Required |
| lastName | Required |
| specialization | Required (e.g., Cardiology, Neurology, Pediatrics) |
| licenseNumber | Required (medical license number) |
| phone | Optional but recommended |
| department | Optional |

---

### 2.2 Get All Doctors

**Endpoint**: `GET /api/admin/all-doctors`
**Description**: Retrieve list of all doctors with filtering options
**Authentication**: Required (Admin role)

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Records per page |
| isActive | boolean | - | Filter by active/inactive status |
| specialization | string | - | Filter by specialization |

#### Request Examples

**Get all doctors**
```
GET /api/admin/all-doctors
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

**Get only active doctors**
```
GET /api/admin/all-doctors?isActive=true
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

**Get cardiology doctors**
```
GET /api/admin/all-doctors?specialization=Cardiology&isActive=true
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Doctors retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "doctor@hospital.com",
      "username": "doctor1704067200000",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+1987654321",
      "specialization": "Cardiology",
      "department": "Cardiology Department",
      "licenseNumber": "MD12345678",
      "role": "doctor",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
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

---

### 2.3 Get Pending Doctor Approvals

**Endpoint**: `GET /api/admin/doctors/pending`
**Description**: Get all doctors waiting for approval (isActive = false)
**Authentication**: Required (Admin role)

#### Request
```
GET /api/admin/doctors/pending
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Pending doctor approvals retrieved",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "email": "doctor@hospital.com",
      "username": "doctor1704067200000",
      "firstName": "Jane",
      "lastName": "Smith",
      "specialization": "Cardiology",
      "licenseNumber": "MD12345678",
      "role": "doctor",
      "isActive": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 3
}
```

---

### 2.4 Approve Doctor

**Endpoint**: `PUT /api/admin/doctors/:doctorId/approve`
**Description**: Approve a doctor account (set isActive = true)
**Authentication**: Required (Admin role)

#### Request
```
PUT /api/admin/doctors/507f1f77bcf86cd799439012/approve
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Doctor approved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "email": "doctor@hospital.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "specialization": "Cardiology",
    "isActive": true,
    "approvedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Error Response (404 - Not Found)
```json
{
  "success": false,
  "message": "Doctor not found"
}
```

---

### 2.5 Deactivate Doctor

**Endpoint**: `PUT /api/admin/doctors/:doctorId/deactivate`
**Description**: Deactivate a doctor account
**Authentication**: Required (Admin role)

#### Request Headers
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

#### Request Body
```json
{
  "reason": "License expired"
}
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Doctor deactivated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "email": "doctor@hospital.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "isActive": false,
    "deactivationReason": "License expired",
    "deactivatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 2.6 Update Doctor Information

**Endpoint**: `PUT /api/admin/doctors/:doctorId/update`
**Description**: Update doctor's professional information
**Authentication**: Required (Admin role)

#### Request Headers
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

#### Request Body (All fields optional)
```json
{
  "specialization": "Neurology",
  "department": "Neurology Department",
  "phone": "+1111111111"
}
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Doctor updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "email": "doctor@hospital.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "specialization": "Neurology",
    "department": "Neurology Department",
    "phone": "+1111111111"
  }
}
```

---

## 3. PATIENT MANAGEMENT

### 3.1 Get All Patients

**Endpoint**: `GET /api/admin/all-patients`
**Description**: Retrieve list of all registered patients
**Authentication**: Required (Admin role)

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Records per page |

#### Request
```
GET /api/admin/all-patients?page=1&limit=20
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "email": "patient@example.com",
      "username": "patient123",
      "firstName": "Mike",
      "lastName": "Johnson",
      "age": 35,
      "medicalHistory": "No known allergies",
      "role": "patient",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

---

## 4. USER MANAGEMENT

### 4.1 Get User by ID

**Endpoint**: `GET /api/admin/user/:userId`
**Description**: Get detailed information about a specific user
**Authentication**: Required (Admin role)

#### Request
```
GET /api/admin/user/507f1f77bcf86cd799439013
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "email": "patient@example.com",
    "username": "patient123",
    "firstName": "Mike",
    "lastName": "Johnson",
    "phone": "+1555555555",
    "age": 35,
    "medicalHistory": "No known allergies",
    "role": "patient",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Response (404 - Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## 5. SYSTEM STATISTICS

### 5.1 Get System Statistics

**Endpoint**: `GET /api/admin/statistics`
**Description**: Get comprehensive system statistics
**Authentication**: Required (Admin role)

#### Request
```
GET /api/admin/statistics
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Response (200 - Success)
```json
{
  "success": true,
  "message": "System statistics retrieved",
  "data": {
    "totalUsers": 268,
    "totalAdmins": 3,
    "totalDoctors": 25,
    "activeDoctors": 22,
    "inactiveDoctors": 3,
    "totalPatients": 240,
    "doctorsBySpecialization": [
      {
        "_id": "Cardiology",
        "count": 5
      },
      {
        "_id": "Neurology",
        "count": 4
      },
      {
        "_id": "Pediatrics",
        "count": 6
      },
      {
        "_id": "Orthopedics",
        "count": 5
      },
      {
        "_id": "General Medicine",
        "count": 5
      }
    ]
  }
}
```

---

## Complete Request/Response Workflow Example

### Scenario: Create and Approve a New Doctor

**Step 1: Admin logs in and gets token**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "adminPassword123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@hospital.com",
    "role": "admin"
  }
}
```

**Step 2: Admin creates new doctor account**
```bash
curl -X POST http://localhost:5000/api/admin/create-doctor \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.sarah@hospital.com",
    "password": "doctorPass123",
    "firstName": "Sarah",
    "lastName": "Williams",
    "specialization": "Cardiology",
    "licenseNumber": "MD87654321",
    "department": "Cardiology"
  }'
```

**Step 3: Admin checks pending doctors**
```bash
curl -X GET http://localhost:5000/api/admin/doctors/pending \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Step 4: Admin approves the doctor**
```bash
curl -X PUT http://localhost:5000/api/admin/doctors/507f1f77bcf86cd799439012/approve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Step 5: Doctor can now login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.sarah@hospital.com",
    "password": "doctorPass123"
  }'
```

---

## Error Handling

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success - Request completed |
| 201 | Created - Resource successfully created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid JWT token |
| 403 | Forbidden - User doesn't have admin role |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Email already exists |
| 500 | Server Error - Internal server error |

### Error Response Format

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Security Notes

1. **Never expose JWT tokens** - Keep tokens secure and don't share in logs/messages
2. **Password requirements** - Minimum 6 characters (enforcement on backend)
3. **Email uniqueness** - All emails must be unique across all users
4. **Doctor approval workflow** - Newly created doctors are inactive until approved
5. **Role-based access** - Only admins can access all endpoints
6. **Token expiration** - JWT tokens expire after 7 days
7. **Password hashing** - All passwords are hashed with bcryptjs (10 salt rounds)

---

## Updated Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. PATIENT REGISTRATION (Public)
   POST /api/auth/register
   ├─ role: "patient" (enforced)
   ├─ email, password, firstName, lastName, age, medicalHistory
   └─ Returns: JWT token, user data

2. ADMIN CREATES OTHER ADMINS
   POST /api/admin/create-admin
   ├─ Requires: Admin JWT token
   ├─ email, password, firstName, lastName
   └─ Returns: Created admin data

3. ADMIN CREATES DOCTORS
   POST /api/admin/create-doctor
   ├─ Requires: Admin JWT token
   ├─ email, password, specialization, licenseNumber, etc.
   ├─ New doctors start as inactive (isActive=false)
   └─ Returns: Created doctor data

4. ADMIN APPROVES DOCTORS
   PUT /api/admin/doctors/:doctorId/approve
   ├─ Requires: Admin JWT token
   └─ Sets: isActive=true

5. ALL USERS LOGIN
   POST /api/auth/login
   ├─ email, password
   ├─ Checks: isActive status
   └─ Returns: JWT token + user data
```

---

## Quick Reference Table

| Operation | Endpoint | Method | Auth Required | Role Required |
|-----------|----------|--------|---------------|---------------|
| Register Patient | /api/auth/register | POST | No | N/A |
| Login Any User | /api/auth/login | POST | No | N/A |
| Create Admin | /api/admin/create-admin | POST | Yes | Admin |
| Create Doctor | /api/admin/create-doctor | POST | Yes | Admin |
| Get All Admins | /api/admin/all-admins | GET | Yes | Admin |
| Get All Doctors | /api/admin/all-doctors | GET | Yes | Admin |
| Get Pending Doctors | /api/admin/doctors/pending | GET | Yes | Admin |
| Approve Doctor | /api/admin/doctors/:id/approve | PUT | Yes | Admin |
| Deactivate Doctor | /api/admin/doctors/:id/deactivate | PUT | Yes | Admin |
| Update Doctor | /api/admin/doctors/:id/update | PUT | Yes | Admin |
| Get All Patients | /api/admin/all-patients | GET | Yes | Admin |
| Get User by ID | /api/admin/user/:id | GET | Yes | Admin |
| System Statistics | /api/admin/statistics | GET | Yes | Admin |

