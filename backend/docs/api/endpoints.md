# 📡 API Endpoints Reference

Complete reference for all Giggles backend API endpoints.

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://yourdomain.com/api
```

---

## Authentication

All endpoints (except auth endpoints) require a valid NextAuth session.

**Authentication Methods:**
- Google OAuth
- Apple Sign In

See [Authentication Documentation](./authentication.md) for setup details.

---

## Table of Contents

- [Authentication](#authentication-endpoints)
- [Families](#family-endpoints)
- [Children](#children-endpoints)
- [Memories](#memory-endpoints)
- [Albums](#album-endpoints)
- [Upload](#upload-endpoints)
- [Highlights](#highlights-endpoints)

---

## Authentication Endpoints

### Get Current User

```http
GET /api/auth/me
```

**Authorization:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://...",
      "authProvider": "google",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## Family Endpoints

### Create Family

```http
POST /api/families
```

**Authorization:** Required

**Request Body:**
```json
{
  "name": "The Smith Family",
  "childName": "Emma",
  "childDob": "2020-05-15",  // Optional
  "childGender": "girl"       // Optional: "boy" | "girl"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "family": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "The Smith Family",
      "inviteCode": "ABC123",
      "members": [
        {
          "userId": "...",
          "role": "parent",
          "joinedAt": "2024-01-15T10:30:00.000Z"
        }
      ]
    },
    "child": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Emma",
      "dob": "2020-05-15T00:00:00.000Z",
      "gender": "girl"
    }
  }
}
```

### Get All Families

```http
GET /api/families
```

**Authorization:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "The Smith Family",
      "inviteCode": "ABC123",
      "members": [...],
      "childrenIds": ["..."],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Family by ID

```http
GET /api/families/:id
```

**Authorization:** Required (must be family member)

**Response:** Same as single family object above

### Join Family

```http
POST /api/families/join
```

**Authorization:** Required

**Request Body:**
```json
{
  "inviteCode": "ABC123",
  "role": "grandparent"  // "parent" | "grandparent" | "relative"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "family": { ... },
    "message": "Successfully joined The Smith Family"
  }
}
```

---

## Children Endpoints

### Create Child

```http
POST /api/children
```

**Authorization:** Required (must be family member)

**Request Body:**
```json
{
  "familyId": "507f1f77bcf86cd799439011",
  "name": "Liam",
  "dob": "2022-03-20",      // Optional
  "gender": "boy",          // Optional: "boy" | "girl"
  "photoUrl": "https://..." // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "familyId": "507f1f77bcf86cd799439011",
    "name": "Liam",
    "dob": "2022-03-20T00:00:00.000Z",
    "gender": "boy",
    "photoUrl": "https://...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Children by Family

```http
GET /api/children?familyId=507f1f77bcf86cd799439011
```

**Authorization:** Required (must be family member)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Emma",
      "dob": "2020-05-15T00:00:00.000Z",
      "gender": "girl"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Liam",
      "dob": "2022-03-20T00:00:00.000Z",
      "gender": "boy"
    }
  ]
}
```

### Update Child

```http
PATCH /api/children/:id
```

**Authorization:** Required (must be family member)

**Request Body:** (all fields optional)
```json
{
  "name": "Emma Rose",
  "dob": "2020-05-15",
  "gender": "girl",
  "photoUrl": "https://..."
}
```

---

## Memory Endpoints

### Create Memory

```http
POST /api/memories
```

**Authorization:** Required (must be family member)

**Request Body:**
```json
{
  "familyId": "507f1f77bcf86cd799439011",
  "childId": "507f1f77bcf86cd799439012",
  "mediaUrl": "https://s3.../photo.jpg",
  "mediaType": "photo",  // "photo" | "video"
  "caption": "First day of school!",
  "date": "2024-09-01T08:00:00.000Z",  // Optional
  "thumbnailUrl": "https://...",        // Optional
  "metadata": {                          // Optional (from metadata extraction)
    "location": {
      "latitude": 40.7829,
      "longitude": -73.9654
    },
    "camera": {
      "make": "Apple",
      "model": "iPhone 15 Pro Max"
    },
    "context": {
      "timeOfDay": "morning",
      "season": "fall",
      "isIndoor": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "familyId": "507f1f77bcf86cd799439011",
    "childId": "507f1f77bcf86cd799439012",
    "uploadedBy": "507f1f77bcf86cd799439010",
    "mediaUrl": "https://s3.../photo.jpg",
    "mediaType": "photo",
    "caption": "First day of school!",
    "tags": ["school", "education", "milestone"],  // AI-generated
    "date": "2024-09-01T08:00:00.000Z",
    "metadata": { ... },
    "reactions": [],
    "comments": [],
    "albumIds": ["507f..."],  // Auto-added to "School" album
    "createdAt": "2024-09-01T08:30:00.000Z"
  }
}
```

### Get Memories

```http
GET /api/memories?familyId=xxx&childId=xxx&page=1&limit=20
```

**Authorization:** Required (must be family member)

**Query Parameters:**
- `familyId` (required)
- `childId` (optional)
- `tags` (optional) - comma-separated
- `startDate` (optional)
- `endDate` (optional)
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "mediaUrl": "https://...",
        "caption": "First day of school!",
        "tags": ["school", "education"],
        "date": "2024-09-01T08:00:00.000Z",
        "uploadedBy": {
          "name": "John Doe",
          "avatar": "https://..."
        },
        "reactions": [
          {
            "userId": "...",
            "emoji": "❤️",
            "createdAt": "2024-09-01T09:00:00.000Z"
          }
        ],
        "comments": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

### React to Memory

```http
POST /api/memories/:id/react
```

**Authorization:** Required

**Request Body:**
```json
{
  "emoji": "❤️"  // "❤️" | "😂" | "⭐" | "🥰" | "👏"
}
```

### Add Comment

```http
POST /api/memories/:id/comment
```

**Authorization:** Required

**Request Body:**
```json
{
  "text": "So proud of you!"
}
```

---

## Album Endpoints

### Get Smart Album Suggestions

```http
GET /api/albums/suggestions?familyId=xxx&childId=xxx
```

**Authorization:** Required (must be family member)

**Query Parameters:**
- `familyId` (required)
- `childId` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "name": "Trip 7/15/2024",
        "photoIds": ["...", "...", "..."],
        "reason": "5 photos from 3 days at same location",
        "confidence": 0.9
      },
      {
        "name": "Summer Memories",
        "photoIds": ["..."],
        "reason": "15 photos from summer",
        "confidence": 0.7
      }
    ],
    "totalPhotosAnalyzed": 20,
    "message": "Found 2 smart album suggestions!"
  }
}
```

---

## Upload Endpoints

### Get Presigned Upload URL

```http
POST /api/upload/presigned-url
```

**Authorization:** Required

**Request Body:**
```json
{
  "fileName": "photo.jpg",
  "fileType": "image/jpeg",
  "folder": "memories"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.../presigned-url",  // PUT file here
    "fileUrl": "https://s3.../final-url"         // Use for memory creation
  }
}
```

**Upload Flow:**
1. Get presigned URL from this endpoint
2. `PUT` file to `uploadUrl`
3. Use `fileUrl` when creating memory

### Extract Photo Metadata

```http
POST /api/upload/extract-metadata
```

**Authorization:** Required

**Request Body:**
```json
{
  "imageUrl": "https://s3.../photo.jpg",
  "fileName": "photo.jpg"
}
```

**Response:**
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
      "model": "iPhone 15 Pro Max",
      "lens": "iPhone 15 Pro Max back camera"
    },
    "context": {
      "timeOfDay": "afternoon",
      "season": "summer",
      "isIndoor": false,
      "isSelfie": false
    },
    "dateTaken": "2024-07-15T14:30:00.000Z"
  },
  "message": "Metadata extracted successfully"
}
```

---

## Highlights Endpoints

### Get Weekly Highlights

```http
GET /api/highlights/weekly?childId=xxx&year=2024
```

**Authorization:** Required

**Query Parameters:**
- `childId` (required)
- `year` (optional, default: current year)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "childId": "507f1f77bcf86cd799439012",
      "familyId": "507f1f77bcf86cd799439011",
      "weekNumber": 35,
      "weekStartDate": "2024-08-26T00:00:00.000Z",
      "weekEndDate": "2024-09-01T23:59:59.000Z",
      "title": "Adventure Week!",
      "summary": "What a week! Emma learned to ride her bike...",
      "narrationScript": "This week was full of...",
      "narrationAudioUrl": "https://s3.../audio.mp3",
      "videoUrl": "https://s3.../reel.mp4",
      "thumbnailUrl": "https://s3.../thumb.jpg",
      "videoDuration": 30,
      "selectedMemoryIds": ["...", "...", "..."],
      "status": "completed",
      "createdAt": "2024-09-02T08:00:00.000Z"
    }
  ]
}
```

