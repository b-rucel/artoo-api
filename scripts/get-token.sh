#!/bin/bash

# load env
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

API_URL="http://localhost:8787/api"

echo "Getting authentication token..."
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }" \
  "$API_URL/auth/login")

# Extract token from response
token=$(echo $response | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -n "$token" ]; then
    echo "Token obtained successfully:"
    # echo "$token"

    # Save token to a file for other scripts to use
    echo "export AUTH_TOKEN=\"$token\"" > .auth_token
    echo "Token saved to .auth_token file"
else
    echo "Failed to get token. Response:"
    echo "$response"
    exit 1
fi

# Make the script executable
chmod +x scripts/get-token.sh