import { Types } from 'mongoose';
import {
  IStorybookGenerationInput,
  IGeneratedPage,
  StorybookTheme,
  StorybookTone,
  PageLayout,
} from '@/lib/types';
import { Memory, Storybook, Child } from '@/lib/db/models';
import {
  selectBestMemories,
  generateValidatedCaption,
  generateOpeningNarrative,
  generateClosingNarrative,
  translateText,
} from './openai';
import {
  generateStorybookCover,
  generatePageIllustration,
  generateBatchIllustrations,
} from './gemini';
import { uploadToS3 } from './s3';

/**
 * Main Storybook Generation Service
 * Orchestrates OpenAI (GPT-5.1) and Gemini to create beautiful storybooks
 */

interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
}

type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Generate a complete storybook with cover and pages
 * This is the core magical feature of the app
 */
export async function generateStorybook(
  input: IStorybookGenerationInput,
  userId: Types.ObjectId,
  onProgress?: ProgressCallback
): Promise<Types.ObjectId> {
  try {
    const {
      childId,
      familyId,
      type,
      theme,
      tone,
      dateRange,
      bilingual = false,
      secondaryLanguage,
      title: customTitle,
    } = input;

    console.log('🎨 Starting storybook generation...');
    console.log('Input:', { type, theme, tone, childId, dateRange });

    // ============================================
    // STAGE 1: Fetch child and memories
    // ============================================
    onProgress?.({
      stage: 'fetching',
      progress: 5,
      message: 'Finding memories to include...',
    });

    const child = await Child.findById(childId);
    if (!child) {
      throw new Error('Child not found');
    }

    const memories = await Memory.find({
      childId: new Types.ObjectId(childId),
      familyId: new Types.ObjectId(familyId),
      date: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    })
      .sort({ date: 1 })
      .lean();

    console.log(`📸 Found ${memories.length} memories in date range`);

    if (memories.length === 0) {
      throw new Error('No memories found in the specified date range. Please select a different date range or add more memories first.');
    }

    // ============================================
    // STAGE 2: Select best memories using GPT-5.1 (with adaptive targeting)
    // ============================================
    onProgress?.({
      stage: 'selecting',
      progress: 15,
      message: 'Selecting the best moments...',
    });

    // ADAPTIVE memory targeting based on what's available
    // Few memories (1-5): Use all of them for a shorter, intimate storybook
    // Moderate (6-15): Target 60-80% for good curation
    // Many (16+): Target 12-20 for optimal storybook length
    let targetCount: number;
    if (memories.length <= 5) {
      targetCount = memories.length; // Use all for short storybooks
      console.log(`📚 Creating intimate storybook with all ${targetCount} memories`);
    } else if (memories.length <= 15) {
      targetCount = Math.max(Math.floor(memories.length * 0.7), 6); // 70% of available
      console.log(`📚 Curating ${targetCount} of ${memories.length} memories (70%)`);
    } else {
      targetCount = Math.min(Math.max(12, Math.floor(memories.length * 0.6)), 20); // 12-20 sweet spot
      console.log(`📚 Curating ${targetCount} of ${memories.length} memories for optimal flow`);
    }

    const memoriesForSelection = memories.map((m) => ({
      id: m._id.toString(),
      caption: m.caption,
      tags: m.tags,
      date: m.date.toISOString(),
    }));

    const selectedMemoryIds = await selectBestMemories({
      memories: memoriesForSelection,
      targetCount,
      storybookType: type,
      theme,
    });

    const selectedMemories = memories.filter((m) =>
      selectedMemoryIds.includes(m._id.toString())
    );

    console.log(`✨ Selected ${selectedMemories.length} best memories`);

    // ============================================
    // STAGE 3: Generate title if not provided
    // ============================================
    onProgress?.({
      stage: 'title',
      progress: 25,
      message: 'Creating storybook title...',
    });

    const title =
      customTitle ||
      generateAutomaticTitle({
        childName: child.name,
        type,
        dateRange,
      });

    console.log(`📚 Storybook title: "${title}"`);

    // ============================================
    // STAGE 4: Generate cover illustration with Gemini
    // ============================================
    onProgress?.({
      stage: 'cover',
      progress: 35,
      message: 'Creating cover illustration...',
    });

    const coverImageUrl = await generateStorybookCover({
      title,
      theme,
      tone,
      childName: child.name,
      storybookType: type,
    });

    console.log('🎨 Cover generated:', coverImageUrl);

    // ============================================
    // STAGE 5: Generate opening page with narrative
    // ============================================
    onProgress?.({
      stage: 'opening',
      progress: 38,
      message: 'Writing opening narrative...',
    });

    const openingNarrative = await generateOpeningNarrative({
      childName: child.name,
      theme,
      tone,
      storybookType: type,
      firstMemoryCaption: selectedMemories[0].caption,
      dateRange,
    });

    console.log('📖 Opening narrative:', openingNarrative.substring(0, 100) + '...');

    // ============================================
    // STAGE 6: Generate pages (mix of real photos + AI illustrations with story arc)
    // ============================================
    onProgress?.({
      stage: 'pages',
      progress: 45,
      message: 'Generating storybook pages...',
    });

    const pages: IGeneratedPage[] = [];
    const generatedCaptions: string[] = []; // Track for context

    // Add opening page (illustration only, no specific memory)
    pages.push({
      pageNumber: 1,
      layout: 'illustration-full',
      imageType: 'generated',
      imageUrl: coverImageUrl, // Reuse cover for opening page
      memoryId: selectedMemories[0]._id, // Reference first memory loosely
      caption: openingNarrative,
      narration: openingNarrative,
    });

    for (let i = 0; i < selectedMemories.length; i++) {
      const memory = selectedMemories[i];
      const pageNumber = i + 2; // Start at page 2 (page 1 is opening)
      const totalPages = selectedMemories.length + 2; // +1 opening, +1 closing

      onProgress?.({
        stage: 'pages',
        progress: 45 + Math.floor((i / selectedMemories.length) * 40),
        message: `Creating page ${pageNumber}/${totalPages}...`,
      });

      // ============================================
      // Determine story arc position for narrative flow
      // ============================================
      let storyArc: 'opening' | 'middle' | 'closing';
      if (i < 2) {
        storyArc = 'opening'; // First 2 memory pages
      } else if (i >= selectedMemories.length - 2) {
        storyArc = 'closing'; // Last 2 memory pages
      } else {
        storyArc = 'middle'; // Everything in between
      }

      // ============================================
      // INTELLIGENT photo vs illustration selection
      // Strategy: Prioritize photos when available, use illustrations for variety
      // ============================================
      const hasPhoto = memory.mediaUrl && memory.mediaUrl.length > 0 && !memory.mediaUrl.startsWith('/placeholder');

      // Use illustrations for:
      // - Every 3rd page (for variety)
      // - OR if no good photo available
      // - OR for dramatic moments (when tags suggest milestone/special)
      const isDramaticMoment = memory.tags?.some(tag =>
        ['milestone', 'first', 'birthday', 'special', 'celebration'].includes(tag.toLowerCase())
      );

      const useGeneratedImage = !hasPhoto || (i % 3 === 1 && !isDramaticMoment);

      let pageImageUrl: string;
      let imageType: 'photo' | 'generated';

      if (useGeneratedImage) {
        // Generate AI illustration with DALL-E 3
        console.log(`🎨 Generating illustration for page ${pageNumber} (${storyArc})...`);

        pageImageUrl = await generatePageIllustration({
          memoryCaption: memory.caption,
          theme,
          tone,
          pageContext: `Page ${pageNumber} of ${totalPages}, ${storyArc} section`,
          previousContext: generatedCaptions.length > 0 ? generatedCaptions.slice(-2).join(' ') : undefined,
        });

        imageType = 'generated';
      } else {
        // Use real photo from memory
        console.log(`📸 Using photo for page ${pageNumber}`);
        pageImageUrl = memory.mediaUrl;
        imageType = 'photo';
      }

      // ============================================
      // Generate beautiful caption with GPT-5.1 (with validation & retry!)
      // ============================================
      console.log(`✍️  Generating validated caption for page ${pageNumber} (${storyArc})...`);

      const caption = await generateValidatedCaption({
        originalCaption: memory.caption,
        theme,
        tone,
        pageContext: `Page ${pageNumber} of ${totalPages} in a ${type} storybook about ${child.name}`,
        previousCaptions: generatedCaptions, // Pass all previous captions for context
        storyArc, // Tell GPT where we are in the story
        maxRetries: 2, // Retry up to 2 times if quality issues
      });

      // Track this caption for future context
      generatedCaptions.push(caption);

      // ============================================
      // Translate caption if bilingual
      // ============================================
      let captionSecondary: string | undefined;

      if (bilingual && secondaryLanguage) {
        console.log(`🌐 Translating to ${secondaryLanguage}...`);

        captionSecondary = await translateText({
          text: caption,
          targetLanguage: secondaryLanguage,
          context: 'Children\'s storybook caption, warm and loving tone',
        });
      }

      // ============================================
      // Determine page layout
      // ============================================
      const layout: PageLayout = determinePageLayout({
        pageNumber,
        totalPages: selectedMemories.length,
        hasLongCaption: caption.length > 150,
        imageType,
      });

      // Add page to collection
      pages.push({
        pageNumber,
        layout,
        imageType,
        imageUrl: pageImageUrl,
        memoryId: memory._id,
        caption,
        captionSecondary,
        narration: caption, // For now, narration = caption
        narrationSecondary: captionSecondary,
      });

      console.log(`✅ Page ${pageNumber} complete`);

      // Small delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ============================================
    // STAGE 7: Generate closing page with narrative
    // ============================================
    onProgress?.({
      stage: 'closing',
      progress: 88,
      message: 'Writing closing narrative...',
    });

    const closingNarrative = await generateClosingNarrative({
      childName: child.name,
      theme,
      tone,
      storybookType: type,
      lastMemoryCaption: selectedMemories[selectedMemories.length - 1].caption,
      memoryCount: selectedMemories.length,
    });

    console.log('📖 Closing narrative:', closingNarrative.substring(0, 100) + '...');

    // Add closing page (illustration only)
    const closingPageNumber = selectedMemories.length + 2;
    pages.push({
      pageNumber: closingPageNumber,
      layout: 'illustration-full',
      imageType: 'generated',
      imageUrl: coverImageUrl, // Reuse cover for closing page (or could generate new illustration)
      memoryId: selectedMemories[selectedMemories.length - 1]._id, // Reference last memory loosely
      caption: closingNarrative,
      narration: closingNarrative,
    });

    console.log(`✅ Complete storybook: ${pages.length} pages total (1 opening + ${selectedMemories.length} memories + 1 closing)`);

    // ============================================
    // STAGE 8: Save storybook to database
    // ============================================
    onProgress?.({
      stage: 'saving',
      progress: 95,
      message: 'Saving your storybook...',
    });

    const storybook = await Storybook.create({
      familyId: new Types.ObjectId(familyId),
      childId: new Types.ObjectId(childId),
      title,
      type,
      theme,
      tone,
      language: bilingual ? 'bilingual' : 'en',
      secondaryLanguage: bilingual ? secondaryLanguage : undefined,
      status: 'draft',
      coverDesign: {
        imageUrl: coverImageUrl,
        title,
        subtitle: `A memory book for ${child.name}`,
      },
      pages,
      createdBy: userId,
    });

    console.log('✅ Storybook saved successfully:', storybook._id);

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Storybook ready!',
    });

    return storybook._id;
  } catch (error: any) {
    console.error('❌ Error generating storybook:', error);
    throw new Error(`Storybook generation failed: ${error.message}`);
  }
}

