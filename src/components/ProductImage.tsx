import { useState } from 'react';
import { Citrus } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#eaf7ed] to-[#fff3db] text-[#27834d] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Citrus className="w-10 h-10 mb-2 opacity-80" strokeWidth={1.75} />
        <span className="text-xs font-semibold text-[#185b36] line-clamp-2 max-w-[160px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}
