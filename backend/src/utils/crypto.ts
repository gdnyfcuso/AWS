// 加密工具

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * 生成 API Key
 */
export function generateApiKey(): string {
  const bytes = randomBytes(32);
  return `aw_${bytes.toString('base64url')}`;
}

/**
 * 生成签名
 */
export function generateSignature(payload: unknown, secret: string): string {
  const str = JSON.stringify(payload);
  return createHash('sha256')
    .update(str + secret)
    .digest('hex');
}

/**
 * 验证签名
 */
export function verifySignature(
  payload: unknown,
  signature: string,
  secret: string
): boolean {
  const expected = generateSignature(payload, secret);
  // 使用 timing-safe 比较
  if (signature.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * 生成 CUID 风格的 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('base64url');
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}
