#!/bin/bash

# Add color variables
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8787/api"

# Source the auth token
if [ -f .auth_token ]; then
    source .auth_token
else
    echo -e "${RED}Error: .auth_token file not found. Please run ./scripts/get-token.sh first.${NC}"
    exit 1
fi

# create and upload a test file
echo $(date) > movetest.txt

echo -e "\n${GREEN}Testing File Upload${NC}"
curl -X POST -s "${API_URL}/files/movetest.txt" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: text/plain" \
  --data-binary "@movetest.txt"

# Test file move
echo -e "\n${GREEN}Testing File Move${NC}"
curl -X POST -s "${API_URL}/move/movetest.txt" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"destination": "new/path/moved-test.txt"}'

# clean up
rm movetest.txt
