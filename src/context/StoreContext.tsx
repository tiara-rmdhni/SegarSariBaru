import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_STORE_SETTINGS,
} from '../data/fallbackCatalog';
import type { Category, StoreSettings } from '../types';

interface StoreContextValue {
  settings: StoreSettings;
  categories: Category[];
  loading: boolean;
  refreshStore: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
  storeName: DEFAULT_STORE_SETTINGS.storeName,
  description: DEFAULT_STORE_SETTINGS.description,
  whatsappNumber: DEFAULT_STORE_SETTINGS.whatsappNumber,
  address: DEFAULT_STORE_SETTINGS.address,
  openingHours: DEFAULT_STORE_SETTINGS.openingHours,
  email: DEFAULT_STORE_SETTINGS.email,
  instagramHandle: DEFAULT_STORE_SETTINGS.instagramHandle,
  logoUrl: DEFAULT_STORE_SETTINGS.logoUrl,
  bannerUrl: DEFAULT_STORE_SETTINGS.bannerUrl,
};

const StoreContext = createContext<StoreContextValue>({
  settings: defaultSettings,
  categories: DEFAULT_CATEGORIES,
  loading: false,
  refreshStore: async () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  const refreshStore = useCallback(async () => {
    try {
      const [settingsRes, catRes] = await Promise.all([
        fetch('/api/store-settings'),
        fetch('/api/categories'),
      ]);
      if (settingsRes.ok) {
        const sData = await settingsRes.json().catch(() => null);
        if (sData?.settings) setSettings(sData.settings);
      }
      if (catRes.ok) {
        const cData = await catRes.json().catch(() => null);
        if (Array.isArray(cData?.categories) && cData.categories.length > 0) {
          setCategories(cData.categories);
        }
      }
    } catch (err) {
      console.warn('Using default store catalog fallback:', err);
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
