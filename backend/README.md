# 🎉 Giggles - Family Memory Sharing Platform

**Giggles** is a Next.js-based backend for a family memory sharing application that automatically creates beautiful video reels, smart albums, and AI-powered highlights from family photos and videos.

---

## ✨ Features

### 🎬 Professional Video Reels
- **Instagram-quality MP4 videos** automatically generated from weekly/monthly highlights
- Ken Burns effects, smooth transitions, and animated text overlays
- AI-generated narration with background music
- 30-second shareable reels perfect for social media

### 📸 Smart Photo Organization
- **Automatic metadata extraction** from photos (GPS, camera info, timestamps)
- **Google Photos-style smart album suggestions**:
  - Trip detection ("Beach Trip - July 15-19")
  - Event detection ("Birthday Party - Jan 15")
  - Seasonal collections ("Summer 2024")
  - Location-based albums ("Grandma's House")

### 🤖 AI-Powered Features
- **Auto-tagging** with GPT-5.1 (activities, emotions, milestones)
- **Weekly highlights** with personalized narration
- **Monthly recaps** with growth summaries and fun stats
- **Milestone detection** and automatic tracking

### 🔐 Secure & Private
- Google OAuth and Apple Sign In
- Family-based access control
- Encrypted data storage
- Privacy-first metadata handling

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+
- FFmpeg

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Giggles/backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start services
brew services start mongodb-community
brew services start redis

# Run development server
npm run dev
```

Visit `http://localhost:3000`

**See the [Getting Started Guide](./docs/guides/getting-started.md) for detailed setup instructions.**

---

## 📚 Documentation

