# VAPI Mobile Number Setup Guide

## Overview
This guide explains how to use VAPI's area code based mobile number (+1-914-465-1284) for your Hospital AI Voice Agent backend.

---

## 1. Phone Number Configuration

### Phone Number Details
- **Phone Number**: +1-914-465-1284
- **Area Code**: 914 (Westchester County, New York)
- **Country Code**: +1 (United States)
- **Region**: Westchester County, NY
- **Timezone**: America/New_York

### Environment Variables
The phone number is configured in `.env`:
```env
VAPI_PHONE_NUMBER=+1-914-465-1284
VAPI_AREA_CODE=914
VAPI_BASE_URL=https://api.vapi.ai
VAPI_API_KEY=your_api_key_here
```

---

## 2. Area Code Understanding (914)

### What is Area Code 914?
- **Location**: Westchester County, New York
- **Coverage**: Includes cities like White Plains, Yonkers, New Rochelle
- **Type**: Mobile/Landline hybrid coverage
- **Calling Zone**: All US numbers (local and long-distance)

### Benefits of Area Code Based Number
✓ **Local Presence**: Appears local to NY area patients  
✓ **Trust Factor**: Recognizable US area code  
✓ **Caller ID**: Displays as +1-914-465-1284  
✓ **Geographic Relevance**: Useful for hospitals in NY region  

---

## 3. Backend Configuration

### Configure VAPI in Your App
The VAPI configuration is located in `config/vapi.js`:

```javascript
const vapiConfig = require('./config/vapi');

// Validate configuration on startup
vapiConfig.validate();

// Access phone number
console.log(vapiConfig.phoneNumber);  // +1-914-465-1284
console.log(vapiConfig.areaCode);     // 914
```

### Initialize Server
```bash
npm start
# Output: ✓ VAPI Configured: +1-914-465-1284 (Area Code: 914)
```

---

## 4. API Endpoints

### Initiate Outbound Call

**Endpoint**: `POST /api/calls/initiate`

**Authentication**: Required (JWT Token)

**Request Body**:
```json
{
  "patientId": "507f1f77bcf86cd799439011",
  "message": "Hello, this is a call from Hospital AI. Can you confirm your appointment?"
}
```

**Alternative (using phone number)**:
```json
{
  "phoneNumber": "+1-914-465-1284",
  "message": "Hello from Hospital AI Voice Agent"
}
```

**Response**: 
```json
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "callId": "507f1f77bcf86cd799439011",
    "vapiCallId": "abc123def456",
    "phoneNumber": "+1-914-465-1284",
    "fromNumber": "+1-914-465-1284",
    "areaCode": "914",
    "status": "initiated"
  }
}
```

### Get Call Status

**Endpoint**: `GET /api/calls/:id/status`

**Response**:
```json
{
  "success": true,
  "message": "Call status retrieved",
  "data": {
    "callId": "507f1f77bcf86cd799439011",
    "vapiStatus": "completed",
    "dbStatus": "completed",
    "duration": 245,
    "transcript": "Patient confirmed appointment...",
    "recordingUrl": "https://vapi.ai/recordings/..."
  }
}
```

### List All Calls

**Endpoint**: `GET /api/calls`

**Response**:
```json
{
  "success": true,
  "message": "Calls retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "phoneNumber": "+1-914-465-1284",
      "fromNumber": "+1-914-465-1284",
      "status": "completed",
      "duration": 245,
      "callType": "outbound",
      "areaCode": "914",
      "transcript": "...",
      "createdAt": "2024-03-19T10:30:00Z"
    }
  ]
}
```

---

## 5. VAPI Webhook Setup

### Configure Webhook URL
In your VAPI Dashboard:

1. Go to **Settings** → **Webhooks**
2. Set Webhook URL:
   ```
   http://your-domain.com/api/webhook/vapi
   ```

3. Enable Events:
   - ✓ Call Started
   - ✓ Call Ended
   - ✓ Message Received
   - ✓ Transcription Updated

### Webhook Events Received

**Call Completed Event**:
```json
{
  "phoneNumber": "+1-914-465-1284",
  "duration": 245,
  "status": "completed",
  "transcript": "Patient details...",
  "recordingUrl": "https://vapi.ai/..."
}
```

