import { NextRequest } from 'next/server';
import { Memory } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';

/**
 * GET /api/memories/[id]
 * Get a single memory with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const { id } = await params;
    const memory = await Memory.findById(id)
      .populate('uploadedBy', 'name avatar')
      .populate('reactions.userId', 'name avatar')
      .populate('comments.userId', 'name avatar')
      .populate('milestoneId')
      .lean();

    if (!memory) {
      return errorResponse('Memory not found', 404);
    }

    return successResponse(memory);
  });
}

/**
 * PATCH /api/memories/[id]
 * Update memory caption or tags
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body = await request.json();
    const { caption, tags } = body;

    const { id } = await params;
    const memory = await Memory.findById(id);
    if (!memory) {
      return errorResponse('Memory not found', 404);
    }

    if (caption) memory.caption = caption;
    if (tags) memory.tags = tags;

    await memory.save();

    console.log('✅ Memory updated:', memory._id);

    return successResponse(memory, 'Memory updated successfully');
  });
}

/**
 * DELETE /api/memories/[id]
 * Delete a memory
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const { id } = await params;
    const memory = await Memory.findById(id);
    if (!memory) {
      return errorResponse('Memory not found', 404);
    }

    // TODO: Delete associated media from S3
    // TODO: Remove from albums
    // TODO: Delete associated milestone if any

    await Memory.deleteOne({ _id: memory._id });

    console.log('✅ Memory deleted:', memory._id);

    return successResponse(null, 'Memory deleted successfully');
  });
}
