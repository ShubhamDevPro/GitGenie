#!/bin/bash

# Test script for debugging restart issues
echo "🔧 Testing restart functionality..."

# Test the restart API endpoint
curl -X POST http://localhost:3000/api/agent/restart-project \
  -H "Content-Type: application/json" \
  -d '{"repositoryId": "cmdx9il730003gpmreu2dj69c"}' \
  -v

echo ""
echo "✅ Test completed. Check the server logs for detailed output."
