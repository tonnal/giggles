import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { IGenerateStorybookRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import { generateStorybook } from '@/lib/services/storybook-generator';

/**
 * POST /api/storybooks/generate
 * Generate a new storybook using AI (GPT-5.1 + Gemini)
 * This is the core magical feature of Giggles
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    const body: IGenerateStorybookRequest = await request.json();

    // Validate required fields
    const validation = validateRequired(body, [
      'childId',
      'type',
      'theme',
      'tone',
      'startDate',
      'endDate',
    ]);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const {
      childId,
      type,
      theme,
      tone,
      startDate,
      endDate,
      bilingual = false,
      secondaryLanguage,
      title,
    } = body;

    // TODO: Get actual user ID and family ID from auth
    const userId = new Types.ObjectId(); // Placeholder
    const familyId = new Types.ObjectId(); // TODO: Get from child or auth

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return errorResponse('Invalid date range: start date must be before end date');
    }

    if (bilingual && !secondaryLanguage) {
      return errorResponse('secondaryLanguage is required when bilingual is true');
    }

    console.log('🎨 Starting storybook generation request...');
    console.log('Parameters:', {
      childId,
      type,
      theme,
      tone,
      dateRange: `${startDate} to ${endDate}`,
      bilingual,
    });

    // ============================================
    // Generate storybook with AI
    // ============================================
    try {
      const storybookId = await generateStorybook(
        {
          childId,
          familyId: familyId.toString(),
          type,
          theme,
          tone,
          dateRange: { start, end },
          bilingual,
          secondaryLanguage,
          title,
        },
        userId,
        // Progress callback (optional - can be used for WebSocket updates)
        (progress) => {
          console.log(
            `📊 Generation progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`
          );
        }
      );

      console.log('✅ Storybook generation complete:', storybookId);

      return successResponse(
        { storybookId: storybookId.toString() },
        'Storybook generated successfully'
      );
    } catch (error: any) {
      console.error('❌ Storybook generation failed:', error);

      return errorResponse(
        `Storybook generation failed: ${error.message}`,
        500
      );
    }
  });
}
