import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type GenerateContentResponse,
} from '@google/genai';

const VISION_MODEL = 'gemini-4-hydrogen';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi pada Secrets atau environment server.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface CustomerImageAnalysis {
  detectedItems: string[];
  freshnessNotes: string;
  flavorProfile: string;
  healthBenefits: string;
  recommendationReason: string;
  recommendedSlugs: string[];
}

export async function analyzeCustomerFruitPhoto(params: {
  imageBuffer: Buffer;
  mimeType: string;
  menuItems: Array<{ slug: string; name: string; categoryName: string; description: string }>;
}): Promise<CustomerImageAnalysis> {
  const ai = getGeminiClient();

  const menuCatalogText = params.menuItems
    .map((m) => `- slug: "${m.slug}" | nama: "${m.name}" (${m.categoryName}) — ${m.description}`)
    .join('\n');

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.imageBuffer.toString('base64'),
          },
        },
        {
          text: [
            'Analisis foto buah, bahan makanan, atau minuman ini dalam Bahasa Indonesia yang ramah dan ringkas untuk pelanggan toko jus Segar Sari.',
            'Berikut daftar menu Segar Sari yang tersedia:',
            menuCatalogText,
            '',
            'Tugas Anda:',
            '1. Identifikasi buah, bahan, atau minuman yang terlihat pada foto.',
            '2. Berikan catatan kesegaran atau karakteristik visual yang tampak.',
            '3. Jelaskan profil rasa & manfaat kesehatan utamanya.',
            '4. Pilih 1 sampai 3 slug menu Segar Sari yang paling relevan dari daftar di atas (gunakan persis string slug dari daftar). Jika foto bukan buah/minuman, sarankan menu populer seperti jus-alpukat atau tropical-mix dengan penjelasan sopan.',
          ].join('\n'),
        },
      ],
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction:
        'Anda adalah ahli nutrisi dan peracik jus buah Segar Sari. Selalu jawab dalam Bahasa Indonesia yang natural, akurat, dan tidak mengarang klaim medis berlebihan.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Daftar buah atau objek minuman yang terdeteksi di foto.',
          },
          freshnessNotes: {
            type: Type.STRING,
            description: 'Catatan singkat mengenai tampilan visual dan kesegaran.',
          },
          flavorProfile: {
            type: Type.STRING,
            description: 'Gambaran profil rasa (misal: manis lembut, segar asam-manis).',
          },
          healthBenefits: {
            type: Type.STRING,
            description: 'Ringkasan manfaat nutrisi alami buah yang terlihat.',
          },
          recommendationReason: {
            type: Type.STRING,
            description: 'Alasan rekomendasi menu Segar Sari yang cocok dengan foto.',
          },
          recommendedSlugs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Maksimal 3 slug produk dari daftar menu Segar Sari.',
          },
        },
        required: [
          'detectedItems',
          'freshnessNotes',
          'flavorProfile',
          'healthBenefits',
          'recommendationReason',
          'recommendedSlugs',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as CustomerImageAnalysis;
  const validSlugs = new Set(params.menuItems.map((m) => m.slug));
  const filteredSlugs = (parsed.recommendedSlugs || []).filter((slug) =>
    validSlugs.has(slug)
  );

  return {
    detectedItems: parsed.detectedItems || [],
    freshnessNotes: parsed.freshnessNotes || 'Foto berhasil dianalisis.',
    flavorProfile: parsed.flavorProfile || 'Segar alami.',
    healthBenefits: parsed.healthBenefits || 'Kaya vitamin dan serat alami buah.',
    recommendationReason:
      parsed.recommendationReason ||
      'Berikut pilihan jus Segar Sari yang paling sesuai untuk Anda.',
    recommendedSlugs:
      filteredSlugs.length > 0
        ? filteredSlugs.slice(0, 3)
        : params.menuItems.slice(0, 2).map((m) => m.slug),
  };
}

export interface AdminProductDraft {
  suggestedName: string;
  suggestedCategorySlug: 'tunggal' | 'mix' | 'paket';
  suggestedDescription: string;
  suggestedPrice: number;
}

export async function analyzeAdminProductPhoto(params: {
  imageBuffer: Buffer;
  mimeType: string;
}): Promise<AdminProductDraft> {
  const ai = getGeminiClient();

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.imageBuffer.toString('base64'),
          },
        },
        {
          text: [
            'Analisis foto produk jus atau paket minuman ini untuk mengisi form katalog admin UMKM Segar Sari.',
            'Pilih suggestedCategorySlug hanya dari: "tunggal", "mix", atau "paket".',
            'Berikan suggestedPrice dalam Rupiah (bilangan bulat kelipatan 1000, kisaran 10000 sampai 75000).',
            'Buat suggestedDescription maksimal 2 kalimat yang menggugah selera dalam Bahasa Indonesia.',
          ].join('\n'),
        },
      ],
    },
    config: {
      systemInstruction:
        'Anda adalah asisten katalog UMKM Segar Sari yang membantu admin membuat nama, kategori, deskripsi, dan estimasi harga produk jus buah.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedName: { type: Type.STRING },
          suggestedCategorySlug: { type: Type.STRING },
          suggestedDescription: { type: Type.STRING },
          suggestedPrice: { type: Type.INTEGER },
        },
        required: [
          'suggestedName',
          'suggestedCategorySlug',
          'suggestedDescription',
          'suggestedPrice',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as AdminProductDraft;
  const cat =
    parsed.suggestedCategorySlug === 'mix' ||
    parsed.suggestedCategorySlug === 'paket'
      ? parsed.suggestedCategorySlug
      : 'tunggal';

  return {
    suggestedName: parsed.suggestedName || 'Jus Buah Segar',
    suggestedCategorySlug: cat,
    suggestedDescription:
      parsed.suggestedDescription ||
      'Jus buah segar pilihan dibuat setiap hari tanpa bahan pengawet.',
    suggestedPrice:
      Number.isFinite(parsed.suggestedPrice) && parsed.suggestedPrice >= 5000
        ? Math.round(parsed.suggestedPrice / 1000) * 1000
        : 15000,
  };
}
