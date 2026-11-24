import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  formatDateTimeID,
  formatRupiah,
  type AuditLogRecord,
  type OrderRecord,
  type OrderStatus,
  type Product,
  type StoreSettings,
} from '../types';

type AdminTab = 'overview' | 'products' | 'orders' | 'settings' | 'audit';

const ORDER_STATUS_LIST: OrderStatus[] = [
  'Menunggu konfirmasi',
  'Diproses',
  'Siap diambil atau dikirim',
  'Selesai',
  'Dibatalkan',
];

function statusStyle(status: string): string {
  switch (status) {
    case 'Selesai':
      return 'text-[#15803d] bg-[#f0fdf4] border-[#bbf7d0]';
    case 'Siap diambil atau dikirim':
      return 'text-[#0369a1] bg-[#f0f9ff] border-[#bae6fd]';
    case 'Diproses':
      return 'text-[#b45309] bg-[#fffbeb] border-[#fde68a]';
    case 'Dibatalkan':
      return 'text-[#b91c1c] bg-[#fef2f2] border-[#fecaca]';
    default:
      return 'text-[#374151] bg-[#f9fafb] border-[#e5e7eb]';
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function AdminPage() {
  const {
    firebaseUser,
    verifiedUser,
    loading: authLoading,
    error: authError,
    signInWithGoogle,
    logout,
    getIdToken,
  } = useAuth();
  const { categories, settings, refreshStore } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [busy, setBusy] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Overview state
  const [overview, setOverview] = useState<{
    totalProducts: number;
    totalOrders: number;
    newOrders: number;
    completedOrders: number;
    totalRevenue: number;
    activeRevenue: number;
    recentOrders: OrderRecord[];
  } | null>(null);

  // Products state
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  const [pForm, setPForm] = useState({
    categoryId: 1,
    name: '',
    slug: '',
    description: '',
    price: 15000,
    stock: 30,
    imageUrl: '/images/products/alpukat.jpg',
    isFeatured: false,
    isAvailable: true,
  });

  // Orders state
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('semua');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Settings state
  const [sForm, setSForm] = useState<StoreSettings>(settings);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    setSForm(settings);
  }, [settings]);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await getIdToken();
      if (!token) throw new Error('Sesi berakhir. Silakan login ulang.');
      const headers = new Headers(init?.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Permintaan admin gagal.');
      }
      return data;
    },
    [getIdToken]
  );

  const loadTabData = useCallback(
    async (tab: AdminTab) => {
      if (!verifiedUser?.isAdmin) return;
      setBusy(true);
      setBannerMsg(null);
      try {
        if (tab === 'overview') {
          const data = await authedFetch('/api/admin/overview');
          setOverview(data);
        } else if (tab === 'products') {
          const data = await authedFetch('/api/admin/products');
          setAdminProducts(data.products || []);
        } else if (tab === 'orders') {
          const params = new URLSearchParams();
          if (orderSearch.trim()) params.set('search', orderSearch.trim());
          if (orderStatusFilter !== 'semua')
            params.set('status', orderStatusFilter);
          if (dateFrom) params.set('dateFrom', dateFrom);
          if (dateTo) params.set('dateTo', dateTo);
          const data = await authedFetch(
            `/api/admin/orders?${params.toString()}`
          );
          setOrders(data.orders || []);
        } else if (tab === 'audit') {
          const data = await authedFetch('/api/admin/audit-logs');
          setAuditLogs(data.logs || []);
        }
      } catch (err: any) {
        setBannerMsg({ type: 'error', text: err.message });
      } finally {
        setBusy(false);
      }
    },
    [
      authedFetch,
      verifiedUser?.isAdmin,
      orderSearch,
      orderStatusFilter,
      dateFrom,
      dateTo,
    ]
  );

  useEffect(() => {
    if (verifiedUser?.isAdmin) {
      loadTabData(activeTab);
    }
  }, [activeTab, verifiedUser?.isAdmin, loadTabData]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return adminProducts;
    return adminProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [adminProducts, productSearch]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setPForm({
      categoryId: categories[0]?.id ?? 1,
      name: '',
      slug: '',
      description: '',
      price: 15000,
      stock: 30,
      imageUrl: '/images/products/alpukat.jpg',
      isFeatured: false,
      isAvailable: true,
    });
    setProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setPForm({
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
      isFeatured: product.isFeatured,
      isAvailable: product.isAvailable,
    });
    setProductModalOpen(true);
  };

  const handleImageUpload = async (
    file: File | null,
    target: 'product' | 'logo' | 'banner',
    alsoAnalyze = false
  ) => {
    if (!file) return;
    setUploadingPhoto(true);
    setBannerMsg(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploaded = await authedFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (target === 'product') {
        setPForm((prev) => ({ ...prev, imageUrl: uploaded.imageUrl }));
      } else if (target === 'logo') {
        setSForm((prev) => ({ ...prev, logoUrl: uploaded.imageUrl }));
      } else {
        setSForm((prev) => ({ ...prev, bannerUrl: uploaded.imageUrl }));
      }

      if (alsoAnalyze && target === 'product') {
        setAnalyzingPhoto(true);
        const aiForm = new FormData();
        aiForm.append('image', file);
        const aiData = await authedFetch('/api/admin/analyze-product-photo', {
          method: 'POST',
          body: aiForm,
        });
        if (aiData.draft) {
          const matchedCat = categories.find(
            (c) => c.slug === aiData.draft.suggestedCategorySlug
          );
          setPForm((prev) => ({
            ...prev,
            name: aiData.draft.suggestedName || prev.name,
            slug: slugify(aiData.draft.suggestedName || prev.name),
            description: aiData.draft.suggestedDescription || prev.description,
            price: aiData.draft.suggestedPrice || prev.price,
            categoryId: matchedCat?.id ?? prev.categoryId,
          }));
        }
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setUploadingPhoto(false);
      setAnalyzingPhoto(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBannerMsg(null);
    try {
      const payload = {
        ...pForm,
        categoryId: Number(pForm.categoryId),
        price: Number(pForm.price),
        stock: Number(pForm.stock),
      };

      if (editingProduct) {
        await authedFetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setBannerMsg({
          type: 'success',
          text: `Produk "${pForm.name}" berhasil diperbarui.`,
        });
      } else {
        await authedFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setBannerMsg({
          type: 'success',
          text: `Produk "${pForm.name}" berhasil ditambahkan.`,
        });
      }
      setProductModalOpen(false);
      await loadTabData('products');
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await authedFetch(`/api/admin/products/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setBannerMsg({
        type: 'success',
        text: `Produk "${deleteTarget.name}" telah dihapus.`,
      });
      setDeleteTarget(null);
      await loadTabData('products');
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (orderId: number, status: OrderStatus) => {
    setBusy(true);
    setBannerMsg(null);
    try {
      const data = await authedFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, ...data.order } : null
        );
      }
      setBannerMsg({
        type: 'success',
        text: `Status pesanan ${data.order.orderNumber} diperbarui ke "${status}".`,
      });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBannerMsg(null);
    try {
      await authedFetch('/api/admin/store-settings', {
        method: 'PUT',
        body: JSON.stringify(sForm),
      });
      await refreshStore();
      setBannerMsg({
        type: 'success',
        text: 'Pengaturan toko berhasil disimpan.',
      });
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  // Loading Auth Gate
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#5c6b60]">
          <Loader2 className="w-5 h-5 animate-spin text-[#27834d]" />
          <span>Memverifikasi sesi administrator...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated Gate
  if (!firebaseUser || !verifiedUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-[#e3ece5] rounded-2xl p-8 text-center space-y-5">
          <ShieldCheck className="w-10 h-10 text-[#27834d] mx-auto" />
          <div>
            <h1 className="font-display text-2xl font-black text-[#185b36]">
              Login Admin Segar Sari
            </h1>
            <p className="mt-2 text-sm text-[#5c6b60]">
              Masuk menggunakan akun Google administrator yang terdaftar untuk mengelola menu, pesanan, dan pengaturan toko.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-3 px-5 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Masuk dengan Google
          </button>

          <Link
            to="/"
            className="block text-xs font-semibold text-[#5c6b60] hover:text-[#185b36]"
          >
            Kembali ke Beranda Toko
          </Link>
        </div>
      </div>
    );
  }

  // Non-Admin Access Denied (RBAC Enforced Server-Side)
  if (!verifiedUser.isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-5">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <div>
            <h1 className="font-display text-2xl font-black text-[#1f2e24]">
              Akses Ditolak (403)
            </h1>
            <p className="mt-2 text-sm text-[#5c6b60]">
              Akun <span className="font-semibold text-[#1f2e24]">{verifiedUser.email}</span> tidak terdaftar sebagai administrator Segar Sari.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold cursor-pointer"
            >
              Keluar & Ganti Akun
            </button>
            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl border border-[#d6e3da] text-sm font-bold text-[#185b36]"
            >
              Kembali ke Toko
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navTabs: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'orders', label: 'Pesanan', icon: ClipboardList },
    { id: 'settings', label: 'Pengaturan Toko', icon: Settings },
    { id: 'audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Admin Header */}
      <div className="bg-white border border-[#e3ece5] rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#5c6b60]">
            Admin Console / {navTabs.find((t) => t.id === activeTab)?.label}
          </p>
          <h1 className="font-display text-xl font-black text-[#185b36]">
            Dashboard Pengelola {settings.storeName}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-[#47594d]">
            {verifiedUser.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#d6e3da] hover:bg-[#f2f7f3] text-xs font-bold text-[#1f2e24] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 bg-white border border-[#e3ece5] rounded-2xl p-3 space-y-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#eaf7ed] text-[#185b36]'
                    : 'text-[#5c6b60] hover:bg-[#f7faf8] hover:text-[#1f2e24]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9 space-y-6">
          {bannerMsg && (
            <div
              role="status"
              className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
                bannerMsg.type === 'success'
                  ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                  : 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
              }`}
            >
              <span>{bannerMsg.text}</span>
              <button
                type="button"
                onClick={() => setBannerMsg(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#e3ece5] rounded-2xl p-5">
                  <p className="text-xs font-semibold text-[#5c6b60]">Total Produk</p>
                  <p className="mt-2 font-display text-2xl font-black text-[#1f2e24] tabular-nums">
                    {overview?.totalProducts ?? '—'}
                  </p>
                </div>
                <div className="bg-white border border-[#e3ece5] rounded-2xl p-5">
                  <p className="text-xs font-semibold text-[#5c6b60]">Total Pesanan</p>
                  <p className="mt-2 font-display text-2xl font-black text-[#1f2e24] tabular-nums">
                    {overview?.totalOrders ?? '—'}
                  </p>
                </div>
                <div className="bg-white border border-[#e3ece5] rounded-2xl p-5">
                  <p className="text-xs font-semibold text-[#5c6b60]">Pesanan Baru</p>
                  <p className="mt-2 font-display text-2xl font-black text-[#b45309] tabular-nums">
                    {overview?.newOrders ?? '—'}
                  </p>
                </div>
                <div className="bg-white border border-[#e3ece5] rounded-2xl p-5">
                  <p className="text-xs font-semibold text-[#5c6b60]">Omzet Selesai</p>
                  <p className="mt-2 font-display text-xl font-black text-[#185b36] tabular-nums">
                    {overview ? formatRupiah(overview.totalRevenue) : '—'}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#e3ece5] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#eef3ef] flex items-center justify-between">
                  <h2 className="font-display text-base font-extrabold text-[#1f2e24]">
                    Pesanan Terbaru
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#27834d] hover:underline cursor-pointer"
                  >
                    Kelola Semua Pesanan
                  </button>
                </div>

                {!overview || overview.recentOrders.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[#5c6b60]">
                    Belum ada pesanan masuk.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#f8fbf9] text-xs text-[#5c6b60] border-b border-[#eef3ef]">
                        <tr>
                          <th className="text-left px-6 py-3 font-semibold">No. Pesanan</th>
                          <th className="text-left px-4 py-3 font-semibold">Pelanggan</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="text-right px-6 py-3 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef3ef]">
                        {overview.recentOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#fafdfb]">
                            <td className="px-6 py-3 font-mono-num text-xs font-semibold text-[#185b36]">
                              {ord.orderNumber}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#1f2e24]">
                              {ord.customerName}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-md border text-xs font-semibold ${statusStyle(
                                  ord.status
                                )}`}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right font-bold tabular-nums">
                              {formatRupiah(ord.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="bg-white border border-[#e3ece5] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#eef3ef] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#6f8074] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Cari nama produk..."
                    className="pl-9 pr-4 py-2 rounded-xl border border-[#d6e3da] text-sm w-full sm:w-64"
                  />
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f8fbf9] text-xs text-[#5c6b60] border-b border-[#eef3ef]">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">Produk</th>
                      <th className="text-left px-4 py-3 font-semibold">Kategori</th>
                      <th className="text-right px-4 py-3 font-semibold">Harga</th>
                      <th className="text-right px-4 py-3 font-semibold">Stok</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-right px-6 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef3ef]">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#fafdfb]">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 rounded-lg overflow-hidden bg-[#f5f8f5] shrink-0">
                              <ProductImage
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-[#1f2e24]">{p.name}</p>
                              <p className="text-xs text-[#5c6b60]">{p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#47594d]">{p.categoryName}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatRupiah(p.price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.stock}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`font-semibold ${
                              p.isAvailable ? 'text-[#15803d]' : 'text-red-600'
                            }`}
                          >
                            {p.isAvailable ? 'Tersedia' : 'Nonaktif'}
                          </span>
                          {p.isFeatured && (
                            <span className="text-[#5c6b60]"> · Unggulan</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              aria-label={`Ubah ${p.name}`}
                              className="p-2 rounded-lg text-[#185b36] hover:bg-[#eaf7ed] cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              aria-label={`Hapus ${p.name}`}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#e3ece5] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari no. pesanan / nama..."
                  className="px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                >
                  <option value="semua">Semua Status</option>
                  {ORDER_STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Dari tanggal"
                  className="px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Sampai tanggal"
                  className="px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                />
              </div>

              <div className="bg-white border border-[#e3ece5] rounded-2xl overflow-hidden">
                {orders.length === 0 ? (
                  <p className="p-10 text-center text-sm text-[#5c6b60]">
                    Tidak ada pesanan yang cocok dengan filter saat ini.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#f8fbf9] text-xs text-[#5c6b60] border-b border-[#eef3ef]">
                        <tr>
                          <th className="text-left px-6 py-3 font-semibold">No. Pesanan</th>
                          <th className="text-left px-4 py-3 font-semibold">Pelanggan</th>
                          <th className="text-left px-4 py-3 font-semibold">Waktu</th>
                          <th className="text-right px-4 py-3 font-semibold">Total</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                          <th className="text-right px-6 py-3 font-semibold">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef3ef]">
                        {orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#fafdfb]">
                            <td className="px-6 py-3 font-mono-num text-xs font-semibold text-[#185b36]">
                              {ord.orderNumber}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#1f2e24]">
                                {ord.customerName}
                              </p>
                              <p className="text-xs text-[#5c6b60]">
                                {ord.customerWhatsapp}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#5c6b60] tabular-nums">
                              {formatDateTimeID(ord.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums">
                              {formatRupiah(ord.totalAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={ord.status}
                                disabled={busy}
                                onChange={(e) =>
                                  handleStatusChange(
                                    ord.id,
                                    e.target.value as OrderStatus
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusStyle(
                                  ord.status
                                )}`}
                              >
                                {ORDER_STATUS_LIST.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(ord)}
                                className="text-xs font-bold text-[#27834d] hover:underline cursor-pointer"
                              >
                                Rincian
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="bg-white border border-[#e3ece5] rounded-2xl p-6 space-y-5"
            >
              <h2 className="font-display text-lg font-extrabold text-[#1f2e24]">
                Pengaturan Profil & Kontak Toko
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                    Nama Toko
                  </label>
                  <input
                    type="text"
                    required
                    value={sForm.storeName}
                    onChange={(e) =>
                      setSForm((p) => ({ ...p, storeName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                    Nomor WhatsApp (Format 628...)
                  </label>
                  <input
                    type="text"
                    required
                    value={sForm.whatsappNumber}
                    onChange={(e) =>
                      setSForm((p) => ({ ...p, whatsappNumber: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                    Jam Buka
                  </label>
                  <input
                    type="text"
                    required
                    value={sForm.openingHours}
                    onChange={(e) =>
                      setSForm((p) => ({ ...p, openingHours: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                    Email Toko
                  </label>
                  <input
                    type="email"
                    required
                    value={sForm.email}
                    onChange={(e) =>
                      setSForm((p) => ({ ...p, email: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                    Instagram / Media Sosial
                  </label>
                  <input
                    type="text"
                    required
                    value={sForm.instagramHandle}
                    onChange={(e) =>
                      setSForm((p) => ({
                        ...p,
                        instagramHandle: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                    Alamat Toko
                  </label>
                  <input
                    type="text"
                    required
                    value={sForm.address}
                    onChange={(e) =>
                      setSForm((p) => ({ ...p, address: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1f2e24] mb-1">
                  Deskripsi Singkat Toko
                </label>
                <textarea
                  rows={3}
                  required
                  value={sForm.description}
                  onChange={(e) =>
                    setSForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#d6e3da] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#eef3ef]">
                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1.5">
                    Gambar Banner Beranda
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#f5f8f5] shrink-0">
                      <ProductImage
                        src={sForm.bannerUrl}
                        alt="Banner toko"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#cde0d3] text-xs font-bold text-[#185b36] hover:bg-[#eaf7ed] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Banner</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files?.[0] ?? null, 'banner')
                        }
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1f2e24] mb-1.5">
                    Gambar Logo
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#f5f8f5] shrink-0">
                      <ProductImage
                        src={sForm.logoUrl}
                        alt="Logo toko"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#cde0d3] text-xs font-bold text-[#185b36] hover:bg-[#eaf7ed] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Logo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files?.[0] ?? null, 'logo')
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || uploadingPhoto}
                className="px-6 py-3 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
              </button>
            </form>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="bg-white border border-[#e3ece5] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#eef3ef]">
                <h2 className="font-display text-base font-extrabold text-[#1f2e24]">
                  Log Aktivitas Keamanan & Admin
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#f8fbf9] text-[#5c6b60] border-b border-[#eef3ef]">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold">Waktu</th>
                      <th className="text-left px-4 py-3 font-semibold">Aktor</th>
                      <th className="text-left px-4 py-3 font-semibold">Aksi</th>
                      <th className="text-left px-4 py-3 font-semibold">Target</th>
                      <th className="text-left px-6 py-3 font-semibold">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef3ef]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#fafdfb]">
                        <td className="px-6 py-3 tabular-nums text-[#5c6b60]">
                          {formatDateTimeID(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#1f2e24]">
                          {log.actorEmail}
                        </td>
                        <td className="px-4 py-3 font-mono-num font-semibold text-[#185b36]">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-[#47594d]">
                          {log.targetType} ({log.targetId})
                        </td>
                        <td className="px-6 py-3 font-mono-num text-[#5c6b60]">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Create / Edit Modal */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-[#185b36]">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#f2f7f3] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#f5f8f5] border border-[#e3ece5] shrink-0">
                  <ProductImage
                    src={pForm.imageUrl}
                    alt={pForm.name || 'Preview'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#cde0d3] text-xs font-bold text-[#185b36] hover:bg-[#eaf7ed] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(
                          e.target.files?.[0] ?? null,
                          'product',
                          false
                        )
                      }
                    />
                  </label>

                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fff3db] border border-[#ffd894] text-xs font-bold text-[#9a5c14] hover:bg-[#ffe8bd] cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>
                      {analyzingPhoto
                        ? 'Menganalisis...'
                        : 'Unggah + Isi Otomatis Gemini'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(
                          e.target.files?.[0] ?? null,
                          'product',
                          true
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Nama Produk</label>
                  <input
                    type="text"
                    required
                    value={pForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPForm((prev) => ({
                        ...prev,
                        name: val,
                        slug: editingProduct ? prev.slug : slugify(val),
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Slug URL</label>
                  <input
                    type="text"
                    required
                    value={pForm.slug}
                    onChange={(e) =>
                      setPForm((prev) => ({
                        ...prev,
                        slug: slugify(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#d6e3da] text-sm font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Kategori</label>
                  <select
                    value={pForm.categoryId}
                    onChange={(e) =>
                      setPForm((prev) => ({
                        ...prev,
                        categoryId: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#d6e3da] text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      required
                      value={pForm.price}
                      onChange={(e) =>
                        setPForm((prev) => ({
                          ...prev,
                          price: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#d6e3da] text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Stok</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={pForm.stock}
                      onChange={(e) =>
                        setPForm((prev) => ({
                          ...prev,
                          stock: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#d6e3da] text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  required
                  value={pForm.description}
                  onChange={(e) =>
                    setPForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#d6e3da] text-sm"
                />
              </div>

              <div className="flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pForm.isAvailable}
                    onChange={(e) =>
                      setPForm((prev) => ({
                        ...prev,
                        isAvailable: e.target.checked,
                      }))
                    }
                  />
                  <span>Tersedia di Katalog</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pForm.isFeatured}
                    onChange={(e) =>
                      setPForm((prev) => ({
                        ...prev,
                        isFeatured: e.target.checked,
                      }))
                    }
                  />
                  <span>Tampilkan di Beranda</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#d6e3da] text-sm font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy || uploadingPhoto}
                  className="px-5 py-2 rounded-xl bg-[#27834d] hover:bg-[#185b36] text-white text-sm font-bold cursor-pointer"
                >
                  {busy ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h2 className="font-display text-lg font-black text-[#1f2e24]">
              Hapus Produk?
            </h2>
            <p className="text-sm text-[#5c6b60]">
              Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong>? Riwayat pesanan sebelumnya tetap aman tersimpan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#d6e3da] text-sm font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteProduct}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono-num text-xs font-bold text-[#27834d]">
                  {selectedOrder.orderNumber}
                </p>
                <h2 className="font-display text-xl font-black text-[#1f2e24]">
                  {selectedOrder.customerName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-[#f2f7f3] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm space-y-1.5 bg-[#f8fbf9] border border-[#eef3ef] rounded-xl p-4">
              <p>
                <span className="text-[#5c6b60]">WhatsApp:</span>{' '}
                <strong>{selectedOrder.customerWhatsapp}</strong>
              </p>
              <p>
                <span className="text-[#5c6b60]">Metode:</span>{' '}
                <strong>
                  {selectedOrder.fulfillmentMethod === 'delivery'
                    ? 'Antar Kurir'
                    : 'Ambil di Toko'}
                </strong>
              </p>
              {selectedOrder.customerAddress && (
                <p>
                  <span className="text-[#5c6b60]">Alamat:</span>{' '}
                  {selectedOrder.customerAddress}
                </p>
              )}
              {selectedOrder.notes && (
                <p>
                  <span className="text-[#5c6b60]">Catatan:</span>{' '}
                  {selectedOrder.notes}
                </p>
              )}
            </div>

            <div className="divide-y divide-[#eef3ef] text-sm">
              {(selectedOrder.items || []).map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between"
                >
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatRupiah(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#d6e3da] flex justify-between text-base font-black text-[#185b36]">
              <span>Total</span>
              <span className="tabular-nums">
                {formatRupiah(selectedOrder.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
