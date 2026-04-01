import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { MonthlyRecap } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  getPaginationParams,
} from '@/lib/utils/api-helpers';

/**
 * GET /api/highlights/monthly
 * Get monthly recaps for a child
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    const { searchParams } = new URL(request.url);

    const childId = searchParams.get('childId');
    const familyId = searchParams.get('familyId');
    const year = searchParams.get('year');

    if (!childId) {
      return errorResponse('childId is required');
    }

    const { page, limit, skip } = getPaginationParams(request);

    // Build query
    const query: any = { childId: new Types.ObjectId(childId) };
    if (familyId) query.familyId = new Types.ObjectId(familyId);
    if (year) query.year = parseInt(year);

    // Get recaps
    const [recaps, total] = await Promise.all([
      MonthlyRecap.find(query)
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit)
        .populate('highlightMemoryIds')
        .populate('childId', 'name photoUrl')
        .lean(),
      MonthlyRecap.countDocuments(query),
    ]);

    return successResponse({
      recaps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}
