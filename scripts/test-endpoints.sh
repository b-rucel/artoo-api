#!/bin/bash

# Base URL - change this according to your environment
API_URL="http://localhost:8787"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Testing Artoo API Endpoints..."
echo "-----------------------------"

# Health Check
echo -e "\n${GREEN}Testing Health Check${NC}"
curl -X -s GET "${API_URL}/health"

# Authentication
echo -e "\n\n${GREEN}Testing Login${NC}"
TOKEN=$(curl -X POST -s "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' | jq -r '.token')

echo -e "\n${GREEN}Testing Token Verification${NC}"
curl -X POST -s "${API_URL}/api/auth/verify" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\"}"

# File Operations
echo -e "\n\n${GREEN}Testing List Files${NC}"
curl -X GET -s "${API_URL}/api/files" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Create a test file
echo "Test content" > test.txt

echo -e "\n\n${GREEN}Testing File Upload${NC}"
curl -X POST -s "${API_URL}/api/files/test.txt" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: text/plain" \
  --data-binary "@test.txt"

echo -e "\n\n${GREEN}Testing File Details${NC}"
curl -X GET -s "${API_URL}/api/details/test.txt" \
  -H "Authorization: Bearer ${TOKEN}"

echo -e "\n\n${GREEN}Testing File Download${NC}"
curl -X GET -s "${API_URL}/api/download/test.txt" \
  -H "Authorization: Bearer ${TOKEN}" \
  --output downloaded_test.txt

echo -e "\n\n${GREEN}Testing File Serve${NC}"
curl -X GET -s "${API_URL}/api/files/test.txt" \
  -H "Authorization: Bearer ${TOKEN}"

# Cleanup
rm test.txt downloaded_test.txt

echo -e "\n\n${GREEN}All tests completed!${NC}"