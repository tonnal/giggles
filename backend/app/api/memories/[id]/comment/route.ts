import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Memory } from '@/lib/db/models';
import { IAddCommentRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';

/**
 * POST /api/memories/[id]/comment
 * Add a comment to a memory
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body: IAddCommentRequest = await request.json();

    const validation = validateRequired(body, ['text']);
    if (!validation.valid) {
      return errorResponse('Comment text is required');
    }

    const { text } = body;

    if (text.length > 1000) {
      return errorResponse('Comment too long (max 1000 characters)');
    }

    // TODO: Get actual user ID from auth
    const userId = new Types.ObjectId(); // Placeholder

    const { id } = await params;
    const memory = await Memory.findById(id);
    if (!memory) {
      return errorResponse('Memory not found', 404);
    }

    // Add comment
    memory.comments.push({
      userId,
      text,
      createdAt: new Date(),
    });

    await memory.save();

    console.log('✅ Comment added to memory:', memory._id);

    // Populate user info for response
    const updatedMemory = await Memory.findById(memory._id)
      .populate('comments.userId', 'name avatar')
      .lean();

    return successResponse(updatedMemory?.comments, 'Comment added successfully');
  });
}
