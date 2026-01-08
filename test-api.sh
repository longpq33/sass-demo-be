#!/bin/bash

# Test script for backend APIs
BASE_URL="http://localhost:4000/api"

echo "=== Testing Backend APIs ==="
echo ""

# Test 1: Health check (if exists)
echo "1. Testing server availability..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL" || echo "Server not running on port 4000"
echo ""

# Test 2: Login
echo "2. Testing Login API..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' \
  -c /tmp/cookies.txt)

echo "Login Response: $LOGIN_RESPONSE"
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo ""

# Test 3: Get current user
echo "3. Testing GET /api/auth/me..."
curl -s -X GET "$BASE_URL/auth/me" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 4: Get tenants (if system admin)
echo "4. Testing GET /api/tenants..."
curl -s -X GET "$BASE_URL/tenants" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 5: Get sites
echo "5. Testing GET /api/sites..."
curl -s -X GET "$BASE_URL/sites" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 6: Get meters
echo "6. Testing GET /api/meters..."
curl -s -X GET "$BASE_URL/meters" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 7: Get alerts
echo "7. Testing GET /api/alerts..."
curl -s -X GET "$BASE_URL/alerts" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

# Test 8: Get dashboard tenant summary
echo "8. Testing GET /api/dashboard/tenant..."
curl -s -X GET "$BASE_URL/dashboard/tenant" \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" | jq '.' || echo "Failed"
echo ""

echo "=== Test completed ==="

