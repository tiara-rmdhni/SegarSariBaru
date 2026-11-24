import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Citrus, Clock, Leaf } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

export function HomePage() {
  const { settings } = useStore();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/products?featured=true')
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data.products)) {
          setFeaturedProducts(data.products.slice(0, 6));
        }
      })
      .catch((err) => console.error('Failed to load featured products:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Hero Split */}
      <section className="bg-gradient-to-br from-[#e7f6ea] via-[#f6fbf2] to-[#fff4df] border-b border-[#e5ede7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-bold tracking-wider uppercase text-[#27834d]">
              Fresh Every Day · 100% Buah Pilihan
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-black text-[#185b36] leading-[1.12] [text-wrap:balance]">
              Segarnya Buah, Sehatnya Setiap Hari!
            </h1>
            <p className="mt-4 text-base text-[#47594d] leading-relaxed max-w-xl">
              {settings.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/katalog"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#ff9e38] hover:bg-[#eb8c27] text-white font-bold text-sm transition-colors whitespace-nowrap"
              >
                <span>Lihat Menu Kami</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/analisis-foto"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-[#cde0d3] hover:border-[#27834d] text-[#185b36] font-bold text-sm transition-colors whitespace-nowrap"
              >
                <Camera className="w-4 h-4 text-[#27834d]" />
                <span>Rekomendasi dari Foto Buah</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-[#dce8df] bg-white shadow-[0_18px_40px_rgba(24,91,54,0.12)]">
              <ProductImage
                src={settings.bannerUrl || '/images/hero-jus.jpg'}
                alt="Jus buah segar Segar Sari"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3-Column Highlights */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#e3ece5] rounded-2xl p-6">
            <Leaf className="w-6 h-6 text-[#27834d]" />
            <h2 className="mt-3 font-display text-lg font-extrabold text-[#1f2e24]">
              Buah Berkualitas
            </h2>
            <p className="mt-1.5 text-sm text-[#5c6b60] leading-relaxed">
              Buah dipetik pada tingkat kematangan optimal agar rasa manis alami dan nutrisinya terjaga.
            </p>
          </div>

          <div className="bg-white border border-[#e3ece5] rounded-2xl p-6">
            <Clock className="w-6 h-6 text-[#27834d]" />
            <h2 className="mt-3 font-display text-lg font-extrabold text-[#1f2e24]">
              Dibuat Setiap Hari
            </h2>
            <p className="mt-1.5 text-sm text-[#5c6b60] leading-relaxed">
              Jus diperas segar sesuai pesanan tanpa bahan pengawet maupun pewarna buatan.
            </p>
          </div>

          <div className="bg-white border border-[#e3ece5] rounded-2xl p-6">
            <Citrus className="w-6 h-6 text-[#27834d]" />
            <h2 className="mt-3 font-display text-lg font-extrabold text-[#1f2e24]">
              Praktis & Mudah
            </h2>
            <p className="mt-1.5 text-sm text-[#5c6b60] leading-relaxed">
              Pesan langsung lewat keranjang website dan konfirmasi pesanan secara cepat melalui WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Menu */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-black text-[#185b36]">
              Menu Pilihan Segar Sari
            </h2>
            <p className="mt-1.5 text-sm text-[#5c6b60]">
              Varian jus buah favorit pelanggan dari buah tunggal, racikan mix, hingga paket hemat.
            </p>
          </div>

          <Link
            to="/katalog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#27834d] hover:text-[#185b36] whitespace-nowrap shrink-0"
          >
            <span>Lihat Semua 12 Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-[#eef4ef] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* AI Photo Finder Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14">
        <div className="bg-[#185b36] rounded-2xl p-8 sm:p-10 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ffcf94]">
              Analisis Foto Buah
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black [text-wrap:balance]">
              Bingung memilih jus yang pas untuk hari ini?
            </h2>
            <p className="mt-2.5 text-sm text-[#d4e7da] leading-relaxed">
              Unggah foto buah atau minuman yang Anda inginkan. Sistem akan menganalisis karakter rasa, manfaat nutrisi, dan merekomendasikan menu Segar Sari yang paling cocok.
            </p>
          </div>

          <Link
            to="/analisis-foto"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#ff9e38] hover:bg-[#eb8c27] text-white font-bold text-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Coba Analisis Foto</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
