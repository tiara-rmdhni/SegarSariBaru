import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../context/CartContext';
import { formatRupiah, type Product } from '../types';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, setDrawerOpen } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(null);
    setQuantity(1);

    Promise.all([
      fetch(`/api/products/${encodeURIComponent(slug)}`),
      fetch('/api/products'),
    ])
      .then(async ([detailRes, listRes]) => {
        if (!detailRes.ok) {
          throw new Error('Produk tidak ditemukan.');
        }
        const detailData = await detailRes.json();
        const listData = listRes.ok ? await listRes.json() : { products: [] };
        if (active) {
          setProduct(detailData.product);
          const others = (listData.products || []).filter(
            (p: Product) =>
              p.slug !== slug &&
              p.categorySlug === detailData.product.categorySlug
          );
          setRelated(others.slice(0, 3));
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat produk.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 rounded-2xl bg-[#eef4ef] animate-pulse" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-black text-[#1f2e24]">
          Produk Tidak Ditemukan
        </h1>
        <p className="mt-2 text-sm text-[#5c6b60]">
          {error || 'Menu yang Anda cari mungkin telah diperbarui.'}
        </p>
        <Link
          to="/katalog"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#27834d] text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>
    );
  }

  const outOfStock = !product.isAvailable || product.stock <= 0;

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    addItem(product, quantity);
    navigate('/checkout');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Breadcrumb" className="text-xs font-medium text-[#5c6b60] flex items-center gap-2">
        <Link to="/" className="hover:text-[#185b36]">
          Beranda
        </Link>
        <span>/</span>
        <Link to="/katalog" className="hover:text-[#185b36]">
          Katalog
        </Link>
        <span>/</span>
        <span className="text-[#185b36] font-semibold">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 aspect-[4/3] rounded-2xl overflow-hidden border border-[#e3ece5] bg-white">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="lg:col-span-6 bg-white border border-[#e3ece5] rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5c6b60]">
            <span>{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span className={outOfStock ? 'text-red-600' : 'text-[#27834d]'}>
              {outOfStock ? 'Stok Habis' : `Tersedia (${product.stock} porsi)`}
            </span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-black text-[#1f2e24]">
            {product.name}
          </h1>

          <p className="mt-3 font-display text-3xl font-black text-[#185b36] tabular-nums">
            {formatRupiah(product.price)}
          </p>

          <p className="mt-4 text-sm text-[#47594d] leading-relaxed">
            {product.description}
          </p>

          <div className="mt-6 pt-6 border-t border-[#eef3ef] space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1f2e24]">
                Jumlah Pesanan
              </span>
              <div className="inline-flex items-center border border-[#d6e3da] rounded-xl">
                <button
                  type="button"
                  disabled={outOfStock || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Kurangi jumlah"
                  className="p-2.5 text-[#185b36] hover:bg-[#eaf7ed] rounded-l-xl disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-5 text-sm font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={outOfStock || quantity >= product.stock}
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock, q + 1))
                  }
                  aria-label="Tambah jumlah"
                  className="p-2.5 text-[#185b36] hover:bg-[#eaf7ed] rounded-r-xl disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={outOfStock}
                onClick={handleAdd}
                className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-[#27834d] text-[#185b36] hover:bg-[#eaf7ed] text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Masuk Keranjang</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Tambah ke Keranjang</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={outOfStock}
                onClick={handleBuyNow}
                className="inline-flex items-center justify-center py-3 px-5 rounded-xl bg-[#ff9e38] hover:bg-[#eb8c27] text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Pesan Sekarang
              </button>
            </div>

            {addedFeedback && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="text-xs font-bold text-[#27834d] underline cursor-pointer"
              >
                Buka Keranjang Belanja
              </button>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-black text-[#185b36] mb-6">
            Menu Serupa Lainnya
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
