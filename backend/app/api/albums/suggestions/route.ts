import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Memory } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';
import { requireAuth, getCurrentUserId } from '@/lib/auth/session';
import { verifyFamilyAccess } from '@/lib/utils/auth-helpers';
import { suggestSmartAlbums } from '@/lib/services/metadata-extractor';

/**
 * GET /api/albums/suggestions?familyId=xxx&childId=xxx
 * Generate smart album suggestions based on photo metadata
 *
 * Returns suggestions for:
 * - Trip albums (photos from same location over multiple days)
 * - Event albums (many photos in short time span)
 * - Seasonal collections
 * - Selfie collections
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const childId = searchParams.get('childId');

    if (!familyId) {
      return errorResponse('familyId is required');
    }

    // Verify user has access to this family
    const { error } = await verifyFamilyAccess(familyId, userId);
    if (error) return error;

    console.log('🎯 Generating smart album suggestions for family:', familyId);

    // Build query
    const query: any = {
      familyId: new Types.ObjectId(familyId),
      mediaType: 'photo', // Only analyze photos for now
    };
    if (childId) {
      query.childId = new Types.ObjectId(childId);
    }

    // Fetch all photos with metadata
    const memories = await Memory.find(query)
      .select('_id metadata dateTaken date')
      .lean();

    console.log(`📸 Found ${memories.length} photos to analyze`);

    // Filter photos that have metadata
    const photosWithMetadata = memories
      .filter((m) => m.metadata)
      .map((m) => ({
        id: m._id.toString(),
        metadata: {
          ...m.metadata,
          dateTaken: m.metadata?.location ? m.date : undefined, // Use date field as fallback
        },
      }));

    console.log(`✅ ${photosWithMetadata.length} photos have metadata`);

    if (photosWithMetadata.length === 0) {
      return successResponse({
        suggestions: [],
        message: 'No photos with metadata found. Upload photos with GPS data to get smart suggestions!',
      });
    }

    // Generate smart album suggestions
    const suggestions = suggestSmartAlbums(photosWithMetadata as any);

    console.log(`🎨 Generated ${suggestions.length} album suggestions`);

    return successResponse({
      suggestions,
      totalPhotosAnalyzed: photosWithMetadata.length,
      message: suggestions.length > 0
        ? `Found ${suggestions.length} smart album suggestions!`
        : 'No album patterns detected yet. Keep uploading photos!',
    });
  });
}
