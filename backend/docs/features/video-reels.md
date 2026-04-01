# 🎬 Professional Video Reel Generation

Complete guide to the automated video reel generation system that creates Instagram Reels-quality MP4 videos from family memories.

---

## 🎯 Overview

The video reel system automatically creates **professional 30-second MP4 videos** that feel like:
- Instagram Reels / TikTok compilations
- Apple Photos Memories
- Spotify Wrapped videos
- Professional, shareable, viral-worthy content

**What's Generated:**
- ✅ 1080x1920 vertical MP4 videos (perfect for mobile)
- ✅ Ken Burns effects (dynamic zoom/pan on photos)
- ✅ Smooth varied transitions (fade, wipe, slide)
- ✅ Animated text overlays synced with audio
- ✅ AI-generated voiceover narration (OpenAI TTS)
- ✅ Background music mixed with narration
- ✅ Generated in ~30-60 seconds

---

## 🏗️ Architecture

### Components

1. **Video Reel Generator** (`lib/services/video-reel-generator.ts`)
   - Core FFmpeg-based video generation
   - Ken Burns effects, transitions, overlays
   - Audio mixing (narration + background music)

2. **BullMQ Queue System** (`lib/queue/video-queue.ts`)
   - Async job processing
   - Progress tracking
   - Automatic retries on failure
   - Job status monitoring

3. **Background Music Manager** (`lib/services/background-music.ts`)
   - Music library management
   - Mood-based track selection
   - Support for pre-licensed tracks

4. **Highlight Generator** (`lib/services/highlight-generator.ts`)
   - Automatically queues video generation after creating highlights
   - Generates text overlays from narration
   - Updates database when video is ready

### Processing Flow

```
User creates memories throughout the week
    ↓
Cron job triggers (Monday 8am)
    ↓
Generate Weekly Highlight (GPT-5.1)
    ↓
Queue Video Reel Generation Job
    ↓
BullMQ Worker Processes Job
    ↓
┌──────────────────────────────────────┐
│  Video Generation Pipeline (30-60s)  │
├──────────────────────────────────────┤
│  1. Download & optimize photos       │
│  2. Generate narration audio (TTS)   │
│  3. Mix audio (narration + music)    │
│  4. Create Ken Burns clips           │
│  5. Add text overlays                │
│  6. Assemble with transitions        │
│  7. Upload to S3                     │
│  8. Update database                  │
└──────────────────────────────────────┘
    ↓
Send push notification to family
    ↓
Family watches & shares video 🎉
```

---

## 🎨 Video Generation Pipeline (Detailed)

### Stage 1: Photo Preparation

```typescript
// Download and optimize each photo to 1080x1920
for (const memory of selectedMemories) {
  const image = await downloadImage(memory.mediaUrl);

  const optimized = await sharp(image)
    .resize(1080, 1920, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  await saveTemp(optimized, `photo-${memory.order}.jpg`);
}
```

### Stage 2: Audio Generation

**2A. Narration (OpenAI TTS)**
```typescript
const narrationAudio = await openai.audio.speech.create({
  model: 'tts-1-hd', // High quality
  voice: 'nova',
  input: script.narrationScript,
  speed: 0.95
});

// Save: narration.mp3
```

**2B. Audio Mixing**
```typescript
// Mix background music (25% volume) with narration (100% volume)
ffmpeg()
  .input(backgroundMusicPath)
  .input(narrationPath)
  .complexFilter([
    `[0:a]volume=0.25,afade=t=in:st=0:d=1,afade=t=out:st=${targetDuration - 2}:d=2[music]`,
    '[1:a]adelay=500|500[narration]',
    '[music][narration]amix=inputs=2:duration=first:dropout_transition=2',
  ])
  .outputOptions(['-t', targetDuration.toString()])
  .output('final-audio.mp3');
```

### Stage 3: Ken Burns Effects

Creates dynamic zoom/pan effects on each photo:

