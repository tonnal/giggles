#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🎬 Video Reel Generation Test      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check Redis
echo -e "${YELLOW}1. Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Redis is running${NC}"
else
    echo -e "${RED}   ❌ Redis is not running!${NC}"
    echo -e "${YELLOW}   Starting Redis...${NC}"
    brew services start redis
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Redis started${NC}"
    else
        echo -e "${RED}   ❌ Could not start Redis. Please run: brew install redis${NC}"
        exit 1
    fi
fi
echo ""

# Check FFmpeg
echo -e "${YELLOW}2. Checking FFmpeg...${NC}"
if ffmpeg -version > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ FFmpeg is installed${NC}"
else
    echo -e "${RED}   ❌ FFmpeg is not installed!${NC}"
    echo -e "${YELLOW}   Please install: brew install ffmpeg${NC}"
    exit 1
fi
echo ""

# Check test photos
echo -e "${YELLOW}3. Checking test assets...${NC}"
PHOTO_COUNT=$(ls assets/test_photo/*.{jpg,jpeg,png,gif} 2>/dev/null | wc -l | tr -d ' ')
if [ "$PHOTO_COUNT" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Found $PHOTO_COUNT test photos in assets/test_photo/${NC}"
else
    echo -e "${RED}   ❌ No test photos found in assets/test_photo/${NC}"
    echo -e "${YELLOW}   Please add some test images to assets/test_photo/${NC}"
    exit 1
fi

MUSIC_COUNT=$(ls assets/music/*.mp3 2>/dev/null | wc -l | tr -d ' ')
if [ "$MUSIC_COUNT" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Found $MUSIC_COUNT music file(s) in assets/music/${NC}"
else
    echo -e "${YELLOW}   ⚠️  No music files found in assets/music/ (optional)${NC}"
fi
echo ""

# Check server is running
echo -e "${YELLOW}4. Checking if server is running...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}   ✅ Server is running on http://localhost:3000${NC}"
else
    echo -e "${RED}   ❌ Server is not running!${NC}"
    echo -e "${YELLOW}   Please start the server: npm run dev${NC}"
    exit 1
fi
echo ""

# Generate video reel
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}5. Generating video reel...${NC}"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/test/generate-reel \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract job ID
JOB_ID=$(echo "$RESPONSE" | jq -r '.data.jobId' 2>/dev/null)
HIGHLIGHT_ID=$(echo "$RESPONSE" | jq -r '.data.highlightId' 2>/dev/null)

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Failed to start video generation${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Video generation started!${NC}"
echo -e "${BLUE}   Job ID: $JOB_ID${NC}"
echo -e "${BLUE}   Highlight ID: $HIGHLIGHT_ID${NC}"
echo ""

# Monitor progress
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}6. Monitoring video generation progress...${NC}"
echo ""

for i in {1..60}; do
    sleep 3

    STATUS_RESPONSE=$(curl -s "http://localhost:3000/api/test/generate-reel?jobId=$JOB_ID")

    STATE=$(echo "$STATUS_RESPONSE" | jq -r '.data.job.state' 2>/dev/null)
    PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.data.job.progress' 2>/dev/null)
    VIDEO_URL=$(echo "$STATUS_RESPONSE" | jq -r '.data.highlight.videoUrl' 2>/dev/null)

    if [ "$STATE" = "completed" ]; then
        echo -e "${GREEN}✅ Video generation completed!${NC}"
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════${NC}"
        echo -e "${GREEN}🎉 Video Reel Generated Successfully!${NC}"
        echo -e "${BLUE}═══════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}Video URL: $VIDEO_URL${NC}"
        echo ""

        if [ "$VIDEO_URL" != "null" ] && [ -n "$VIDEO_URL" ]; then
            # Try to download
            echo -e "${YELLOW}Downloading video...${NC}"
            OUTPUT_FILE="test-reel-$(date +%Y%m%d-%H%M%S).mp4"

            if [[ "$VIDEO_URL" == file://* ]]; then
                LOCAL_PATH="${VIDEO_URL#file://}"
                cp "$LOCAL_PATH" "$OUTPUT_FILE" 2>/dev/null && \
                    echo -e "${GREEN}✅ Video saved as: $OUTPUT_FILE${NC}" || \
                    echo -e "${YELLOW}⚠️  Could not copy video from: $LOCAL_PATH${NC}"
            else
                curl -s -o "$OUTPUT_FILE" "$VIDEO_URL" && \
                    echo -e "${GREEN}✅ Video downloaded as: $OUTPUT_FILE${NC}" || \
                    echo -e "${YELLOW}⚠️  Could not download video${NC}"
            fi

            # Try to open the video
            if [ -f "$OUTPUT_FILE" ]; then
                echo ""
                echo -e "${BLUE}Opening video...${NC}"
                open "$OUTPUT_FILE" 2>/dev/null || \
                    echo -e "${YELLOW}Please open manually: $OUTPUT_FILE${NC}"
            fi
        fi

        echo ""
        echo -e "${BLUE}To view all test highlights:${NC}"
        echo -e "${GREEN}curl http://localhost:3000/api/test/generate-reel | jq '.'${NC}"
        echo ""

        exit 0
    elif [ "$STATE" = "failed" ]; then
        echo -e "${RED}❌ Video generation failed!${NC}"
        echo ""
        echo "Full response:"
        echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
        exit 1
    elif [ "$STATE" = "active" ]; then
        echo -e "${YELLOW}   ⏳ Progress: ${PROGRESS}% - State: $STATE${NC}"
    elif [ "$STATE" = "waiting" ]; then
        echo -e "${YELLOW}   ⏳ Waiting in queue...${NC}"
    else
        echo -e "${YELLOW}   ⏳ State: $STATE${NC}"
    fi
done

echo ""
echo -e "${YELLOW}⚠️  Video generation is taking longer than expected (3 minutes)${NC}"
echo -e "${YELLOW}   The job is still running. Check status manually:${NC}"
echo -e "${GREEN}   curl http://localhost:3000/api/test/generate-reel?jobId=$JOB_ID | jq '.'${NC}"
echo ""
