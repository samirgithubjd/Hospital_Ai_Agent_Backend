# Hospital AI Voice Agent Backend

A production-ready backend for a hospital AI voice agent system that receives calls from Vapi AI, processes patient data, and stores it in MongoDB.

## Features

- **JWT Authentication**: Secure admin login with token-based authentication
- **MongoDB Integration**: Mongoose models for Admin, Patient, and Call data
- **Vapi Webhook Integration**: Receive and process call data from Vapi AI voice agent
- **Emergency Detection**: Automatically detects emergency keywords in transcripts
- **Patient Information Extraction**: Parses transcripts to extract patient details
- **Protected Routes**: Role-based access control for admin endpoints
- **Error Handling**: Comprehensive error handling middleware
- **Request Logging**: Console logging for all HTTP requests
- **CORS Enabled**: Cross-origin resource sharing configured

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs for password hashing
- **Configuration**: dotenv for environment variables
- **CORS**: Cross-origin resource sharing

## Project Structure

```
hospital-ai-agent-backend/
├── config/
│   └── database.js           # MongoDB connection configuration
├── models/
│   ├── Admin.js              # Admin schema with password hashing
│   ├── Patient.js            # Patient schema
│   └── Call.js               # Call records schema
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── patientController.js  # Patient management
│   ├── callController.js     # Call records management
│   ├── appointmentController.js # Appointments management
│   └── webhookController.js  # Vapi webhook processing
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   ├── errorHandler.js       # Global error handling
│   └── logger.js             # Request logging
├── routes/
│   ├── auth.js               # Authentication routes
│   ├── patients.js           # Patient routes
│   ├── calls.js              # Call routes
│   ├── appointments.js       # Appointment routes
│   └── webhook.js            # Webhook routes
├── .env                       # Environment variables
├── server.js                  # Main server file
└── package.json              # Project dependencies
```

## Installation

### Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- MongoDB account (Atlas recommended)

### Setup Steps

1. **Clone or navigate to the project directory**:
   ```bash
   cd hospital-ai-agent-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - The `.env` file is already configured with the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb+srv://samirjadav271:samir%40jadav%232103@cluster0.t5bjitg.mongodb.net/hospital_ai
     JWT_SECRET=supersecretkey
     VAPI_API_KEY=a8134105-5245-4649-be2d-ad61410d2b02
     NODE_ENV=development
     ```
   - **Note**: In production, update these values securely

4. **Start the server**:
   ```bash
   npm start
   ```

   The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

#### Register Admin
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@hospital.com",
  "password": "securepassword123",
  "confirmPassword": "securepassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "admin": {
      "id": "66123abc...",
      "email": "admin@hospital.com"
    }
  }
}
```

#### Login Admin
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@hospital.com",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "66123abc...",
      "email": "admin@hospital.com"
    }
  }
}
```

### Patients (Protected - Requires Auth Token)

#### Get All Patients
```http
GET /api/patients
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [
    {
      "_id": "66123abc...",
      "name": "John Doe",
      "age": 45,
      "phone": "+1234567890",
      "symptoms": "chest pain and difficulty breathing",
      "isEmergency": true,
      "createdAt": "2026-03-18T10:30:00Z"
    }
  ]
}
```

#### Get Patient by ID
```http
GET /api/patients/:id
Authorization: Bearer <token>
```

### Calls (Protected - Requires Auth Token)

#### Get All Calls
```http
GET /api/calls
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Calls retrieved successfully",
  "data": [
    {
      "_id": "66123xyz...",
      "patientId": "66123abc...",
      "phoneNumber": "+1234567890",
      "duration": 420,
      "status": "completed",
      "transcript": "Hello, my name is John Doe. I am 45 years old...",
      "recordingUrl": "https://recordings.vapi.ai/call123.mp3",
      "createdAt": "2026-03-18T10:30:00Z"
    }
  ]
}
```

#### Get Call by ID
```http
GET /api/calls/:id
Authorization: Bearer <token>
```

### Appointments (Protected - Requires Auth Token)

#### Get All Appointments
```http
GET /api/appointments
Authorization: Bearer <token>
```

### Vapi Webhook (Unprotected)

#### Receive Call Data from Vapi
```http
POST /api/webhook/vapi
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "duration": 420,
  "status": "completed",
  "transcript": "Hello, my name is John Doe. I am 45 years old and I'm experiencing chest pain.",
  "recordingUrl": "https://recordings.vapi.ai/call123.mp3"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "callId": "66123xyz...",
    "patientId": "66123abc...",
    "isEmergency": true
  }
}
```

## Database Models

### Admin Model
```javascript
{
  email: String (required, unique),
  password: String (hashed, required),
  timestamps: { createdAt, updatedAt }
}
```

