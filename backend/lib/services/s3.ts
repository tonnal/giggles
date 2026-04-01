import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_BUCKET = process.env.AWS_S3_BUCKET || 'giggles-media';

// Initialize S3 Client
let s3Client: S3Client | null = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log(`✅ S3 configured for bucket: ${AWS_BUCKET} in region: ${AWS_REGION}`);
} else {
  console.warn('⚠️  AWS credentials not configured. S3 uploads will use placeholder URLs.');
}

/**
 * Generate a presigned URL for uploading files to S3
 * This allows the client to upload directly to S3 without going through the server
 */
export async function getUploadPresignedUrl(params: {
  fileName: string;
  fileType: string;
  folder?: string;
}): Promise<{ uploadUrl: string; fileUrl: string }> {
  try {
    const { fileName, fileType, folder = 'uploads' } = params;

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const key = `${folder}/${timestamp}-${randomString}-${fileName}`;

    if (!s3Client) {
      // Return placeholder URL if S3 not configured
      console.warn('⚠️  S3 not configured, returning placeholder URL');
      const placeholderUrl = `https://placeholder.s3.amazonaws.com/${key}`;
      return {
        uploadUrl: placeholderUrl,
        fileUrl: placeholderUrl,
      };
    }

    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    // Generate presigned URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Construct the public URL for the file
    const fileUrl = `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    console.log('✅ Presigned upload URL generated:', key);

    return {
      uploadUrl,
      fileUrl,
    };
  } catch (error: any) {
    console.error('❌ Error generating presigned URL:', error.message);
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Generate a presigned URL for downloading/viewing files from S3
 */
export async function getDownloadPresignedUrl(params: {
  fileKey: string;
}): Promise<string> {
  try {
    const { fileKey } = params;

    if (!s3Client) {
      console.warn('⚠️  S3 not configured, returning placeholder URL');
      return `https://placeholder.s3.amazonaws.com/${fileKey}`;
    }

    const command = new GetObjectCommand({
      Bucket: AWS_BUCKET,
      Key: fileKey,
    });

    // Generate presigned URL valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    console.log('✅ Presigned download URL generated:', fileKey);

    return url;
  } catch (error: any) {
    console.error('❌ Error generating download URL:', error.message);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Upload a buffer/file directly to S3 (for server-side uploads like AI-generated images)
 */
export async function uploadToS3(params: {
  buffer: Buffer | Uint8Array;
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<string> {
  try {
    const { buffer, fileName, contentType, folder = 'generated' } = params;

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const key = `${folder}/${timestamp}-${randomString}-${fileName}`;

    if (!s3Client) {
      console.warn('⚠️  S3 not configured, returning placeholder URL');
      return `https://placeholder.s3.amazonaws.com/${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const fileUrl = `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    console.log('✅ File uploaded to S3:', key);

    return fileUrl;
  } catch (error: any) {
    console.error('❌ Error uploading to S3:', error.message);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(fileKey: string): Promise<void> {
  try {
    if (!s3Client) {
      console.warn('⚠️  S3 not configured, skipping deletion');
      return;
    }

    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    const command = new DeleteObjectCommand({
      Bucket: AWS_BUCKET,
      Key: fileKey,
    });

    await s3Client.send(command);

    console.log('✅ File deleted from S3:', fileKey);
  } catch (error: any) {
    console.error('❌ Error deleting from S3:', error.message);
    throw new Error('Failed to delete file from S3');
  }
}

export default s3Client;
