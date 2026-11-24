import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../src/server/app.ts';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url || '/api';
  const parsed = new URL(rawUrl, 'http://localhost');

  if (parsed.searchParams.has('__path')) {
    const subPath = (parsed.searchParams.get('__path') || '').replace(/^\/+/, '');
    parsed.searchParams.delete('__path');
    const qs = parsed.searchParams.toString();
    req.url = `/api${subPath ? `/${subPath}` : ''}${qs ? `?${qs}` : ''}`;
  } else if (!parsed.pathname.startsWith('/api')) {
    req.url = `/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  return app(req as any, res as any);
}
