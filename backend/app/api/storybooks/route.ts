import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Storybook } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  getPaginationParams,
} from '@/lib/utils/api-helpers';

/**
 * GET /api/storybooks
 * List all storybooks for a family/child with filters
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    const { searchParams } = new URL(request.url);

    const familyId = searchParams.get('familyId');
    const childId = searchParams.get('childId');
    const status = searchParams.get('status');

    const { page, limit, skip } = getPaginationParams(request);

    // Build query
    const query: any = {};
    if (familyId) query.familyId = new Types.ObjectId(familyId);
    if (childId) query.childId = new Types.ObjectId(childId);
    if (status) query.status = status;

    // Get storybooks
    const [storybooks, total] = await Promise.all([
      Storybook.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('childId', 'name photoUrl')
        .populate('createdBy', 'name avatar')
        .select('-pages') // Exclude pages for list view
        .lean(),
      Storybook.countDocuments(query),
    ]);

    return successResponse({
      storybooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}