### Getting Started
- **[Getting Started Guide](./docs/guides/getting-started.md)** - Complete setup and installation
- **[Project Structure](#project-structure)** - Understand the codebase layout

### API Documentation
- **[API Endpoints](./docs/api/endpoints.md)** - Complete API reference
- **[Authentication](./docs/api/authentication.md)** - OAuth setup and session management
- **[Security Model](./docs/api/security.md)** - Authorization and access control

### Core Features
- **[Video Reels](./docs/features/video-reels.md)** - Automated video generation system
- **[Metadata Extraction](./docs/features/metadata-extraction.md)** - Photo analysis and smart albums
- **[Highlights System](./docs/features/highlights.md)** - Weekly/monthly AI-powered recaps

### Testing & Development
- **[Testing Video Reels](./docs/guides/testing-video-reels.md)** - Test video generation locally
- **[Testing Metadata](./docs/guides/testing-metadata.md)** - Test metadata extraction

**[📖 Full Documentation Index](./docs/README.md)**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GIGGLES BACKEND                          │
│                    (Next.js 16 + Turbopack)                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Authentication │  │   Core API       │  │   AI Services    │
│                  │  │                  │  │                  │
│  • Google OAuth  │  │  • Families      │  │  • GPT-5.1       │
│  • Apple Sign In │  │  • Children      │  │  • TTS (OpenAI)  │
│  • NextAuth.js   │  │  • Memories      │  │  • Vision (GPT)  │
│  • JWT Sessions  │  │  • Albums        │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Smart Features │  │   Video System   │  │   Storage        │
│                  │  │                  │  │                  │
│  • Metadata      │  │  • FFmpeg        │  │  • AWS S3        │
│  • Smart Albums  │  │  • Ken Burns     │  │  • MongoDB       │
│  • Auto-tagging  │  │  • Text Overlays │  │  • Redis         │
│  • Geolocation   │  │  • BullMQ Queue  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** MongoDB (Mongoose)
- **Authentication:** NextAuth.js (Google, Apple OAuth)
- **AI/ML:** OpenAI GPT-5.1, TTS, Vision
- **Video Processing:** FFmpeg, Sharp, node-canvas
- **Queue:** BullMQ + Redis
- **Storage:** AWS S3
- **Deployment:** Vercel (or self-hosted)

---

## 📁 Project Structure

```
backend/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── auth/         # Authentication (NextAuth)
│   │   ├── families/     # Family management
│   │   ├── children/     # Child profiles
│   │   ├── memories/     # Memory uploads & retrieval
│   │   ├── albums/       # Album management & suggestions
│   │   ├── upload/       # File upload & metadata extraction
│   │   └── test/         # Test endpoints (no auth)
│   └── page.tsx          # Landing page
│
├── lib/                    # Core libraries
│   ├── db/               # Database
│   │   ├── models/       # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Family.ts
│   │   │   ├── Child.ts
│   │   │   ├── Memory.ts
│   │   │   ├── Album.ts
│   │   │   └── WeeklyHighlight.ts
│   │   └── mongodb.ts    # DB connection
│   │
│   ├── services/         # Business logic
│   │   ├── openai.ts                 # GPT, TTS integration
│   │   ├── s3.ts                     # S3 uploads
│   │   ├── metadata-extractor.ts     # EXIF & smart albums
│   │   ├── video-reel-generator.ts   # FFmpeg video generation
│   │   ├── highlight-generator.ts    # Weekly/monthly highlights
│   │   └── background-music.ts       # Music library
│   │
│   ├── queue/            # BullMQ queues
│   │   └── video-queue.ts
│   │
│   ├── auth/             # NextAuth configuration
│   │   ├── auth-config.ts
│   │   └── session.ts
│   │
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   │
│   └── utils/            # Helpers
│       ├── api-helpers.ts
│       └── auth-helpers.ts
│
├── assets/                # Static assets
│   ├── music/            # Background music tracks
│   └── test_photo/       # Test photos
│
├── docs/                  # Documentation
│   ├── api/              # API documentation
│   ├── features/         # Feature documentation
│   └── guides/           # How-to guides
│
├── .env.local            # Environment variables
├── package.json
└── README.md             # This file
```

---

## 🎯 Key Features Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Authentication (Google, Apple) | ✅ Complete | [Auth Docs](./docs/api/authentication.md) |
| Family Management | ✅ Complete | [API Endpoints](./docs/api/endpoints.md) |
| Memory Upload & Tagging | ✅ Complete | [API Endpoints](./docs/api/endpoints.md) |
| Metadata Extraction | ✅ Complete | [Metadata Docs](./docs/features/metadata-extraction.md) |
| Smart Album Suggestions | ✅ Complete | [Metadata Docs](./docs/features/metadata-extraction.md) |
| Video Reel Generation | ✅ Complete | [Video Reels Docs](./docs/features/video-reels.md) |
| Weekly/Monthly Highlights | ✅ Complete | [Highlights Docs](./docs/features/highlights.md) |
| AI Auto-Tagging | ✅ Complete | [API Endpoints](./docs/api/endpoints.md) |

---

## 🧪 Testing

### Quick Tests

```bash
# Test video reel generation
./test-reel.sh

# Test metadata extraction
npx tsx test-metadata-flow.ts

# Start development server
npm run dev
```

**See [Testing Documentation](./docs/guides/testing-video-reels.md) for detailed testing guides.**

---

## 🔑 Environment Variables

Required environment variables (`.env.local`):

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/giggles

# Redis
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Apple Sign In (optional)
APPLE_CLIENT_ID=<from Apple Developer Portal>
APPLE_CLIENT_SECRET=<from Apple Developer Portal>

# OpenAI API
OPENAI_API_KEY=sk-...

# AWS S3
AWS_ACCESS_KEY_ID=<from AWS Console>
AWS_SECRET_ACCESS_KEY=<from AWS Console>
AWS_REGION=us-east-1
AWS_S3_BUCKET=giggles-uploads

# Video Configuration
MUSIC_LIBRARY_PATH=./assets/music
VIDEO_QUEUE_CONCURRENCY=2
```

**See [Getting Started Guide](./docs/guides/getting-started.md) for detailed setup.**

---

## 💰 Cost Analysis (Estimated)

**Per-user monthly costs:**

| Service | Usage | Cost |
|---------|-------|------|
| OpenAI API (GPT-5.1, TTS) | ~1000 memories/month | $2.10 |
| AWS S3 (storage + transfer) | ~1GB + 5GB | $0.47 |
| MongoDB Atlas | Shared cluster | $0.50 |
| Redis (Upstash) | Serverless | $0.10 |
| **Total per user** | | **~$3.20/month** |

**At 10,000 users:** ~$32,000/month

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Connect MongoDB Atlas and Upstash Redis for production
```

### Self-Hosted

```bash
# Build for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "giggles-backend" -- start
```

---

## 📄 API Endpoints Overview

### Authentication
- `GET /api/auth/me` - Get current user

### Families
- `POST /api/families` - Create family
- `GET /api/families` - List families
- `POST /api/families/join` - Join with invite code

### Memories
- `POST /api/memories` - Upload memory (with auto-tagging)
- `GET /api/memories` - List memories
- `POST /api/memories/:id/react` - React to memory
- `POST /api/memories/:id/comment` - Comment on memory

### Upload & Metadata
- `POST /api/upload/presigned-url` - Get S3 upload URL
- `POST /api/upload/extract-metadata` - Extract photo metadata

### Smart Albums
- `GET /api/albums/suggestions` - Get smart album suggestions

### Video Reels
- `POST /api/test/generate-reel` - Generate test video reel
- `GET /api/test/generate-reel?jobId=xxx` - Check generation status

**[📖 Full API Reference](./docs/api/endpoints.md)**

---

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation when adding features
4. Follow TypeScript best practices

---

## 📞 Support

For questions or issues:
1. Check the [documentation](./docs/README.md)
2. Review error logs and console output
3. Verify all environment variables are set
4. Ensure required services (Redis, MongoDB) are running

---

## 📄 License

Proprietary - Giggles Family App

---

**Built with ❤️ for families to preserve their precious moments**

**Last Updated:** January 2026
