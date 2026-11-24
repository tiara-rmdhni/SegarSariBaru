import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { settings } = useStore();

  return (
    <footer className="bg-[#123f28] text-white mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <p className="font-display text-2xl font-black tracking-tight text-white">
            {settings.storeName}
          </p>
          <p className="mt-3 text-sm text-[#c7ddd0] leading-relaxed max-w-sm">
            {settings.description}
          </p>
        </div>

        <div className="space-y-2.5 text-sm">
          <p className="font-display font-bold text-white text-base">
            Informasi Toko
          </p>
          <p className="text-[#c7ddd0]">{settings.address}</p>
          <p className="text-[#c7ddd0]">{settings.openingHours}</p>
          <p className="text-[#c7ddd0]">
            Email: {settings.email} · IG: {settings.instagramHandle}
          </p>
        </div>

        <div className="space-y-2.5 text-sm">
          <p className="font-display font-bold text-white text-base">
            Navigasi & Kebijakan
          </p>
          <div className="flex flex-col gap-2 text-[#c7ddd0]">
            <Link to="/katalog" className="hover:text-white transition-colors w-fit">
              Katalog Menu
            </Link>
            <Link to="/analisis-foto" className="hover:text-white transition-colors w-fit">
              Analisis Foto Buah AI
            </Link>
            <Link to="/privasi" className="hover:text-white transition-colors w-fit">
              Kebijakan Privasi
            </Link>
            <Link to="/admin" className="hover:text-white transition-colors w-fit">
              Dashboard Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9ec0ac]">
          <span>
            © {new Date().getFullYear()} {settings.storeName}. Seluruh hak cipta dilindungi.
          </span>
          <span>100% Buah Segar Alami · Tanpa Pengawet</span>
        </div>
      </div>
    </footer>
  );
}