/**
 * Regenerate a single page of an existing storybook
 */
export async function regeneratePage(params: {
  storybookId: Types.ObjectId;
  pageNumber: number;
  options?: {
    regenerateImage?: boolean;
    regenerateCaption?: boolean;
    newTone?: StorybookTone;
  };
}): Promise<IGeneratedPage> {
  try {
    const { storybookId, pageNumber, options = {} } = params;
    const { regenerateImage = true, regenerateCaption = true, newTone } = options;

    const storybook = await Storybook.findById(storybookId);
    if (!storybook) {
      throw new Error('Storybook not found');
    }

    if (storybook.status === 'locked' || storybook.status === 'ordered') {
      throw new Error('Cannot edit locked or ordered storybook');
    }

    const page = storybook.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) {
      throw new Error('Page not found');
    }

    const updatedPage = { ...page };

    // Get memory for context
    const memory = page.memoryId
      ? await Memory.findById(page.memoryId).lean()
      : null;

    if (!memory) {
      throw new Error('Memory not found for this page');
    }

    // Regenerate image if requested
    if (regenerateImage && page.imageType === 'generated') {
      console.log(`🎨 Regenerating illustration for page ${pageNumber}...`);

      const newImageUrl = await generatePageIllustration({
        memoryCaption: memory.caption,
        theme: storybook.theme,
        tone: newTone || storybook.tone,
      });

      updatedPage.imageUrl = newImageUrl;
    }

    // Regenerate caption if requested (with validation)
    if (regenerateCaption) {
      console.log(`✍️  Regenerating validated caption for page ${pageNumber}...`);

      const newCaption = await generateValidatedCaption({
        originalCaption: memory.caption,
        theme: storybook.theme,
        tone: newTone || storybook.tone,
        maxRetries: 2,
      });

      updatedPage.caption = newCaption;
      updatedPage.narration = newCaption;

      // Retranslate if bilingual
      if (storybook.language === 'bilingual' && storybook.secondaryLanguage) {
        const newCaptionSecondary = await translateText({
          text: newCaption,
          targetLanguage: storybook.secondaryLanguage,
          context: 'Children\'s storybook caption',
        });

        updatedPage.captionSecondary = newCaptionSecondary;
        updatedPage.narrationSecondary = newCaptionSecondary;
      }
    }

    // Update the page in the storybook
    const pageIndex = storybook.pages.findIndex((p) => p.pageNumber === pageNumber);
    storybook.pages[pageIndex] = updatedPage;
    await storybook.save();

    console.log(`✅ Page ${pageNumber} regenerated successfully`);

    return updatedPage;
  } catch (error: any) {
    console.error('❌ Error regenerating page:', error);
    throw new Error(`Failed to regenerate page: ${error.message}`);
  }
}

