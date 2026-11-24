import crypto from 'node:crypto';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
export const PRODUCT_UPLOAD_DIR = path.resolve(UPLOAD_ROOT, 'products');

export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error:
          'Terlalu banyak permintaan dari perangkat Anda. Silakan coba lagi beberapa saat.',
      });
    }

    bucket.count += 1;

    if (buckets.size > 2000) {
      for (const [k, b] of buckets.entries()) {
        if (now > b.resetAt) buckets.delete(k);
      }
    }

    next();
  };
}

export type VerifiedImageType = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: '.jpg' | '.png' | '.webp';
};

export function detectImageSignature(buffer: Buffer): VerifiedImageType | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: '.png' };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: '.webp' };
  }

  return null;
}

export function generateSafeUploadFilename(ext: '.jpg' | '.png' | '.webp') {
  return `${crypto.randomUUID()}${ext}`;
}

export function resolveUploadPath(filename: string): string | null {
  const safeBase = path.basename(filename);
  const resolved = path.resolve(PRODUCT_UPLOAD_DIR, safeBase);
  if (!resolved.startsWith(PRODUCT_UPLOAD_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

export function sanitizePublicImageUrl(url: string): string {
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/uploads/products/')
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return '/images/hero-jus.jpg';
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || 'unknown').slice(0, 64);
}
