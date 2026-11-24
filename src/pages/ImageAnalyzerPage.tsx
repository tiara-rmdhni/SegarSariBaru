import { useState } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';

interface AnalysisResult {
  detectedItems: string[];
  freshnessNotes: string;
  flavorProfile: string;
  healthBenefits: string;
  recommendationReason: string;
  recommendedSlugs: string[];
}

export function ImageAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);

  const handleFileChange = (selected: File | null) => {
    setError(null);
    setAnalysis(null);
    setRecommendedProducts([]);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Format gambar harus JPEG, PNG, atau WebP.');
      return;
    }

    if (selected.size > 3 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 3 MB.');
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleAnalyze = async () => {
    if (!file || analyzing) return;
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menganalisis gambar.');
      }
      setAnalysis(data.analysis);
      setRecommendedProducts(data.recommendedProducts || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memproses foto.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#27834d]">
          Gemini Vision
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-black text-[#185b36]">
          Analisis Foto Buah & Rekomendasi Jus
        </h1>
        <p className="mt-2 text-sm text-[#5c6b60]">
          Unggah foto buah segar, bahan minuman, atau sajian favorit Anda untuk melihat profil rasa, manfaat nutrisi, dan rekomendasi menu Segar Sari yang sesuai.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 bg-white border border-[#e3ece5] rounded-2xl p-6 space-y-5">
          <label className="block border-2 border-dashed border-[#c7dbcd] hover:border-[#27834d] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#fafdfb]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pratinjau foto yang diunggah"
                className="w-full h-56 object-cover rounded-lg"
              />
            ) : (
              <div className="py-8 flex flex-col items-center">
                <Upload className="w-8 h-8 text-[#27834d] mb-2" />
                <span className="text-sm font-bold text-[#1f2e24]">
                  Pilih atau letakkan foto di sini
                </span>
                <span className="mt-1 text-xs text-[#5c6b60]">
                  JPEG, PNG, atau WebP · Maksimal 3 MB
                </span>
              </div>
            )}
          </label>

          {error && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!file || analyzing}
            onClick={handleAnalyze}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menganalisis Foto...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Analisis Foto dengan Gemini</span>
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-7">
          {!analysis ? (
            <div className="bg-white border border-[#e3ece5] rounded-2xl p-8 text-center">
              <Camera className="w-10 h-10 text-[#b9d4c0] mx-auto mb-3" strokeWidth={1.5} />
              <h2 className="font-display text-lg font-extrabold text-[#1f2e24]">
                Hasil Analisis Akan Muncul di Sini
              </h2>
              <p className="mt-1.5 text-sm text-[#5c6b60] max-w-md mx-auto">
                Setelah foto diunggah dan dianalisis, Anda akan mendapatkan rincian buah terdeteksi beserta menu Segar Sari yang bisa langsung dipesan.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#e3ece5] rounded-2xl p-6 sm:p-7 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#27834d]">
                  Hasil Analisis Gemini
                </p>
                <h2 className="mt-1 font-display text-xl font-black text-[#1f2e24]">
                  {analysis.detectedItems.length > 0
                    ? analysis.detectedItems.join(', ')
                    : 'Foto Buah & Minuman'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-[#f7faf8] border border-[#e5ede7]">
                  <p className="text-xs font-bold text-[#185b36]">
                    Catatan Visual & Kesegaran
                  </p>
                  <p className="mt-1 text-[#47594d] leading-relaxed">
                    {analysis.freshnessNotes}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#f7faf8] border border-[#e5ede7]">
                  <p className="text-xs font-bold text-[#185b36]">
                    Profil Rasa
                  </p>
                  <p className="mt-1 text-[#47594d] leading-relaxed">
                    {analysis.flavorProfile}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#fffaf0] border border-[#f5e6c8] text-sm">
                <p className="text-xs font-bold text-[#9a5c14]">
                  Manfaat Nutrisi & Rekomendasi
                </p>
                <p className="mt-1 text-[#47594d] leading-relaxed">
                  {analysis.healthBenefits} {analysis.recommendationReason}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {recommendedProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-black text-[#185b36] mb-6">
            Rekomendasi Menu Segar Sari Untuk Anda
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
