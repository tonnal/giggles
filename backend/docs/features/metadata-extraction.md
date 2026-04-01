# 📸 Photo Metadata Extraction & Smart Album Organization

Complete guide to the metadata extraction system that powers Google Photos-style smart album organization.

---

## 🎯 Overview

The metadata extraction system automatically analyzes uploaded photos to extract:
- **Timestamps** - When the photo was actually taken
- **GPS Location** - Where the photo was taken
- **Camera Info** - Device and settings used
- **Smart Context** - Indoor/outdoor, time of day, season, selfie detection

This metadata powers **smart album suggestions** like:
- **Trip Detection** - "Beach Trip - July 15-19"
- **Event Detection** - "Birthday Party - Jan 15"
- **Seasonal Collections** - "Summer 2024"
- **Location-based Albums** - "Grandma's House"

---

## 🔍 What Metadata Can Be Extracted?

### 1. Timestamps ⏰

- **Date Taken** (`DateTimeOriginal`) - Original photo capture time
- **Date Modified** - Last edit time
- **Date Created** - File creation time

**Use cases:**
- Timeline sorting
- "On This Day" memories
- Group photos by day/week/month
- Detect events (many photos in short time)

### 2. GPS Location 📍

- **Latitude/Longitude** - Exact coordinates
- **Altitude** - Height above sea level
- **Reverse Geocoded Address** - "Central Park, New York" (optional)

**Use cases:**
- **Trip detection** - Photos from same location over 3+ days
- **Frequent places** - Home, grandparents' house, daycare
- **Location-based albums** - "Beach Trip July 2024"
- **Map view** - Show photos on a map

### 3. Camera/Device Info 📷

- **Make** - Apple, Samsung, Canon
- **Model** - iPhone 15 Pro Max, Galaxy S23
- **Lens** - Front camera (selfie detection!)
- **Software** - iOS 17, Camera app version

**Use cases:**
- Detect selfies (front camera)
- Quality filtering (DSLR vs phone)
- Device-specific albums

### 4. Photo Settings 🎛️

- **ISO** - Light sensitivity (indoor/outdoor detection)
- **Exposure Time** - Shutter speed
- **F-Number** - Aperture
- **Focal Length** - Zoom level
- **Flash** - Was flash used? (indoor indicator)

**Use cases:**
- **Indoor/Outdoor detection** - Flash + high ISO = indoor
- **Low-light photos** - High ISO detection

### 5. Image Properties 🖼️

- **Width × Height** - Resolution
- **Orientation** - Portrait/landscape/rotation
- **File Size** - Storage management
- **Format** - JPEG, PNG, HEIC

### 6. Smart Context Detection 🤖

AI-powered context detection:
- **Time of Day** - Morning, afternoon, evening, night
- **Season** - Spring, summer, fall, winter (Northern Hemisphere)
- **Indoor/Outdoor** - Based on flash and ISO
- **Is Selfie** - Front camera detection

---

## 🚀 Implementation

### Database Schema

**Memory Model** (`lib/db/models/Memory.ts:95-123`)

```typescript
interface IMemory {
  // ... existing fields

  metadata?: {
    // Location data
    location?: {
      latitude: number;
      longitude: number;
      altitude?: number;
      address?: string;
    };

    // Camera info
    camera?: {
      make?: string;
      model?: string;
      lens?: string;
    };

    // Context
    context?: {
      isIndoor?: boolean;
      timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
      season?: 'spring' | 'summer' | 'fall' | 'winter';
      isSelfie?: boolean;
    };
  };
}
```

**Indexes for Efficient Queries:**
```typescript
MemorySchema.index({ 'metadata.location.latitude': 1, 'metadata.location.longitude': 1 });
MemorySchema.index({ 'metadata.context.season': 1 });
MemorySchema.index({ 'metadata.context.timeOfDay': 1 });
```

---

## 📱 Mobile App Integration Flow

