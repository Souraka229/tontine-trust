import type { ReactNode } from "react";

interface IPhoneFrameProps {
  children?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  tilt?: "left" | "center" | "right" | "none";
  size?: "sm" | "md" | "lg";
}

const tiltClass = {
  left: "-rotate-6 -translate-x-2",
  center: "rotate-0",
  right: "rotate-6 translate-x-2",
  none: "",
};

const sizeClass = {
  sm: "w-[200px] sm:w-[220px]",
  md: "w-[240px] sm:w-[270px]",
  lg: "w-[260px] sm:w-[300px]",
};

/** Cadre iPhone 15 Pro (Dynamic Island) — contenu React ou image PNG. */
export default function IPhoneFrame({
  children,
  imageSrc,
  imageAlt = "Aperçu HACKBIT sur iPhone",
  className = "",
  tilt = "none",
  size = "md",
}: IPhoneFrameProps) {
  return (
    <div
      className={`relative mx-auto transition-transform duration-500 hover:scale-[1.01] ${sizeClass[size]} ${tiltClass[tilt]} ${className}`}
    >
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-violet-400/12 via-transparent to-amber-400/8 blur-2xl pointer-events-none" />
      <div
        className="relative rounded-[2.75rem] p-[2.5px] shadow-[0_18px_40px_-14px_rgba(64,25,109,0.35)]"
        style={{
          background: "linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 40%, #2c2c2e 100%)",
        }}
      >
        <div className="rounded-[2.6rem] bg-[#0a0a0a] p-[7px]">
          <div className="relative rounded-[2.2rem] overflow-hidden bg-black aspect-[9/19.5]">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 w-[28%] h-[22px] bg-black rounded-full shadow-inner" />
            {/* Boutons latéraux */}
            <div className="absolute -left-[2px] top-[18%] w-[3px] h-8 bg-[#2a2a2c] rounded-l-sm" />
            <div className="absolute -left-[2px] top-[28%] w-[3px] h-14 bg-[#2a2a2c] rounded-l-sm" />
            <div className="absolute -right-[2px] top-[22%] w-[3px] h-20 bg-[#2a2a2c] rounded-r-sm" />

            {imageSrc ? (
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full overflow-hidden pt-7">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[60%] h-3 bg-violet-900/10 blur-lg rounded-full" />
    </div>
  );
}
