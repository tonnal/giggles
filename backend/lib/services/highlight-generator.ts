import { Types } from 'mongoose';
import { Memory, Child, WeeklyHighlight, MonthlyRecap } from '@/lib/db/models';
import OpenAI from 'openai';
import { generateStorybookCover } from './gemini';
import { uploadToS3 } from './s3';
import { queueVideoReelGeneration } from '@/lib/queue/video-queue';
import { detectMoodFromContent } from './background-music';

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
 * 🎬 WEEKLY HIGHLIGHT GENERATOR
 * Creates playful weekly recap with narration and collage
 */
export async function generateWeeklyHighlight(params: {
  childId: Types.ObjectId;
  familyId: Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
}): Promise<Types.ObjectId> {
  try {
    const { childId, familyId, weekStartDate, weekEndDate } = params;

    console.log('🎬 Generating weekly highlight...', {
      childId,
      weekStart: weekStartDate.toISOString(),
      weekEnd: weekEndDate.toISOString(),
    });

    // Get child info
    const child = await Child.findById(childId);
    if (!child) throw new Error('Child not found');

    // Get all memories from the week
    const memories = await Memory.find({
      childId,
      familyId,
      date: {
        $gte: weekStartDate,
        $lte: weekEndDate,
      },
    })
      .sort({ date: 1 })
      .lean();

    if (memories.length === 0) {
      console.log('⏭️  No memories this week, skipping highlight generation');
      throw new Error('No memories found for this week');
    }

    console.log(`📸 Found ${memories.length} memories`);

    // ============================================
    // 1. SELECT TOP 5-8 MEMORIES (GPT-5.1)
    // ============================================
    const topMemories = await selectTopMemoriesForHighlight({
      memories: memories.map((m) => ({
        id: m._id.toString(),
        caption: m.caption,
        tags: m.tags,
        date: m.date.toISOString(),
        mediaUrl: m.mediaUrl,
      })),
      childName: child.name,
      highlightType: 'weekly',
    });

    const selectedMemories = memories.filter((m) =>
      topMemories.selectedIds.includes(m._id.toString())
    );

    console.log(`✨ Selected ${selectedMemories.length} top memories`);

    // ============================================
    // 2. GENERATE PLAYFUL TITLE & SUMMARY (GPT-5.1)
    // ============================================
    const content = await generateHighlightContent({
      childName: child.name,
      memories: selectedMemories.map((m) => ({
        caption: m.caption,
        tags: m.tags,
        date: m.date,
      })),
      highlightType: 'weekly',
      theme: topMemories.suggestedTheme || 'playful',
    });

    console.log('📝 Content generated:', {
      title: content.title,
      summary: content.summary.substring(0, 100) + '...',
    });

    // ============================================
    // 3. GENERATE AUDIO NARRATION (OpenAI TTS)
    // ============================================
    let narrationAudioUrl: string | undefined;

    try {
      narrationAudioUrl = await generateAudioNarration({
        text: content.narrationText,
        childName: child.name,
      });
      console.log('🎤 Audio narration generated');
    } catch (error) {
      console.error('⚠️  Audio generation failed, continuing without audio:', error);
    }

    // ============================================
    // 4. GENERATE COLLAGE (Optional - Gemini)
    // ============================================
    let collageImageUrl: string | undefined;

    try {
      // Only generate collage if we have multiple images
      if (selectedMemories.length >= 3) {
        collageImageUrl = await generateWeeklyCollage({
          memories: selectedMemories.slice(0, 6), // Max 6 for collage
          theme: topMemories.suggestedTheme || 'playful',
          childName: child.name,
        });
        console.log('🎨 Collage generated');
      }
    } catch (error) {
      console.error('⚠️  Collage generation failed, using first memory as cover:', error);
    }

    // ============================================
    // 5. SAVE WEEKLY HIGHLIGHT
    // ============================================
    const weekNumber = getWeekNumber(weekStartDate);

    const highlight = await WeeklyHighlight.create({
      familyId,
      childId,
      weekStartDate,
      weekEndDate,
      weekNumber,
      year: weekStartDate.getFullYear(),
      title: content.title,
      summary: content.summary,
      narrationText: content.narrationText,
      narrationAudioUrl,
      memoryIds: selectedMemories.map((m) => m._id),
      coverImageUrl: collageImageUrl || selectedMemories[0].mediaUrl,
      collageImageUrl,
      collageLayout: 'scrapbook',
      status: 'generating',
      generatedAt: new Date(),
    });

    console.log('✅ Weekly highlight created:', highlight._id);

    // ============================================
    // 6. QUEUE VIDEO REEL GENERATION
    // ============================================
    try {
      // Generate text overlays for video
      const textOverlays = generateTextOverlays(content, selectedMemories.length);

      // Queue video generation job
      const jobId = await queueVideoReelGeneration({
        type: 'weekly',
        highlightId: highlight._id.toString(),
        childId: childId.toString(),
        familyId: familyId.toString(),
        memoryIds: selectedMemories.map((m) => m._id.toString()),
        title: content.title,
        narrationText: content.narrationText,
        textOverlays,
        quality: 'fast', // Default to fast mode
      });

      // Update highlight with job ID
      await WeeklyHighlight.findByIdAndUpdate(highlight._id, {
        videoJobId: jobId,
      });

      console.log('🎬 Video reel job queued:', jobId);
    } catch (error) {
      console.error('⚠️  Failed to queue video generation:', error);
      // Continue anyway - video generation is optional
    }

    return highlight._id;
  } catch (error: any) {
    console.error('❌ Weekly highlight generation failed:', error);
    throw error;
  }
}

