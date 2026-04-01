import OpenAI from 'openai';
import { IMemoryTaggingInput, IMemoryTaggingOutput } from '@/lib/types';

// Emergent Integration Proxy URL for universal LLM key
const EMERGENT_BASE_URL = process.env.INTEGRATION_PROXY_URL 
  ? `${process.env.INTEGRATION_PROXY_URL}/openai`
  : 'https://integrations.emergentagent.com/openai';

// Initialize OpenAI client with Emergent proxy
const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.EMERGENT_LLM_KEY ? EMERGENT_BASE_URL : undefined,
});

// Get model from environment variable (GPT-4o by default for compatibility)
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

if (!process.env.EMERGENT_LLM_KEY && !process.env.OPENAI_API_KEY) {
  console.warn('⚠️  Neither EMERGENT_LLM_KEY nor OPENAI_API_KEY is set');
} else {
  console.log(`✅ OpenAI configured with model: ${MODEL} via ${process.env.EMERGENT_LLM_KEY ? 'Emergent proxy' : 'direct OpenAI'}`);
}

/**
 * Auto-tag a memory based on caption and optionally image analysis
 * Uses GPT-5.1 for intelligent tagging and milestone detection
 */
export async function tagMemory(
  input: IMemoryTaggingInput
): Promise<IMemoryTaggingOutput> {
  try {
    const { caption, imageUrl } = input;

    const systemPrompt = `You are an expert at categorizing children's memories and detecting important milestones.

Your task is to:
1. Extract relevant tags from the memory caption (e.g., park, outdoor, family, learning, happy, milestone)
2. Detect if this is a significant milestone (first steps, first word, first day of school, etc.)

Return your response as a JSON object with this structure:
{
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedMilestone": {
    "category": "first_steps" | "first_word" | "first_day_school" | "first_tooth" | "first_birthday" | "other",
    "title": "First Steps" (or null if not a milestone)
  }
}

Tags should be:
- Lowercase, single words or short phrases
- Relevant to the activity, location, emotion, or people involved
- Between 3-8 tags per memory
- Include emotion tags when appropriate (happy, excited, proud, calm, funny)

Milestone categories:
- first_word: Child saying their first word or sentence
- first_steps: Child walking for the first time
- first_day_school: First day at school/daycare
- first_tooth: First tooth coming in
- first_birthday: Birthday celebrations
- other: Any other significant milestone`;

    const userPrompt = `Analyze this child memory and provide tags + milestone detection:

Memory caption: "${caption}"

${imageUrl ? `An image is also attached to this memory.` : ''}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{}'
    ) as IMemoryTaggingOutput;

    // Validate and clean the response
    const tags = Array.isArray(result.tags)
      ? result.tags.filter((tag) => tag && tag.trim().length > 0)
      : [];

    const output: IMemoryTaggingOutput = {
      tags,
      suggestedMilestone: result.suggestedMilestone?.title
        ? result.suggestedMilestone
        : undefined,
    };

    console.log('✅ Memory tagged successfully:', {
      caption: caption.substring(0, 50) + '...',
      tags: output.tags,
      milestone: output.suggestedMilestone?.title || 'none',
    });

    return output;
  } catch (error: any) {
    console.error('❌ Error tagging memory:', error.message);
    // Return empty tags on error to not block memory creation
    return {
      tags: ['untagged'],
    };
  }
}

/**
 * Generate opening narrative for storybook (sets the stage)
 */
export async function generateOpeningNarrative(params: {
  childName: string;
  theme: string;
  tone: string;
  storybookType: string;
  firstMemoryCaption: string;
  dateRange: { start: Date; end: Date };
}): Promise<string> {
  try {
    const { childName, theme, tone, storybookType, firstMemoryCaption, dateRange } = params;

    const startMonth = dateRange.start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const endMonth = dateRange.end.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const systemPrompt = `You are a professional children's book writer specializing in ${theme} themed stories with a ${tone} tone.

Write a beautiful opening narrative for a ${storybookType} storybook about ${childName} covering memories from ${startMonth} to ${endMonth}.

Guidelines:
- Write 2-3 sentences that set the stage and invite readers into the story
- Match the ${tone} tone (funny = playful, emotional = touching, calm = gentle)
- Create anticipation for the journey ahead
- Use warm, loving language that parents will treasure
- Reference the timeframe naturally
- Make it feel like the beginning of a meaningful journey

Example openings:
- Emotional: "In the heart of summer, little ${childName}'s world blossomed with wonder. Every day brought new discoveries, tiny triumphs, and moments too precious to forget."
- Funny: "Hold onto your hats, folks—${childName} was on a mission to keep everyone entertained! From silly faces to epic messes, ${storybookType === 'monthly' ? 'this month' : 'this time'} was packed with giggles."
- Calm: "As the seasons gently turned, ${childName} grew and explored, finding joy in the simple, beautiful moments of each day."`;

    const userPrompt = `Write an opening narrative for ${childName}'s ${storybookType} storybook.

Theme: ${theme}
Tone: ${tone}
Timeframe: ${startMonth} to ${endMonth}
First memory in the book: "${firstMemoryCaption}"

Write a captivating 2-3 sentence opening that sets the ${tone} tone and welcomes readers into this special journey.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 200,
    });

    const opening = response.choices[0].message.content?.trim() || '';

    console.log('✅ Opening narrative generated:', opening.substring(0, 80) + '...');

    return opening;
  } catch (error: any) {
    console.error('❌ Error generating opening narrative:', error.message);
    return `Welcome to ${params.childName}'s special story, filled with wonderful memories.`;
  }
}