### Patient Model
```javascript
{
  name: String,
  age: Number,
  phone: String,
  symptoms: String,
  isEmergency: Boolean (default: false),
  createdAt: Date
}
```

### Call Model
```javascript
{
  patientId: ObjectId (ref: Patient),
  phoneNumber: String,
  duration: Number,
  status: String (enum: 'completed', 'missed'),
  transcript: String,
  recordingUrl: String,
  createdAt: Date
}
```

## Emergency Detection

The system automatically detects emergency calls based on keywords in the transcript:
- "chest pain"
- "accident"
- "bleeding"
- "unconscious"
- "heart attack"
- "breathing difficulty"
- "severe pain"
- "critical"
- "emergency"

When an emergency is detected, the patient's `isEmergency` field is set to `true` and a warning is logged to the console.

## Features

### Automatic Patient Information Extraction

The webhook controller automatically extracts patient information from the call transcript:
- **Name**: Extracted from patterns like "my name is..." or "I'm..."
- **Age**: Extracted from patterns like "I'm X years old" or "age is X"
- **Symptoms**: Stores the entire transcript as symptoms

### JWT Authentication

- Tokens are valid for 7 days
- Include token in the `Authorization` header as: `Bearer <token>`
- Protected routes require valid token

### Error Handling

- Global error handling middleware catches all errors
- Consistent error response format
- Detailed logging in development mode

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```
(Requires `nodemon` to be installed globally or added to devDependencies)

### Production Mode
```bash
npm start
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` file with real credentials
2. **JWT Secret**: Use a strong, randomly generated secret in production
3. **MongoDB URI**: Use strong passwords and IP whitelisting
4. **CORS**: Configure CORS appropriately for production frontend URL
5. **Password Hashing**: All passwords are hashed with bcryptjs before storage
6. **VAPI_API_KEY**: Never expose API keys in frontend code

## Example Workflow

1. **Admin Registration**:
   ```bash
   POST /api/auth/register
   Email: admin@hospital.com
   Password: securepass123
   ```

2. **Admin Login**:
   ```bash
   POST /api/auth/login
   Email: admin@hospital.com
   Password: securepass123
   → Returns JWT token
   ```

3. **Vapi Webhook Call** (from Vapi AI system):
   ```bash
   POST /api/webhook/vapi
   {
     "phoneNumber": "+1234567890",
     "duration": 300,
     "status": "completed",
     "transcript": "My name is Jane Smith, I am 28 years old and experiencing chest pain",
     "recordingUrl": "https://..."
   }
   → Automatically creates Patient and Call records
   → Sets isEmergency to true
   ```

4. **Admin Retrieves Patients** (with token):
   ```bash
   GET /api/patients
   Authorization: Bearer <token>
   → Returns all patients including the new one
   ```

5. **Admin Views Call Details**:
   ```bash
   GET /api/calls/:callId
   Authorization: Bearer <token>
   → Returns call details with patient info
   ```

## Logging

All HTTP requests are automatically logged with:
- Timestamp
- HTTP method
- URL path
- Response status code

Emergency calls are logged with special warnings:
```
⚠ EMERGENCY CALL DETECTED from +1234567890
  Patient: Jane Smith
  Transcript excerpt: My name is Jane Smith...
```

## Development Tips

1. Use Postman or Insomnia to test API endpoints
2. Keep `.env` file for local development, don't commit it
3. Check server logs for webhook processing details
4. Test authentication by copying the token from login response
5. Use `?` in queries to pass the token if testing in browser

## Production Deployment

Before deploying to production:

1. Update `.env` with production values:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate strong random string>
   MONGODB_URI=<production MongoDB URL>
   VAPI_API_KEY=<production API key>
   PORT=<production port>
   ```

2. Review and update CORS settings for your frontend domain

3. Set up MongoDB indexes for better query performance

4. Use a process manager (PM2, systemd) to keep the server running

5. Configure nginx/Apache as reverse proxy with HTTPS

6. Set up monitoring and error tracking (Sentry, DataDog)

7. Enable request rate limiting for webhook endpoint

## Support & Troubleshooting

### MongoDB Connection Error
- Verify MongoDB URI in `.env`
- Check MongoDB Atlas IP whitelist includes your server IP
- Ensure connection string is correctly formatted

### JWT Token Issue
- Token must be included in `Authorization` header as `Bearer <token>`
- Token expires after 7 days, user needs to login again
- Check `JWT_SECRET` matches between server and token

### Webhook Not Working
- Verify Vapi is sending correct JSON payload
- Check server logs for error messages
- Ensure MongoDB is connected
- Test webhook endpoint with curl or Postman

## License

ISC

## Author

Created for Hospital AI Voice Agent System
