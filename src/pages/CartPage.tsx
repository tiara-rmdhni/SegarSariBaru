import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { formatRupiah } from '../types';

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-[#185b36]">
            Keranjang Belanja
          </h1>
          <p className="mt-1 text-sm text-[#5c6b60]">
            Periksa kembali menu pilihan Anda sebelum melanjutkan ke checkout.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
          >
            Kosongkan Keranjang
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 bg-white border border-[#e3ece5] rounded-2xl p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-[#b9d4c0] mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-display text-xl font-bold text-[#1f2e24]">
            Keranjang Anda belum terisi
          </p>
          <p className="mt-1.5 text-sm text-[#5c6b60]">
            Jelajahi 12 pilihan jus buah segar dan paket hemat Segar Sari.
          </p>
          <Link
            to="/katalog"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold transition-colors"
          >
            <span>Lihat Katalog Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white border border-[#e3ece5] rounded-2xl divide-y divide-[#eef3ef]">
            {items.map((item) => (
              <div
                key={item.productId}
                className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#f5f8f5] shrink-0">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/produk/${item.slug}`}
                    className="font-display text-base font-extrabold text-[#1f2e24] hover:text-[#27834d]"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[#5c6b60] tabular-nums mt-0.5">
                    {formatRupiah(item.price)} / item
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="inline-flex items-center border border-[#d6e3da] rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      aria-label="Kurangi jumlah"
                      className="p-2 text-[#185b36] hover:bg-[#eaf7ed] rounded-l-xl cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3.5 text-sm font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      aria-label="Tambah jumlah"
                      className="p-2 text-[#185b36] hover:bg-[#eaf7ed] rounded-r-xl cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-display font-extrabold text-[#185b36] tabular-nums min-w-[96px] text-right">
                    {formatRupiah(item.price * item.quantity)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Hapus ${item.name}`}
                    className="p-2 text-[#8a9a8f] hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 bg-white border border-[#e3ece5] rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-lg font-extrabold text-[#1f2e24]">
              Ringkasan Pesanan
            </h2>
            <div className="space-y-2.5 text-sm border-b border-[#eef3ef] pb-4">
              <div className="flex justify-between text-[#5c6b60]">
                <span>Total Item</span>
                <span className="tabular-nums font-semibold">
                  {items.reduce((sum, i) => sum + i.quantity, 0)} item
                </span>
              </div>
              <div className="flex justify-between text-[#1f2e24] font-bold text-base">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#185b36]">
                  {formatRupiah(subtotal)}
                </span>
              </div>
            </div>

            <Link
              to="/checkout"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#ff9e38] hover:bg-[#eb8c27] text-white text-sm font-bold transition-colors"
            >
              <span>Lanjut ke Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
