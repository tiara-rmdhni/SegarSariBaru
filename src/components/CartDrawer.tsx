import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatRupiah } from '../types';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const {
    items,
    subtotal,
    drawerOpen,
    setDrawerOpen,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!drawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang Belanja"
    >
      <div
        className="fixed inset-0"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-[#e5ede7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#27834d]" />
            <h2 className="font-display text-lg font-extrabold text-[#1f2e24]">
              Keranjang Belanja
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup keranjang"
            className="p-2 rounded-lg text-[#5c6b60] hover:bg-[#f2f7f3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#b9d4c0] mb-3" strokeWidth={1.5} />
              <p className="font-display text-base font-bold text-[#1f2e24]">
                Keranjang Anda masih kosong
              </p>
              <p className="mt-1 text-sm text-[#5c6b60] max-w-xs">
                Pilih jus buah segar favorit Anda dari menu katalog Segar Sari.
              </p>
              <Link
                to="/katalog"
                onClick={() => setDrawerOpen(false)}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#27834d] text-white text-sm font-bold hover:bg-[#185b36] transition-colors"
              >
                Jelajahi Katalog
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#eef3ef]">
              {items.map((item) => (
                <li key={item.productId} className="py-4 flex gap-4">
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-[#f5f8f5] shrink-0">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/produk/${item.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="font-display font-bold text-sm text-[#1f2e24] hover:text-[#27834d] truncate"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Hapus ${item.name}`}
                        className="text-[#8a9a8f] hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#5c6b60] tabular-nums mt-0.5">
                      {formatRupiah(item.price)} / item
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#dce6df] rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          aria-label="Kurangi jumlah"
                          className="p-1.5 text-[#47594d] hover:bg-[#eaf7ed] rounded-l-lg cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          aria-label="Tambah jumlah"
                          className="p-1.5 text-[#47594d] hover:bg-[#eaf7ed] rounded-r-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-[#185b36] tabular-nums">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#e5ede7] p-6 bg-[#fafdfb] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#5c6b60]">
                Subtotal Sementara
              </span>
              <span className="font-display text-xl font-black text-[#185b36] tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/keranjang"
                onClick={() => setDrawerOpen(false)}
                className="text-center py-2.5 px-4 rounded-xl border border-[#cde0d3] text-[#185b36] text-sm font-bold hover:bg-[#eaf7ed] transition-colors whitespace-nowrap"
              >
                Lihat Keranjang
              </Link>
              <Link
                to="/checkout"
                onClick={() => setDrawerOpen(false)}
                className="text-center py-2.5 px-4 rounded-xl bg-[#ff9e38] hover:bg-[#eb8c27] text-white text-sm font-bold transition-colors whitespace-nowrap"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