```typescript
// DRAMATIC zoom expressions - 50% zoom!
if (effect.zoom === 'in') {
  zoomExpression = 'min(zoom+0.0033,1.5)'; // Zoom in from 1.0 to 1.5
} else {
  zoomExpression = 'min(max(1.5-on*0.0033,1.0),1.5)'; // Zoom out
}

// DYNAMIC pan with movement
switch (effect.pan) {
  case 'left-to-right':
    xExpression = 'iw/2-(iw/zoom/2)-60+on*4'; // Fast movement right
    break;
  case 'right-to-left':
    xExpression = 'iw/2-(iw/zoom/2)+60-on*4'; // Fast movement left
    break;
  // ... more pan directions
}

ffmpeg(photoPath)
  .inputOptions([
    '-loop', '1',
    '-framerate', '30', // CRITICAL: Explicitly set framerate
    '-t', duration.toString()
  ])
  .videoFilters([
    `zoompan=z='${zoomExpression}':d=${frames}:x='${xExpression}':y='${yExpression}':s=1080x1920`,
    'format=yuv420p'
  ])
  .output(`clip-${index}.mp4`);
```

**5 Ken Burns Variations:**
- Zoom in, pan left→right
- Zoom out, pan right→left
- Zoom in, pan bottom→top
- Zoom out, pan top→bottom
- Zoom in, centered (no pan)

### Stage 4: Text Overlays

**4A. Generate Text Images (2x resolution for quality)**
```typescript
const width = 2160; // 2x resolution
const height = 1000;
let fontSize = 160; // Large font (2x of 80)

// Word wrap function
const maxWidth = 1900; // Leave padding
const words = overlay.text.split(' ');
const lines: string[] = [];
let currentLine = words[0];

for (let i = 1; i < words.length; i++) {
  const testLine = currentLine + ' ' + words[i];
  const metrics = ctx.measureText(testLine);

  if (metrics.width > maxWidth) {
    lines.push(currentLine);
    currentLine = words[i];
  } else {
    currentLine = testLine;
  }
}
lines.push(currentLine);

// Auto-reduce font size if still too wide
while (lines.some(line => ctx.measureText(line).width > maxWidth) && fontSize > 80) {
  fontSize -= 10;
  ctx.font = `bold ${fontSize}px Arial`;
  // Re-wrap...
}
```

**4B. Apply Overlays to Video**
```typescript
cmd
  .complexFilter(filterChain)
  .map('[vout]')
  .videoCodec('libx264')
  .outputOptions([
    '-preset', 'medium', // Better quality
    '-crf', '18', // High quality (lower = better)
    '-pix_fmt', 'yuv420p'
  ]);
```

### Stage 5: Transitions

```typescript
// 7 varied transitions for visual interest
const transitions = [
  'fade',
  'wipeleft',
  'wiperight',
  'slideleft',
  'slideright',
  'smoothleft',
  'smoothright'
];

for (let i = 1; i < clipPaths.length; i++) {
  const offset = i * (clipDuration - transitionDuration);
  const transition = transitions[i % transitions.length];

  filterChain.push(
    `${previousOutput}[${i}:v]xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset}${currentOutput}`
  );
}
```

### Stage 6: Final Assembly

```typescript
// Combine: video clips + text overlays + mixed audio
ffmpeg
  .input('video-with-text.mp4')
  .input('final-audio.mp3')
  .audioCodec('aac')
  .videoCodec('libx264')
  .outputOptions([
    '-preset', 'superfast', // Fast encoding
    '-crf', '26', // Balanced quality
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart' // Web streaming
  ])
  .output('final-reel.mp4');
```

---

## ⚙️ Setup & Configuration

### Prerequisites