### Get Monthly Recaps

```http
GET /api/highlights/monthly?childId=xxx&year=2024
```

**Authorization:** Required

Similar response structure to weekly highlights.

---

## Test Endpoints

### Generate Test Video Reel

```http
POST /api/test/generate-reel
```

**No authorization required** (test endpoint)

**Request Body:** (all optional)
```json
{
  "familyId": "...",
  "childId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "highlightId": "507f1f77bcf86cd799439015",
    "jobId": "12345",
    "familyId": "507f1f77bcf86cd799439011",
    "childId": "507f1f77bcf86cd799439012",
    "memoryCount": 5,
    "status": "Video generation started..."
  }
}
```

### Check Video Generation Status

```http
GET /api/test/generate-reel?jobId=12345
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "state": "completed",  // "waiting" | "active" | "completed" | "failed"
    "progress": 100,       // 0-100
    "highlight": {
      "videoUrl": "https://s3.../reel.mp4",
      "thumbnailUrl": "https://s3.../thumb.jpg",
      "status": "completed"
    }
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not a family member)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

**Current limits:**
- 100 requests per minute per user
- 10 uploads per minute per user
- 5 video generations per hour per family

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

---

## WebSocket Events (Future)

Planned real-time updates:

- `video-generation-progress` - Video reel generation progress
- `new-memory` - New memory added to family
- `new-reaction` - New reaction on memory
- `new-comment` - New comment on memory

---

## See Also

- [Authentication](./authentication.md)
- [Security Model](./security.md)
- [Getting Started Guide](../guides/getting-started.md)
- [Video Reels](../features/video-reels.md)
- [Metadata Extraction](../features/metadata-extraction.md)
