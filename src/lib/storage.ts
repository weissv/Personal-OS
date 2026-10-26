import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

const S3_BUCKET = process.env.S3_BUCKET || 'mezon-sprint-media';
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://r2.storage.school.mezon';
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'test-r2-access-key';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'test-r2-secret-key';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export async function generatePresignedUploadUrl(params: {
  weekId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  const fileExt = path.extname(params.fileName) || (params.fileType.includes('audio') ? '.webm' : '.webp');
  const uniqueKey = `weeks/${params.weekId}/${Date.now()}-${randomUUID()}${fileExt}`;

  // If real R2 credentials are provided:
  let uploadUrl: string;
  let publicUrl: string;

  if (process.env.USE_REAL_S3 === 'true') {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: uniqueKey,
      ContentType: params.fileType,
      ContentLength: params.fileSize,
    });
    uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    publicUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${uniqueKey}`;
  } else {
    // Local / development upload endpoint compatible with direct HTTP PUT
    ensureUploadDir();
    uploadUrl = `/api/v1/media/upload?key=${encodeURIComponent(uniqueKey)}`;
    publicUrl = `/api/v1/media/files/${uniqueKey}`;
  }

  return {
    uploadUrl,
    publicUrl,
    key: uniqueKey,
  };
}

export const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}
