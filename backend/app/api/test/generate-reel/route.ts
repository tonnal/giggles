import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { successResponse, errorResponse, withMiddleware } from '@/lib/utils/api-helpers';
import { Memory, Child, Family, WeeklyHighlight } from '@/lib/db/models';
import { queueVideoReelGeneration } from '@/lib/queue/video-queue';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

// Emergent Integration Proxy URL for universal LLM key
const EMERGENT_BASE_URL = process.env.INTEGRATION_PROXY_URL 
  ? `${process.env.INTEGRATION_PROXY_URL}/openai`
  : 'https://integrations.emergentagent.com/openai';

const openai = new OpenAI({ 
  apiKey: process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY || 'placeholder',
  baseURL: process.env.EMERGENT_LLM_KEY ? EMERGENT_BASE_URL : undefined,
});
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * POST /api/test/generate-reel
 * Test endpoint to generate a video reel without authentication
 * FOR DEVELOPMENT/TESTING ONLY
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    console.log('🧪 TEST MODE: Generating video reel without authentication');

    // Get test photos from assets
    const testPhotosDir = path.join(process.cwd(), 'assets', 'test_photo');
    const testPhotos = await fs.readdir(testPhotosDir);
    const photoFiles = testPhotos.filter((f) =>
      f.match(/\.(jpg|jpeg|png|gif)$/i)
    );

    if (photoFiles.length === 0) {
      return errorResponse('No test photos found in assets/test_photo');
    }

    console.log(`📸 Found ${photoFiles.length} test photos`);

    // Create or get test family
    let family = await Family.findOne({ name: 'Test Family' });
    if (!family) {
      const testUserId = new Types.ObjectId();
      family = await Family.create({
        name: 'Test Family',
        members: [
          {
            userId: testUserId,
            role: 'parent',
            joinedAt: new Date(),
          },
        ],
        childrenIds: [],
        createdBy: testUserId,
      });
      console.log('✅ Test family created:', family._id);
    }

    // Create or get test child
    let child = await Child.findOne({ familyId: family._id, name: 'Test Child' });
    if (!child) {
      child = await Child.create({
        familyId: family._id,
        name: 'Test Child',
        dob: new Date('2020-01-15'),
        gender: 'boy',
        createdBy: family.createdBy,
      });

      family.childrenIds.push(child._id);
      await family.save();
      console.log('✅ Test child created:', child._id);
    }

    // Delete old test memories
    await Memory.deleteMany({ familyId: family._id });
    console.log('🗑️  Cleared old test memories');

    // Create test memories with actual file paths
    const memoryIds: Types.ObjectId[] = [];
    const testCaptions = [
      "First day at the park! Had so much fun on the swings.",
      "Learning to ride a bike without training wheels - so proud!",
      "Making cookies with grandma. The chocolate chips disappeared fast!",
      "Playing with the new puppy in the backyard.",
      "Beach day! Building the biggest sandcastle ever.",
      "First time trying ice cream - loved it!",
    ];

    for (let i = 0; i < Math.min(photoFiles.length, 6); i++) {
      const photoPath = path.join(testPhotosDir, photoFiles[i]);
      const memory = await Memory.create({
        familyId: family._id,
        childId: child._id,
        uploadedBy: family.createdBy,
        mediaUrl: `file://${photoPath}`, // Local file path
        mediaType: 'photo',
        caption: testCaptions[i] || `Test memory ${i + 1}`,
        tags: ['test', 'fun', 'family'],
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over past days
        reactions: [],
        comments: [],
        albumIds: [],
      });
      memoryIds.push(memory._id);
      console.log(`✅ Test memory ${i + 1} created`);
    }

    // Generate narration script using GPT-5.1
    console.log('🤖 Generating narration with GPT-5.1...');
    const narrationResponse = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are creating a playful, loving weekly highlight for Test Child.

Write in a PLAYFUL, JOYFUL tone - like a proud parent showing off their child's adventures.

Create:
1. **Title**: Short, catchy, playful (e.g., "Adventure Week!", "Fun Times")
2. **Narration**: 30-45 second script that:
   - Opens with excitement ("What a week it's been!")
   - Highlights 3-4 key moments with personality
   - Ends with warm closing ("Can't wait to see what's next!")
   - Uses second-person ("You" - addressing the child)

