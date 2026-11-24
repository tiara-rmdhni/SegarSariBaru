import fs from 'node:fs';
import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { isDatabaseConfigured } from '../db/index.ts';
import {
  ORDER_STATUSES,
  AppError,
  adminCreateProduct,
  adminDeleteProduct,
  adminListAuditLogs,
  adminListOrders,
  adminListProducts,
  adminUpdateOrderStatus,
  adminUpdateProduct,
  adminUpdateStoreSettings,
  createOrderTransaction,
  getAdminOverview,
  getCategories,
  getProductBySlug,
  getPublicProducts,
  getStoreSettings,
  logAuditEvent,
} from '../db/queries.ts';
import {
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from '../middleware/auth.ts';
import {
  analyzeAdminProductPhoto,
  analyzeCustomerFruitPhoto,
} from './gemini.ts';
import {
  PRODUCT_UPLOAD_DIR,
  createRateLimiter,
  detectImageSignature,
  generateSafeUploadFilename,
  getClientIp,
  resolveUploadPath,
  sanitizePublicImageUrl,
  securityHeadersMiddleware,
} from './security.ts';

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

const orderCreateSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  customerName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  customerWhatsapp: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, 'Format nomor WhatsApp tidak valid'),
  fulfillmentMethod: z.enum(['pickup', 'delivery']),
  customerAddress: z.string().trim().max(400).optional().default(''),
  notes: z.string().trim().max(400).optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1, 'Keranjang tidak boleh kosong')
    .max(30),
});

const productUpsertSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  description: z.string().trim().min(5).max(800),
  price: z.number().int().min(1000).max(5000000),
  stock: z.number().int().min(0).max(10000),
  imageUrl: z.string().trim().min(1).max(500),
  isFeatured: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(800),
  whatsappNumber: z
    .string()
    .trim()
    .regex(
      /^[0-9]{8,16}$/,
      'Nomor WhatsApp harus angka format internasional (misal 6281234567890)'
    ),
  address: z.string().trim().min(5).max(300),
  openingHours: z.string().trim().min(3).max(150),
  email: z.string().trim().email().max(150),
  instagramHandle: z.string().trim().min(2).max(80),
  logoUrl: z.string().trim().min(1).max(500),
  bannerUrl: z.string().trim().min(1).max(500),
});

