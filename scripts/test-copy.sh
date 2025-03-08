#!/bin/bash

API_URL="http://localhost:8787"

# Source the auth token
if [ -f .auth_token ]; then
    source .auth_token
else
    echo "Error: .auth_token file not found. Please run get-token.sh first."
    exit 1
fi

# Test basic file copy
echo "Testing basic file copy..."
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "new/path/pic1.jpg",
    "copyHeaders": {
      "x-amz-copy-source-if-none-match": "*"
    }
  }' \
  "$API_URL/api/copy/pic1.jpg"

echo -e "\n\nTesting conditional copy with ETag..."
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "new/path/test2.txt",
    "copyHeaders": {
      "x-amz-copy-source-if-match": "\"abc123\"",
      "x-amz-copy-source-if-none-match": "*"
    }
  }' \
  "$API_URL/api/copy/test.txt"

echo -e "\n\nTesting copy with timestamp conditions..."
curl -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "new/path/test3.txt",
    "copyHeaders": {
      "x-amz-copy-source-if-modified-since": "2024-01-01T00:00:00Z",
      "x-amz-copy-source-if-none-match": "*"
    }
  }' \
  "$API_URL/api/copy/test.txt"
