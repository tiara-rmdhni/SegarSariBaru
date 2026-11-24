import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';

export function Navbar() {
  const { totalItems, setDrawerOpen } = useCart();
  const { settings } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Beranda' },
    { to: '/katalog', label: 'Katalog' },
    { to: '/analisis-foto', label: 'Analisis Foto' },
    { to: '/tentang', label: 'Tentang' },
    { to: '/kontak', label: 'Kontak' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5ede7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          className="font-display text-2xl font-black tracking-tight text-[#185b36] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27834d] rounded"
        >
          {settings.storeName || 'Segar Sari'}
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#47594d]"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                  isActive
                    ? 'text-[#27834d] border-[#27834d]'
                    : 'border-transparent hover:text-[#185b36] hover:border-[#cbe4d1]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9e38]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Keranjang</span>
            <span className="font-mono-num text-xs bg-white/20 px-1.5 py-0.5 rounded-md tabular-nums">
              {totalItems}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            className="md:hidden p-2 rounded-lg text-[#185b36] hover:bg-[#eaf7ed] transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#e5ede7] bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#eaf7ed] text-[#185b36]'
                    : 'text-[#47594d] hover:bg-[#f7faf8]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
