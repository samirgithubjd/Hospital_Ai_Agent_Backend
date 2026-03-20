# Testing the `/api/calls/initiate` Endpoint

## ✅ What Was Fixed

1. **Route Ordering** - POST `/initiate` and GET `/:id/status` now defined before wildcard `/:id`
2. **Error Handling** - Better validation with helpful error messages
3. **Body Validation** - Added explicit check for request body

---

## 🧪 Correct Way to Test

### 1. **Get JWT Token First**

```bash
curl -X POST https://remigial-jace-antecedently.ngrok-free.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. **Save the Token**

```bash
TOKEN="your_token_here"
```

### 3. **Initiate Call - Option A (Phone Number)**

```bash
curl -X POST https://remigial-jace-antecedently.ngrok-free.dev/api/calls/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1-914-555-1234",
    "message": "Hello from Hospital AI"
  }'
```

### 4. **Initiate Call - Option B (Patient ID)**

First, create a patient or get existing patient ID:

```bash
curl -X GET https://remigial-jace-antecedently.ngrok-free.dev/api/patients \
  -H "Authorization: Bearer $TOKEN"
```

Then use the patient ID:

```bash
curl -X POST https://remigial-jace-antecedently.ngrok-free.dev/api/calls/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "507f1f77bcf86cd799439011",
    "message": "Your appointment reminder"
  }'
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Request body is missing"
**Cause**: Missing `Content-Type: application/json` header  
**Fix**: Add header:
```bash
-H "Content-Type: application/json"
```

### Issue 2: "Either phoneNumber or patientId is required"
**Cause**: Neither field provided in request body  
**Fix**: Include at least one:
```json
{
  "phoneNumber": "+1-914-555-1234"
}
```

### Issue 3: "401 Unauthorized" or "Invalid token"
**Cause**: Missing or invalid JWT token  
**Fix**: 
1. Login first to get token
2. Use format: `Authorization: Bearer <token>`
3. Check token hasn't expired

### Issue 4: "Failed to initiate call" + VAPI error
**Cause**: VAPI API key or backend URL issue  
**Fix**:
1. Verify `VAPI_API_KEY` in `.env`
2. Check `VAPI_BASE_URL` is correct
3. Verify VAPI account is active

---

## 📝 Request Format Checklist

- [ ] HTTP Method: **POST**
- [ ] URL: `/api/calls/initiate`
- [ ] Header: `Content-Type: application/json`
- [ ] Header: `Authorization: Bearer <JWT_TOKEN>`
- [ ] Body: Valid JSON with `phoneNumber` OR `patientId`
- [ ] Phone format: `+1-914-555-1234` (E.164 format)

---

## 🔍 Using Postman

1. **Create request**: POST
2. **URL**: `https://remigial-jace-antecedently.ngrok-free.dev/api/calls/initiate`
3. **Headers tab**:
   ```
   Authorization: Bearer eyJhbGci...
   Content-Type: application/json
   ```
4. **Body tab** (select "raw" → "JSON"):
   ```json
   {
     "phoneNumber": "+1-914-555-1234",
     "message": "Test call from Hospital AI"
   }
   ```
5. **Send**

---

## ✅ Expected Successful Response

```json
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "callId": "507f1f77bcf86cd799439011",
    "vapiCallId": "abc123def456",
    "phoneNumber": "+1-914-555-1234",
    "fromNumber": "+1-914-465-1284",
    "areaCode": "914",
    "status": "initiated"
  }
}
```

---

## 🔗 Full Test Script

Save as `test-call.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="https://remigial-jace-antecedently.ngrok-free.dev"
EMAIL="admin@hospital.com"
PASSWORD="SecurePassword123"
PHONE="+1-914-555-1234"

echo "🔐 Getting JWT Token..."
TOKEN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  echo $TOKEN_RESPONSE
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."

echo "📞 Initiating call..."
CALL_RESPONSE=$(curl -s -X POST $BASE_URL/api/calls/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$PHONE\", \"message\": \"Hello from Hospital AI\"}")

echo "Response:"
echo $CALL_RESPONSE | jq '.'
```

Run it:
```bash
chmod +x test-call.sh
./test-call.sh
```

---

## 🎯 Next Steps

1. ✅ Restart server: `npm start`
2. → Test with correct headers & body format
3. → Check server logs for any errors
4. → Verify VAPI webhook is configured
5. → Monitor call completion in MongoDB

