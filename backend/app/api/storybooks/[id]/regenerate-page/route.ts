import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import { regeneratePage } from '@/lib/services/storybook-generator';

/**
 * POST /api/storybooks/[id]/regenerate-page
 * Regenerate a single page of a storybook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body = await request.json();

    const validation = validateRequired(body, ['pageNumber']);
    if (!validation.valid) {
      return errorResponse('pageNumber is required');
    }

    const { pageNumber, regenerateImage, regenerateCaption, newTone } = body;

    const { id } = await params;
    console.log(`🔄 Regenerating page ${pageNumber} of storybook ${id}...`);

    try {
      const updatedPage = await regeneratePage({
        storybookId: new Types.ObjectId(id),
        pageNumber,
        options: {
          regenerateImage,
          regenerateCaption,
          newTone,
        },
      });

      console.log(`✅ Page ${pageNumber} regenerated successfully`);

      return successResponse(updatedPage, 'Page regenerated successfully');
    } catch (error: any) {
      console.error('❌ Page regeneration failed:', error);
      return errorResponse(`Failed to regenerate page: ${error.message}`, 500);
    }
  });
}
