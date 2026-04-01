# 🚀 Getting Started with Giggles Backend

Complete setup guide for the Giggles family memory sharing platform backend.

---

## Prerequisites

Before you begin, ensure you have installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 6+ ([Install Guide](https://docs.mongodb.com/manual/installation/))
- **Redis** 7+ ([Install Guide](https://redis.io/docs/getting-started/installation/))
- **FFmpeg** ([Install Guide](https://ffmpeg.org/download.html))
- **Git**

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Giggles/backend
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages:
- Next.js 16 (framework)
- MongoDB/Mongoose (database)
- NextAuth.js (authentication)
- BullMQ + Redis (queue)
- FFmpeg/Sharp/Canvas (video/image processing)
- OpenAI SDK (AI services)

### 3. Setup Environment Variables

Create a `.env.local` file in the backend root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/giggles
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/giggles

# Redis
REDIS_URL=redis://localhost:6379
# Or use Upstash for serverless:
# REDIS_URL=rediss://:password@host:port

# NextAuth
NEXTAUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (required for authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign In (optional)
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret

# OpenAI API (required for AI features)
OPENAI_API_KEY=sk-...

# AWS S3 (required for file storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=giggles-uploads

# Video Configuration
MUSIC_LIBRARY_PATH=./assets/music
VIDEO_QUEUE_CONCURRENCY=2
```

---

## Service Setup

### 1. MongoDB

**Option A: Local MongoDB**

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongod

# Verify
mongosh  # Should connect successfully
```

**Option B: MongoDB Atlas (Cloud)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Add to `.env.local` as `MONGODB_URI`

### 2. Redis

**Option A: Local Redis**

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

**Option B: Upstash (Serverless)**

1. Go to [Upstash](https://upstash.com/)
2. Create a Redis database
3. Get connection string
4. Add to `.env.local` as `REDIS_URL`

### 3. FFmpeg

Required for video reel generation:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html

# Verify
ffmpeg -version
```

### 4. Setup Music Library

For video reel generation:

```bash
mkdir -p assets/music
```

Download background music tracks (see [Video Reels Documentation](../features/video-reels.md#setup--configuration)).

---

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret to `.env.local`

### Apple Sign In (Optional)

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID
3. Enable **Sign in with Apple**
4. Create a Service ID
5. Configure redirect URLs
6. Generate a client secret
7. Add to `.env.local`

See [Authentication Documentation](../api/authentication.md) for detailed setup.

---

## AWS S3 Setup

Required for file storage:

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create an S3 bucket (e.g., `giggles-uploads`)
3. Create an IAM user with S3 access
4. Generate access keys
5. Add credentials to `.env.local`

**Bucket Configuration:**
- Enable CORS for browser uploads
- Set lifecycle rules for old files
- Configure public read access (or use presigned URLs)

---

## Running the Application

### Development Mode

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

**Features enabled in dev mode:**
- Hot reload (Turbopack)
- Detailed error messages
- Source maps
- API routes at `/api/*`

### Production Build

```bash
npm run build
npm start
```

---

## Verify Installation

### 1. Check Health Endpoints

```bash
# Check server is running
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok"}
```

### 2. Check Database Connection

```bash
# The server logs should show:
# ✅ MongoDB connected: giggles
```

### 3. Check Redis Connection

```bash
redis-cli ping

# Expected response: PONG
```

### 4. Test Authentication

```bash
# Visit in browser:
http://localhost:3000/api/auth/signin

# You should see the NextAuth sign-in page
```

---

## Testing the System

### Test Video Reel Generation

```bash
./test-reel.sh
```

See [Testing Video Reels](./testing-video-reels.md) for details.

### Test Metadata Extraction

```bash
npx tsx test-metadata-flow.ts
```

See [Testing Metadata](./testing-metadata.md) for details.

---

## Project Structure

```
backend/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── auth/         # Authentication
│   │   ├── families/     # Family management
│   │   ├── children/     # Child profiles
│   │   ├── memories/     # Memory uploads
│   │   ├── albums/       # Album management
│   │   ├── upload/       # File upload & metadata
│   │   └── test/         # Test endpoints
│   └── page.tsx          # Landing page
│
├── lib/                    # Core libraries
│   ├── db/               # Database models
│   │   ├── models/       # Mongoose schemas
│   │   └── mongodb.ts    # DB connection
│   ├── services/         # Business logic
│   │   ├── openai.ts     # GPT, TTS
│   │   ├── s3.ts         # S3 uploads
│   │   ├── metadata-extractor.ts
│   │   ├── video-reel-generator.ts
│   │   └── highlight-generator.ts
│   ├── queue/            # BullMQ queues
│   ├── auth/             # NextAuth config
│   └── utils/            # Helpers
│
├── assets/                # Static assets
│   ├── music/            # Background music
│   └── test_photo/       # Test photos
│
├── docs/                  # Documentation
│   ├── api/              # API docs
│   ├── features/         # Feature docs
│   └── guides/           # How-to guides
│
└── .env.local            # Environment variables
```

---

## Common Issues

### Port Already in Use

```
Error: Port 3000 is already in use
```

**Solution:** Kill the process or use a different port:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### MongoDB Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:** Ensure MongoDB is running:
```bash
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Redis Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:** Ensure Redis is running:
```bash
brew services start redis              # macOS
sudo systemctl start redis             # Linux
```

### FFmpeg Not Found

```
Error: Cannot find ffmpeg
```

**Solution:** Install FFmpeg system-wide (see setup above).

---

## Next Steps

After setup is complete:

1. **Read the Documentation**
   - [API Endpoints](../api/endpoints.md)
   - [Authentication](../api/authentication.md)
   - [Video Reels](../features/video-reels.md)
   - [Metadata Extraction](../features/metadata-extraction.md)

2. **Test the Features**
   - [Testing Video Reels](./testing-video-reels.md)
   - [Testing Metadata](./testing-metadata.md)

3. **Start Building**
   - Create your first family
   - Upload memories
   - Generate video reels
   - Try smart album suggestions

---

## Getting Help

- Check the [documentation](../README.md)
- Review error logs in console
- Verify environment variables
- Ensure all services are running

---

**You're all set! 🎉**

The Giggles backend is now running and ready for development.
