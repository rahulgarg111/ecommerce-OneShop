import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  /** Rendered width in px; Unsplash images are fetched at roughly 2x this size */
  width?: number;
}

const sized = (src: string, width?: number) => {
  if (!width || !src.includes('images.unsplash.com')) return src;
  const px = Math.min(800, width * 2);
  return src.replace(/([?&])w=\d+/, `$1w=${px}`).replace(/([?&])h=\d+/, `$1h=${px}`);
};

/** Image with lazy loading, a fade-in and a neat placeholder if it fails. */
const SmartImage = ({ src, alt, className = '', width }: SmartImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 ${className}`}>
        <ImageOff className="w-8 h-8" />
      </div>
    );
  }

  return (
    <img
      src={sized(src, width)}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default SmartImage;
