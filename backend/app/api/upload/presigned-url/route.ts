import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import { getUploadPresignedUrl } from '@/lib/services/s3';

/**
 * POST /api/upload/presigned-url
 * Get a presigned URL for uploading files to S3
 * This allows mobile app to upload directly to S3 without going through the server
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    const body = await request.json();

    const validation = validateRequired(body, ['fileName', 'fileType']);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { fileName, fileType, folder } = body;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'video/mp4',
      'video/quicktime',
      'video/mov',
    ];

    if (!allowedTypes.includes(fileType)) {
      return errorResponse(
        `File type ${fileType} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    console.log('📤 Generating presigned upload URL for:', fileName);

    try {
      const { uploadUrl, fileUrl } = await getUploadPresignedUrl({
        fileName,
        fileType,
        folder: folder || 'memories',
      });

      console.log('✅ Presigned URL generated');

      return successResponse(
        {
          uploadUrl, // URL to PUT the file to
          fileUrl, // Final URL of the uploaded file (to save in memory)
        },
        'Presigned URL generated successfully'
      );
    } catch (error: any) {
      console.error('❌ Failed to generate presigned URL:', error);
      return errorResponse(
        `Failed to generate presigned URL: ${error.message}`,
        500
      );
    }
  });
}