### Complete Upload Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. User selects photo to upload
   ↓
2. Request presigned S3 URL
   POST /api/upload/presigned-url
   Body: { fileName, fileType }
   Response: { uploadUrl, fileUrl }
   ↓
3. Upload photo directly to S3
   PUT <presigned URL>
   Body: <photo binary>
   ↓
4. Extract metadata from uploaded photo
   POST /api/upload/extract-metadata
   Body: { imageUrl: <S3 URL>, fileName }
   Response: { location, camera, context, dateTaken }
   ↓
5. Create memory with metadata
   POST /api/memories
   Body: {
     familyId,
     childId,
     mediaUrl: <S3 URL>,
     mediaType: 'photo',
     caption,
     date: <use dateTaken or current date>,
     metadata: <from step 4>
   }
   ↓
6. (Optional) Show smart album suggestions
   GET /api/albums/suggestions?familyId=xxx
   Display banner: "We found a trip! 📸 Create album?"
```

### Example Mobile Code (React Native)

```typescript
async function uploadPhotoWithMetadata(photo: Photo) {
  // Step 1: Get presigned URL
  const { uploadUrl, fileUrl } = await fetch('/api/upload/presigned-url', {
    method: 'POST',
    body: JSON.stringify({
      fileName: photo.fileName,
      fileType: photo.type,
    }),
  }).then(r => r.json());

  // Step 2: Upload to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: photo.blob,
    headers: { 'Content-Type': photo.type },
  });

  // Step 3: Extract metadata
  const metadata = await fetch('/api/upload/extract-metadata', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl: fileUrl,
      fileName: photo.fileName,
    }),
  }).then(r => r.json());

  // Step 4: Create memory
  const memory = await fetch('/api/memories', {
    method: 'POST',
    body: JSON.stringify({
      familyId: currentFamilyId,
      childId: currentChildId,
      mediaUrl: fileUrl,
      mediaType: 'photo',
      caption: photo.caption,
      date: metadata.dateTaken || new Date(),
      metadata: metadata.data,
    }),
  }).then(r => r.json());

  return memory;
}

// Periodically check for smart album suggestions
async function checkSmartAlbums() {
  const response = await fetch(
    `/api/albums/suggestions?familyId=${familyId}`
  );
  const { suggestions } = await response.json();

  if (suggestions.length > 0) {
    // Show banner: "We found a trip! Create album?"
    showAlbumSuggestionBanner(suggestions[0]);
  }
}
```

---

## 🎯 Smart Album Suggestions

### API Endpoint

```bash
GET /api/albums/suggestions?familyId=xxx&childId=xxx
```

**Response:**
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
      },
      {
        "name": "Event 8/1/2024",
        "photoIds": ["id6", "id7", "id8", ...],
        "reason": "10 photos taken within 4 hours",
        "confidence": 0.85
      },
      {
        "name": "Summer Memories",
        "photoIds": [...],
        "reason": "15 photos from summer",
        "confidence": 0.7
      },
      {
        "name": "Selfies",
        "photoIds": [...],
        "reason": "5 selfie photos",
        "confidence": 0.8
      }
    ],
    "totalPhotosAnalyzed": 20,
    "message": "Found 4 smart album suggestions!"
  }
}
```

### Detection Algorithms

**1. Trip Detection** (confidence: 90%)
```typescript
// Algorithm:
- 5+ photos at same location (within 500m)
- Taken over 2-14 days
- Example: "Trip 7/15/2024" (23 photos)
```

**2. Event Detection** (confidence: 85%)
```typescript
// Algorithm:
- 10+ photos in 4-hour time span
- Example: "Event 8/1/2024" (45 photos - birthday party)
```

**3. Regular Location Albums** (confidence: 75%)
```typescript
// Algorithm:
- 20+ photos over 30+ days at same location
- Example: "Grandma's House" (67 photos over 6 months)
```