/**
 * 📅 MONTHLY RECAP GENERATOR
 * Creates comprehensive monthly summary with stats
 */
export async function generateMonthlyRecap(params: {
  childId: Types.ObjectId;
  familyId: Types.ObjectId;
  month: number;
  year: number;
}): Promise<Types.ObjectId> {
  try {
    const { childId, familyId, month, year } = params;

    console.log('📅 Generating monthly recap...', { childId, month, year });

    const child = await Child.findById(childId);
    if (!child) throw new Error('Child not found');

    // Get month date range
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    // Get all memories from the month
    const memories = await Memory.find({
      childId,
      familyId,
      date: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    })
      .sort({ date: 1 })
      .lean();

    if (memories.length === 0) {
      throw new Error('No memories found for this month');
    }

    console.log(`📸 Found ${memories.length} memories`);

    // ============================================
    // 1. CALCULATE STATS
    // ============================================
    const stats = calculateMonthStats(memories);

    console.log('📊 Stats calculated:', stats);

    // ============================================
    // 2. SELECT TOP 10-15 MEMORIES (GPT-5.1)
    // ============================================
    const topMemories = await selectTopMemoriesForHighlight({
      memories: memories.map((m) => ({
        id: m._id.toString(),
        caption: m.caption,
        tags: m.tags,
        date: m.date.toISOString(),
        mediaUrl: m.mediaUrl,
      })),
      childName: child.name,
      highlightType: 'monthly',
      targetCount: Math.min(15, Math.max(10, Math.floor(memories.length * 0.6))),
    });

    const selectedMemories = memories.filter((m) =>
      topMemories.selectedIds.includes(m._id.toString())
    );

    // ============================================
    // 3. GENERATE CONTENT (GPT-5.1)
    // ============================================
    const content = await generateHighlightContent({
      childName: child.name,
      memories: selectedMemories.map((m) => ({
        caption: m.caption,
        tags: m.tags,
        date: m.date,
      })),
      highlightType: 'monthly',
      theme: 'nostalgic',
      stats,
    });

    // ============================================
    // 4. GENERATE GROWTH SUMMARY (GPT-5.1)
    // ============================================
    const growthSummary = await generateGrowthSummary({
      childName: child.name,
      month: monthStart.toLocaleString('en-US', { month: 'long' }),
      memories: memories.map((m) => ({
        caption: m.caption,
        tags: m.tags,
        date: m.date.toISOString(),
      })),
    });

    // ============================================
    // 5. GENERATE AUDIO (OpenAI TTS)
    // ============================================
    let narrationAudioUrl: string | undefined;

    try {
      narrationAudioUrl = await generateAudioNarration({
        text: content.narrationText,
        childName: child.name,
      });
    } catch (error) {
      console.error('⚠️  Audio generation failed:', error);
    }

    // ============================================
    // 6. SAVE MONTHLY RECAP
    // ============================================
    const monthName = monthStart.toLocaleString('en-US', { month: 'long' });

    const recap = await MonthlyRecap.create({
      familyId,
      childId,
      month,
      year,
      monthName,
      title: content.title,
      summary: content.summary,
      narrationText: content.narrationText,
      narrationAudioUrl,
      stats,
      highlightMemoryIds: selectedMemories.map((m) => m._id),
      coverImageUrl: selectedMemories[0].mediaUrl,
      growthSummary,
      musicRecommendation: suggestMusic(stats.favoriteTags),
      status: 'generating',
      generatedAt: new Date(),
    });

    console.log('✅ Monthly recap created:', recap._id);

    // ============================================
    // 7. QUEUE VIDEO REEL GENERATION
    // ============================================
    try {
      // Generate text overlays for video
      const textOverlays = generateTextOverlays(content, selectedMemories.length);

      // Queue video generation job
      const jobId = await queueVideoReelGeneration({
        type: 'monthly',
        highlightId: recap._id.toString(),
        childId: childId.toString(),
        familyId: familyId.toString(),
        memoryIds: selectedMemories.map((m) => m._id.toString()),
        title: content.title,
        narrationText: content.narrationText,
        textOverlays,
        quality: 'premium', // Monthly gets premium quality
      });

      // Update recap with job ID
      await MonthlyRecap.findByIdAndUpdate(recap._id, {
        videoJobId: jobId,
      });

      console.log('🎬 Video reel job queued:', jobId);
    } catch (error) {
      console.error('⚠️  Failed to queue video generation:', error);
      // Continue anyway - video generation is optional
    }

    return recap._id;
  } catch (error: any) {
    console.error('❌ Monthly recap generation failed:', error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Select top memories using GPT-5.1
 */
async function selectTopMemoriesForHighlight(params: {
  memories: Array<{
    id: string;
    caption: string;
    tags: string[];
    date: string;
    mediaUrl: string;
  }>;
  childName: string;
  highlightType: 'weekly' | 'monthly';
  targetCount?: number;
}): Promise<{ selectedIds: string[]; suggestedTheme: string }> {
  const { memories, childName, highlightType, targetCount = highlightType === 'weekly' ? 6 : 12 } =
    params;

  const systemPrompt = `You are selecting the best moments for ${childName}'s ${highlightType} highlight reel.

Choose ${targetCount} memories that:
- Show variety (different activities, emotions, people)
- Include significant moments (milestones, firsts, special events)
- Create a narrative arc (beginning → middle → end)
- Balance joyful, proud, and meaningful moments
- Avoid repetitive moments

Also suggest a playful theme name based on the week's activities.

Return JSON:
{
  "selectedIds": ["id1", "id2", ...],
  "suggestedTheme": "Adventure Week!" or "Learning Days" or "Family Fun" etc
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify(
          memories.map((m) => ({
            id: m.id,
            caption: m.caption,
            tags: m.tags,
            date: m.date,
          }))
        ),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  return {
    selectedIds: result.selectedIds || memories.slice(0, targetCount).map((m) => m.id),
    suggestedTheme: result.suggestedTheme || 'Amazing Moments',
  };
}

/**
 * Generate playful title, summary, and narration using GPT-5.1
 */
async function generateHighlightContent(params: {
  childName: string;
  memories: Array<{ caption: string; tags: string[]; date: Date }>;
  highlightType: 'weekly' | 'monthly';
  theme: string;
  stats?: any;
}): Promise<{ title: string; summary: string; narrationText: string }> {
  const { childName, memories, highlightType, theme, stats } = params;

  const systemPrompt = `You are creating a ${highlightType} highlight for ${childName}.

Write in a PLAYFUL, LOVING, JOYFUL tone - like a proud parent showing off their child's adventures.

Create:
1. **Title**: Short, catchy, playful (e.g., "Adventure Week!", "${childName}'s January Joy", "Giggles & Milestones")
2. **Summary**: 2-3 sentences capturing the essence (warm, emotional, celebratory)
3. **Narration**: COMPACT ~25-30 SECOND script (for Instagram Reels!) that:
   - MUST be SHORT - aim for 60-75 words max (about 25-30 seconds when spoken)
   - Opens with punchy excitement ("What an amazing week!")
   - Highlights 2-3 KEY moments with personality (be selective!)
   - Ends with warm closing ("Can't wait for more!")
   - Uses second-person ("You" - addressing the child)
   - IMPACTFUL and FUN - every word counts!
   - Fast-paced narration style for viral reels

${stats ? `Stats this month: ${JSON.stringify(stats)}` : ''}

IMPORTANT: Keep narration BRIEF and PUNCHY - this is for a 30-second video reel!

Return JSON:
{
  "title": "...",
  "summary": "...",
  "narrationText": "..."
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Theme: ${theme}\n\nMemories:\n${memories
          .map((m, i) => `${i + 1}. ${m.caption} (${m.tags.join(', ')})`)
          .join('\n')}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  return {
    title: result.title || `${childName}'s ${theme}`,
    summary: result.summary || `A wonderful ${highlightType} full of special moments!`,
    narrationText: result.narrationText || result.summary,
  };
}

/**
 * Generate growth summary using GPT-5.1
 */
async function generateGrowthSummary(params: {
  childName: string;
  month: string;
  memories: Array<{ caption: string; tags: string[]; date: string }>;
}): Promise<string> {
  const { childName, month, memories } = params;

  const systemPrompt = `Write a loving growth summary for ${childName}'s ${month}.

Focus on:
- New skills or behaviors noticed
- Personality developments
- Changes in interests
- Milestones reached

Write 2-3 sentences in warm, observant parental voice.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify(memories),
      },
    ],
    temperature: 0.8,
    max_tokens: 200,
  });

  return response.choices[0].message.content?.trim() || '';
}

/**
 * Generate audio narration using OpenAI TTS
 */
async function generateAudioNarration(params: {
  text: string;
  childName: string;
}): Promise<string> {
  const { text } = params;

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova', // Warm, friendly female voice
    input: text,
    speed: 0.95, // Slightly slower for warmth
  });

  const buffer = Buffer.from(await mp3Response.arrayBuffer());

  // Upload to S3
  const audioUrl = await uploadToS3({
    buffer,
    fileName: `narration-${Date.now()}.mp3`,
    contentType: 'audio/mpeg',
    folder: 'narrations',
  });

  return audioUrl;
}

/**
 * Generate collage using Gemini (simplified)
 */
async function generateWeeklyCollage(params: {
  memories: any[];
  theme: string;
  childName: string;
}): Promise<string> {
  // For now, return placeholder
  // In production, use Gemini to combine images or create illustrated collage
  return `/collages/weekly-${Date.now()}.jpg`;
}

/**
 * Calculate month statistics
 */
function calculateMonthStats(memories: any[]) {
  const tagCounts: Record<string, number> = {};

  memories.forEach((m) => {
    m.tags.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const favoriteTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((entry) => entry[0]);

  // Find busiest day
  const dayCounts: Record<string, number> = {};
  memories.forEach((m) => {
    const day = m.date.toISOString().split('T')[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const busiestDayStr = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    totalMemories: memories.length,
    newMilestones: memories.filter((m) => m.milestoneId).length,
    favoriteTags,
    busiestDay: busiestDayStr ? new Date(busiestDayStr) : new Date(),
    memoriesCount: memories.length,
  };
}

/**
 * Suggest background music based on tags
 */
function suggestMusic(tags: string[]): string {
  if (tags.includes('happy') || tags.includes('playful')) {
    return 'Upbeat & Playful';
  }
  if (tags.includes('calm') || tags.includes('peaceful')) {
    return 'Gentle & Soothing';
  }
  if (tags.includes('adventure') || tags.includes('outdoor')) {
    return 'Adventurous & Fun';
  }
  return 'Warm & Loving';
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Generate text overlays for video from highlight content
 */
function generateTextOverlays(
  content: { title: string; summary: string; narrationText: string },
  memoryCount: number
): Array<{
  text: string;
  startTime: number;
  duration: number;
  animation?: 'fade' | 'slide-up';
  position?: 'top' | 'center' | 'bottom';
}> {
  const overlays = [];
  const clipDuration = 5; // Each photo shows for 5 seconds

  // Opening title overlay (0-2 seconds)
  overlays.push({
    text: content.title,
    startTime: 0,
    duration: 2,
    animation: 'fade' as const,
    position: 'top' as const,
  });

  // Split memories into sections with captions
  // Extract key phrases from narration
  const sentences = content.narrationText.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  // Add mid-video overlays every 10-15 seconds
  const midOverlayCount = Math.min(2, Math.floor(memoryCount / 3));

  for (let i = 0; i < midOverlayCount; i++) {
    const sentenceIndex = Math.floor((i + 1) * (sentences.length / (midOverlayCount + 1)));
    const sentence = sentences[sentenceIndex]?.trim();

    if (sentence && sentence.length > 0 && sentence.length < 50) {
      overlays.push({
        text: sentence,
        startTime: (i + 1) * 10,
        duration: 3,
        animation: 'slide-up' as const,
        position: 'bottom' as const,
      });
    }
  }

  return overlays;
}

export default {
  generateWeeklyHighlight,
  generateMonthlyRecap,
};
