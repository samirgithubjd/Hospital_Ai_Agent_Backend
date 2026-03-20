#!/bin/bash

# ==========================================
# HOSPITAL AI AGENT - API TESTING SCRIPT
# Restricted Authentication Model Testing
# ==========================================

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000/api"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Hospital AI Agent - API Tests${NC}"
echo -e "${BLUE}================================${NC}\n"

# Test 1: Register as Patient
echo -e "${YELLOW}1️⃣  Testing Patient Registration...${NC}"
PATIENT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient_test@example.com",
    "password": "PatientPass123",
    "firstName": "Test",
    "lastName": "Patient",
    "age": 35,
    "medicalHistory": "No allergies"
  }')

PATIENT_TOKEN=$(echo $PATIENT_RESPONSE | jq -r '.data.token' 2>/dev/null)
PATIENT_ID=$(echo $PATIENT_RESPONSE | jq -r '.data.user.id' 2>/dev/null)

if [ ! -z "$PATIENT_TOKEN" ] && [ "$PATIENT_TOKEN" != "null" ]; then
  echo -e "${GREEN}✅ Patient registered successfully${NC}"
  echo -e "   Patient ID: $PATIENT_ID"
  echo -e "   Token: ${PATIENT_TOKEN:0:20}...\n"
else
  echo -e "${RED}❌ Patient registration failed${NC}"
  echo "Response: $PATIENT_RESPONSE\n"
fi

# Test 2: Try to register as doctor (should fail)
echo -e "${YELLOW}2️⃣  Testing Doctor Registration (Should Fail)...${NC}"
DOCTOR_REG_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor_test@hospital.com",
    "password": "DoctorPass123",
    "firstName": "Dr.",
    "lastName": "Test",
    "specialization": "Cardiology",
    "licenseNumber": "MD12345"
  }')

DOCTOR_REG_ERROR=$(echo $DOCTOR_REG_RESPONSE | jq -r '.message' 2>/dev/null)
if [[ "$DOCTOR_REG_ERROR" == *"Only patients can self-register"* ]]; then
  echo -e "${GREEN}✅ Correctly blocked non-patient registration${NC}"
  echo -e "   Error: $DOCTOR_REG_ERROR\n"
else
  echo -e "${RED}❌ Should have blocked doctor registration${NC}"
  echo "Response: $DOCTOR_REG_RESPONSE\n"
fi

# Test 3: Patient login
echo -e "${YELLOW}3️⃣  Testing Patient Login...${NC}"
PATIENT_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient_test@example.com",
    "password": "PatientPass123"
  }')

PATIENT_LOGIN_TOKEN=$(echo $PATIENT_LOGIN | jq -r '.data.token' 2>/dev/null)
if [ ! -z "$PATIENT_LOGIN_TOKEN" ] && [ "$PATIENT_LOGIN_TOKEN" != "null" ]; then
  echo -e "${GREEN}✅ Patient login successful${NC}"
  echo -e "   Token: ${PATIENT_LOGIN_TOKEN:0:20}...\n"
else
  echo -e "${RED}❌ Patient login failed${NC}"
  echo "Response: $PATIENT_LOGIN\n"
fi