/**
 * Generate closing narrative for storybook (provides satisfying ending)
 */
export async function generateClosingNarrative(params: {
  childName: string;
  theme: string;
  tone: string;
  storybookType: string;
  lastMemoryCaption: string;
  memoryCount: number;
}): Promise<string> {
  try {
    const { childName, theme, tone, storybookType, lastMemoryCaption, memoryCount } = params;

    const systemPrompt = `You are a professional children's book writer specializing in ${theme} themed stories with a ${tone} tone.

Write a beautiful closing narrative for a ${storybookType} storybook about ${childName} containing ${memoryCount} special memories.

Guidelines:
- Write 2-3 sentences that provide a satisfying, warm conclusion
- Match the ${tone} tone (funny = lighthearted send-off, emotional = touching farewell, calm = peaceful reflection)
- Celebrate the journey we've witnessed
- Look forward with hope and love
- Leave parents with a heartfelt feeling
- Make it feel complete but open to future adventures

Example closings:
- Emotional: "And so, these precious moments became part of ${childName}'s story—a story still being written, one beautiful day at a time. The journey continues, filled with love."
- Funny: "What a wild ride! ${childName} packed more fun into these memories than should be legally allowed. Can't wait to see what hilarious adventures come next!"
- Calm: "These quiet, beautiful moments remind us that childhood is a gift to be savored. ${childName}'s journey continues, gently unfolding like petals in the morning sun."`;

    const userPrompt = `Write a closing narrative for ${childName}'s ${storybookType} storybook.

Theme: ${theme}
Tone: ${tone}
Number of memories: ${memoryCount}
Final memory in the book: "${lastMemoryCaption}"

Write a heartfelt 2-3 sentence closing that brings the story to a satisfying, ${tone} conclusion.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 200,
    });

    const closing = response.choices[0].message.content?.trim() || '';

    console.log('✅ Closing narrative generated:', closing.substring(0, 80) + '...');

    return closing;
  } catch (error: any) {
    console.error('❌ Error generating closing narrative:', error.message);
    return `These wonderful memories of ${params.childName} will be cherished forever.`;
  }
}

/**
 * Generate a beautiful caption/narration for a storybook page WITH CONTEXT
 * Uses GPT-5.1 for creative, emotionally rich storytelling with multi-turn context
 */
export async function generateStoryCaption(params: {
  originalCaption: string;
  theme: string;
  tone: string;
  pageContext?: string;
  previousCaptions?: string[]; // NEW: Context from previous pages for consistency
  storyArc?: 'opening' | 'middle' | 'closing'; // NEW: Position in story
}): Promise<string> {
  try {
    const { originalCaption, theme, tone, pageContext, previousCaptions, storyArc } = params;

    // Build context-aware system prompt
    let contextGuidance = '';
    if (previousCaptions && previousCaptions.length > 0) {
      contextGuidance = `\n\nPrevious pages in this story:\n${previousCaptions.slice(-3).join('\n')}\n\nMaintain consistent style, voice, and vocabulary with the previous pages.`;
    }

    if (storyArc) {
      const arcGuidance = {
        opening: 'This is near the beginning of the story. Build anticipation and introduce the journey.',
        middle: 'This is the heart of the story. Continue the narrative flow naturally from what came before.',
        closing: 'This is near the end of the story. Begin wrapping up the journey with warmth.',
      };
      contextGuidance += `\n\n${arcGuidance[storyArc]}`;
    }

    const systemPrompt = `You are a professional children's book writer specializing in ${theme} themed stories with a ${tone} tone.

Your task is to transform parent-captured memory captions into beautiful, emotionally resonant narration suitable for a printed storybook.

Guidelines:
- Write in a warm, loving voice that parents will cherish
- Match the ${tone} tone (funny = playful and lighthearted, emotional = touching and heartfelt, calm = gentle and soothing)
- Keep it concise: 1-3 sentences maximum
- Use vivid, sensory language that brings the moment to life
- Write in past tense, third person (referring to the child by name if possible, or "they")
- Avoid clichés; be authentic and specific to this unique moment
- For ${theme} theme: incorporate appropriate imagery and vocabulary
- Create narrative flow and connection between pages${contextGuidance}

Example transformations:
- Original: "First time riding a bike without training wheels"
- ${tone === 'emotional' ? 'Emotional' : tone === 'funny' ? 'Funny' : 'Calm'}: ${
      tone === 'emotional'
        ? '"With wobbly determination and a heart full of courage, they pedaled forward into a new chapter of independence. The training wheels were gone, but the pride in their eyes would last forever."'
        : tone === 'funny'
        ? '"Look at them go! Wobbling like a baby giraffe learning to walk, but grinning like they just conquered Mount Everest. Spoiler alert: they did!"'
        : '"Steadily, calmly, they found their balance. The world held its breath as small wheels turned, and a new skill blossomed like a quiet sunrise."'
    }`;

    const userPrompt = `Transform this memory into a beautiful storybook caption:

Original caption: "${originalCaption}"
${pageContext ? `\nContext: ${pageContext}` : ''}

Write a ${tone}, ${theme}-themed narration (1-3 sentences max) that flows naturally with the story.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const caption = response.choices[0].message.content?.trim() || originalCaption;

    console.log('✅ Story caption generated:', {
      original: originalCaption.substring(0, 40) + '...',
      generated: caption.substring(0, 60) + '...',
    });

    return caption;
  } catch (error: any) {
    console.error('❌ Error generating story caption:', error.message);
    // Fall back to original caption on error
    return params.originalCaption;
  }
}