export function createApiApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '1mb' }));

  const checkoutLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 12,
    keyPrefix: 'checkout',
  });

  const aiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 15,
    keyPrefix: 'gemini-vision',
  });

  const adminLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 90,
    keyPrefix: 'admin-api',
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, dbConfigured: isDatabaseConfigured() });
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const list = await getCategories();
      res.json({ categories: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat kategori.' });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const search =
        typeof req.query.search === 'string' ? req.query.search : undefined;
      const featuredOnly = req.query.featured === 'true';

      const items = await getPublicProducts({
        categorySlug: category,
        search,
        featuredOnly,
      });
      res.json({ products: items });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat produk.' });
    }
  });

  app.get('/api/products/:slug', async (req, res) => {
    try {
      const slug = req.params.slug?.trim();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: 'Slug produk tidak valid.' });
      }
      const product = await getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ error: 'Produk tidak ditemukan.' });
      }
      res.json({ product });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat produk.' });
    }
  });

  app.get('/api/store-settings', async (_req, res) => {
    try {
      const settings = await getStoreSettings();
      res.json({
        settings: {
          storeName: settings.storeName,
          description: settings.description,
          whatsappNumber: settings.whatsappNumber,
          address: settings.address,
          openingHours: settings.openingHours,
          email: settings.email,
          instagramHandle: settings.instagramHandle,
          logoUrl: sanitizePublicImageUrl(settings.logoUrl),
          bannerUrl: sanitizePublicImageUrl(settings.bannerUrl),
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Gagal memuat informasi toko.' });
    }
  });

  app.post('/api/orders', checkoutLimiter, async (req, res) => {
    try {
      const parsed = orderCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstErr =
          parsed.error.issues[0]?.message || 'Data pesanan tidak valid.';
        return res.status(400).json({ error: firstErr });
      }

      if (
        parsed.data.fulfillmentMethod === 'delivery' &&
        parsed.data.customerAddress.trim().length < 8
      ) {
        return res.status(400).json({
          error:
            'Alamat pengiriman lengkap wajib diisi untuk pengantaran kurir.',
        });
      }

      const result = await createOrderTransaction({
        idempotencyKey: parsed.data.idempotencyKey,
        customerName: parsed.data.customerName,
        customerWhatsapp: parsed.data.customerWhatsapp,
        customerAddress: parsed.data.customerAddress,
        fulfillmentMethod: parsed.data.fulfillmentMethod,
        notes: parsed.data.notes,
        items: parsed.data.items,
      });

      res.status(result.isDuplicate ? 200 : 201).json({
        order: result.order,
        items: result.items,
        whatsappUrl: result.whatsappUrl,
        isDuplicate: result.isDuplicate,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'Gagal memproses pesanan.' });
    }
  });

  app.post(
    '/api/analyze-image',
    aiLimiter,
    uploadMemory.single('image'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file || !req.file.buffer) {
          return res.status(400).json({ error: 'File gambar wajib diunggah.' });
        }

        const verified = detectImageSignature(req.file.buffer);
        if (!verified) {
          return res.status(400).json({
            error:
              'Format file tidak valid. Hanya gambar JPEG, PNG, atau WebP asli yang diterima.',
          });
        }

        const menuItems = await getPublicProducts();
        const analysis = await analyzeCustomerFruitPhoto({
          imageBuffer: req.file.buffer,
          mimeType: verified.mime,
          menuItems: menuItems.map((m) => ({
            slug: m.slug,
            name: m.name,
            categoryName: m.categoryName,
            description: m.description,
          })),
        });

        const recommendedProducts = menuItems.filter((m) =>
          analysis.recommendedSlugs.includes(m.slug)
        );

        res.json({
          analysis,
          recommendedProducts,
        });
      } catch (error: any) {
        console.error('Customer image analysis error:', error);
        res.status(502).json({
          error:
            error.message ||
            'Analisis foto sedang tidak tersedia. Pastikan GEMINI_API_KEY sudah dikonfigurasi.',
        });
      }
    }
  );

  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    const authUser = req.authUser!;
    if (authUser.role === 'admin') {
      await logAuditEvent({
        actorUid: authUser.uid,
        actorEmail: authUser.email,
        action: 'ADMIN_SESSION_VERIFIED',
        targetType: 'auth',
        targetId: authUser.uid,
        ipAddress: getClientIp(req),
      });
    }
    res.json({
      user: {
        uid: authUser.uid,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        isAdmin: authUser.role === 'admin',
      },
    });
  });

  app.use('/api/admin', adminLimiter, requireAuth, requireAdmin);

  app.get('/api/admin/overview', async (_req, res) => {
    try {
      const overview = await getAdminOverview();
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat ringkasan.' });
    }
  });

  app.get('/api/admin/products', async (_req, res) => {
    try {
      const items = await adminListProducts();
      res.json({ products: items });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat produk.' });
    }
  });

  app.post('/api/admin/products', async (req: AuthRequest, res) => {
    try {
      const parsed = productUpsertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Input produk tidak valid.',
        });
      }

      const created = await adminCreateProduct({
        ...parsed.data,
        imageUrl: sanitizePublicImageUrl(parsed.data.imageUrl),
      });

      await logAuditEvent({
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email,
        action: 'CREATE_PRODUCT',
        targetType: 'product',
        targetId: String(created.id),
        metadata: { name: created.name, price: created.price },
        ipAddress: getClientIp(req),
      });

      res.status(201).json({ product: created });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'Gagal menambah produk.' });
    }
  });

  app.put('/api/admin/products/:id', async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID produk tidak valid.' });
      }

      const parsed = productUpsertSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Input produk tidak valid.',
        });
      }

      const payload = {
        ...parsed.data,
        ...(parsed.data.imageUrl
          ? { imageUrl: sanitizePublicImageUrl(parsed.data.imageUrl) }
          : {}),
      };

      const updated = await adminUpdateProduct(id, payload);

      await logAuditEvent({
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email,
        action: 'UPDATE_PRODUCT',
        targetType: 'product',
        targetId: String(id),
        metadata: {
          name: updated.name,
          price: updated.price,
          stock: updated.stock,
        },
        ipAddress: getClientIp(req),
      });

      res.json({ product: updated });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: error.message || 'Gagal memperbarui produk.' });
    }
  });

  app.delete('/api/admin/products/:id', async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID produk tidak valid.' });
      }

      const deleted = await adminDeleteProduct(id);

      if (
        !process.env.VERCEL &&
        deleted.imageUrl.startsWith('/uploads/products/')
      ) {
        const filename = deleted.imageUrl.replace('/uploads/products/', '');
        const resolved = resolveUploadPath(filename);
        if (resolved && fs.existsSync(resolved)) {
          fs.unlinkSync(resolved);
        }
      }

      await logAuditEvent({
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email,
        action: 'DELETE_PRODUCT',
        targetType: 'product',
        targetId: String(id),
        metadata: { name: deleted.name },
        ipAddress: getClientIp(req),
      });

      res.json({ deletedId: id });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'Gagal menghapus produk.' });
    }
  });

  app.post(
    '/api/admin/upload',
    uploadMemory.single('image'),
    async (req: AuthRequest, res: Response) => {
      try {
        if (process.env.VERCEL === '1') {
          return res.status(400).json({
            error:
              'Lingkungan Vercel bersifat serverless (read-only). Pilih gambar bawaan galeri atau masukkan URL HTTPS gambar produk.',
          });
        }

        if (!req.file || !req.file.buffer) {
          return res.status(400).json({ error: 'File gambar wajib dipilih.' });
        }

        const verified = detectImageSignature(req.file.buffer);
        if (!verified) {
          return res.status(400).json({
            error:
              'File ditolak. Hanya gambar JPEG, PNG, atau WebP terverifikasi yang diizinkan.',
          });
        }

        fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
        const filename = generateSafeUploadFilename(verified.ext);
        const targetPath = resolveUploadPath(filename);
        if (!targetPath) {
          return res.status(400).json({ error: 'Path penyimpanan tidak valid.' });
        }

        fs.writeFileSync(targetPath, req.file.buffer);
        const publicUrl = `/uploads/products/${filename}`;

        await logAuditEvent({
          actorUid: req.authUser!.uid,
          actorEmail: req.authUser!.email,
          action: 'UPLOAD_IMAGE',
          targetType: 'media',
          targetId: filename,
          metadata: { mime: verified.mime, size: req.file.buffer.length },
          ipAddress: getClientIp(req),
        });

        res.status(201).json({ imageUrl: publicUrl });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Gagal mengunggah gambar.' });
      }
    }
  );

  app.post(
    '/api/admin/analyze-product-photo',
    aiLimiter,
    uploadMemory.single('image'),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.file || !req.file.buffer) {
          return res.status(400).json({ error: 'File gambar wajib diunggah.' });
        }
        const verified = detectImageSignature(req.file.buffer);
        if (!verified) {
          return res.status(400).json({
            error: 'Format gambar tidak valid (harus JPEG, PNG, atau WebP).',
          });
        }

        const draft = await analyzeAdminProductPhoto({
          imageBuffer: req.file.buffer,
          mimeType: verified.mime,
        });

        res.json({ draft });
      } catch (error: any) {
        console.error('Admin product photo analysis error:', error);
        res.status(502).json({
          error:
            error.message || 'Gagal menganalisis foto produk dengan Gemini.',
        });
      }
    }
  );

  app.get('/api/admin/orders', async (req, res) => {
    try {
      const search =
        typeof req.query.search === 'string' ? req.query.search : undefined;
      const status =
        typeof req.query.status === 'string' ? req.query.status : undefined;
      const dateFrom =
        typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
      const dateTo =
        typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

      const list = await adminListOrders({ search, status, dateFrom, dateTo });
      res.json({ orders: list });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat pesanan.' });
    }
  });

  app.patch('/api/admin/orders/:id/status', async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'ID pesanan tidak valid.' });
      }

      const parsed = orderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Status pesanan tidak valid.' });
      }

      const updated = await adminUpdateOrderStatus(id, parsed.data.status);

      await logAuditEvent({
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email,
        action: 'UPDATE_ORDER_STATUS',
        targetType: 'order',
        targetId: updated.orderNumber,
        metadata: { status: parsed.data.status },
        ipAddress: getClientIp(req),
      });

      res.json({ order: updated });
    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res
        .status(500)
        .json({ error: error.message || 'Gagal mengubah status pesanan.' });
    }
  });

  app.put('/api/admin/store-settings', async (req: AuthRequest, res) => {
    try {
      const parsed = storeSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error:
            parsed.error.issues[0]?.message || 'Pengaturan toko tidak valid.',
        });
      }

      const updated = await adminUpdateStoreSettings({
        ...parsed.data,
        logoUrl: sanitizePublicImageUrl(parsed.data.logoUrl),
        bannerUrl: sanitizePublicImageUrl(parsed.data.bannerUrl),
      });

      await logAuditEvent({
        actorUid: req.authUser!.uid,
        actorEmail: req.authUser!.email,
        action: 'UPDATE_STORE_SETTINGS',
        targetType: 'store_settings',
        targetId: String(updated.id),
        metadata: { storeName: updated.storeName },
        ipAddress: getClientIp(req),
      });

      res.json({ settings: updated });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Gagal menyimpan pengaturan toko.' });
    }
  });

  app.get('/api/admin/audit-logs', async (_req, res) => {
    try {
      const logs = await adminListAuditLogs(50);
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memuat audit log.' });
    }
  });

  app.use((err: any, _req: Request, res: Response, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: 'Ukuran gambar melebihi batas maksimal 3 MB.' });
      }
      return res.status(400).json({ error: 'Gagal memproses file unggahan.' });
    }
    next(err);
  });

  return app;
}
