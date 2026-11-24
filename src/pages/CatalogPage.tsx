import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

export function CatalogPage() {
  const { categories } = useStore();
  const { syncWithCatalog } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>(
    'default'
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/products')
      .then(async (res) => {
        if (!res.ok) throw new Error('Gagal memuat katalog menu.');
        return res.json();
      })
      .then((data) => {
        if (active && Array.isArray(data.products)) {
          setProducts(data.products);
          syncWithCatalog(data.products);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat katalog.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [syncWithCatalog]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const catOk =
        selectedCategory === 'semua' || p.categorySlug === selectedCategory;
      const searchOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return catOk && searchOk;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-[#185b36]">
          Katalog Menu Segar Sari
        </h1>
        <p className="mt-2 text-sm text-[#5c6b60]">
          Temukan jus buah murni, racikan mix spesial, hingga paket hemat untuk keluarga dan acara kantor.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#e5ede7]">
        <div
          className="flex flex-wrap items-center gap-1.5 p-1 bg-[#eef5f0] rounded-xl w-fit"
          role="tablist"
          aria-label="Filter kategori menu"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('semua')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === 'semua'
                ? 'bg-white text-[#185b36] shadow-sm'
                : 'text-[#5c6b60] hover:text-[#185b36]'
            }`}
          >
            Semua Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.slug
                  ? 'bg-white text-[#185b36] shadow-sm'
                  : 'text-[#5c6b60] hover:text-[#185b36]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6f8074] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jus atau paket..."
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-[#d6e3da] bg-white text-sm text-[#1f2e24] focus:outline-none focus:ring-2 focus:ring-[#27834d]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Urutkan menu"
            className="px-3.5 py-2.5 rounded-xl border border-[#d6e3da] bg-white text-sm font-medium text-[#1f2e24] focus:outline-none focus:ring-2 focus:ring-[#27834d]"
          >
            <option value="default">Urutan Rekomendasi</option>
            <option value="price-asc">Harga Terendah</option>
            <option value="price-desc">Harga Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        {error ? (
          <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-[#eef4ef] animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white border border-[#e3ece5] rounded-2xl">
            <p className="font-display text-lg font-bold text-[#1f2e24]">
              Tidak ada menu yang cocok dengan pencarian Anda
            </p>
            <p className="mt-1 text-sm text-[#5c6b60]">
              Coba kata kunci lain atau pilih kategori Semua Menu.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('semua');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#27834d] text-white text-xs font-bold hover:bg-[#185b36] cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
