# API Integration Examples

## 1. Admin Authentication Flow

### Register New Admin

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "SecurePassword123",
    "confirmPassword": "SecurePassword123"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "email": "admin@hospital.com"
    }
  }
}
```

### Login to Get JWT Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "SecurePassword123"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiNTA3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIiwiZW1haWwiOiJhZG1pbkBob3NwaXRhbC5jb20iLCJpYXQiOjE3NDU2NzU2MzksImV4cCI6MTc0NjI4MDQzOX0.x1Y2Z3a4B5c6D7e8F9g0H1i2J3k4L5m6N7o8P9q0",
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "email": "admin@hospital.com"
    }
  }
}
```

Save the token for authenticated requests.

---

## 2. Vapi Webhook Integration

### Example: Vapi Sending Call Data

The Vapi AI system sends call data to your webhook endpoint. Configure Vapi to POST to:
```
https://your-domain.com/api/webhook/vapi
```

### Webhook Request Example

```bash
curl -X POST http://localhost:5000/api/webhook/vapi \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1-555-123-4567",
    "duration": 420,
    "status": "completed",
    "transcript": "Hello, my name is John Doe. I am 45 years old. I am experiencing chest pain and difficulty breathing.",
    "recordingUrl": "https://recordings.vapi.ai/call-2026-03-18-12345.mp3"
  }'
```

### Webhook Response

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "callId": "507f1f77bcf86cd799439012",
    "patientId": "507f1f77bcf86cd799439013",
    "isEmergency": true
  }
}
```

### Emergency Detection Example

For this transcript: "My name is Sarah Johnson. I am 32 years old. I had an accident and I'm bleeding heavily!"

The system will:
- Extract: Name = Sarah Johnson, Age = 32
- Detect: isEmergency = true (due to "accident" and "bleeding")
- Create: Patient record with isEmergency=true
- Create: Call record linked to patient
- Log: ⚠ EMERGENCY CALL DETECTED

---

## 3. Retrieve Patient Data (Protected Route)

### Get All Patients

```bash
TOKEN="<JWT_TOKEN_FROM_LOGIN>"

curl -X GET http://localhost:5000/api/patients \
  -H "Authorization: Bearer $TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "John Doe",
      "age": 45,
      "phone": "+1-555-123-4567",
      "symptoms": "chest pain and difficulty breathing",
      "isEmergency": true,
      "createdAt": "2026-03-18T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Sarah Johnson",
      "age": 32,
      "phone": "+1-555-987-6543",
      "symptoms": "headache and dizziness",
      "isEmergency": false,
      "createdAt": "2026-03-18T11:15:00.000Z"
    }
  ]
}
```

### Get Specific Patient

```bash
TOKEN="<JWT_TOKEN_FROM_LOGIN>"
PATIENT_ID="507f1f77bcf86cd799439013"

curl -X GET http://localhost:5000/api/patients/$PATIENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "Patient retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "John Doe",
    "age": 45,
    "phone": "+1-555-123-4567",
    "symptoms": "chest pain and difficulty breathing",
    "isEmergency": true,
    "createdAt": "2026-03-18T10:30:00.000Z"
  }
}
```

---

## 4. Retrieve Call Records (Protected Route)

### Get All Calls

```bash
TOKEN="<JWT_TOKEN_FROM_LOGIN>"

curl -X GET http://localhost:5000/api/calls \
  -H "Authorization: Bearer $TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "Calls retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "patientId": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "John Doe",
        "age": 45,
        "phone": "+1-555-123-4567",
        "symptoms": "chest pain and difficulty breathing",
        "isEmergency": true,
        "createdAt": "2026-03-18T10:30:00.000Z"
      },
      "phoneNumber": "+1-555-123-4567",
      "duration": 420,
      "status": "completed",
      "transcript": "Hello, my name is John Doe. I am 45 years old. I am experiencing chest pain and difficulty breathing.",
      "recordingUrl": "https://recordings.vapi.ai/call-2026-03-18-12345.mp3",
      "createdAt": "2026-03-18T10:30:00.000Z"
    }
  ]
}
```

### Get Specific Call

```bash
TOKEN="<JWT_TOKEN_FROM_LOGIN>"
CALL_ID="507f1f77bcf86cd799439012"

curl -X GET http://localhost:5000/api/calls/$CALL_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Health Check

```bash
curl -X GET http://localhost:5000/api/health
```

**Response**:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-18T15:45:30.123Z"
}
```

---

## 6. JavaScript Frontend Integration Example

### Register Admin

```javascript
async function registerAdmin() {
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@hospital.com',
      password: 'SecurePassword123',
      confirmPassword: 'SecurePassword123'
    })
  });

  const data = await response.json();
  console.log(data);
}
```

### Login and Get Token

```javascript
async function loginAdmin() {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@hospital.com',
      password: 'SecurePassword123'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    // Store token in localStorage
    localStorage.setItem('authToken', data.data.token);
    console.log('Login successful!');
    return data.data.token;
  } else {
    console.error('Login failed:', data.message);
  }
}
```

### Fetch Protected Data

```javascript
async function getPatients() {
  const token = localStorage.getItem('authToken');

  const response = await fetch('http://localhost:5000/api/patients', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('Patients:', data.data);
  return data.data;
}
```

### Filter Emergency Calls

```javascript
async function getEmergencyCalls() {
  const token = localStorage.getItem('authToken');

  const response = await fetch('http://localhost:5000/api/calls', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  
  // Filter for emergency calls
  const emergencyCalls = data.data.filter(call => 
    call.patientId && call.patientId.isEmergency
  );
  
  console.log('Emergency Calls:', emergencyCalls);
  return emergencyCalls;
}
```

---

## 7. Error Handling Examples

### Unauthorized (Missing Token)

```bash
curl -X GET http://localhost:5000/api/patients
```

**Response** (401):
```json
{
  "success": false,
  "message": "No authorization header provided"
}
```

### Invalid Token

```bash
curl -X GET http://localhost:5000/api/patients \
  -H "Authorization: Bearer invalid-token"
```

**Response** (401):
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Patient Not Found

```bash
curl -X GET http://localhost:5000/api/patients/invalid-id \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (404):
```json
{
  "success": false,
  "message": "Patient not found"
}
```

### Validation Error (Register)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "short",
    "confirmPassword": "short"
  }'
```

**Response** (400):
```json
{
  "success": false,
  "message": "Password must be at least 6 characters"
}
```

---

## 8. Testing with Postman

### Setting up Postman Collection

1. **Create new collection**: "Hospital AI Backend"

2. **Create requests**:
   - POST `{{base_url}}/api/auth/register`
   - POST `{{base_url}}/api/auth/login`
   - GET `{{base_url}}/api/patients`
   - GET `{{base_url}}/api/calls`
   - POST `{{base_url}}/api/webhook/vapi`

3. **Set variables**:
   - `base_url`: http://localhost:5000
   - `token`: (Auto-save from login response)

4. **Pre-request script** for login:
   ```javascript
   // After login, automatically save token
   pm.environment.set("token", pm.response.json().data.token);
   ```

5. **Headers for protected routes**:
   ```
   Authorization: Bearer {{token}}
   ```

---

## Notes

- Keep your JWT token secret
- Tokens expire after 7 days
- Always use HTTPS in production
- The webhook endpoint is public (no auth required) for Vapi integration
- All other endpoints require JWT authentication
- Emergency keywords are case-insensitive
