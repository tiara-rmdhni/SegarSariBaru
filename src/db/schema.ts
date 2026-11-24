import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'restrict' })
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(50),
  imageUrl: text('image_url').notNull(),
  isFeatured: boolean('is_featured').notNull().default(false),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerWhatsapp: text('customer_whatsapp').notNull(),
  customerAddress: text('customer_address').notNull().default(''),
  fulfillmentMethod: text('fulfillment_method').notNull().default('pickup'),
  notes: text('notes').notNull().default(''),
  subtotal: integer('subtotal').notNull(),
  totalAmount: integer('total_amount').notNull(),
  status: text('status').notNull().default('Menunggu konfirmasi'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  productName: text('product_name').notNull(),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  lineTotal: integer('line_total').notNull(),
});

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull().default('Segar Sari'),
  description: text('description')
    .notNull()
    .default(
      'Jus buah 100% alami tanpa gula berlebih dan tanpa bahan pengawet, dibuat segar setiap hari untuk menemani aktivitas sehat Anda.'
    ),
  whatsappNumber: text('whatsapp_number').notNull().default('6281234567890'),
  address: text('address')
    .notNull()
    .default('Jl. Melati Segar No. 28, Kemang, Jakarta Selatan'),
  openingHours: text('opening_hours').notNull().default('Setiap Hari · 08.00 – 21.00 WIB'),
  email: text('email').notNull().default('halo@segarsari.id'),
  instagramHandle: text('instagram_handle').notNull().default('@segarsari.id'),
  logoUrl: text('logo_url').notNull().default('/images/hero-jus.jpg'),
  bannerUrl: text('banner_url').notNull().default('/images/hero-jus.jpg'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorEmail: text('actor_email').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  metadata: text('metadata').notNull().default('{}'),
  ipAddress: text('ip_address').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
