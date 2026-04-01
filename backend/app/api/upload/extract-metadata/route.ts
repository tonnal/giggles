import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import { extractPhotoMetadata } from '@/lib/services/metadata-extractor';

/**
 * POST /api/upload/extract-metadata
 * Extract metadata from an uploaded photo
 * Fetches the image from URL and extracts EXIF data, GPS, camera info, etc.
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    const body = await request.json();

    const validation = validateRequired(body, ['imageUrl', 'fileName']);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { imageUrl, fileName } = body;

    console.log('📸 Extracting metadata from:', fileName);

    try {
      // Fetch the image from S3
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract comprehensive metadata
      const metadata = await extractPhotoMetadata(buffer, fileName);

      console.log('✅ Metadata extracted:', {
        hasLocation: !!metadata.location,
        hasCamera: !!metadata.camera,
        hasContext: !!metadata.detectedContext,
        dateTaken: metadata.dateTaken,
      });

      // Return metadata in the format expected by IPhotoMetadata
      return successResponse(
        {
          location: metadata.location,
          camera: metadata.camera,
          context: metadata.detectedContext,
          dateTaken: metadata.dateTaken, // Also return dateTaken for auto-dating
        },
        'Metadata extracted successfully'
      );
    } catch (error: any) {
      console.error('❌ Failed to extract metadata:', error);
      return errorResponse(
        `Failed to extract metadata: ${error.message}`,
        500
      );
    }
  });
}