The backend will:
1. Extract patient information from transcript
2. Detect emergency keywords
3. Create/update patient records
4. Store call data in MongoDB

---

## 6. Database Schema

### Call Record Structure
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (optional),
  phoneNumber: String,
  fromNumber: String,
  duration: Number,
  status: String, // initiated, ringing, connected, completed, missed, failed
  transcript: String,
  recordingUrl: String,
  vapiCallId: String,
  callType: String, // inbound, outbound
  areaCode: String, // 914
  createdAt: Date
}
```

---

## 7. Usage Examples

### Example 1: Initiate Call to Patient

```bash
curl -X POST http://localhost:5000/api/calls/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "507f1f77bcf86cd799439011",
    "message": "Hello, this is your appointment reminder"
  }'
```

### Example 2: Initiate Call to Phone Number

```bash
curl -X POST http://localhost:5000/api/calls/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1-9145551234",
    "message": "Important health reminder from your hospital"
  }'
```

### Example 3: Check Call Status

```bash
curl -X GET http://localhost:5000/api/calls/507f1f77bcf86cd799439011/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 8. Troubleshooting

### Issue: "VAPI_PHONE_NUMBER not configured"
**Solution**: Ensure `.env` file contains:
```env
VAPI_PHONE_NUMBER=+1-914-465-1284
VAPI_API_KEY=your_api_key
```

### Issue: Calls not being initiated
**Check**:
1. JWT token is valid: `Authorization: Bearer <token>`
2. Phone number format is correct: `+1-914-465-1284`
3. VAPI API key is valid in `.env`
4. Patient exists if using `patientId`

**Debug**: Check server logs for error messages

### Issue: Webhook not receiving data
**Steps**:
1. Verify webhook URL in VAPI Dashboard: `http://your-domain.com/api/webhook/vapi`
2. Ensure backend is publicly accessible (use ngrok for local testing)
3. Check firewall/proxy settings
4. Verify events are enabled in VAPI settings

### Issue: Area Code appearing differently
**Note**: VAPI may format the number as:
- +1-914-465-1284 (your default)
- +19144651284 (without formatting)
- 914-465-1284 (local format)

All are equivalent. The backend normalizes this internally.

---

## 9. Testing Locally with ngrok

### Setup ngrok Tunnel
```bash
# Install ngrok (if not installed)
npm install -g ngrok

# Start ngrok tunnel
ngrok http 5000

# Output:
# Forwarding: https://abc123.ngrok.io → http://localhost:5000
```

### Update .env
```env
WEBHOOK_URL=https://abc123.ngrok.io/api/webhook/vapi
```

### Update VAPI Webhook URL
In VAPI Dashboard: `https://abc123.ngrok.io/api/webhook/vapi`

### Test Call
```bash
curl -X POST http://localhost:5000/api/calls/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1-9145551234"}'
```

---

## 10. Production Checklist

- [ ] VAPI_API_KEY is secure and not hardcoded
- [ ] VAPI_PHONE_NUMBER is set correctly
- [ ] Webhook URL is publicly accessible (HTTPS)
- [ ] All VAPI events are enabled
- [ ] Database backups are configured
- [ ] Error logging is enabled
- [ ] CORS is properly configured
- [ ] JWT tokens have appropriate expiration
- [ ] Rate limiting is implemented
- [ ] SSL certificate is valid

---

## 11. Next Steps

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Create admin account** (see README.md)

3. **Register patients** via `/api/patients/register`

4. **Initiate test calls** via `/api/calls/initiate`

5. **Monitor webhooks** for call completions

6. **Review transcripts and records** in MongoDB

---

## 12. Support Resources

- **VAPI Documentation**: https://docs.vapi.ai
- **VAPI Dashboard**: https://dashboard.vapi.ai
- **Area Code 914 Info**: Westchester County, NY
- **Backend API Docs**: See [API_EXAMPLES.md](../API_EXAMPLES.md)

---

## Important Notes

⚠️ **Rate Limiting**: VAPI may have rate limits on API calls  
⚠️ **Costs**: Calls via VAPI may incur charges - check your plan  
⚠️ **Compliance**: Ensure HIPAA compliance for healthcare calls  
⚠️ **Time Zones**: 914 area is in America/New_York timezone  

---

**Last Updated**: March 19, 2024  
**Version**: 1.0.0
