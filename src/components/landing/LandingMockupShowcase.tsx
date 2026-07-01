import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { LANDING_MOCKUP_SLIDES, type MockupTabId } from "@/data/landingMockups";
import LandingPhoneMockup from "./LandingPhoneMockup";

const WHATSAPP_COMMANDS = ["/aide", "CREER", "REJOINDRE", "TONTINE", "/solde", "/cotiser", "/bitcoin", "/score"];

export default function LandingMockupShowcase() {
  const navigate = useNavigate();
  const [active, setActive] = useState<MockupTabId>("home");
  const slide = LANDING_MOCKUP_SLIDES.find((s) => s.id === active) ?? LANDING_MOCKUP_SLIDES[0];

  return (
    <div className="rounded-3xl bg-white border border-violet-100 tc-shadow-card-cw overflow-hidden">
      <div className="flex flex-wrap gap-2 p-4 sm:p-5 pb-0 sm:pb-0 border-b border-violet-50">
        {LANDING_MOCKUP_SLIDES.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[hsl(266_62%_33%)] text-white"
                  : "bg-violet-50 text-slate-600 hover:bg-violet-100 hover:text-[hsl(266_62%_33%)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-8 p-5 sm:p-6 lg:p-7">
        <div className="min-w-0 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(266_62%_33%)]">
            {slide.eyebrow}
          </p>
          <h3 className="mt-1.5 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {slide.title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{slide.description}</p>

          <ul className="mt-4 space-y-2">
            {slide.highlights.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700 leading-snug">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          {active === "whatsapp" && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {WHATSAPP_COMMANDS.map((cmd) => (
                <code
                  key={cmd}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-50 text-[hsl(266_62%_33%)] border border-violet-100"
                >
                  {cmd}
                </code>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap gap-2">
              {slide.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg bg-violet-50 px-3 py-2"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="text-xs font-bold text-[hsl(266_62%_33%)]">{stat.value}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate(slide.ctaPath)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(266_62%_33%)] hover:gap-2.5 transition-all shrink-0"
            >
              {slide.ctaLabel}
              <span aria-hidden>→</span>
            </button>
          </div>

          <p className="mt-4 text-[11px] text-slate-500 leading-relaxed lg:hidden">{slide.footnote}</p>
        </div>

        <figure className="flex flex-col items-center gap-2 shrink-0 mx-auto lg:mx-0">
          <LandingPhoneMockup
            key={slide.id}
            src={slide.src}
            alt={slide.alt}
            size="md"
            crop
            floating={false}
          />
          <figcaption className="hidden lg:block text-[11px] text-slate-500 text-center max-w-[260px] leading-snug">
            {slide.footnote}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
