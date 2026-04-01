import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { StorybookTheme, StorybookTone } from '@/lib/types';

// Initialize Gemini client for video generation
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Initialize OpenAI client for DALL-E 3 image generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get model from environment variable
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set in environment variables');
}

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not set - image generation will use placeholders');
}

console.log(`✅ Gemini configured with model: ${MODEL_NAME}`);
console.log(`✅ DALL-E 3 configured for image generation`);

/**
 * Theme-specific style guides for consistent image generation
 */
const THEME_STYLES = {
  cute: {
    style: 'kawaii, adorable, pastel colors, soft rounded shapes, cheerful, child-friendly illustration',
    mood: 'joyful, heartwarming, sweet',
    palette: 'pastel pink, baby blue, soft yellow, mint green',
  },
  watercolor: {
    style: 'watercolor painting, soft edges, flowing brushstrokes, artistic, dreamy, hand-painted aesthetic',
    mood: 'gentle, nostalgic, artistic',
    palette: 'muted watercolor tones, soft washes, organic color blending',
  },
  adventure: {
    style: 'adventure storybook illustration, vibrant, dynamic, whimsical, exploratory',
    mood: 'exciting, adventurous, bold',
    palette: 'rich earth tones, forest greens, sunset oranges, sky blues',
  },
  bedtime: {
    style: 'bedtime story illustration, calming, peaceful, gentle, moonlit, dreamy',
    mood: 'serene, peaceful, sleepy, cozy',
    palette: 'deep blues, soft purples, warm creams, gentle silvers',
  },
  minimal: {
    style: 'minimalist illustration, clean lines, simple shapes, modern, elegant, uncluttered',
    mood: 'calm, sophisticated, timeless',
    palette: 'neutral tones, black and white with subtle accent colors',
  },
};

/**
 * Tone-specific emotional directions
 */
const TONE_DIRECTIONS = {
  funny: 'playful, humorous, lighthearted, whimsical, silly expressions',
  emotional: 'touching, heartfelt, tender, meaningful, emotionally resonant',
  calm: 'peaceful, gentle, soothing, tranquil, serene',
};

/**
 * Generate a storybook cover illustration using DALL-E 3
 */
export async function generateStorybookCover(params: {
  title: string;
  theme: StorybookTheme;
  tone: StorybookTone;
  childName?: string;
  storybookType?: string;
}): Promise<string> {
  try {
    const { title, theme, tone, childName, storybookType } = params;

    const themeStyle = THEME_STYLES[theme];
    const toneDirection = TONE_DIRECTIONS[tone];

    // Construct detailed prompt for DALL-E 3
    const prompt = `A beautiful children's storybook cover illustration in ${themeStyle.style} style. ${themeStyle.mood} mood with ${toneDirection} feeling. Color palette: ${themeStyle.palette}. Professional book cover quality with space for title overlay. ${
      storybookType === 'monthly' ? 'Include subtle calendar or seasonal elements. ' : ''
    }${
      storybookType === 'yearbook' ? 'Include subtle timeline or growth elements. ' : ''
    }${
      storybookType === 'vacation' ? 'Include travel or adventure elements. ' : ''
    }Family-friendly, warm, inviting. No text or letters in the image. ${theme} themed artwork for children ages 0-10.`;

    console.log('🎨 Generating storybook cover with DALL-E 3...');
    console.log('Prompt:', prompt.substring(0, 150) + '...');

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E 3');
    }

    console.log('✅ Storybook cover generated successfully');
    console.log('Image URL:', imageUrl);

    // TODO: Download and upload to S3 for permanent storage
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Error generating storybook cover:', error.message);
    // Return placeholder on error
    return `/placeholder-covers/${params.theme}-cover.jpg`;
  }
}

/**
 * Generate a storybook page illustration based on memory caption using DALL-E 3
 */
export async function generatePageIllustration(params: {
  memoryCaption: string;
  theme: StorybookTheme;
  tone: StorybookTone;
  pageContext?: string;
  previousContext?: string; // NEW: Context from previous pages for consistency
}): Promise<string> {
  try {
    const { memoryCaption, theme, tone, pageContext, previousContext } = params;

    const themeStyle = THEME_STYLES[theme];
    const toneDirection = TONE_DIRECTIONS[tone];

    // Construct prompt for DALL-E 3 (more concise than Gemini prompts)
    const prompt = `A children's storybook page illustration in ${themeStyle.style} style depicting: "${memoryCaption}". ${themeStyle.mood} mood, ${toneDirection} feeling. Color palette: ${themeStyle.palette}. ${
      previousContext ? `Consistent with previous pages: ${previousContext}. ` : ''
    }Professional children's book quality, ${theme} themed. Warm, child-friendly, suitable for ages 0-10. Stylized illustrated characters, not realistic photos. Focus on the key emotional moment. No text or letters in the image. ${tone} emotional tone.`;

    console.log('🎨 Generating page illustration with DALL-E 3...');
    console.log('Memory:', memoryCaption.substring(0, 80) + '...');

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E 3');
    }

    console.log('✅ Page illustration generated successfully');

    // TODO: Download and upload to S3 for permanent storage
    return imageUrl;
  } catch (error: any) {
    console.error('❌ Error generating page illustration:', error.message);
    return `/placeholder-pages/${params.theme}-page.jpg`;
  }
}

/**
 * Generate multiple page illustrations in batch for efficiency
 */
export async function generateBatchIllustrations(params: {
  memories: Array<{
    id: string;
    caption: string;
  }>;
  theme: StorybookTheme;
  tone: StorybookTone;
}): Promise<Map<string, string>> {
  const { memories, theme, tone } = params;
  const illustrations = new Map<string, string>();

  console.log(`🎨 Batch generating ${memories.length} illustrations...`);

  // Generate illustrations sequentially to avoid rate limits
  for (const memory of memories) {
    try {
      const imageUrl = await generatePageIllustration({
        memoryCaption: memory.caption,
        theme,
        tone,
      });

      illustrations.set(memory.id, imageUrl);

      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to generate illustration for memory ${memory.id}`);
      illustrations.set(memory.id, `/placeholder-pages/${theme}-page.jpg`);
    }
  }

  console.log(`✅ Batch generation complete: ${illustrations.size}/${memories.length} successful`);

  return illustrations;
}

/**
 * Generate a themed decorative element or divider
 */
export async function generateDecorativeElement(params: {
  theme: StorybookTheme;
  elementType: 'divider' | 'corner' | 'header' | 'footer';
}): Promise<string> {
  try {
    const { theme, elementType } = params;
    const themeStyle = THEME_STYLES[theme];

    const prompt = `Create a decorative ${elementType} element for a ${theme} themed children's storybook.

STYLE: ${themeStyle.style}
PALETTE: ${themeStyle.palette}

REQUIREMENTS:
- Small decorative ${elementType} suitable for book layout
- ${theme} aesthetic
- Subtle, not distracting from main content
- Elegant, professional, child-friendly
- No text or letters

${elementType === 'divider' ? '- Horizontal decorative line or pattern' : ''}
${elementType === 'corner' ? '- Small corner ornament or flourish' : ''}
${elementType === 'header' ? '- Top-of-page decorative element' : ''}
${elementType === 'footer' ? '- Bottom-of-page decorative element' : ''}`;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const imageUrl = response.text();

    return imageUrl || `/decorative/${theme}-${elementType}.png`;
  } catch (error: any) {
    console.error('❌ Error generating decorative element:', error.message);
    return `/decorative/${params.theme}-${params.elementType}.png`;
  }
}

export default genAI;
