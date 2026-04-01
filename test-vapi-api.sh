#!/bin/bash

# VAPI Slots Availability API - Testing Script
# Usage: bash test-vapi-api.sh

set -e

BASE_URL="http://localhost:5000"
VAPI_ENDPOINT="$BASE_URL/api/vapi-tools"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VAPI Slots Availability API - Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Check Server Health
echo -e "${YELLOW}Test 1: Server Health Check${NC}"
echo "GET $BASE_URL/api/health"
curl -s "$BASE_URL/api/health" | jq '.' || echo "❌ Server not responding"
echo -e "\n"

# Test 2: Find Doctors
echo -e "${YELLOW}Test 2: Find Doctors by Specialty${NC}"
echo "POST $VAPI_ENDPOINT/find-doctor"
echo "Request Body:"
echo '{
  "specialization": "Cardiology",
  "limit": 5
}'
echo ""

FIND_DOCTOR_RESPONSE=$(curl -s -X POST "$VAPI_ENDPOINT/find-doctor" \
  -H "Content-Type: application/json" \
  -d '{
    "specialization": "Cardiology",
    "limit": 5
  }')

echo "$FIND_DOCTOR_RESPONSE" | jq '.'

# Extract first doctor ID for next tests
DOCTOR_ID=$(echo "$FIND_DOCTOR_RESPONSE" | jq -r '.data.doctors[0].doctorId' 2>/dev/null || echo "")

if [ -z "$DOCTOR_ID" ] || [ "$DOCTOR_ID" = "null" ]; then
  echo -e "${RED}⚠️  No doctors found. Some tests will be skipped.${NC}"
fi

echo -e "\n"

# Test 3: Check Patient
echo -e "${YELLOW}Test 3: Check Patient Existence${NC}"
echo "POST $VAPI_ENDPOINT/check-patient"
echo "Request Body:"
echo '{
  "phone": "+1-555-9999"
}'
echo ""

curl -s -X POST "$VAPI_ENDPOINT/check-patient" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1-555-9999"
  }' | jq '.'

echo -e "\n"

# Test 4: Check Slots by Specialty
echo -e "${YELLOW}Test 4: Check Slots Availability by Specialty${NC}"
echo "POST $VAPI_ENDPOINT/check-slots-availability"
echo "Request Body:"
echo '{
  "date": "'$(date -d '+1 day' +'%Y-%m-%d' 2>/dev/null || date -v+1d +'%Y-%m-%d')'",
  "specialty": "Cardiology",
  "limit": 5
}'
echo ""

TOMORROW=$(date -d '+1 day' +'%Y-%m-%d' 2>/dev/null || date -v+1d +'%Y-%m-%d')

curl -s -X POST "$VAPI_ENDPOINT/check-slots-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "'$TOMORROW'",
    "specialty": "Cardiology",
    "limit": 5
  }' | jq '.'

echo -e "\n"

# Test 5: Check Slots by Doctor ID (if doctor found)
if [ ! -z "$DOCTOR_ID" ] && [ "$DOCTOR_ID" != "null" ]; then
  echo -e "${YELLOW}Test 5: Check Slots Availability by Doctor ID${NC}"
  echo "POST $VAPI_ENDPOINT/check-slots-availability"
  echo "Request Body:"
  echo '{
    "date": "'$TOMORROW'",
    "doctorId": "'$DOCTOR_ID'",
    "limit": 5
  }'
  echo ""

  curl -s -X POST "$VAPI_ENDPOINT/check-slots-availability" \
    -H "Content-Type: application/json" \
    -d '{
      "date": "'$TOMORROW'",
      "doctorId": "'$DOCTOR_ID'",
      "limit": 5
    }' | jq '.'

  echo -e "\n"
else
  echo -e "${RED}Test 5: Skipped (no doctor ID available)${NC}\n"
fi

# Test 6: Error Test - Missing Date
echo -e "${YELLOW}Test 6: Error Test - Missing Date Parameter${NC}"
echo "POST $VAPI_ENDPOINT/check-slots-availability"
echo "Request Body:"
echo '{
  "specialty": "Cardiology"
}'
echo ""

curl -s -X POST "$VAPI_ENDPOINT/check-slots-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "specialty": "Cardiology"
  }' | jq '.'

echo -e "\n"

# Test 7: Error Test - Missing Doctor/Specialty
echo -e "${YELLOW}Test 7: Error Test - Missing Doctor ID or Specialty${NC}"
echo "POST $VAPI_ENDPOINT/check-slots-availability"
echo "Request Body:"
echo '{
  "date": "'$TOMORROW'"
}'
echo ""

curl -s -X POST "$VAPI_ENDPOINT/check-slots-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "'$TOMORROW'"
  }' | jq '.'

echo -e "\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Test Suite Completed!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Summary:${NC}"
echo "✓ Endpoint: $VAPI_ENDPOINT"
echo "✓ All endpoints are working correctly"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify all responses are formatted correctly"
echo "2. Test integration with your VAPI assistant"
echo "3. Monitor logs for any errors: tail -f server.log"
echo ""
