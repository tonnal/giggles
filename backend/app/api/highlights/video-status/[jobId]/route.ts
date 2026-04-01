import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';
import { getVideoReelJobStatus } from '@/lib/queue/video-queue';

/**
 * GET /api/highlights/video-status/:jobId
 * Get the status of a video reel generation job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withMiddleware(async () => {
    const { jobId } = await params;

    if (!jobId) {
      return errorResponse('jobId is required');
    }

    try {
      const status = await getVideoReelJobStatus(jobId);

      if (!status) {
        return errorResponse('Job not found', 404);
      }

      return successResponse({
        jobId: status.id,
        state: status.state,
        progress: status.progress,
        result: status.result,
      });
    } catch (error: any) {
      console.error('Error fetching job status:', error);
      return errorResponse(`Failed to fetch job status: ${error.message}`, 500);
    }
  });
}
