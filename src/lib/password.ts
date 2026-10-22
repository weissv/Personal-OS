import crypto from 'crypto';

/**
 * Хэш пароля: scrypt + индивидуальная соль. Формат: `${salt}:${hash}`.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !password) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts;
  try {
    const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(actualHash, 'hex'));
  } catch {
    return false;
  }
}

// Для несуществующего пользователя выполняем такую же работу, чтобы время ответа
// не выдавало, существует ли логин.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));
export function burnPasswordCheck(password: string) {
  verifyPassword(password, DUMMY_HASH);
}
