#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Usage: ./test-all-vapi-endpoints.sh https://your-ngrok-url.ngrok-free.dev${NC}"
  echo -e "${YELLOW}Example: ./test-all-vapi-endpoints.sh https://xxxx-yyyy-zzzz.ngrok-free.dev${NC}"
  exit 1
fi

BASE_URL="$1"
RESULTS=0
TOTAL=0

# Function to test an endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  TOTAL=$((TOTAL + 1))
  
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test #$TOTAL: $description${NC}"
  echo -e "${BLUE}Endpoint: $method $endpoint${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  if [ "$method" = "POST" ]; then
    echo -e "${YELLOW}Request:${NC}"
    echo "$data" | jq '.' 2>/dev/null || echo "$data"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
  fi
  
  echo ""
  echo -e "${YELLOW}HTTP Status: $HTTP_CODE${NC}"
  echo -e "${YELLOW}Response:${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  if [[ $HTTP_CODE =~ ^[2] ]]; then
    echo -e "${GREEN}✅ PASS${NC}"
    RESULTS=$((RESULTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}"
  fi
}

# Print header
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     VAPI Tools API Comprehensive Test Suite               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}⏳ Testing health endpoint first...${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null)
if [[ $HEALTH =~ ^[2] ]]; then
  echo -e "${GREEN}✅ Server is reachable!${NC}"
else
  echo -e "${RED}❌ Cannot reach server at $BASE_URL${NC}"
  echo -e "${RED}   Check if ngrok is running on port 5000${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Now testing all VAPI tool endpoints...${NC}"
echo ""

# Test 2: Check Patient - Found
test_endpoint "POST" "/api/vapi-tools/check-patient" \
  '{"phone":"1234567890"}' \
  "Check Patient - By Phone"

# Test 3: Check Patient - Not Found
test_endpoint "POST" "/api/vapi-tools/check-patient" \
  '{"email":"nonexistent@example.com"}' \
  "Check Patient - Not Found (New Patient)"

# Test 4: Find Doctor - By Specialty
test_endpoint "POST" "/api/vapi-tools/find-doctor" \
  '{"specialization":"Cardiology"}' \
  "Find Doctor - By Specialty"

# Test 5: Find Doctor - By Name
test_endpoint "POST" "/api/vapi-tools/find-doctor" \
  '{"doctorName":"John"}' \
  "Find Doctor - By Name"

# Test 6: List All Doctors
test_endpoint "POST" "/api/vapi-tools/list-doctors" \
  '{}' \
  "List All Doctors"

# Test 7: List Doctors by Specialty
test_endpoint "POST" "/api/vapi-tools/list-doctors" \
  '{"specialization":"Cardiology","limit":5}' \
  "List Doctors - Filtered by Specialty"

# Test 8: Check Doctor Availability
# Note: You'll need a real doctor ID from your database
test_endpoint "POST" "/api/vapi-tools/check-doctor-availability" \
  '{"doctorId":"69bd12688e841db3b4da15a2"}' \
  "Check Doctor Availability"

# Test 9: Check Slots Availability - By Date
test_endpoint "POST" "/api/vapi-tools/check-slots-availability" \
  '{"date":"2025-04-20","specialty":"Cardiology","limit":10}' \
  "Check Slots Availability - By Specialty & Date"

# Test 10: Check Symptoms - Emergency
test_endpoint "POST" "/api/vapi-tools/check-symptoms" \
  '{"symptoms":"severe chest pain and difficulty breathing"}' \
  "Check Symptoms - Emergency Case"

# Test 11: Check Symptoms - Non-Emergency
test_endpoint "POST" "/api/vapi-tools/check-symptoms" \
  '{"symptoms":"mild headache and sore throat"}' \
  "Check Symptoms - Non-Emergency Case"

# Test 12: Register Patient
test_endpoint "POST" "/api/vapi-tools/register-patient" \
  '{"firstName":"John","lastName":"Doe","email":"john.doe.'$(date +%s)'@example.com","phone":"9876543210","age":30,"gender":"male"}' \
  "Register New Patient"

# Test 13: Main VAPI Tool Router
test_endpoint "POST" "/api/vapi-tools/" \
  '{"toolUse":{"toolName":"check_patient","input":{"phone":"1234567890"}}}' \
  "Main VAPI Tool Router - Check Patient"

# Print summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                     TEST SUMMARY                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Total Tests: $TOTAL${NC}"
echo -e "${GREEN}Passed: $RESULTS${NC}"
echo -e "${RED}Failed: $((TOTAL - RESULTS))${NC}"
echo ""

if [ $RESULTS -eq $TOTAL ]; then
  echo -e "${GREEN}✅ All tests passed! Your VAPI endpoints are working correctly.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Check the responses above for details.${NC}"
  exit 1
fi
