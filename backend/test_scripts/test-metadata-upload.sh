#!/bin/bash

# Test script for metadata extraction and memory upload flow
# This simulates what the mobile app would do

set -e

BASE_URL="http://localhost:3000"

echo "🧪 Testing Metadata Extraction & Memory Upload Flow"
echo "================================================"
echo ""

# Step 1: Upload photo to local server for testing (simulate S3 upload)
echo "📤 Step 1: Simulating photo upload..."
# In production, the mobile app would:
# 1. Get presigned URL from /api/upload/presigned-url
# 2. Upload photo to S3
# 3. Get back the S3 URL

# For testing, we'll use a local file path that we can access via file:// or serve statically
# But since we need HTTP, let's assume the photo is already "uploaded" and accessible
TEST_IMAGE_URL="file:///Users/aryanjain/Desktop/Giggles/backend/assets/test_photo/avyaan1.jpeg"
echo "   Using test image: $TEST_IMAGE_URL"
echo ""

# Step 2: Extract metadata from uploaded photo
echo "📸 Step 2: Extracting metadata..."
METADATA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/upload/extract-metadata" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageUrl\": \"$TEST_IMAGE_URL\",
    \"fileName\": \"avyaan1.jpeg\"
  }")

echo "   Response: $METADATA_RESPONSE"
echo ""

# Parse metadata from response (using jq if available)
if command -v jq &> /dev/null; then
  METADATA=$(echo "$METADATA_RESPONSE" | jq '.data')
  HAS_LOCATION=$(echo "$METADATA" | jq -r '.location != null')
  HAS_CAMERA=$(echo "$METADATA" | jq -r '.camera != null')
  DATE_TAKEN=$(echo "$METADATA" | jq -r '.dateTaken')

  echo "   ✅ Metadata extracted:"
  echo "      - Has Location: $HAS_LOCATION"
  echo "      - Has Camera: $HAS_CAMERA"
  echo "      - Date Taken: $DATE_TAKEN"
  echo ""

  # Step 3: Create memory with metadata
  echo "🎤 Step 3: Creating memory with metadata..."

  # Note: This will fail without proper auth, but shows the flow
  MEMORY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/memories" \
    -H "Content-Type: application/json" \
    -d "{
      \"familyId\": \"507f1f77bcf86cd799439011\",
      \"childId\": \"507f1f77bcf86cd799439012\",
      \"mediaUrl\": \"$TEST_IMAGE_URL\",
      \"mediaType\": \"photo\",
      \"caption\": \"Test photo with metadata extraction\",
      \"date\": \"$DATE_TAKEN\",
      \"metadata\": $METADATA
    }" || echo "Expected to fail due to auth")

  echo "   Response: $MEMORY_RESPONSE"
  echo ""

  # Step 4: Get smart album suggestions
  echo "🎨 Step 4: Getting smart album suggestions..."
  SUGGESTIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/albums/suggestions?familyId=507f1f77bcf86cd799439011" || echo "Expected to fail due to auth")

  echo "   Response: $SUGGESTIONS_RESPONSE"
  echo ""

else
  echo "   ⚠️  jq not installed, showing raw response"
  echo "   Install jq to see parsed output: brew install jq"
  echo ""
fi

echo "================================================"
echo "✅ Test complete!"
echo ""
echo "📝 Production Flow (Mobile App):"
echo "   1. Call /api/upload/presigned-url to get S3 upload URL"
echo "   2. Upload photo directly to S3"
echo "   3. Call /api/upload/extract-metadata with S3 URL"
echo "   4. Call /api/memories with metadata from step 3"
echo "   5. Periodically call /api/albums/suggestions to show smart albums"
echo ""