**1. Install Redis** (required for BullMQ queue)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Verify
redis-cli ping  # Should return: PONG
```

**2. Install FFmpeg** (required for video processing)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

**3. Setup Music Library**

Create music directory and add background tracks:

```bash
mkdir -p assets/music
```

**Recommended:** Subscribe to [Epidemic Sound](https://www.epidemicsound.com/) ($15/month) or [Artlist](https://artlist.io/) ($9.99/month) and download tracks:

- `upbeat-playful.mp3` (Joyful mood)
- `warm-emotional.mp3` (Emotional mood)
- `gentle-calm.mp3` (Calm mood)
- `energetic-adventure.mp3` (Adventure mood)
- `quirky-fun.mp3` (Funny mood)
- `happy-bounce.mp3` (Playful mood)
- `gentle-memories.mp3` (Nostalgic mood)
- `inspiring-uplifting.mp3` (Uplifting mood)

Place them in `assets/music/`.

**4. Environment Variables**

Add to `.env`:

```bash
# Redis
REDIS_URL=redis://localhost:6379

# Video Configuration
MUSIC_LIBRARY_PATH=./assets/music
VIDEO_QUEUE_CONCURRENCY=2
```

---

## 🚀 Usage

### Automatic Video Generation

Video reels are **automatically generated** when weekly/monthly highlights are created:

```typescript
// This automatically queues video generation
const highlightId = await generateWeeklyHighlight({
  childId,
  familyId,
  weekStartDate,
  weekEndDate,
});

// Video generation happens in the background
// Database is updated when complete
```

### Manual Video Generation

Trigger video generation via test endpoint:

```bash
POST /api/test/generate-reel
{
  "familyId": "optional",
  "childId": "optional"
}
```

**Response:**
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
  }
}
```

### Check Video Status

Monitor progress:

```bash
GET /api/test/generate-reel?jobId=12345
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "state": "completed",  // waiting | active | completed | failed
    "progress": 100,
    "highlight": {
      "videoUrl": "https://s3.../reel-123.mp4",
      "thumbnailUrl": "https://s3.../thumb-123.jpg",
      "videoDuration": 30,
      "status": "completed"
    }
  }
}
```

---

## 🎨 Video Quality Modes

### Fast Mode (Default for Weekly)
- Simple crossfade transitions
- Basic Ken Burns (zoom only)
- Static text overlays
- Generation time: **30-45 seconds**
- Cost: **~$0.10 per video**

### Premium Mode (Default for Monthly)
- Advanced Ken Burns (zoom + pan)
- Multiple transition styles (7 variations)
- Animated text overlays
- Higher quality encoding
- Generation time: **60-90 seconds**
- Cost: **~$0.12 per video**

---

## 📊 Database Schema

### WeeklyHighlight / MonthlyRecap

Video-related fields:

```typescript
{
  // ... existing fields

  // Video fields
  videoUrl?: string;           // S3 URL to MP4 file
  thumbnailUrl?: string;        // S3 URL to thumbnail
  videoDuration?: number;       // Duration in seconds (default: 30)
  videoJobId?: string;          // BullMQ job ID for tracking
  status: 'generating' | 'completed' | 'failed';
  errorMessage?: string;        // If failed
}
```

---

## 💰 Cost Analysis

### Per Video Reel

| Component | Service | Cost |
|-----------|---------|------|
| Memory selection | GPT-5.1 | $0.01 |
| Script generation | GPT-5.1 | $0.02 |
| Narration audio | OpenAI TTS HD | $0.02 |
| Background music | Epidemic Sound | $0.001 (subscription) |
| Video processing | FFmpeg (self-hosted) | $0.03 (compute) |
| Storage (S3) | AWS | $0.01 |
| **Total** | | **$0.09 - $0.12** |

### At Scale

With 10,000 active children:
- Weekly highlights: 40,000/month
- Monthly recaps: 10,000/month
- **Total cost:** $4,000 - $6,000/month

**Revenue potential** (5% storybook conversion):
- 500 storybooks × $30 = $15,000/month
- **ROI: 3-4x**

---

## 📱 Mobile App Integration

### Display Video

```typescript
import { Video } from 'react-native-video';

<Video
  source={{ uri: highlight.videoUrl }}
  style={styles.fullscreen}
  controls={true}
  resizeMode="cover"
  poster={highlight.thumbnailUrl}
/>
```

