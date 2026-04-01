# 🎬 Video Reel Testing Guide

## Quick Start

You have:
- ✅ **5 test photos** in `assets/test_photo/` (avyaan1-5.jpeg)
- ✅ **1 music file** in `assets/music/`
- ✅ **No auth required** - special test endpoint created

---

## Method 1: Automated Test Script (Recommended)

```bash
# Make sure server is running first
npm run dev

# In another terminal, run the test script:
cd /Users/aryanjain/Desktop/Giggles/backend
./test-reel.sh
```

The script will:
1. ✅ Check all prerequisites (Redis, FFmpeg, photos, music)
2. ✅ Generate a video reel automatically
3. ✅ Monitor progress in real-time
4. ✅ Download and open the video when done

---

## Method 2: Manual cURL Commands

### Step 1: Check Prerequisites

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check FFmpeg
ffmpeg -version

# Check test assets
ls -l assets/test_photo/
ls -l assets/music/
```

### Step 2: Generate Video Reel

```bash
# Start generation
curl -X POST http://localhost:3000/api/test/generate-reel \
  -H "Content-Type: application/json" | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "highlightId": "67e234abc123...",
    "jobId": "12345",
    "familyId": "67e234...",
    "childId": "67e234...",
    "memoryCount": 5,
    "status": "Video generation started..."
  },
  "message": "Test video reel generation started successfully"
}
```

**Save the `jobId` from the response!**

### Step 3: Monitor Progress

```bash
# Replace YOUR_JOB_ID with actual job ID from step 2
JOB_ID="YOUR_JOB_ID"

# Check status
curl "http://localhost:3000/api/test/generate-reel?jobId=$JOB_ID" | jq '.'
```

**Response shows:**
- `state`: "waiting" → "active" → "completed" or "failed"
- `progress`: 0-100%
- `videoUrl`: Available when completed

### Step 4: Get Video URL

```bash
# When state is "completed", video URL will be in response
curl "http://localhost:3000/api/test/generate-reel?jobId=$JOB_ID" \
  | jq -r '.data.highlight.videoUrl'
```

### Step 5: View All Test Highlights

```bash
# List all generated test highlights
curl http://localhost:3000/api/test/generate-reel | jq '.'
```

---

## What Happens During Generation

### Timeline (approximately 30-60 seconds):

1. **Initial Setup** (5%)
   - Creates test family and child if needed
   - Loads test photos from `assets/test_photo/`
   - Creates memory records

2. **AI Script Generation** (10-20%)
   - GPT-5.1 generates playful narration script
   - Creates title and text overlays

3. **Photo Processing** (20-40%)
   - Downloads/loads 5 test photos
   - Resizes to 1080x1920 (vertical format)

4. **Audio Generation** (40-50%)
   - OpenAI TTS generates narration
   - Mixes with background music

5. **Video Creation** (50-85%)
   - Creates Ken Burns effect clips (zoom/pan)
   - Adds text overlays
   - Assembles with crossfade transitions

6. **Finalization** (85-95%)
   - Adds final audio track
   - Generates thumbnail

7. **Upload** (95-100%)
   - Uploads to S3 (or saves locally in test mode)
   - Updates database

---

## Expected Output

The generated video will be:
- **Format:** MP4
- **Resolution:** 1080x1920 (vertical, Instagram Reels format)
- **Duration:** ~25-30 seconds (5 photos × 5 seconds each)
- **Features:**
  - ✅ Ken Burns effects (zoom/pan animations)
  - ✅ Crossfade transitions between photos
  - ✅ Title text overlay at start
  - ✅ AI-generated voiceover narration
  - ✅ Background music (if available)
  - ✅ Professional quality

---

## Troubleshooting

### Redis Not Running
```bash
# macOS
brew services start redis

# Verify
redis-cli ping
```

### FFmpeg Not Installed
```bash
brew install ffmpeg
```

### "No test photos found"
```bash
# Make sure photos are in the right location
ls assets/test_photo/*.{jpg,jpeg,png}

# They should be there (avyaan1-5.jpeg)
```

### Video Generation Stuck
```bash
# Check the dev server logs
# You should see progress logs like:
# 🎬 Processing video reel job...
# 📁 Loaded local file: .../avyaan1.jpeg
# ✅ Photo 1/5 optimized
# 🎤 Audio narration generated
# etc.

# Check Redis queue
redis-cli keys "*"

# Check BullMQ job status
curl "http://localhost:3000/api/test/generate-reel?jobId=YOUR_JOB_ID" | jq '.'
```

### "MongoDB connection error"
```bash
# Check MongoDB Atlas IP whitelist
# Go to: https://cloud.mongodb.com/
# Network Access → Add IP Address → Allow from Anywhere (for testing)

# Or check connection string in .env
cat .env | grep MONGODB_URI
```

---

## Advanced Testing

### Test with Different Photo Counts

The endpoint automatically uses up to 6 photos. To test with different counts:
1. Move photos out of `assets/test_photo/` to test with fewer
2. Add more photos to test with more

### Test Different Music

```bash
# Rename or replace the music file
mv assets/music/brain-implant*.mp3 assets/music/upbeat-playful.mp3

# Or add multiple files - the system picks based on mood
```

### View Server Logs

```bash
# In the terminal where npm run dev is running, you'll see:
# 🧪 TEST MODE: Generating video reel without authentication
# 📸 Found 5 test photos
# ✅ Test family created: ...
# ✅ Test child created: ...
# 🤖 Generating narration with GPT-5.1...
# 📝 Generated content: ...
# 🎬 Processing video reel job...
# 📁 Loaded local file: .../avyaan1.jpeg
# ✅ Photo 1/5 optimized
# ...
# ✅ Video reel generated successfully
```

---

## Clean Up Test Data

To remove test data and start fresh:

```bash
# The test endpoint automatically creates:
# - Family: "Test Family"
# - Child: "Test Child"
# - Memories with your test photos

# To clean up, you can delete from MongoDB
# Or just regenerate - it will overwrite old test memories
```

---

## Production Testing

Once you have OAuth configured:

```bash
# Use the real endpoint (requires authentication)
curl -X POST http://localhost:3000/api/highlights/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "weekly",
    "childId": "YOUR_REAL_CHILD_ID",
    "familyId": "YOUR_REAL_FAMILY_ID"
  }'
```

---

## What to Look For

### ✅ Success Indicators:
- Video generated in 30-60 seconds
- Clean progress from 0% to 100%
- Video file is 1080x1920 resolution
- Ken Burns effects visible (zoom/pan)
- Smooth transitions between photos
- Clear audio narration
- Background music playing (if added)
- Title text overlay appears

### ❌ Problem Indicators:
- Generation stuck at same percentage for > 2 minutes
- FFmpeg errors in server logs
- "Photo processing" errors
- Audio generation failures
- Empty or corrupted video file

---

**Ready to test! Run `./test-reel.sh` to get started! 🎬**