/**
 * Lock a storybook to prepare for ordering
 */
export async function lockStorybook(storybookId: Types.ObjectId): Promise<void> {
  const storybook = await Storybook.findById(storybookId);
  if (!storybook) {
    throw new Error('Storybook not found');
  }

  if (storybook.status === 'ordered' || storybook.status === 'shipped') {
    throw new Error('Storybook already ordered');
  }

  storybook.status = 'locked';
  storybook.lockedAt = new Date();
  await storybook.save();

  console.log('🔒 Storybook locked:', storybookId);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate an automatic title based on storybook type and date range
 */
function generateAutomaticTitle(params: {
  childName: string;
  type: string;
  dateRange: { start: Date; end: Date };
}): string {
  const { childName, type, dateRange } = params;

  const startMonth = dateRange.start.toLocaleString('en-US', { month: 'long' });
  const startYear = dateRange.start.getFullYear();
  const endMonth = dateRange.end.toLocaleString('en-US', { month: 'long' });
  const endYear = dateRange.end.getFullYear();

  switch (type) {
    case 'monthly':
      return `${childName}'s ${startMonth} ${startYear}`;
    case 'yearbook':
      return `${childName}'s ${startYear} Year`;
    case 'milestone':
      return `${childName}'s Milestones`;
    case 'vacation':
      return `${childName}'s Adventure`;
    case 'custom':
      if (startMonth === endMonth && startYear === endYear) {
        return `${childName}'s ${startMonth} ${startYear}`;
      }
      return `${childName}'s Memories`;
    default:
      return `${childName}'s Story`;
  }
}

/**
 * Determine the best page layout based on content
 */
function determinePageLayout(params: {
  pageNumber: number;
  totalPages: number;
  hasLongCaption: boolean;
  imageType: 'photo' | 'generated';
}): PageLayout {
  const { pageNumber, totalPages, hasLongCaption, imageType } = params;

  // First and last pages often work well with full images
  if (pageNumber === 1 || pageNumber === totalPages) {
    return hasLongCaption ? 'photo-left-text-right' : 'photo-full';
  }

  // Long captions need side-by-side layout
  if (hasLongCaption) {
    return 'photo-left-text-right';
  }

  // Generated illustrations work well full-page
  if (imageType === 'generated') {
    return 'illustration-full';
  }

  // Default to photo-full for real photos
  return 'photo-full';
}

export default {
  generateStorybook,
  regeneratePage,
  lockStorybook,
};
