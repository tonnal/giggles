import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import {
  triggerWeeklyHighlightNow,
  triggerMonthlyRecapNow,
} from '@/lib/cron/auto-highlights';

/**
 * POST /api/highlights/generate
 * Manually trigger highlight/recap generation (for testing or user request)
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    const body = await request.json();

    const validation = validateRequired(body, ['type', 'childId', 'familyId']);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { type, childId, familyId, month, year } = body;

    if (!['weekly', 'monthly'].includes(type)) {
      return errorResponse('type must be "weekly" or "monthly"');
    }

    console.log(`🎬 Manual highlight generation requested: ${type}`, {
      childId,
      familyId,
    });

    try {
      let highlightId: Types.ObjectId;

      if (type === 'weekly') {
        highlightId = await triggerWeeklyHighlightNow(childId, familyId);
      } else {
        highlightId = await triggerMonthlyRecapNow(childId, familyId, month, year);
      }

      console.log(`✅ ${type} highlight generated:`, highlightId);

      return successResponse(
        { highlightId: highlightId.toString() },
        `${type === 'weekly' ? 'Weekly highlight' : 'Monthly recap'} generated successfully`
      );
    } catch (error: any) {
      console.error(`❌ ${type} highlight generation failed:`, error);

      return errorResponse(
        `Highlight generation failed: ${error.message}`,
        500
      );
    }
  });
}
