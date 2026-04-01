import { NextRequest } from 'next/server';
import { Storybook } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';

/**
 * GET /api/storybooks/[id]
 * Get full storybook details including all pages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const { id } = await params;
    const storybook = await Storybook.findById(id)
      .populate('childId', 'name photoUrl dob gender')
      .populate('createdBy', 'name avatar')
      .lean();

    if (!storybook) {
      return errorResponse('Storybook not found', 404);
    }

    return successResponse(storybook);
  });
}

/**
 * PATCH /api/storybooks/[id]
 * Update storybook metadata (title, theme, etc.)
 * Can only update drafts
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body = await request.json();
    const { title, theme, tone } = body;

    const { id } = await params;
    const storybook = await Storybook.findById(id);
    if (!storybook) {
      return errorResponse('Storybook not found', 404);
    }

    if (storybook.status !== 'draft') {
      return errorResponse('Can only edit draft storybooks', 400);
    }

    // Update fields if provided
    if (title) storybook.title = title;
    if (theme) storybook.theme = theme;
    if (tone) storybook.tone = tone;

    await storybook.save();

    console.log('✅ Storybook updated:', storybook._id);

    return successResponse(storybook, 'Storybook updated successfully');
  });
}

/**
 * DELETE /api/storybooks/[id]
 * Delete a storybook
 * Can only delete drafts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const { id } = await params;
    const storybook = await Storybook.findById(id);
    if (!storybook) {
      return errorResponse('Storybook not found', 404);
    }

    if (storybook.status === 'ordered' || storybook.status === 'shipped') {
      return errorResponse('Cannot delete ordered or shipped storybooks', 400);
    }

    await Storybook.deleteOne({ _id: storybook._id });

    console.log('✅ Storybook deleted:', storybook._id);

    return successResponse(null, 'Storybook deleted successfully');
  });
}