Return JSON:
{
  "title": "...",
  "narrationText": "..."
}`,
        },
        {
          role: 'user',
          content: `Memories:\n${testCaptions.slice(0, memoryIds.length).join('\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
    });

    const content = JSON.parse(narrationResponse.choices[0].message.content || '{}');
    const title = content.title || 'Test Week Highlights';
    const narrationText = content.narrationText || 'What an amazing week of fun and adventures!';

    console.log('📝 Generated content:', { title, narrationText: narrationText.substring(0, 100) });

    // Create weekly highlight
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date();

    const highlight = await WeeklyHighlight.create({
      familyId: family._id,
      childId: child._id,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      weekNumber: Math.ceil((weekEnd.getDate()) / 7),
      year: weekEnd.getFullYear(),
      title,
      summary: 'Test highlight reel generated for testing purposes',
      narrationText,
      memoryIds,
      coverImageUrl: `file://${path.join(testPhotosDir, photoFiles[0])}`,
      collageLayout: 'scrapbook',
      status: 'generating',
      generatedAt: new Date(),
    });

    console.log('✅ Weekly highlight created:', highlight._id);

    // Generate text overlays - multiple overlays for better sync
    // Total video duration will be ~30 seconds (5 clips × 6.5s - transitions)
    const textOverlays = [
      {
        text: title,
        startTime: 0,
        duration: 4, // Show title at start
        animation: 'fade' as const,
        position: 'top' as const,
      },
      {
        text: '📸 Making Memories!',
        startTime: 13,
        duration: 3,
        animation: 'fade' as const,
        position: 'top' as const,
      },
      {
        text: '✨ Keep Shining!',
        startTime: 26,
        duration: 4,
        animation: 'fade' as const,
        position: 'top' as const,
      },
    ];

    // Queue video generation
    console.log('🎬 Queueing video generation...');

    // HARDCODED MUSIC PATH FOR TESTING
    const testMusicPath = path.join(process.cwd(), 'assets', 'music', 'brain-implant-cyberpunk-sci-fi-trailer-action-intro-330416.mp3');

    const jobId = await queueVideoReelGeneration({
      type: 'weekly',
      highlightId: highlight._id.toString(),
      childId: child._id.toString(),
      familyId: family._id.toString(),
      memoryIds: memoryIds.map((id) => id.toString()),
      title,
      narrationText,
      textOverlays,
      quality: 'fast',
      backgroundMusicPath: testMusicPath, // Hardcoded for testing
    });

    await WeeklyHighlight.findByIdAndUpdate(highlight._id, {
      videoJobId: jobId,
    });

    console.log('📋 Video job queued:', jobId);

    return successResponse(
      {
        highlightId: highlight._id.toString(),
        jobId,
        familyId: family._id.toString(),
        childId: child._id.toString(),
        memoryCount: memoryIds.length,
        status: 'Video generation started. Check status with jobId.',
      },
      'Test video reel generation started successfully'
    );
  });
}

/**
 * GET /api/test/generate-reel?jobId=xxx
 * Check test video reel generation status
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      // Return all test highlights
      const highlights = await WeeklyHighlight.find({})
        .populate('childId')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return successResponse({
        highlights: highlights.map((h) => ({
          id: h._id,
          title: h.title,
          status: h.status,
          videoUrl: h.videoUrl,
          videoJobId: h.videoJobId,
          createdAt: h.createdAt,
        })),
      });
    }

    // Get specific job status
    const { getVideoReelJobStatus } = await import('@/lib/queue/video-queue');
    const status = await getVideoReelJobStatus(jobId);

    if (!status) {
      return errorResponse('Job not found', 404);
    }

    // Also get the highlight data
    const highlight = await WeeklyHighlight.findOne({ videoJobId: jobId }).lean();

    return successResponse({
      job: {
        id: status.id,
        state: status.state,
        progress: status.progress,
        result: status.result,
      },
      highlight: highlight
        ? {
            id: highlight._id,
            title: highlight.title,
            status: highlight.status,
            videoUrl: highlight.videoUrl,
            thumbnailUrl: highlight.thumbnailUrl,
          }
        : null,
    });
  });
}
