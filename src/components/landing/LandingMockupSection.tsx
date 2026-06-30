import LandingPhoneMockup from "./LandingPhoneMockup";

interface LandingMockupSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  cta?: { label: string; onClick: () => void };
  reverse?: boolean;
}

/** Bloc texte + mockup iPhone (image) — alternance gauche/droite le long de la page */
export default function LandingMockupSection({
  eyebrow,
  title,
  description,
  imageSrc,
  imageAlt,
  cta,
  reverse = false,
}: LandingMockupSectionProps) {
  return (
    <div
      className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        reverse ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""
      }`}
    >
      <div className={reverse ? "lg:pl-4" : "lg:pr-4"}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(266_62%_33%)] mb-3">
          {eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {title}
        </h2>
        <p className="mt-4 text-slate-600 leading-relaxed text-[15px]">{description}</p>
        {cta && (
          <button
            type="button"
            onClick={cta.onClick}
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(266_62%_33%)] hover:gap-3 transition-all"
          >
            {cta.label}
            <span aria-hidden>→</span>
          </button>
        )}
      </div>
      <LandingPhoneMockup src={imageSrc} alt={imageAlt} />
    </div>
  );
}
