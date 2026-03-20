# VAPI Mobile Number Setup - Quick Reference

## ✅ What's Been Configured

### 1. **Phone Number Set** 
- **Number**: +1-914-465-1284
- **Area Code**: 914 (Westchester County, NY)
- **Location**: Configured in `.env`

### 2. **Backend Updates**
```
✓ .env - Added VAPI phone number variables
✓ config/vapi.js - Created VAPI configuration module
✓ models/Call.js - Enhanced with area code tracking
✓ controllers/callController.js - Added outbound call functions
✓ routes/calls.js - Added new API endpoints
✓ server.js - VAPI validation on startup
```

### 3. **New API Endpoints**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/calls/initiate` | POST | Initiate outbound call |
| `/api/calls/:id/status` | GET | Check call status |
| `/api/health` | GET | Health + VAPI config status |

---

## 🚀 Quick Start

### Start Server
```bash
npm start
```

Expected output:
```
✓ VAPI Configured: +1-914-465-1284 (Area Code: 914)
```

### Make Your First Call
```bash
# 1. Get JWT token (from login)
TOKEN="your_jwt_token_here"

# 2. Initiate call
curl -X POST http://localhost:5000/api/calls/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1-9145551234",
    "message": "Hello from Hospital AI"
  }'

# Response:
{
  "success": true,
  "callId": "...",
  "vapiCallId": "...",
  "phoneNumber": "+1-9145551234",
  "fromNumber": "+1-914-465-1284",
  "areaCode": "914",
  "status": "initiated"
}
```

---

## 📞 Area Code 914 Details

**Location Info**:
- **Region**: Westchester County, New York
- **Major Cities**: White Plains, Yonkers, New Rochelle
- **Timezone**: America/New_York (EST/EDT)
- **Type**: Mixed mobile/landline coverage

**Why Use 914?**
- ✓ Local presence for NY patients
- ✓ Builds trust (recognizable US area code)
- ✓ Cost-effective
- ✓ Full US calling coverage

---

## 🔌 VAPI Integration Flow

```
Client Request
    ↓
POST /api/calls/initiate
    ↓
Backend → VAPI API
    ↓
VAPI Initiates Call
    ↓
Patient Answers
    ↓
VAPI Webhook Notification
    ↓
Backend Stores Call Data + Transcript
    ↓
Database (MongoDB)
```

---

## 📁 File Structure

```
config/
  ├── database.js          (existing)
  ├── vapi.js              (NEW - VAPI config)
controllers/
  ├── callController.js    (UPDATED - new functions)
models/
  ├── Call.js              (UPDATED - new fields)
routes/
  ├── calls.js             (UPDATED - new endpoints)
server.js                   (UPDATED - VAPI validation)
.env                        (UPDATED - phone number vars)
VAPI_SETUP_GUIDE.md        (NEW - detailed guide)
```

---

## 🧪 Testing Checklist

- [ ] Server starts with "✓ VAPI Configured" message
- [ ] `/api/health` returns VAPI status
- [ ] Can get JWT token via login
- [ ] Can initiate call to test number
- [ ] Call appears in database
- [ ] Webhook receives call completion data

---

## 🔑 Environment Variables

```env
# Phone Configuration
VAPI_PHONE_NUMBER=+1-914-465-1284
VAPI_AREA_CODE=914
VAPI_BASE_URL=https://api.vapi.ai

# API Key
VAPI_API_KEY=a8134105-5245-4649-be2d-ad61410d2b02

# Other
PORT=5000
NODE_ENV=development
```

---

## 🛠️ Troubleshooting

**Q: "VAPI_PHONE_NUMBER not configured"**  
A: Check `.env` has `VAPI_PHONE_NUMBER=+1-914-465-1284`

**Q: Call not initiating?**  
A: Verify JWT token, phone format (+1-914...), and VAPI API key

**Q: Webhook not working?**  
A: Set webhook URL in VAPI dashboard to your domain

---

## 📖 Full Documentation

For complete setup guide, see: [VAPI_SETUP_GUIDE.md](./VAPI_SETUP_GUIDE.md)

---

## 💡 Next Steps

1. ✅ Backend configured with number
2. → Configure VAPI Dashboard webhook
3. → Test with real calls
4. → Monitor transcripts & recordings
5. → Deploy to production

---

**Quick Links**:
- Server Health: `http://localhost:5000/api/health`
- VAPI Dashboard: https://dashboard.vapi.ai
- API Examples: See [API_EXAMPLES.md](./API_EXAMPLES.md)