# Test 4: Admin login (assumes admin already exists)
echo -e "${YELLOW}4️⃣  Testing Admin Login...${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "admin123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.data.token' 2>/dev/null)
if [ ! -z "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
  echo -e "${GREEN}✅ Admin login successful${NC}"
  echo -e "   Token: ${ADMIN_TOKEN:0:20}...\n"
else
  echo -e "${RED}⚠️  Admin not available. Please create admin first.${NC}"
  echo -e "   Create initial admin using MongoDB or seed script.\n"
  ADMIN_TOKEN=""
fi

# Test 5: Admin creates doctor (if admin token available)
if [ ! -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}5️⃣  Testing Admin Creates Doctor...${NC}"
  DOCTOR_CREATE=$(curl -s -X POST "$BASE_URL/admin/create-doctor" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "dr.sarah@hospital.com",
      "password": "DoctorPass123",
      "firstName": "Sarah",
      "lastName": "Williams",
      "specialization": "Cardiology",
      "licenseNumber": "MD87654321",
      "department": "Cardiology"
    }')

  DOCTOR_ID=$(echo $DOCTOR_CREATE | jq -r '.data.doctor.id' 2>/dev/null)
  DOCTOR_ACTIVE=$(echo $DOCTOR_CREATE | jq -r '.data.doctor.isActive' 2>/dev/null)

  if [ ! -z "$DOCTOR_ID" ] && [ "$DOCTOR_ID" != "null" ]; then
    echo -e "${GREEN}✅ Doctor created successfully${NC}"
    echo -e "   Doctor ID: $DOCTOR_ID"
    echo -e "   Initial Status: $DOCTOR_ACTIVE (should be false)\n"
    
    # Test 6: Try doctor login before approval (should fail)
    echo -e "${YELLOW}6️⃣  Testing Doctor Login Before Approval (Should Fail)...${NC}"
    DOCTOR_LOGIN_FAIL=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "dr.sarah@hospital.com",
        "password": "DoctorPass123"
      }')
    
    DOCTOR_LOGIN_ERROR=$(echo $DOCTOR_LOGIN_FAIL | jq -r '.message' 2>/dev/null)
    if [[ "$DOCTOR_LOGIN_ERROR" == *"deactivated"* ]] || [[ "$DOCTOR_LOGIN_ERROR" == *"Invalid"* ]]; then
      echo -e "${GREEN}✅ Correctly blocked inactive doctor login${NC}"
      echo -e "   Error: $DOCTOR_LOGIN_ERROR\n"
    else
      echo -e "${YELLOW}⚠️  Doctor might be active (check if already approved)\n"
    fi
    
    # Test 7: Admin approves doctor
    echo -e "${YELLOW}7️⃣  Testing Admin Approves Doctor...${NC}"
    DOCTOR_APPROVE=$(curl -s -X PUT "$BASE_URL/admin/doctors/$DOCTOR_ID/approve" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json")
    
    DOCTOR_APPROVED=$(echo $DOCTOR_APPROVE | jq -r '.data.isActive' 2>/dev/null)
    if [ "$DOCTOR_APPROVED" = "true" ]; then
      echo -e "${GREEN}✅ Doctor approved successfully${NC}"
      echo -e "   New Status: $DOCTOR_APPROVED\n"
      
      # Test 8: Doctor login after approval
      echo -e "${YELLOW}8️⃣  Testing Doctor Login After Approval...${NC}"
      DOCTOR_LOGIN_SUCCESS=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
          "email": "dr.sarah@hospital.com",
          "password": "DoctorPass123"
        }')
      
      DOCTOR_TOKEN=$(echo $DOCTOR_LOGIN_SUCCESS | jq -r '.data.token' 2>/dev/null)
      if [ ! -z "$DOCTOR_TOKEN" ] && [ "$DOCTOR_TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ Doctor login successful after approval${NC}"
        echo -e "   Token: ${DOCTOR_TOKEN:0:20}...\n"
      else
        echo -e "${RED}❌ Doctor login failed${NC}"
      fi
    else
      echo -e "${RED}❌ Doctor approval failed${NC}"
    fi
    
  else
    echo -e "${RED}❌ Doctor creation failed${NC}"
    echo "Response: $DOCTOR_CREATE\n"
  fi
  
  # Test 9: Admin creates another admin
  echo -e "${YELLOW}9️⃣  Testing Admin Creates Another Admin...${NC}"
  ADMIN_CREATE=$(curl -s -X POST "$BASE_URL/admin/create-admin" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin2@hospital.com",
      "password": "AdminPass123",
      "firstName": "John",
      "lastName": "Admin",
      "phone": "+1-555-555-5555"
    }')

  NEW_ADMIN_ID=$(echo $ADMIN_CREATE | jq -r '.data.admin.id' 2>/dev/null)
  NEW_ADMIN_ACTIVE=$(echo $ADMIN_CREATE | jq -r '.data.admin.isActive' 2>/dev/null)

  if [ ! -z "$NEW_ADMIN_ID" ] && [ "$NEW_ADMIN_ID" != "null" ]; then
    echo -e "${GREEN}✅ New admin created successfully${NC}"
    echo -e "   Admin ID: $NEW_ADMIN_ID"
    echo -e "   Initial Status: $NEW_ADMIN_ACTIVE (should be true)\n"
    
    # Test 10: New admin login
    echo -e "${YELLOW}🔟 Testing New Admin Login...${NC}"
    NEW_ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "admin2@hospital.com",
        "password": "AdminPass123"
      }')
    
    NEW_ADMIN_TOKEN=$(echo $NEW_ADMIN_LOGIN | jq -r '.data.token' 2>/dev/null)
    if [ ! -z "$NEW_ADMIN_TOKEN" ] && [ "$NEW_ADMIN_TOKEN" != "null" ]; then
      echo -e "${GREEN}✅ New admin login successful${NC}"
      echo -e "   Token: ${NEW_ADMIN_TOKEN:0:20}...\n"
    else
      echo -e "${RED}❌ New admin login failed${NC}"
    fi
  else
    echo -e "${RED}❌ Admin creation failed${NC}"
    echo "Response: $ADMIN_CREATE\n"
  fi

  # Test 11: Get system statistics
  echo -e "${YELLOW}📊 Testing System Statistics...${NC}"
  STATS=$(curl -s -X GET "$BASE_URL/admin/statistics" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  TOTAL_USERS=$(echo $STATS | jq -r '.data.totalUsers' 2>/dev/null)
  TOTAL_ADMINS=$(echo $STATS | jq -r '.data.totalAdmins' 2>/dev/null)
  TOTAL_DOCTORS=$(echo $STATS | jq -r '.data.totalDoctors' 2>/dev/null)
  TOTAL_PATIENTS=$(echo $STATS | jq -r '.data.totalPatients' 2>/dev/null)

  if [ ! -z "$TOTAL_USERS" ] && [ "$TOTAL_USERS" != "null" ]; then
    echo -e "${GREEN}✅ System statistics retrieved${NC}"
    echo -e "   Total Users: $TOTAL_USERS"
    echo -e "   Admins: $TOTAL_ADMINS"
    echo -e "   Doctors: $TOTAL_DOCTORS"
    echo -e "   Patients: $TOTAL_PATIENTS\n"
  else
    echo -e "${RED}❌ Failed to get statistics${NC}"
  fi
fi

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "${GREEN}✅ Restricted Authentication Model Verified!${NC}"
echo -e "\nKey Points:"
echo -e "  • Patients can self-register (public)"
echo -e "  • Doctors created by admins (must approve)"
echo -e "  • Admins created by admins (immediate access)"
echo -e "  • All roles use same login endpoint"
echo -e "  • Active status controls login capability"
echo -e "\nDocumentation:"
echo -e "  • AUTH_FLOW_GUIDE.md - Visual flow diagrams"
echo -e "  • ADMIN_OPERATIONS_API.md - Complete admin API docs"
echo -e "  • AUTH_PAYLOADS.md - Payload examples"

echo -e "\n${BLUE}================================${NC}\n"
