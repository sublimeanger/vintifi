import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** Aspect ratio class, e.g. "aspect-[4/5]" */
  aspectRatio?: string;
  loading?: "lazy" | "eager";
}

export function ProgressiveImage({ src, alt, className, aspectRatio, loading = "lazy" }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted/30", aspectRatio)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}
