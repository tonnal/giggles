# 🧪 Testing Metadata Extraction

Guide for testing the photo metadata extraction and smart album suggestion system.

---

## Quick Test

### Run Automated Test

```bash
cd /Users/aryanjain/Desktop/Giggles/backend

# Test metadata extraction
npx tsx test-metadata-extraction.ts

# Test complete integration flow
npx tsx test-metadata-flow.ts
```

### Expected Output

```
🧪 Testing Complete Metadata Extraction Flow

================================================

📸 Step 1: Extracting metadata from test photo...

✅ Metadata extracted:

📋 Full metadata:
{
  "camera": {
    "make": "Apple",
    "model": "iPhone 15 Pro Max",
    "lens": "iPhone 15 Pro Max back triple camera 6.765mm f/1.78",
    "software": "17.4.1"
  },
  "detectedContext": {
    "timeOfDay": "night",
    "season": "spring",
    "isIndoor": true
  },
  "dateTaken": "2024-05-20T16:36:13.000Z"
}

---

🎨 Step 3: Testing smart album suggestions...

🎯 Smart Album Suggestions:

1. Trip 7/15/2024
   📸 Photos: 5
   💡 Reason: 5 photos from 3 days at same location
   🎲 Confidence: 90%

2. Event 8/1/2024
   📸 Photos: 10
   💡 Reason: 10 photos taken within 4 hours
   🎲 Confidence: 85%

3. Selfies
   📸 Photos: 5
   💡 Reason: 5 selfie photos
   🎲 Confidence: 80%

================================================
✅ All tests passed!
```

---

## Manual API Testing

### 1. Extract Metadata from Photo

**Note:** The extraction endpoint needs a publicly accessible image URL. For local testing, you need to upload the photo to S3 first or use a public URL.

```bash
# First, get a presigned URL for upload
curl -X POST http://localhost:3000/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "fileType": "image/jpeg",
    "folder": "test"
  }' | jq '.'

# Upload your photo to the presigned URL (use the uploadUrl from response)
# Then use the fileUrl for metadata extraction

# Extract metadata
curl -X POST http://localhost:3000/api/upload/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://your-s3-url/test.jpg",
    "fileName": "test.jpg"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 40.7829,
      "longitude": -73.9654,
      "altitude": 10
    },
    "camera": {
      "make": "Apple",
      "model": "iPhone 15 Pro Max"
    },
    "context": {
      "timeOfDay": "afternoon",
      "season": "summer",
      "isIndoor": false
    },
    "dateTaken": "2024-07-15T10:30:00.000Z"
  }
}
```

### 2. Create Memory with Metadata

```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "familyId": "507f1f77bcf86cd799439011",
    "childId": "507f1f77bcf86cd799439012",
    "mediaUrl": "https://your-s3-url/test.jpg",
    "mediaType": "photo",
    "caption": "Test photo with metadata",
    "date": "2024-07-15T10:30:00.000Z",
    "metadata": {
      "location": {
        "latitude": 40.7829,
        "longitude": -73.9654
      },
      "camera": {
        "make": "Apple",
        "model": "iPhone 15 Pro Max"
      },
      "context": {
        "timeOfDay": "afternoon",
        "season": "summer",
        "isIndoor": false
      }
    }
  }' | jq '.'
```

### 3. Get Smart Album Suggestions

```bash
curl -X GET "http://localhost:3000/api/albums/suggestions?familyId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "name": "Trip 7/15/2024",
        "photoIds": ["id1", "id2", "id3", "id4", "id5"],
        "reason": "5 photos from 3 days at same location",
        "confidence": 0.9
      }
    ],
    "totalPhotosAnalyzed": 20,
    "message": "Found 1 smart album suggestions!"
  }
}
```

---

## Testing with Sample Photos

### Upload Multiple Photos

To test smart album suggestions, you need to upload multiple photos with metadata:

```bash
# Upload 5-10 photos from the same location
# Use different timestamps to simulate a trip

for i in {1..5}; do
  # Upload photo
  # Extract metadata
  # Create memory with metadata
done

# Then check suggestions
curl -X GET "http://localhost:3000/api/albums/suggestions?familyId=xxx"
```

---

## Troubleshooting

### No Metadata Extracted

**Problem:** Metadata fields are null or missing

**Possible Causes:**
1. Photo doesn't have EXIF data
2. GPS location services were disabled
3. Photo was edited/processed and EXIF was stripped

**Solution:**
- Use original photos from camera/phone
- Enable location services when taking photos
- Avoid heavily edited/processed images

### Smart Albums Not Detected

**Problem:** No suggestions returned

**Possible Causes:**
1. Not enough photos uploaded (need 5+ for trips, 10+ for events)
2. Photos don't have location metadata
3. Photos are too spread out in time/location

**Solution:**
- Upload more photos with GPS data
- Use photos from same event/location
- Check that photos have `dateTaken` or `date` field

---

## Database Inspection

### Check Metadata in Database

```bash
# Connect to MongoDB
mongosh

# Use your database
use giggles

# Find memories with metadata
db.memories.find({ "metadata": { $exists: true } }).pretty()

# Find memories with GPS location
db.memories.find({ "metadata.location": { $exists: true } }).pretty()

# Count photos by season
db.memories.aggregate([
  { $match: { "metadata.context.season": { $exists: true } } },
  { $group: { _id: "$metadata.context.season", count: { $sum: 1 } } }
])
```

---

## Performance Testing

### Test Extraction Speed

```bash
# Time single extraction
time npx tsx test-metadata-extraction.ts

# Expected: ~200-500ms per photo
```

### Test Suggestion Generation Speed

```bash
# Time suggestion generation
time npx tsx test-metadata-flow.ts

# Expected: ~100-200ms for 100 photos
```

---

## Next Steps

After testing metadata extraction:
1. Test full upload flow from mobile app
2. Verify smart album suggestions appear in UI
3. Test "Create Album" functionality from suggestions
4. Monitor extraction performance in production

---

## See Also

- [Metadata Extraction Documentation](../features/metadata-extraction.md)
- [API Endpoints](../api/endpoints.md)
- [Getting Started Guide](./getting-started.md)
