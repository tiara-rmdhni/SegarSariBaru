import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Category, StoreSettings } from '../types';

interface StoreContextValue {
  settings: StoreSettings;
  categories: Category[];
  loading: boolean;
  refreshStore: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
  storeName: 'Segar Sari',
  description:
    'Jus buah 100% alami tanpa gula berlebih dan tanpa bahan pengawet, dibuat segar setiap hari untuk menemani aktivitas sehat Anda.',
  whatsappNumber: '6281234567890',
  address: 'Jl. Melati Segar No. 28, Kemang, Jakarta Selatan',
  openingHours: 'Setiap Hari · 08.00 – 21.00 WIB',
  email: 'halo@segarsari.id',
  instagramHandle: '@segarsari.id',
  logoUrl: '/images/hero-jus.jpg',
  bannerUrl: '/images/hero-jus.jpg',
};

const StoreContext = createContext<StoreContextValue>({
  settings: defaultSettings,
  categories: [],
  loading: true,
  refreshStore: async () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshStore = useCallback(async () => {
    try {
      const [settingsRes, catRes] = await Promise.all([
        fetch('/api/store-settings'),
        fetch('/api/categories'),
      ]);
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.settings) setSettings(sData.settings);
      }
      if (catRes.ok) {
        const cData = await catRes.json();
        if (Array.isArray(cData.categories)) setCategories(cData.categories);
      }
    } catch (err) {
      console.error('Failed to load store context:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStore();
  }, [refreshStore]);

  return (
    <StoreContext.Provider value={{ settings, categories, loading, refreshStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
