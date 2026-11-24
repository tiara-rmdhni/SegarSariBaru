import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CartItem, Product } from '../types';

const CART_STORAGE_KEY = 'segar-sari-cart-v1';

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  syncWithCatalog: (products: Product[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.productId === 'number' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage quota errors
    }
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    const safeQty = Math.max(1, Math.min(50, Math.floor(quantity)));
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const maxAllowed = Math.max(1, product.stock);
        next[idx] = {
          ...next[idx],
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          stock: product.stock,
          quantity: Math.min(maxAllowed, next[idx].quantity + safeQty),
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          stock: product.stock,
          quantity: Math.min(Math.max(1, product.stock), safeQty),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const maxQty = item.stock > 0 ? item.stock : 50;
        return { ...item, quantity: Math.min(maxQty, Math.max(1, quantity)) };
      })
    );
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const syncWithCatalog = useCallback((products: Product[]) => {
    const map = new Map(products.map((p) => [p.id, p]));
    setItems((prev) =>
      prev
        .map((item) => {
          const fresh = map.get(item.productId);
          if (!fresh || !fresh.isAvailable || fresh.stock <= 0) return null;
          return {
            ...item,
            name: fresh.name,
            slug: fresh.slug,
            price: fresh.price,
            imageUrl: fresh.imageUrl,
            stock: fresh.stock,
            quantity: Math.min(item.quantity, fresh.stock),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        drawerOpen,
        setDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        syncWithCatalog,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
