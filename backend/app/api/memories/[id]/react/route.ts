import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Memory } from '@/lib/db/models';
import { IAddReactionRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';

/**
 * POST /api/memories/[id]/react
 * Add or update a reaction to a memory
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body: IAddReactionRequest = await request.json();

    const validation = validateRequired(body, ['emoji']);
    if (!validation.valid) {
      return errorResponse('Emoji is required');
    }

    const { emoji } = body;

    // Validate emoji
    const validEmojis = ['❤️', '😂', '⭐', '🥰', '👏'];
    if (!validEmojis.includes(emoji)) {
      return errorResponse('Invalid emoji');
    }

    // TODO: Get actual user ID from auth
    const userId = new Types.ObjectId(); // Placeholder

    const { id } = await params;
    const memory = await Memory.findById(id);
    if (!memory) {
      return errorResponse('Memory not found', 404);
    }

    // Check if user already reacted
    const existingReactionIndex = memory.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex >= 0) {
      // Update existing reaction
      memory.reactions[existingReactionIndex].emoji = emoji;
    } else {
      // Add new reaction
      memory.reactions.push({
        userId,
        emoji,
        createdAt: new Date(),
      });
    }

    await memory.save();

    console.log('✅ Reaction added to memory:', memory._id);

    return successResponse(memory.reactions, 'Reaction added successfully');
  });
}

/**
 * DELETE /api/memories/[id]/react
 * Remove a reaction from a memory
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    // TODO: Get actual user ID from auth
    const userId = new Types.ObjectId(); // Placeholder

    const { id } = await params;
    const memory = await Memory.findById(id);
    if (!memory) {
      return errorResponse('Memory not found', 404);
    }

    // Remove user's reaction
    memory.reactions = memory.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    await memory.save();

    console.log('✅ Reaction removed from memory:', memory._id);

    return successResponse(memory.reactions, 'Reaction removed successfully');
  });
}
