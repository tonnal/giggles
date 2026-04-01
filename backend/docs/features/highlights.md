# 🎬 Automated Highlights & Recaps System

## Overview

The Giggles app now has a **fully automated system** for creating playful, personalized weekly highlights and monthly recaps - complete with **AI-generated narration and audio**!

This is what keeps families engaged and makes the app addictive. Every week, they get a beautiful, personalized recap delivered automatically.

---

## 🎯 What Gets Generated

### 1. **Weekly Highlights** (Every Monday)

**Generated for:** All children with memories from last week

**Contains:**
- ✨ **Playful title** - "Adventure Week!", "Learning Days", etc. (GPT-5.1)
- 📝 **Summary** - 2-3 sentence warm recap (GPT-5.1)
- 🎤 **Audio narration** - 30-45 second voiceover (OpenAI TTS)
- 📸 **Top 5-8 memories** - AI-selected best moments (GPT-5.1)
- 🎨 **Optional collage** - Visual compilation (Gemini)

**Delivery:** Push notification: "Your week's highlights are ready! 🎉"

---

### 2. **Monthly Recaps** (1st of Each Month)

**Generated for:** All children with memories from last month

**Contains:**
- 🎊 **Monthly title** - "January Adventures", "Your Amazing February"
- 📊 **Fun stats**:
  - Total memories captured
  - New milestones reached
  - Favorite activities (top tags)
  - Busiest day
- 📝 **Growth summary** - Developmental observations (GPT-5.1)
- 🎤 **Audio narration** - 60-90 second voiceover (OpenAI TTS)
- 📸 **Top 10-15 memories** - Best moments of the month
- 🎵 **Music recommendation** - Suggested background music

**Delivery:** Push notification: "Your month in review is here! 📅"

---

## 🤖 How It Works (Technical Flow)

### Weekly Highlights (Every Monday 8 AM)

```
1. Cron job triggers
2. For each child:
   a. Fetch all memories from last week (Mon-Sun)
   b. GPT-5.1 selects top 5-8 memories
   c. GPT-5.1 generates playful title + summary + narration script
   d. OpenAI TTS converts narration to audio MP3
   e. (Optional) Gemini creates photo collage
   f. Save to WeeklyHighlight collection
   g. Send push notification to family
```

### Monthly Recaps (1st of Month 9 AM)

```
1. Cron job triggers
2. For each child:
   a. Fetch all memories from last month
   b. Calculate stats (tags, milestones, busiest day)
   c. GPT-5.1 selects top 10-15 memories
   d. GPT-5.1 generates title + summary + growth summary + narration
   e. OpenAI TTS converts to audio
   f. Save to MonthlyRecap collection
   g. Send push notification
```

---

## 🎨 AI Prompting Strategy

### **GPT-5.1 Tone Guidelines:**

All prompts use:
- ✅ **Playful, loving, joyful** tone
- ✅ **Second-person** ("You did this!" - addressing child)
- ✅ **Parent-proud voice** (like showing off to relatives)
- ✅ **Emotional warmth** (celebrates small wins)

**Example narration output:**
> "What a week it's been! You learned to ride your bike without training wheels - we were SO proud watching you pedal all by yourself! Then you spent Sunday making cookies with Grandma, and boy did those chocolate chips disappear fast! Can't wait to see what adventures next week brings! 🎉"

---

## 📊 Database Models

### WeeklyHighlight

```typescript
{
  familyId: ObjectId,
  childId: ObjectId,
  weekStartDate: Date,
  weekEndDate: Date,
  weekNumber: number,
  year: number,

  title: string,              // "Adventure Week!"
  summary: string,            // 2-3 sentence recap
  narrationText: string,      // Audio script
  narrationAudioUrl: string,  // MP3 file on S3

  memoryIds: ObjectId[],      // Selected memories
  coverImageUrl: string,      // First photo or collage
  collageImageUrl?: string,   // Generated collage
  collageLayout: 'grid' | 'scrapbook' | 'polaroid' | 'filmstrip',

  viewCount: number,
  isViewed: boolean,
  generatedAt: Date
}
```

### MonthlyRecap

```typescript
{
  familyId: ObjectId,
  childId: ObjectId,
  month: number,              // 1-12
  year: number,
  monthName: string,          // "January"

  title: string,
  summary: string,
  narrationText: string,
  narrationAudioUrl: string,

  stats: {
    totalMemories: number,
    newMilestones: number,
    favoriteTags: string[],
    busiestDay: Date,
    memoriesCount: number
  },

  highlightMemoryIds: ObjectId[],
  coverImageUrl: string,
  collageImageUrl?: string,
  musicRecommendation: string,  // "Upbeat & Playful"
  growthSummary: string,        // "This month, Emma learned..."

  viewCount: number,
  isViewed: boolean
}
```

