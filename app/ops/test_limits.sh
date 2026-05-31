#!/bin/bash

set -e

API_ENDPOINT="$1"

if [ -z "$API_ENDPOINT" ]; then
  echo "Provide api endpoint."
  exit 1
fi

response=$(curl -s -X GET "$API_ENDPOINT/health" 2>/dev/null)

# Compare exact response
if [ "$response" != '{"ok":true}' ]; then
    echo "Error: Health check failed"
    echo "Expected: {\"ok\": true}"
    echo "Got: $response"
    exit 1
fi

echo "$API_ENDPOINT seems Healthy"

echo "Testing $API_ENDPOINT/daily"

for i in {1..100}; do
  curl -X GET "$API_ENDPOINT/daily" 2>/dev/null &
done