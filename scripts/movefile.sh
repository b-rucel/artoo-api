curl -X POST \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"destination": "new/path/file.txt"}' \
  http://localhost:8787/api/move/current/path/file.txt