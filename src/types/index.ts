export interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  isFeatured: boolean;
  isAvailable: boolean;
}

export interface StoreSettings {
  storeName: string;
  description: string;
  whatsappNumber: string;
  address: string;
  openingHours: string;
  email: string;
  instagramHandle: string;
  logoUrl: string;
  bannerUrl: string;
}

export interface OrderItemRecord {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export type OrderStatus =
  | 'Menunggu konfirmasi'
  | 'Diproses'
  | 'Siap diambil atau dikirim'
  | 'Selesai'
  | 'Dibatalkan';

export interface OrderRecord {
  id: number;
  orderNumber: string;
  customerName: string;
  customerWhatsapp: string;
  customerAddress: string;
  fulfillmentMethod: 'pickup' | 'delivery';
  notes: string;
  subtotal: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemRecord[];
}

export interface AuditLogRecord {
  id: number;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string;
  ipAddress: string;
  createdAt: string;
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  quantity: number;
}

export function formatRupiah(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
}

export function formatDateTimeID(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