### Share to Social Media

```typescript
import { Share, Linking } from 'react-native';

// Generic share
await Share.share({
  url: highlight.videoUrl,
  message: `Check out this week's highlights! 🎉`,
});

// Direct to Instagram Reels
await Linking.openURL(
  `instagram://camera?url=${encodeURIComponent(highlight.videoUrl)}`
);
```

### Progress Indicator

```typescript
const [progress, setProgress] = useState(0);

// Poll job status
const pollStatus = async (jobId: string) => {
  const response = await fetch(`/api/test/generate-reel?jobId=${jobId}`);
  const { data } = await response.json();

  setProgress(data.progress);

  if (data.state === 'completed') {
    refetchHighlights();
  } else if (data.state !== 'failed') {
    setTimeout(() => pollStatus(jobId), 2000);
  }
};
```

---

## 🔍 Monitoring & Debugging

### Common Issues

**Issue: Redis connection failed**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
Solution: Ensure Redis is running (`redis-cli ping`)

**Issue: FFmpeg not found**
```
Error: Cannot find ffmpeg
```
Solution: Install FFmpeg system-wide

**Issue: Music file not found**
```
Error: ENOENT: no such file or directory
```
Solution: Add music files to `assets/music/`

**Issue: Video generation hangs at 45%**
```
Error: ffmpeg exited with code 234
```
Solution: Verify `-framerate 30` is set in FFmpeg input options

### View Logs

```bash
# Watch logs in real-time
tail -f logs/video-generation.log

# Check running FFmpeg processes
ps aux | grep ffmpeg
```

---

## 🎯 Performance Optimization

### Concurrency Control

```bash
VIDEO_QUEUE_CONCURRENCY=2  # Process 2 videos at a time
```

### Rate Limiting

Built-in rate limiting:
- Max 5 jobs per minute
- Prevents overloading FFmpeg

### Memory Management

Monitor memory usage:

```bash
# Watch memory usage
watch -n 1 free -h
```

### Cleanup

Old jobs are automatically cleaned up:
- Completed jobs: Kept for 24 hours
- Failed jobs: Kept for 7 days

---

## 🔐 Security Considerations

1. **S3 Bucket:** Ensure public read access is restricted
2. **Redis:** Don't expose Redis port publicly
3. **API:** Add authentication to manual trigger endpoints
4. **Rate Limiting:** Prevent abuse of video generation API

---

## 🔮 Future Enhancements

### Planned Features

1. **Real-time Progress via WebSocket**
   - Replace polling with WebSocket updates
   - Show live progress to users

2. **Custom Branding**
   - Add family logo watermark
   - Customizable color schemes

3. **Advanced Effects**
   - Face detection for smart cropping
   - Auto-color grading
   - Slow-motion effects

4. **AI Music Generation**
   - Integrate Suno or Mubert
   - Generate custom tracks per video

5. **Multi-language Support**
   - Narration in different languages
   - Auto-translate text overlays

6. **Template System**
   - Pre-designed video templates
   - Seasonal themes (birthday, holiday, etc.)

---

## ✅ Implementation Status

| Component | Status | File |
|-----------|--------|------|
| Video reel generator | ✅ Complete | `lib/services/video-reel-generator.ts` |
| BullMQ queue system | ✅ Complete | `lib/queue/video-queue.ts` |
| Background music manager | ✅ Complete | `lib/services/background-music.ts` |
| Highlight generator integration | ✅ Complete | `lib/services/highlight-generator.ts` |
| Test endpoint | ✅ Complete | `app/api/test/generate-reel/route.ts` |
| Ken Burns effects | ✅ Complete | 5 variations implemented |
| Text overlays | ✅ Complete | High-quality with word wrapping |
| Varied transitions | ✅ Complete | 7 transition types |
| Audio mixing | ✅ Complete | Narration + background music |

---

**The video reel system is production-ready! 🎉**

Creates Instagram Reels-quality videos automatically from family memories.
