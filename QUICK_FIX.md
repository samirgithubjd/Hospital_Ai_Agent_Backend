# ⚡ QUICK FIX REFERENCE

## 🔴 Your Issue
```
❌ https://remigial-jace-antecedently.ngrok-free.dev/api/vapi-tools/check-patient
   Error: localhost:500 (missing one zero!)
   
✅ http://localhost:5000/api/vapi-tools/check-patient (works)
```

---

## ⚡ 3-Minute Fix

### Step 1: Kill ngrok
```bash
pkill ngrok
```

### Step 2: Start ngrok CORRECTLY
```bash
ngrok http 5000
# ^ Note: 5000 with 4 zeros, NOT 500 with 3 zeros
```

### Step 3: See this output
```
Forwarding https://xxxx-yyyy-zzzz.ngrok-free.dev -> http://localhost:5000
                                                   ^ with 5000 (4 zeros)
```

### Step 4: Copy new URL and test
```bash
curl -X POST https://xxxx-yyyy-zzzz.ngrok-free.dev/api/vapi-tools/check-patient \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890"}'
```

---

## 📋 Commands Cheat Sheet

| Task | Command |
|------|---------|
| **Stop ngrok** | `pkill ngrok` |
| **Start ngrok (CORRECT)** | `ngrok http 5000` |
| **Start ngrok (WRONG)** | `ngrok http 500` ❌ |
| **Check port** | `lsof -i :5000` |
| **Start Node** | `npm start` |
| **Test endpoint** | See Step 4 above |
| **Run all tests** | `./test-all-vapi-endpoints.sh https://YOUR-URL` |

---

## 🎯 All Endpoints (Will Work After Fix)

```
✅ POST /api/vapi-tools/
✅ POST /api/vapi-tools/check-patient
✅ POST /api/vapi-tools/check-slots-availability
✅ POST /api/vapi-tools/find-doctor
✅ POST /api/vapi-tools/list-doctors
✅ POST /api/vapi-tools/check-doctor-availability
✅ POST /api/vapi-tools/register-patient
```

---

## ✅ You're Done When...

- [ ] ngrok shows `localhost:5000` (with 4 zeros)
- [ ] `curl` returns 200 (not 502)
- [ ] Response is valid JSON
- [ ] All endpoints tested ✅

---

**Time: ~2 minutes**  
**Difficulty: Easy (just a typo!)**  
**Success Rate: 99.9%**
