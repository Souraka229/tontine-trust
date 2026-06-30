import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRIES = [
  { code: "BJ", name: "Bénin", prefix: "+229", flag: "🇧🇯" },
  { code: "CI", name: "Côte d'Ivoire", prefix: "+225", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal", prefix: "+221", flag: "🇸🇳" },
  { code: "TG", name: "Togo", prefix: "+228", flag: "🇹🇬" },
  { code: "GH", name: "Ghana", prefix: "+233", flag: "🇬🇭" },
  { code: "CM", name: "Cameroun", prefix: "+237", flag: "🇨🇲" },
  { code: "ML", name: "Mali", prefix: "+223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", prefix: "+226", flag: "🇧🇫" },
  { code: "NE", name: "Niger", prefix: "+227", flag: "🇳🇪" },
  { code: "GN", name: "Guinée", prefix: "+224", flag: "🇬🇳" },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  premium?: boolean;
}

export default function PhoneInput({ value, onChange, placeholder = "01 XX XX XX XX", label, className = "", premium = false }: PhoneInputProps) {
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [open, setOpen] = useState(false);
  const [localNumber, setLocalNumber] = useState(
    value ? value.replace(/^\+\d+\s?/, "") : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCountrySelect = (c: typeof COUNTRIES[0]) => {
    setCountry(c);
    setOpen(false);
    onChange(`${c.prefix} ${localNumber}`);
    inputRef.current?.focus();
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only digits and spaces
    const raw = e.target.value.replace(/[^\d\s]/g, "");
    setLocalNumber(raw);
    onChange(`${country.prefix} ${raw}`);
  };

  const shellClass = premium
    ? "flex items-stretch rounded-xl border border-violet-100 bg-[hsl(270_33%_99%)] focus-within:border-[hsl(266_62%_33%)] focus-within:ring-2 focus-within:ring-[hsl(266_62%_33%)]/15 focus-within:bg-white transition-all overflow-hidden"
    : "flex items-stretch rounded-xl border border-border bg-card focus-within:border-[hsl(var(--tc-green))] transition-colors overflow-hidden";

  const labelClass = premium
    ? "block text-xs font-semibold text-slate-600 mb-2 tracking-wide"
    : "block text-xs font-medium text-muted-foreground mb-1.5";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className={labelClass}>{label}</label>
      )}
      <div className={shellClass}>
        {/* Country selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="h-full flex items-center gap-1.5 px-3 border-r border-border text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-muted-foreground text-xs">{country.prefix}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute top-full left-0 z-50 mt-1 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-slide-up">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors text-sm ${
                    country.code === c.code ? "bg-[hsla(160,84%,39%,0.08)] text-[hsl(var(--tc-green))] font-semibold" : ""
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{c.prefix}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          ref={inputRef}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
