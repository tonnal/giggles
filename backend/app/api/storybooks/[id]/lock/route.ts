import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';
import { lockStorybook } from '@/lib/services/storybook-generator';

/**
 * POST /api/storybooks/[id]/lock
 * Lock a storybook to prepare for ordering
 * Once locked, it cannot be edited (pages, title, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const { id } = await params;
    console.log(`🔒 Locking storybook ${id}...`);

    try {
      await lockStorybook(new Types.ObjectId(id));

      console.log(`✅ Storybook locked successfully`);

      return successResponse(null, 'Storybook locked successfully');
    } catch (error: any) {
      console.error('❌ Failed to lock storybook:', error);
      return errorResponse(`Failed to lock storybook: ${error.message}`, 500);
    }
  });
}
