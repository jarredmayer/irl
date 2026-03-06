/**
 * LazyImage
 *
 * Image component with:
 * - Native lazy loading
 * - Blur-up placeholder effect
 * - Graceful fallback on error
 */

import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholderColor?: string;
}

export function LazyImage({
  src,
  alt,
  className = '',
  style,
  placeholderColor = '#e2e8f0',
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state when src changes
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Check if already loaded (cached)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        backgroundColor: placeholderColor,
      }}
    >
      {/* Placeholder shimmer */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: placeholderColor }}
        />
      )}

      {/* Actual image */}
      {!hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <svg
            className="w-8 h-8 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
