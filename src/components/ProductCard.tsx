import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatRupiah, type Product } from '../types';
import { ProductImage } from './ProductImage';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    if (product.stock <= 0 || !product.isAvailable) return;
    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const outOfStock = !product.isAvailable || product.stock <= 0;

  return (
    <article className="group bg-white border border-[#e3ece5] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(24,91,54,0.08)]">
      <Link
        to={`/produk/${product.slug}`}
        className="block aspect-[4/3] w-full bg-[#f5f8f5] overflow-hidden"
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-xs font-medium text-[#5c6b60]">
          <span>{product.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className={outOfStock ? 'text-red-600 font-semibold' : ''}>
            {outOfStock ? 'Habis' : `Stok ${product.stock}`}
          </span>
        </div>

        <Link
          to={`/produk/${product.slug}`}
          className="mt-1.5 font-display text-lg font-extrabold text-[#1f2e24] hover:text-[#27834d] transition-colors"
        >
          {product.name}
        </Link>

        <p className="mt-1.5 text-sm text-[#5c6b60] leading-relaxed line-clamp-2 flex-1">
          {product.description}
        </p>

        <div className="mt-5 pt-4 border-t border-[#eef3ef] flex items-center justify-between gap-3">
          <span className="font-display text-lg font-black text-[#185b36] tabular-nums whitespace-nowrap">
            {formatRupiah(product.price)}
          </span>

          <button
            type="button"
            disabled={outOfStock}
            onClick={handleAdd}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              justAdded
                ? 'bg-[#185b36] text-white'
                : 'bg-[#eaf7ed] text-[#185b36] hover:bg-[#27834d] hover:text-white'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Ditambah</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Keranjang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
