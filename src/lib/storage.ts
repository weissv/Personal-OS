import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { MEDIA_TYPES } from './validation';
import path from 'path';
import fs from 'fs';

const S3_BUCKET = process.env.S3_BUCKET || 'mezon-sprint-media';
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://r2.storage.school.mezon';
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'test-r2-access-key';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'test-r2-secret-key';

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/** Локальный ключ хранилища → путь URL для отдачи файла через RBAC-роут. */
export const LOCAL_MEDIA_PREFIX = '/api/v1/media/files/';

export async function generatePresignedUploadUrl(params: {
  weekId: string;
  fileType: string; // уже проверенный MIME из белого списка
  fileSize: number;
}) {
  // Расширение определяется только по проверенному MIME — не по имени файла от клиента
  const fileExt = MEDIA_TYPES[params.fileType] || '.bin';
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
    publicUrl = `${LOCAL_MEDIA_PREFIX}${uniqueKey}`;
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

/**
 * Безопасно превращает ключ хранилища (`weeks/<id>/<file>`) в абсолютный путь внутри UPLOAD_DIR.
 * null — если ключ пытается выйти за пределы каталога загрузок.
 */
export function resolveUploadPath(key: string): string | null {
  if (typeof key !== 'string' || !key || key.includes('\0')) return null;
  const root = path.resolve(UPLOAD_DIR);
  const target = path.resolve(root, key.replace(/^[/\\]+/, ''));
  if (target !== root && target.startsWith(root + path.sep)) return target;
  return null;
}

/** Ключ хранилища из сохранённого fileUrl (локальный режим), иначе null. */
export function storageKeyFromUrl(fileUrl: string): string | null {
  const idx = fileUrl.indexOf(LOCAL_MEDIA_PREFIX);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(fileUrl.slice(idx + LOCAL_MEDIA_PREFIX.length).split('?')[0]);
  } catch {
    return null;
  }
}
