import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthUserContext {
  uid: string;
  email: string;
  name: string;
  role: string;
  dbUserId: number;
}

export interface AuthRequest extends Request {
  authUser?: AuthUserContext;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Token autentikasi tidak valid.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) {
      return res
        .status(401)
        .json({ error: 'Akun Google tidak memiliki alamat email terverifikasi.' });
    }

    const dbUser = await getOrCreateUser(
      decoded.uid,
      decoded.email,
      decoded.name || ''
    );

    req.authUser = {
      uid: decoded.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      dbUserId: dbUser.id,
    };

    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res
      .status(401)
      .json({ error: 'Sesi tidak valid atau telah berakhir. Silakan login ulang.' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Autentikasi diperlukan.' });
  }
  if (req.authUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Akses ditolak. Akun Anda tidak memiliki izin administrator.',
    });
  }
  next();
}
