import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/server/app.ts';
import { PRODUCT_UPLOAD_DIR } from './src/server/security.ts';

const PORT = 3000;

async function startServer() {
  const app = createApiApp();

  app.use(
    '/images',
    express.static(path.resolve(process.cwd(), 'public/images'), {
      maxAge: '1d',
      index: false,
    })
  );

  app.use(
    '/uploads/products',
    express.static(PRODUCT_UPLOAD_DIR, {
      maxAge: '1d',
      index: false,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Segar Sari server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Segar Sari server:', err);
  process.exit(1);
});