/**
 * Translate text to another language using GPT-5.1
 * Maintains tone and context across languages
 */
export async function translateText(params: {
  text: string;
  targetLanguage: string;
  context?: string;
}): Promise<string> {
  const { text, targetLanguage, context } = params;

  try {

    const systemPrompt = `You are an expert translator specializing in children's literature and family memories.

Translate the given text to ${targetLanguage}, preserving:
- Emotional tone and warmth
- Cultural appropriateness
- Natural, native-sounding language
- Age-appropriate vocabulary for family contexts

${context ? `Context: ${context}` : ''}

Return ONLY the translated text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const translation = response.choices[0].message.content?.trim() || text;

    console.log('✅ Text translated to', targetLanguage);

    return translation;
  } catch (error: any) {
    console.error('❌ Error translating text:', error.message);
    return text;
  }
}

/**
 * Select the best memories for a storybook from a collection
 * Uses GPT-5.1 to intelligently curate memories that tell a cohesive story
 */
export async function selectBestMemories(params: {
  memories: Array<{
    id: string;
    caption: string;
    tags: string[];
    date: string;
  }>;
  targetCount: number;
  storybookType: string;
  theme: string;
}): Promise<string[]> {
  const { memories, targetCount, storybookType, theme } = params;

  try {

    if (memories.length <= targetCount) {
      // If we have fewer memories than target, return all
      return memories.map((m) => m.id);
    }

    const systemPrompt = `You are an expert curator creating ${storybookType} storybooks with a ${theme} theme.

Your task is to select the ${targetCount} most meaningful and story-worthy memories from the provided list.

Selection criteria:
1. Diversity: Choose varied activities and emotions
2. Story arc: Pick memories that flow well together chronologically
3. Significance: Prioritize milestones and special moments
4. Visual variety: Ensure good mix of different settings
5. Emotional range: Include joyful, proud, calm, and playful moments
6. Theme alignment: Favor memories that fit the ${theme} aesthetic

Return a JSON object with this structure:
{
  "selectedIds": ["id1", "id2", "id3", ...],
  "reasoning": "Brief explanation of selection strategy"
}`;

    const userPrompt = `Select the best ${targetCount} memories from this list of ${memories.length} memories for a ${storybookType} storybook:

${memories
  .map(
    (m, i) =>
      `${i + 1}. ID: ${m.id}
   Date: ${m.date}
   Caption: "${m.caption}"
   Tags: ${m.tags.join(', ')}`
  )
  .join('\n\n')}

Return the ${targetCount} best memory IDs as a JSON object.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const selectedIds = result.selectedIds || memories.slice(0, targetCount).map((m) => m.id);

    console.log('✅ Best memories selected:', {
      total: memories.length,
      selected: selectedIds.length,
      reasoning: result.reasoning,
    });

    return selectedIds;
  } catch (error: any) {
    console.error('❌ Error selecting best memories:', error.message);
    // Fall back to first N memories
    return memories.slice(0, params.targetCount).map((m) => m.id);
  }
}