**4. Seasonal Collections** (confidence: 70%)
```typescript
// Algorithm:
- 10+ photos from same season
- Example: "Summer 2024" (156 photos)
```

**5. Selfie Collection** (confidence: 80%)
```typescript
// Algorithm:
- 5+ photos detected as selfies (front camera)
- Example: "Selfies" (12 photos)
```

---

## 🔍 Database Queries

### Find Photos by Location

```typescript
// Find all photos near a location (within ~1km)
const nearbyPhotos = await Memory.find({
  familyId,
  'metadata.location.latitude': {
    $gte: targetLat - 0.01,
    $lte: targetLat + 0.01,
  },
  'metadata.location.longitude': {
    $gte: targetLng - 0.01,
    $lte: targetLng + 0.01,
  },
});
```

### Find Seasonal Photos

```typescript
// Find all summer photos
const summerPhotos = await Memory.find({
  familyId,
  'metadata.context.season': 'summer',
});
```

### Find Selfies

```typescript
// Find all selfie photos
const selfies = await Memory.find({
  familyId,
  'metadata.context.isSelfie': true,
});
```

---

## 📊 Performance

- **Metadata extraction:** ~200-500ms per photo
- **Smart album analysis:** ~100-200ms for 100 photos
- **Database queries:** Indexed for fast location/season searches

**Optimization tips:**
- Extract metadata in background (after S3 upload completes)
- Cache smart album suggestions (refresh daily)
- Lazy-load reverse geocoding (only when viewing map)

---

## 🔐 Privacy Considerations

1. **GPS Data Privacy**
   - Metadata extraction is opt-in (only if app requests it)
   - GPS data stored securely in family database
   - Can be deleted without deleting photo

2. **Sharing Photos**
   - When sharing externally, strip GPS metadata
   - Only share location within family

3. **Data Control**
   - Users can disable metadata extraction
   - Users can delete metadata separately from photos

---

## 🧪 Testing

### Run Test Suite

```bash
# Test metadata extraction service
npx tsx test-metadata-extraction.ts

# Test complete integration flow
npx tsx test-metadata-flow.ts
```

### Example Test Results

```
📸 Metadata Extraction: Working
✅ iPhone 15 Pro Max detected
✅ Date taken: May 20, 2024
✅ Indoor night photo detected
✅ Spring season detected

💾 Memory Creation: Working
✅ Metadata saved to database

🎯 Smart Album Suggestions: Working
✅ Trip detection: 5 photos → "Trip 7/15/2024"
✅ Event detection: 10 photos → "Event 8/1/2024"
✅ Seasonal grouping: 15 photos → "Summer Memories"
✅ Selfie collection: 5 photos → "Selfies"
```

---

## 🔮 Future Enhancements

### Planned Features

1. **Reverse Geocoding**
   - Convert GPS to address: "Central Park, New York"
   - Requires Google Maps API integration

2. **Face Detection**
   - Number of people in photo
   - Adult vs child detection
   - Match to family members

3. **Scene Recognition** (with Claude Vision)
   - "Swimming pool", "Birthday cake", "Park"
   - Enable activity-based albums

---

## ✅ Implementation Status

| Component | Status | File |
|-----------|--------|------|
| Memory schema with metadata | ✅ Complete | `lib/db/models/Memory.ts` |
| Metadata extraction service | ✅ Complete | `lib/services/metadata-extractor.ts` |
| Extract metadata API | ✅ Complete | `app/api/upload/extract-metadata/route.ts` |
| Memory creation with metadata | ✅ Complete | `app/api/memories/route.ts` |
| Smart album suggestions API | ✅ Complete | `app/api/albums/suggestions/route.ts` |
| Database indexes | ✅ Complete | `lib/db/models/Memory.ts` |

---

**Ready for mobile app integration!** 🚀

The backend is now ready to provide Google Photos-style smart album organization based on photo metadata.
