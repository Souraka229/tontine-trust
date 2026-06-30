import { useState } from "react";
import { Smartphone } from "lucide-react";

const FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"><rect width="390" height="844" rx="48" fill="#f1f5f9"/><rect x="40" y="120" width="310" height="200" rx="16" fill="#e2e8f0"/><text x="195" y="230" text-anchor="middle" fill="#64748b" font-family="system-ui" font-size="14">Aperçu indisponible</text></svg>',
)}`;

const SIZE_CLASS = {
  sm: "max-w-[260px]",
  md: "max-w-[300px]",
  lg: "max-w-[min(88vw,340px)] sm:max-w-[360px] lg:max-w-[400px]",
} as const;

/** Mockup iPhone complet (image avec cadre intégré) */
export default function LandingPhoneMockup({
  src,
  alt,
  size = "md",
  crop = false,
  floating = true,
}: {
  src: string;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  crop?: boolean;
  floating?: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    if (imgSrc !== FALLBACK_SVG) setImgSrc(FALLBACK_SVG);
    else setFailed(true);
  };

  return (
    <div
      className={`w-full ${SIZE_CLASS[size]} mx-auto ${floating ? "tc-phone-float" : ""} animate-fade-in`}
    >
      {failed ? (
        <div className="w-full aspect-[390/844] rounded-[2.5rem] border-2 border-violet-100 bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Smartphone className="w-10 h-10 text-violet-300" />
          <p className="text-xs text-slate-500">Aperçu non chargé</p>
        </div>
      ) : crop ? (
        <div className="relative w-full aspect-[390/844] overflow-hidden rounded-[1.75rem] drop-shadow-[0_16px_36px_rgba(64,25,109,0.28)]">
          <img
            src={imgSrc}
            alt={alt}
            width={390}
            height={844}
            className="absolute left-1/2 top-1/2 w-[162%] max-w-none h-auto -translate-x-1/2 -translate-y-[46%]"
            decoding="async"
            loading="eager"
            onError={onError}
          />
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          width={390}
          height={844}
          className="w-full h-auto block drop-shadow-[0_16px_36px_rgba(64,25,109,0.28)]"
          decoding="async"
          loading="eager"
          onError={onError}
        />
      )}
    </div>
  );
}