/**
 * Generate a monthly growth summary for a child
 * Uses GPT-5.1 to create a loving, observant summary of development
 */
export async function generateMonthlySummary(params: {
  childName: string;
  month: string;
  memories: Array<{
    caption: string;
    tags: string[];
    date: string;
  }>;
}): Promise<string> {
  const { childName, month, memories } = params;

  try {

    const systemPrompt = `You are a loving family documentarian writing monthly growth summaries for children.

Create a warm, observant summary of ${childName}'s development this month based on the captured memories.

Guidelines:
- Write in a tender, parental voice
- Highlight 2-4 key developments or patterns
- Use specific examples from the memories
- Keep it concise (3-5 sentences)
- Focus on growth, learning, personality, and special moments
- Avoid generic statements; be specific to THIS child's unique journey

Example:
"This month, Emma discovered the joy of splashing in puddles, jumping in with both feet and squealing with delight. She's becoming more independent at mealtime, insisting on using her own spoon (even if half the food ends up on her shirt!). Her vocabulary is growing daily, with 'butterfly' being her new favorite word—she says it constantly, often at completely random moments."`;

    const userPrompt = `Write a monthly summary for ${childName} based on these ${memories.length} memories from ${month}:

${memories
  .map(
    (m, i) =>
      `${i + 1}. ${m.date}: "${m.caption}" (${m.tags.join(', ')})`
  )
  .join('\n')}

Create a loving 3-5 sentence summary of ${childName}'s month.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 250,
    });

    const summary = response.choices[0].message.content?.trim() || '';

    console.log('✅ Monthly summary generated for', childName);

    return summary;
  } catch (error: any) {
    console.error('❌ Error generating monthly summary:', error.message);
    return `A wonderful month filled with ${memories.length} special moments.`;
  }
}

/**
 * Validate caption quality and retry if needed
 * Ensures captions meet minimum quality standards
 */
export async function generateValidatedCaption(params: {
  originalCaption: string;
  theme: string;
  tone: string;
  pageContext?: string;
  previousCaptions?: string[];
  storyArc?: 'opening' | 'middle' | 'closing';
  maxRetries?: number;
}): Promise<string> {
  const maxRetries = params.maxRetries || 2;
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const caption = await generateStoryCaption(params);

      // Validate caption quality
      const wordCount = caption.split(/\s+/).length;
      const sentenceCount = (caption.match(/[.!?]+/g) || []).length;

      // Quality checks
      if (caption.length < 20) {
        lastError = 'Caption too short (< 20 characters)';
        console.warn(`⚠️  Attempt ${attempt}: ${lastError}, retrying...`);
        continue;
      }

      if (caption.length > 400) {
        lastError = 'Caption too long (> 400 characters)';
        console.warn(`⚠️  Attempt ${attempt}: ${lastError}, retrying...`);
        continue;
      }

      if (wordCount < 5) {
        lastError = 'Caption has too few words (< 5)';
        console.warn(`⚠️  Attempt ${attempt}: ${lastError}, retrying...`);
        continue;
      }

      if (sentenceCount === 0) {
        lastError = 'Caption has no complete sentences';
        console.warn(`⚠️  Attempt ${attempt}: ${lastError}, retrying...`);
        continue;
      }

      // Check for repetitive content (same word repeated 4+ times)
      const words = caption.toLowerCase().split(/\s+/);
      const wordFreq = new Map<string, number>();
      for (const word of words) {
        if (word.length > 3) { // Only check words longer than 3 chars
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
          if (wordFreq.get(word)! >= 4) {
            lastError = `Caption has repetitive content (word "${word}" repeated ${wordFreq.get(word)} times)`;
            console.warn(`⚠️  Attempt ${attempt}: ${lastError}, retrying...`);
            continue;
          }
        }
      }

      // All quality checks passed!
      console.log(`✅ Caption quality validated (attempt ${attempt})`);
      return caption;
    } catch (error: any) {
      lastError = error.message;
      console.warn(`⚠️  Attempt ${attempt} failed: ${lastError}`);

      if (attempt === maxRetries) {
        // Final attempt failed, fall back to original
        console.error(`❌ All ${maxRetries} attempts failed, using original caption`);
        return params.originalCaption;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  // Should never reach here, but just in case
  console.error(`❌ Caption generation failed after ${maxRetries} attempts: ${lastError}`);
  return params.originalCaption;
}

/**
 * Validate that AI image generation succeeded
 */
export function validateImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/placeholder')) return false;
  if (url.length < 10) return false;

  // Check if it's a valid URL format
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default openai;
