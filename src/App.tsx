import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreProvider } from './context/StoreContext';
import { AdminPage } from './pages/AdminPage';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { ImageAnalyzerPage } from './pages/ImageAnalyzerPage';
import { AboutPage, ContactPage, PrivacyPage } from './pages/InfoPages';
import { ProductDetailPage } from './pages/ProductDetailPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-[#fffdf6] text-[#1f2e24]">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/katalog" element={<CatalogPage />} />
                  <Route path="/produk/:slug" element={<ProductDetailPage />} />
                  <Route path="/keranjang" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/analisis-foto" element={<ImageAnalyzerPage />} />
                  <Route path="/tentang" element={<AboutPage />} />
                  <Route path="/kontak" element={<ContactPage />} />
                  <Route path="/privasi" element={<PrivacyPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                </Routes>
              </main>
              <Footer />
              <CartDrawer />
            </div>
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
