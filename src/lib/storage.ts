import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT || 'https://example.com', // prevent crashing if missing
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: R2_SECRET_ACCESS_KEY || 'dummy',
  },
  forcePathStyle: true,
});

export const checkR2Health = async () => {
  if (!R2_BUCKET_NAME || !R2_ENDPOINT || !R2_ACCESS_KEY_ID) {
    return false; // Not configured yet
  }
  try {
    const command = new HeadBucketCommand({ Bucket: R2_BUCKET_NAME });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    // Only log the message to avoid cluttering the terminal or crashing Next.js dev overlay
    console.error("R2 Health Check Failed:", error.name || error.message || "Unknown error");
    return false;
  }
};

export const generatePresignedUploadUrl = async (key: string, contentType: string, expiresIn = 3600) => {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
};

export const getPublicUrl = (key: string) => {
  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
};
