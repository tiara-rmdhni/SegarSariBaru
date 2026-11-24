import crypto from 'node:crypto';
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  categories,
  orderItems,
  orders,
  products,
  storeSettings,
} from './schema.ts';

export const ORDER_STATUSES = [
  'Menunggu konfirmasi',
  'Diproses',
  'Siap diambil atau dikirim',
  'Selesai',
  'Dibatalkan',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getCategories() {
  try {
    return await db
      .select()
      .from(categories)
      .orderBy(categories.sortOrder, categories.id);
  } catch (error) {
    console.error('Database query getCategories failed:', error);
    throw new Error('Gagal memuat kategori menu.', { cause: error });
  }
}

export async function getPublicProducts(filters?: {
  categorySlug?: string;
  search?: string;
  featuredOnly?: boolean;
}) {
  try {
    const conditions = [eq(products.isAvailable, true)];

    if (filters?.categorySlug && filters.categorySlug !== 'semua') {
      const cat = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, filters.categorySlug))
        .limit(1);
      if (cat.length === 0) return [];
      conditions.push(eq(products.categoryId, cat[0].id));
    }

    if (filters?.featuredOnly) {
      conditions.push(eq(products.isFeatured, true));
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = `%${filters.search.trim()}%`;
      const searchCond = or(
        ilike(products.name, q),
        ilike(products.description, q)
      );
      if (searchCond) conditions.push(searchCond);
    }

    const rows = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        stock: products.stock,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        isAvailable: products.isAvailable,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(categories.sortOrder, products.id);

    return rows;
  } catch (error) {
    console.error('Database query getPublicProducts failed:', error);
    throw new Error('Gagal memuat daftar produk.', { cause: error });
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const rows = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        stock: products.stock,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        isAvailable: products.isAvailable,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query getProductBySlug failed:', error);
    throw new Error('Gagal memuat detail produk.', { cause: error });
  }
}

