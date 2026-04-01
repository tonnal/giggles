import { NextRequest } from 'next/server';
import { Family } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';

/**
 * GET /api/families/[id]
 * Get family details with members and children
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const { id } = await params;
    const family = await Family.findById(id)
      .populate('members.userId', 'name email avatar')
      .populate('childrenIds')
      .lean();

    if (!family) {
      return errorResponse('Family not found', 404);
    }

    return successResponse(family);
  });
}

/**
 * PATCH /api/families/[id]
 * Update family details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body = await request.json();
    const { name } = body;

    const { id } = await params;
    const family = await Family.findById(id);
    if (!family) {
      return errorResponse('Family not found', 404);
    }

    if (name) family.name = name;

    await family.save();

    console.log('✅ Family updated:', family._id);

    return successResponse(family, 'Family updated successfully');
  });
}