---

## 🛣️ API Endpoints

### Get Weekly Highlights
```
GET /api/highlights/weekly?childId=xxx&year=2024
```

Response:
```json
{
  "success": true,
  "data": {
    "highlights": [
      {
        "_id": "...",
        "title": "Adventure Week!",
        "summary": "What an amazing week of firsts...",
        "narrationAudioUrl": "https://s3.../narration-123.mp3",
        "memoryIds": [...],
        "coverImageUrl": "...",
        "weekStartDate": "2024-01-08",
        "weekEndDate": "2024-01-14"
      }
    ],
    "pagination": {...}
  }
}
```

### Get Monthly Recaps
```
GET /api/highlights/monthly?childId=xxx&year=2024
```

### Manually Trigger Generation (Testing/Admin)
```
POST /api/highlights/generate
{
  "type": "weekly",  // or "monthly"
  "childId": "...",
  "familyId": "...",
  "month": 1,        // optional for monthly
  "year": 2024       // optional for monthly
}
```

---

## ⚙️ Starting the Cron Jobs

**In your server entry point** (e.g., `server.ts` or API route):

```typescript
import { startHighlightJobs } from '@/lib/cron/auto-highlights';

// Start automated jobs
startHighlightJobs();
```

This schedules:
- ✅ Weekly highlights: Every Monday at 8 AM
- ✅ Monthly recaps: 1st of month at 9 AM

---

## 🎤 Audio Generation (OpenAI TTS)

Uses **OpenAI TTS (text-to-speech)** with:
- Model: `tts-1`
- Voice: `nova` (warm, friendly female)
- Speed: `0.95` (slightly slower for warmth)
- Format: MP3, uploaded to S3

**Cost:** ~$0.015 per 1000 characters
- Weekly highlight (250 chars): ~$0.004
- Monthly recap (500 chars): ~$0.008

Very affordable!

---

## 📱 Mobile App Integration

### Display in App:

1. **Home Tab - "This Week's Highlights" Card**
   - Show latest weekly highlight
   - Tap to view full highlight with slideshow
   - Play audio button

2. **Timeline Tab - "Recaps" Section**
   - List all past weekly/monthly highlights
   - Filter by week/month

3. **Slideshow Playback:**
   - Display selected photos in sequence
   - Play narration audio overlay
   - Simple fade transitions between photos
   - Duration: Match audio length

---

## 🚀 Future Enhancements (Phase 2)

1. **Full Video Generation**
   - Use FFmpeg to create MP4 from photos + audio
   - Add transitions, Ken Burns effects, text overlays

2. **Personalized Themes**
   - Let GPT-5.1 detect themes ("Sports Week", "Family Time", "Learning Adventures")
   - Generate theme-specific visuals with Gemini

3. **Share to Social Media**
   - One-tap share highlights to Instagram Stories, Facebook
   - Branded watermark: "Made with Giggles"

4. **"On This Day" Feature**
   - Compare photo from 1 year ago to today
   - "Look how much you've grown!"

5. **AI Voice Cloning**
   - Let parents record their voice
   - Use ElevenLabs to clone it for narration
   - Ultra-personal experience

---

## 💰 Cost Estimates

**Per Child Per Month:**
- Weekly highlights (4x): $0.016 (GPT-5.1) + $0.016 (TTS) = **$0.032**
- Monthly recap (1x): $0.02 (GPT-5.1) + $0.008 (TTS) = **$0.028**

**Total:** ~$0.06 per child per month

With 10,000 active children: $600/month

**Revenue potential:** If this drives 5% storybook conversion → $5,000+ revenue

ROI: 8x+

---

## ✅ Implementation Checklist

- [x] Create WeeklyHighlight model
- [x] Create MonthlyRecap model
- [x] Build highlight generator service with GPT-5.1
- [x] Add OpenAI TTS audio generation
- [x] Create cron jobs for automation
- [x] Build API endpoints to retrieve highlights
- [x] Add manual trigger endpoint for testing

**Next steps:**
1. Start cron jobs in server entry point
2. Test manual generation: `POST /api/highlights/generate`
3. Build mobile UI to display highlights
4. Add push notifications when highlights are ready
5. Implement audio playback in app

---

**This system makes Giggles sticky. Families will come back every week just to see their highlights! 🎉**
