import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { useStore } from '../context/StoreContext';

export function AboutPage() {
  const { settings } = useStore();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#27834d]">
            Tentang {settings.storeName}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-[#185b36] [text-wrap:balance]">
            Kesegaran Buah Alami dari Kebun Pilihan ke Gelas Anda
          </h1>
          <p className="text-sm text-[#47594d] leading-relaxed">
            {settings.description}
          </p>
          <p className="text-sm text-[#47594d] leading-relaxed">
            Setiap gelas jus di {settings.storeName} diracik secara higienis tanpa bahan pengawet, menggunakan buah matang alami agar Anda dan keluarga dapat menikmati nutrisi terbaik setiap hari.
          </p>
          <div className="pt-2">
            <Link
              to="/katalog"
              className="inline-block px-6 py-3 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold transition-colors"
            >
              Jelajahi Menu Kami
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 aspect-[4/3] rounded-2xl overflow-hidden border border-[#e3ece5]">
          <ProductImage
            src={settings.bannerUrl || '/images/hero-jus.jpg'}
            alt={`Tentang ${settings.storeName}`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings } = useStore();
  const digits = settings.whatsappNumber.replace(/\D/g, '') || '6281234567890';
  const waHref = `https://wa.me/${digits}?text=${encodeURIComponent(
    `Halo ${settings.storeName}, saya ingin bertanya mengenai menu jus segar.`
  )}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl font-black text-[#185b36]">
        Hubungi {settings.storeName}
      </h1>
      <p className="mt-2 text-sm text-[#5c6b60]">
        Untuk pemesanan acara kantor, kemitraan, atau pertanyaan seputar ketersediaan buah harian.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e3ece5] rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#27834d] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#5c6b60]">Alamat Gerai</p>
              <p className="text-sm font-semibold text-[#1f2e24] mt-0.5">
                {settings.address}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#27834d] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#5c6b60]">Jam Operasional</p>
              <p className="text-sm font-semibold text-[#1f2e24] mt-0.5">
                {settings.openingHours}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#27834d] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#5c6b60]">Email & Media Sosial</p>
              <p className="text-sm font-semibold text-[#1f2e24] mt-0.5">
                {settings.email} · {settings.instagramHandle}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#eaf7ed] border border-[#cde0d3] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <Phone className="w-6 h-6 text-[#185b36]" />
            <h2 className="mt-3 font-display text-xl font-black text-[#185b36]">
              Chat Langsung via WhatsApp
            </h2>
            <p className="mt-1.5 text-sm text-[#47594d]">
              Tim kami siap membantu pemesanan cepat dan informasi stok harian.
            </p>
          </div>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white font-bold text-sm transition-colors"
          >
            <span>Buka WhatsApp</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  const { settings } = useStore();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl font-black text-[#185b36]">
        Kebijakan Privasi
      </h1>
      <div className="mt-6 bg-white border border-[#e3ece5] rounded-2xl p-6 sm:p-8 space-y-4 text-sm text-[#47594d] leading-relaxed">
        <p>
          {settings.storeName} hanya mengumpulkan informasi yang diperlukan untuk memproses pesanan Anda, yaitu nama pelanggan, nomor WhatsApp, alamat pengantaran (jika memilih kurir), dan catatan pesanan.
        </p>
        <p>
          Data pesanan disimpan secara aman di database server dengan pembatasan akses ketat dan hanya dapat dilihat oleh administrator resmi {settings.storeName}.
        </p>
        <p>
          Foto yang Anda unggah pada fitur Analisis Foto diproses secara sementara di server untuk memberikan rekomendasi menu dan tidak disimpan secara permanen di server kami.
        </p>
      </div>
    </div>
  );
}