export async function getStoreSettings() {
  try {
    const rows = await db.select().from(storeSettings).limit(1);
    if (rows.length > 0) return rows[0];

    const inserted = await db
      .insert(storeSettings)
      .values({
        storeName: 'Segar Sari',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query getStoreSettings failed:', error);
    throw new Error('Gagal memuat pengaturan toko.', { cause: error });
  }
}

function formatRupiahServer(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function buildWhatsappUrl(
  storeWhatsapp: string,
  order: {
    orderNumber: string;
    customerName: string;
    customerWhatsapp: string;
    fulfillmentMethod: string;
    customerAddress: string;
    notes: string;
    totalAmount: number;
  },
  items: Array<{ productName: string; quantity: number; lineTotal: number }>
): string {
  const digits = storeWhatsapp.replace(/\D/g, '') || '6281234567890';
  const normalizedPhone = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits;

  const itemLines = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.productName} x${item.quantity} (${formatRupiahServer(item.lineTotal)})`
    )
    .join('\n');

  const lines = [
    `Halo Segar Sari, saya ingin mengonfirmasi pesanan:`,
    `No. Pesanan: ${order.orderNumber}`,
    `Nama: ${order.customerName}`,
    `WhatsApp: ${order.customerWhatsapp}`,
    `Metode: ${order.fulfillmentMethod === 'delivery' ? 'Antar Kurir' : 'Ambil di Toko'}`,
    ...(order.fulfillmentMethod === 'delivery' && order.customerAddress
      ? [`Alamat: ${order.customerAddress}`]
      : []),
    ``,
    `Rincian Menu:`,
    itemLines,
    ``,
    `Total: ${formatRupiahServer(order.totalAmount)}`,
    ...(order.notes ? [`Catatan: ${order.notes}`] : []),
    ``,
    `Mohon konfirmasi ketersediaan dan instruksi pembayarannya. Terima kasih.`,
  ];

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export async function createOrderTransaction(input: {
  idempotencyKey: string;
  customerName: string;
  customerWhatsapp: string;
  customerAddress: string;
  fulfillmentMethod: 'pickup' | 'delivery';
  notes: string;
  items: Array<{ productId: number; quantity: number }>;
}) {
  try {
    const result = await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, input.idempotencyKey))
        .limit(1);

      const settingsRows = await tx.select().from(storeSettings).limit(1);
      const storeWhatsapp =
        settingsRows[0]?.whatsappNumber || '6281234567890';

      if (existing.length > 0) {
        const existingOrder = existing[0];
        const existingItems = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, existingOrder.id));

        return {
          order: existingOrder,
          items: existingItems,
          whatsappUrl: buildWhatsappUrl(
            storeWhatsapp,
            existingOrder,
            existingItems
          ),
          isDuplicate: true,
        };
      }

      const qtyByProduct = new Map<number, number>();
      for (const item of input.items) {
        qtyByProduct.set(
          item.productId,
          (qtyByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const productIds = Array.from(qtyByProduct.keys());
      const dbProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));
      const lineItemsToInsert: Array<{
        productId: number;
        productName: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }> = [];

      let subtotal = 0;

      for (const [productId, quantity] of qtyByProduct.entries()) {
        const product = productMap.get(productId);
        if (!product) {
          throw new AppError(
            'Salah satu produk pada keranjang tidak ditemukan.',
            404
          );
        }
        if (!product.isAvailable) {
          throw new AppError(
            `Maaf, ${product.name} sedang tidak tersedia saat ini.`,
            409
          );
        }

        const updatedStock = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(products.id, product.id), gte(products.stock, quantity))
          )
          .returning({ id: products.id, stock: products.stock });

        if (updatedStock.length === 0) {
          throw new AppError(
            `Stok ${product.name} tidak mencukupi (tersisa ${product.stock}).`,
            409
          );
        }

        const lineTotal = product.price * quantity;
        subtotal += lineTotal;
        lineItemsToInsert.push({
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity,
          lineTotal,
        });
      }

      const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const orderNumber = `SS-${dateTag}-${suffix}`;

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          idempotencyKey: input.idempotencyKey,
          customerName: input.customerName,
          customerWhatsapp: input.customerWhatsapp,
          customerAddress: input.customerAddress,
          fulfillmentMethod: input.fulfillmentMethod,
          notes: input.notes,
          subtotal,
          totalAmount: subtotal,
          status: 'Menunggu konfirmasi',
        })
        .returning();

      const insertedItems = await tx
        .insert(orderItems)
        .values(
          lineItemsToInsert.map((item) => ({
            orderId: createdOrder.id,
            ...item,
          }))
        )
        .returning();

      return {
        order: createdOrder,
        items: insertedItems,
        whatsappUrl: buildWhatsappUrl(
          storeWhatsapp,
          createdOrder,
          insertedItems
        ),
        isDuplicate: false,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('createOrderTransaction failed:', error);
    throw new Error('Gagal memproses pesanan. Silakan coba lagi.', {
      cause: error,
    });
  }
}

export async function logAuditEvent(entry: {
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUid: entry.actorUid,
      actorEmail: entry.actorEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: JSON.stringify(entry.metadata ?? {}),
      ipAddress: entry.ipAddress ?? '',
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getAdminOverview() {
  try {
    const [allProducts, allOrders, recentOrders] = await Promise.all([
      db.select({ id: products.id, isAvailable: products.isAvailable }).from(products),
      db
        .select({
          id: orders.id,
          status: orders.status,
          totalAmount: orders.totalAmount,
        })
        .from(orders),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    ]);

    const totalProducts = allProducts.length;
    const totalOrders = allOrders.length;
    const newOrders = allOrders.filter(
      (o) => o.status === 'Menunggu konfirmasi'
    ).length;
    const completedOrders = allOrders.filter(
      (o) => o.status === 'Selesai'
    ).length;
    const totalRevenue = allOrders
      .filter((o) => o.status === 'Selesai')
      .reduce((acc, o) => acc + o.totalAmount, 0);
    const activeRevenue = allOrders
      .filter((o) => o.status !== 'Dibatalkan')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    return {
      totalProducts,
      totalOrders,
      newOrders,
      completedOrders,
      totalRevenue,
      activeRevenue,
      recentOrders,
    };
  } catch (error) {
    console.error('getAdminOverview failed:', error);
    throw new Error('Gagal memuat ringkasan dashboard.', { cause: error });
  }
}

export async function adminListProducts() {
  try {
    return await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        stock: products.stock,
        imageUrl: products.imageUrl,
        isFeatured: products.isFeatured,
        isAvailable: products.isAvailable,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(categories.sortOrder, products.id);
  } catch (error) {
    console.error('adminListProducts failed:', error);
    throw new Error('Gagal memuat data produk admin.', { cause: error });
  }
}

export async function adminCreateProduct(data: {
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  isFeatured: boolean;
  isAvailable: boolean;
}) {
  try {
    const existingSlug = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, data.slug))
      .limit(1);

    if (existingSlug.length > 0) {
      throw new AppError(
        'Slug produk sudah digunakan. Gunakan nama atau slug lain.',
        409
      );
    }

    const [created] = await db.insert(products).values(data).returning();
    return created;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('adminCreateProduct failed:', error);
    throw new Error('Gagal menambahkan produk baru.', { cause: error });
  }
}

export async function adminUpdateProduct(
  id: number,
  data: Partial<{
    categoryId: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    imageUrl: string;
    isFeatured: boolean;
    isAvailable: boolean;
  }>
) {
  try {
    if (data.slug) {
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, data.slug))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        throw new AppError('Slug produk sudah digunakan produk lain.', 409);
      }
    }

    const [updated] = await db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      throw new AppError('Produk tidak ditemukan.', 404);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('adminUpdateProduct failed:', error);
    throw new Error('Gagal memperbarui produk.', { cause: error });
  }
}

export async function adminDeleteProduct(id: number) {
  try {
    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    if (!deleted) {
      throw new AppError('Produk tidak ditemukan.', 404);
    }
    return deleted;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('adminDeleteProduct failed:', error);
    throw new Error('Gagal menghapus produk.', { cause: error });
  }
}

export async function adminListOrders(filters?: {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const conditions = [];

    if (filters?.status && filters.status !== 'semua') {
      conditions.push(eq(orders.status, filters.status));
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      const cond = or(
        ilike(orders.orderNumber, q),
        ilike(orders.customerName, q),
        ilike(orders.customerWhatsapp, q)
      );
      if (cond) conditions.push(cond);
    }

    if (filters?.dateFrom) {
      const fromDate = new Date(`${filters.dateFrom}T00:00:00.000Z`);
      if (!Number.isNaN(fromDate.getTime())) {
        conditions.push(gte(orders.createdAt, fromDate));
      }
    }

    if (filters?.dateTo) {
      const toDate = new Date(`${filters.dateTo}T23:59:59.999Z`);
      if (!Number.isNaN(toDate.getTime())) {
        conditions.push(lte(orders.createdAt, toDate));
      }
    }

    const orderRows =
      conditions.length > 0
        ? await db
            .select()
            .from(orders)
            .where(and(...conditions))
            .orderBy(desc(orders.createdAt))
        : await db.select().from(orders).orderBy(desc(orders.createdAt));

    if (orderRows.length === 0) return [];

    const itemRows = await db
      .select()
      .from(orderItems)
      .where(
        inArray(
          orderItems.orderId,
          orderRows.map((o) => o.id)
        )
      );

    const itemsByOrder = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const arr = itemsByOrder.get(item.orderId) ?? [];
      arr.push(item);
      itemsByOrder.set(item.orderId, arr);
    }

    return orderRows.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) ?? [],
    }));
  } catch (error) {
    console.error('adminListOrders failed:', error);
    throw new Error('Gagal memuat daftar pesanan.', { cause: error });
  }
}

export async function adminUpdateOrderStatus(
  orderId: number,
  nextStatus: OrderStatus
) {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (existing.length === 0) {
        throw new AppError('Pesanan tidak ditemukan.', 404);
      }

      const prevStatus = existing[0].status;
      if (prevStatus === nextStatus) {
        return existing[0];
      }

      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (prevStatus !== 'Dibatalkan' && nextStatus === 'Dibatalkan') {
        for (const item of items) {
          if (item.productId) {
            await tx
              .update(products)
              .set({
                stock: sql`${products.stock} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(products.id, item.productId));
          }
        }
      } else if (prevStatus === 'Dibatalkan' && nextStatus !== 'Dibatalkan') {
        for (const item of items) {
          if (item.productId) {
            const dec = await tx
              .update(products)
              .set({
                stock: sql`${products.stock} - ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  gte(products.stock, item.quantity)
                )
              )
              .returning({ id: products.id });
            if (dec.length === 0) {
              throw new AppError(
                `Stok ${item.productName} tidak mencukupi untuk mengaktifkan kembali pesanan.`,
                409
              );
            }
          }
        }
      }

      const [updated] = await tx
        .update(orders)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('adminUpdateOrderStatus failed:', error);
    throw new Error('Gagal memperbarui status pesanan.', { cause: error });
  }
}

export async function adminUpdateStoreSettings(data: {
  storeName: string;
  description: string;
  whatsappNumber: string;
  address: string;
  openingHours: string;
  email: string;
  instagramHandle: string;
  logoUrl: string;
  bannerUrl: string;
}) {
  try {
    const existing = await db.select().from(storeSettings).limit(1);
    if (existing.length === 0) {
      const [inserted] = await db
        .insert(storeSettings)
        .values({ ...data })
        .returning();
      return inserted;
    }

    const [updated] = await db
      .update(storeSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, existing[0].id))
      .returning();

    return updated;
  } catch (error) {
    console.error('adminUpdateStoreSettings failed:', error);
    throw new Error('Gagal menyimpan pengaturan toko.', { cause: error });
  }
}

export async function adminListAuditLogs(limit = 40) {
  try {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('adminListAuditLogs failed:', error);
    throw new Error('Gagal memuat log aktivitas.', { cause: error });
  }
}
