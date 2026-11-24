-- Seed awal Segar Sari (3 kategori, 12 produk, 1 store_settings)

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Jus Buah Tunggal', 'tunggal', 1),
  ('Jus Mix', 'mix', 2),
  ('Paket Jus', 'paket', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (category_id, name, slug, description, price, stock, image_url, is_featured, is_available)
SELECT c.id, v.name, v.slug, v.description, v.price, v.stock, v.image_url, v.is_featured, true
FROM (VALUES
  ('tunggal', 'Jus Alpukat', 'jus-alpukat', 'Alpukat mentega lembut kaya lemak tak jenuh yang sehat dengan tekstur creamy alami.', 15000, 40, '/images/products/alpukat.jpg', true),
  ('tunggal', 'Jus Mangga', 'jus-mangga', 'Mangga harum manis segar dengan perpaduan rasa manis dan sedikit asam yang menyegarkan.', 12000, 45, '/images/products/mangga.jpg', true),
  ('tunggal', 'Jus Jeruk', 'jus-jeruk', 'Perasan jeruk manis murni tinggi vitamin C untuk membantu menjaga daya tahan tubuh.', 10000, 60, '/images/products/jeruk.jpg', false),
  ('tunggal', 'Jus Semangka', 'jus-semangka', 'Kesegaran buah semangka merah dingin yang menghidrasi tubuh di hari yang panas.', 10000, 55, '/images/products/semangka.jpg', false),
  ('tunggal', 'Jus Strawberry', 'jus-strawberry', 'Buah strawberry pilihan tinggi antioksidan dengan rasa asam-manis yang menggugah selera.', 15000, 35, '/images/products/strawberry.jpg', true),
  ('tunggal', 'Jus Buah Naga', 'jus-buah-naga', 'Buah naga merah kaya serat dan nutrisi dengan warna cerah alami tanpa pewarna buatan.', 12000, 40, '/images/products/naga.jpg', false),
  ('mix', 'Mango Strawberry', 'mango-strawberry', 'Perpaduan manisnya mangga matang dan segar asam buah strawberry dalam satu gelas.', 17000, 30, '/images/products/mango-strawberry.jpg', true),
  ('mix', 'Alpukat Cokelat', 'alpukat-cokelat', 'Alpukat creamy berpadu dengan cokelat premium yang lembut dan memanjakan lidah.', 18000, 35, '/images/products/alpukat-cokelat.jpg', true),
  ('mix', 'Tropical Mix', 'tropical-mix', 'Kombinasi buah tropis nanas, mangga, dan jeruk yang segar untuk mengembalikan energi.', 18000, 30, '/images/products/tropical-mix.jpg', false),
  ('paket', 'Paket Sehat', 'paket-sehat', 'Paket hemat berisi 2 gelas jus pilihan untuk menemani sarapan atau sore sehat Anda.', 22000, 25, '/images/products/paket-sehat.jpg', false),
  ('paket', 'Paket Keluarga', 'paket-keluarga', 'Paket 4 gelas jus buah segar yang cocok dinikmati bersama keluarga di rumah.', 42000, 20, '/images/products/paket-keluarga.jpg', true),
  ('paket', 'Paket Kantoran', 'paket-kantoran', 'Paket spesial berisi 6 gelas jus segar untuk rapat kantor, acara tim, atau kumpul bersama.', 60000, 15, '/images/products/paket-kantoran.jpg', false)
) AS v(cat_slug, name, slug, description, price, stock, image_url, is_featured)
JOIN public.categories c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_settings (id, store_name, description, whatsapp_number, address, opening_hours, email, instagram_handle, logo_url, banner_url)
VALUES (
  1,
  'Segar Sari',
  'Jus buah 100% alami tanpa gula berlebih dan tanpa bahan pengawet, dibuat segar setiap hari untuk menemani aktivitas sehat Anda.',
  '6281234567890',
  'Jl. Melati Segar No. 28, Kemang, Jakarta Selatan',
  'Setiap Hari · 08.00 – 21.00 WIB',
  'halo@segarsari.id',
  '@segarsari.id',
  '/images/hero-jus.jpg',
  '/images/hero-jus.jpg'
)
ON CONFLICT (id) DO NOTHING;
