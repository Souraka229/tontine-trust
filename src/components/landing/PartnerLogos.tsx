/** Intégrations réellement branchées dans le projet */
const PAYMENTS = [
  { src: "/logos/kkiapay.svg", alt: "Kkiapay" },
  { src: "/logos/mtn-momo.svg", alt: "MTN MoMo" },
  { src: "/logos/moov-money.svg", alt: "Moov Money" },
];

const CRYPTO = [
  { src: "/logos/bitcoin.svg", alt: "Bitcoin" },
  { src: "/logos/whatsapp.svg", alt: "WhatsApp" },
];

export default function PartnerLogos() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Mobile Money · Bénin
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10 opacity-80 hover:opacity-100 transition-opacity">
          {PAYMENTS.map((p) => (
            <img
              key={p.alt}
              src={p.src}
              alt={p.alt}
              className="h-6 sm:h-7 w-auto object-contain grayscale-[20%] hover:grayscale-0 transition-all"
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-10 opacity-80 hover:opacity-100 transition-opacity">
        {CRYPTO.map((p) => (
          <img
            key={p.alt}
            src={p.src}
            alt={p.alt}
            className="h-7 sm:h-8 w-auto object-contain grayscale-[20%] hover:grayscale-0 transition-all"
          />
        ))}
      </div>
    </div>
  );
}
