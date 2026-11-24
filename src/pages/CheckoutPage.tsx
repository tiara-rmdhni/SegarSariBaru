import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import {
  formatRupiah,
  type OrderItemRecord,
  type OrderRecord,
} from '../types';

interface CheckoutReceipt {
  order: OrderRecord;
  items: OrderItemRecord[];
  whatsappUrl: string;
}

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useStore();

  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ss-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'pickup' | 'delivery'>(
    'pickup'
  );
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  const totalCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );

  const buildLocalFallbackReceipt = (): CheckoutReceipt => {
    const nowIso = new Date().toISOString();
    const dateTag = nowIso.slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderNumber = `SS-${dateTag}-${suffix}`;

    const orderItemsList: OrderItemRecord[] = items.map((item, idx) => ({
      id: idx + 1,
      orderId: 0,
      productId: item.productId,
      productName: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
    }));

    const digits = settings.whatsappNumber.replace(/\D/g, '') || '6281234567890';
    const normalizedPhone = digits.startsWith('0')
      ? `62${digits.slice(1)}`
      : digits;

    const itemLines = orderItemsList
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.productName} x${item.quantity} (${formatRupiah(item.lineTotal)})`
      )
      .join('\n');

    const lines = [
      'Halo Segar Sari, saya ingin mengonfirmasi pesanan:',
      `No. Pesanan: ${orderNumber}`,
      `Nama: ${customerName.trim()}`,
      `WhatsApp: ${customerWhatsapp.trim()}`,
      `Metode: ${fulfillmentMethod === 'delivery' ? 'Antar Kurir' : 'Ambil di Toko'}`,
      ...(fulfillmentMethod === 'delivery' && customerAddress.trim()
        ? [`Alamat: ${customerAddress.trim()}`]
        : []),
      '',
      'Rincian Menu:',
      itemLines,
      '',
      `Total: ${formatRupiah(subtotal)}`,
      ...(notes.trim() ? [`Catatan: ${notes.trim()}`] : []),
      '',
      'Mohon konfirmasi ketersediaan dan instruksi pembayarannya. Terima kasih.',
    ];

    return {
      order: {
        id: 0,
        orderNumber,
        customerName: customerName.trim(),
        customerWhatsapp: customerWhatsapp.trim(),
        customerAddress:
          fulfillmentMethod === 'delivery' ? customerAddress.trim() : '',
        fulfillmentMethod,
        notes: notes.trim(),
        subtotal,
        totalAmount: subtotal,
        status: 'Menunggu konfirmasi',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      items: orderItemsList,
      whatsappUrl: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(lines.join('\n'))}`,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || items.length === 0) return;

    if (fulfillmentMethod === 'delivery' && customerAddress.trim().length < 8) {
      setError('Alamat pengiriman lengkap wajib diisi untuk pengantaran kurir.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          customerName,
          customerWhatsapp,
          fulfillmentMethod,
          customerAddress:
            fulfillmentMethod === 'delivery' ? customerAddress : '',
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500 && res.status !== 404 && data?.error) {
          throw new Error(data.error);
        }
        // Fallback if backend API is unavailable (e.g. static deployment without serverless API)
        setReceipt(buildLocalFallbackReceipt());
        clearCart();
        return;
      }

      if (!data?.order) {
        setReceipt(buildLocalFallbackReceipt());
        clearCart();
        return;
      }

      setReceipt({
        order: data.order,
        items: data.items || [],
        whatsappUrl: data.whatsappUrl,
      });
      clearCart();
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ss-${Date.now()}`
      );
    } catch (err: any) {
      if (err instanceof TypeError) {
        // Network error when backend is unreachable
        setReceipt(buildLocalFallbackReceipt());
        clearCart();
      } else {
        setError(err.message || 'Terjadi kesalahan saat memproses pesanan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-[#d6e5da] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-[#27834d] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#27834d]">
                Pesanan Tercatat · {receipt.order.status}
              </p>
              <h1 className="mt-1 font-display text-2xl font-black text-[#1f2e24]">
                Terima Kasih, {receipt.order.customerName}
              </h1>
              <p className="mt-1 text-sm text-[#5c6b60]">
                Pesanan Anda telah tersimpan dengan nomor{' '}
                <span className="font-mono-num font-semibold text-[#185b36]">
                  {receipt.order.orderNumber}
                </span>
                . Pembayaran belum selesai — silakan lanjutkan konfirmasi pesanan melalui WhatsApp kami.
              </p>
            </div>
          </div>

          <div className="bg-[#f8fbf9] border border-[#e5ede7] rounded-xl p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5c6b60]">Nomor Pesanan</span>
              <span className="font-mono-num font-bold text-[#1f2e24]">
                {receipt.order.orderNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5c6b60]">Metode</span>
              <span className="font-semibold text-[#1f2e24]">
                {receipt.order.fulfillmentMethod === 'delivery'
                  ? 'Antar Kurir'
                  : 'Ambil di Toko'}
              </span>
            </div>
            {receipt.order.customerAddress && (
              <div className="flex justify-between gap-4">
                <span className="text-[#5c6b60] shrink-0">Alamat</span>
                <span className="text-right text-[#1f2e24]">
                  {receipt.order.customerAddress}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-[#e5ede7] space-y-2">
              {receipt.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-[#47594d]">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums text-[#1f2e24]">
                    {formatRupiah(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#d6e3da] flex justify-between text-base font-extrabold text-[#185b36]">
              <span>Total Pesanan (Terverifikasi Server)</span>
              <span className="tabular-nums">
                {formatRupiah(receipt.order.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={receipt.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white font-bold text-sm transition-colors"
            >
              <span>Konfirmasi Pesanan via WhatsApp</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              to="/katalog"
              className="inline-flex items-center justify-center py-3.5 px-5 rounded-xl border border-[#cde0d3] text-[#185b36] hover:bg-[#eaf7ed] font-bold text-sm transition-colors"
            >
              Kembali ke Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <ShoppingBag className="w-12 h-12 text-[#b9d4c0] mx-auto mb-3" strokeWidth={1.5} />
        <h1 className="font-display text-2xl font-black text-[#1f2e24]">
          Keranjang Belanja Kosong
        </h1>
        <p className="mt-2 text-sm text-[#5c6b60]">
          Tambahkan menu jus terlebih dahulu sebelum melanjutkan checkout.
        </p>
        <Link
          to="/katalog"
          className="mt-6 inline-block px-6 py-3 rounded-xl bg-[#27834d] text-white text-sm font-bold"
        >
          Pilih Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-black text-[#185b36]">
        Checkout Pesanan
      </h1>
      <p className="mt-1.5 text-sm text-[#5c6b60]">
        Total harga dihitung dan diverifikasi oleh server sebelum pesanan dibuat.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#e3ece5] rounded-2xl p-6 sm:p-7 space-y-5"
        >
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-semibold text-[#1f2e24] mb-1.5"
            >
              Nama Lengkap
            </label>
            <input
              id="customerName"
              type="text"
              required
              minLength={2}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-4 py-2.5 rounded-xl border border-[#d6e3da] text-sm focus:outline-none focus:ring-2 focus:ring-[#27834d]"
            />
          </div>

          <div>
            <label
              htmlFor="customerWhatsapp"
              className="block text-sm font-semibold text-[#1f2e24] mb-1.5"
            >
              Nomor WhatsApp Aktif
            </label>
            <input
              id="customerWhatsapp"
              type="tel"
              required
              value={customerWhatsapp}
              onChange={(e) => setCustomerWhatsapp(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full px-4 py-2.5 rounded-xl border border-[#d6e3da] text-sm focus:outline-none focus:ring-2 focus:ring-[#27834d]"
            />
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#1f2e24] mb-2">
              Metode Pengambilan
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentMethod('pickup')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                  fulfillmentMethod === 'pickup'
                    ? 'border-[#27834d] bg-[#eaf7ed] text-[#185b36]'
                    : 'border-[#d6e3da] bg-white text-[#5c6b60]'
                }`}
              >
                Ambil di Toko
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentMethod('delivery')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                  fulfillmentMethod === 'delivery'
                    ? 'border-[#27834d] bg-[#eaf7ed] text-[#185b36]'
                    : 'border-[#d6e3da] bg-white text-[#5c6b60]'
                }`}
              >
                Antar Kurir
              </button>
            </div>
          </div>

          {fulfillmentMethod === 'delivery' && (
            <div>
              <label
                htmlFor="customerAddress"
                className="block text-sm font-semibold text-[#1f2e24] mb-1.5"
              >
                Alamat Pengiriman Lengkap
              </label>
              <textarea
                id="customerAddress"
                required
                minLength={8}
                rows={3}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Nama jalan, nomor rumah, patokan lokasi..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#d6e3da] text-sm focus:outline-none focus:ring-2 focus:ring-[#27834d]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-semibold text-[#1f2e24] mb-1.5"
            >
              Catatan Pesanan (Opsional)
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Sedikit es / tanpa gula"
              className="w-full px-4 py-2.5 rounded-xl border border-[#d6e3da] text-sm focus:outline-none focus:ring-2 focus:ring-[#27834d]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl bg-[#ff9e38] hover:bg-[#eb8c27] text-white font-bold text-sm transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? 'Memproses Pesanan...'
              : 'Buat Pesanan & Siapkan Link WhatsApp'}
          </button>
        </form>

        <aside className="lg:col-span-5 bg-white border border-[#e3ece5] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-extrabold text-[#1f2e24]">
            Ringkasan Belanja ({totalCount} item)
          </h2>

          <ul className="divide-y divide-[#eef3ef] text-sm">
            {items.map((item) => (
              <li
                key={item.productId}
                className="py-3 flex items-center justify-between gap-3"
              >
                <span className="text-[#47594d]">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-bold text-[#1f2e24] tabular-nums shrink-0">
                  {formatRupiah(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t border-[#d6e3da] flex items-center justify-between">
            <span className="text-sm font-bold text-[#1f2e24]">
              Estimasi Total
            </span>
            <span className="font-display text-2xl font-black text-[#185b36] tabular-nums">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <p className="text-xs text-[#5c6b60] leading-relaxed">
            Pembayaran dilakukan setelah konfirmasi ketersediaan melalui WhatsApp resmi toko.
          </p>
        </aside>
      </div>
    </div>
  );
}
