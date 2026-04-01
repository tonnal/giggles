# 📚 Giggles Backend Documentation

Complete documentation for the Giggles family memory sharing platform backend.

---

## 📖 Table of Contents

### Getting Started
- [**Getting Started Guide**](./guides/getting-started.md) - Setup, installation, and first steps
- [**Environment Setup**](./guides/environment-setup.md) - Environment variables and configuration

### API Documentation
- [**Authentication**](./api/authentication.md) - OAuth setup (Google, Apple) and session management
- [**Security Model**](./api/security.md) - Authorization, family access control, and protected endpoints
- [**API Endpoints**](./api/endpoints.md) - Complete API reference for all endpoints

### Core Features
- [**Metadata Extraction**](./features/metadata-extraction.md) - Photo EXIF extraction and smart album suggestions
- [**Video Reels**](./features/video-reels.md) - Automated video reel generation with AI narration
- [**Highlights System**](./features/highlights.md) - Weekly highlights and monthly recaps

### Testing & Development
- [**Testing Video Reels**](./guides/testing-video-reels.md) - How to test video generation locally
- [**Testing Metadata Extraction**](./guides/testing-metadata.md) - How to test metadata features

---

## 🎯 Quick Links

### For Developers
- **First time setup?** → [Getting Started Guide](./guides/getting-started.md)
- **Setting up OAuth?** → [Authentication](./api/authentication.md)
- **Testing video reels?** → [Testing Video Reels](./guides/testing-video-reels.md)
- **Need API reference?** → [API Endpoints](./api/endpoints.md)

### For Features
- **Photo metadata extraction** → [Metadata Extraction](./features/metadata-extraction.md)
- **Smart album suggestions** → [Metadata Extraction](./features/metadata-extraction.md#smart-album-suggestions)
- **Video reel generation** → [Video Reels](./features/video-reels.md)
- **AI-generated highlights** → [Highlights System](./features/highlights.md)

---

## 🏗️ Architecture Overview

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

## 🚀 Key Technologies

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** MongoDB (Mongoose)
- **Authentication:** NextAuth.js (Google, Apple OAuth)
- **AI/ML:** OpenAI GPT-5.1, TTS, Vision
- **Video Processing:** FFmpeg, Sharp, node-canvas
- **Queue:** BullMQ + Redis
- **Storage:** AWS S3
- **Deployment:** Vercel (or self-hosted)

---

## 📊 Database Schema

### Core Collections
- **Users** - OAuth-authenticated users
- **Families** - Family groups with invite codes
- **Children** - Child profiles linked to families
- **Memories** - Photos/videos with AI tags and metadata
- **Albums** - Auto-generated and custom albums
- **Milestones** - Developmental milestones

### Smart Features
- **WeeklyHighlights** - AI-generated weekly recaps with video reels
- **MonthlyRecaps** - AI-generated monthly summaries with video reels

---

## 🎨 Feature Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Authentication (Google, Apple) | ✅ Complete | [Authentication](./api/authentication.md) |
| Family Management | ✅ Complete | [API Endpoints](./api/endpoints.md) |
| Memory Upload & Tagging | ✅ Complete | [API Endpoints](./api/endpoints.md) |
| Metadata Extraction | ✅ Complete | [Metadata](./features/metadata-extraction.md) |
| Smart Album Suggestions | ✅ Complete | [Metadata](./features/metadata-extraction.md) |
| Video Reel Generation | ✅ Complete | [Video Reels](./features/video-reels.md) |
| Weekly/Monthly Highlights | ✅ Complete | [Highlights](./features/highlights.md) |
| AI Auto-Tagging | ✅ Complete | [API Endpoints](./api/endpoints.md) |

---

## 💰 Cost Analysis

### Per-User Monthly Costs (estimated)

| Service | Usage | Cost |
|---------|-------|------|
| **OpenAI API** | | |
| - GPT-5.1 (tagging, narration) | ~1000 memories/month | $2.00 |
| - TTS (audio narration) | ~5 reels/month | $0.10 |
| **AWS** | | |
| - S3 Storage | ~1GB photos/videos | $0.02 |
| - S3 Transfer | ~5GB downloads | $0.45 |
| **Infrastructure** | | |
| - MongoDB Atlas | Shared cluster | $0.50 |
| - Redis (Upstash) | Serverless | $0.10 |
| **Total per user** | | **~$3.20/month** |

**At scale (10,000 users):** $32,000/month

---

## 📞 Support & Contributing

### Getting Help
1. Check the relevant documentation section
2. Review error logs and console output
3. Verify all environment variables are set
4. Ensure required services (Redis, MongoDB) are running

### Contributing
1. Follow the existing code structure
2. Add tests for new features
3. Update documentation when adding features
4. Follow TypeScript best practices

---

## 📄 License

Proprietary - Giggles Family App

---

**Last Updated:** January 2026

For questions or issues, please contact the development team.
