import type { LucideIcon } from "lucide-react";
import {
  Sun,
  Moon,
  Lock,
  Fingerprint,
  KeyRound,
  Globe,
  Phone,
  Bell,
  MessageSquare,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/layout/TopBar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, Trash2, Users } from "lucide-react";
import { clearDemoAccounts, getDemoAccounts, removeDemoAccount, type DemoAccountRecord } from "@/lib/demoMultiAccount";
import { toast } from "sonner";

const MOMO_LOGOS = [
  { src: "/logos/mtn-momo.svg", alt: "MTN MoMo" },
  { src: "/logos/moov-money.svg", alt: "Moov Money" },
  { src: "/logos/orange-money.svg", alt: "Orange Money" },
  { src: "/logos/kkiapay.svg", alt: "Kkiapay" },
] as const;

type SettingItem = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  name: string;
  sub?: string;
  toggle?: boolean;
  checked?: boolean;
  onToggle?: () => void;
  arrow?: boolean;
  logos?: boolean;
};

export default function Parametres() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const [demoAccounts, setDemoAccounts] = useState<DemoAccountRecord[]>([]);

  const refreshDemo = useCallback(() => setDemoAccounts(getDemoAccounts()), []);

  useEffect(() => {
    refreshDemo();
  }, [refreshDemo]);

  const ThemeIcon = theme === "dark" ? Moon : Sun;

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Écran & Affichage",
      items: [
        {
          icon: ThemeIcon,
          iconBg: "bg-[hsla(258,90%,66%,0.12)]",
          iconColor: "text-[hsl(var(--tc-brand))]",
          name: "Mode Sombre / Clair",
          sub: "Basculer le thème de l'app",
          toggle: true,
          checked: theme === "dark",
          onToggle: toggleTheme,
        },
      ],
    },
    {
      title: "Sécurité",
      items: [
        {
          icon: Lock,
          iconBg: "bg-[hsla(160,84%,39%,0.12)]",
          iconColor: "text-[hsl(var(--tc-green))]",
          name: "Modifier le PIN",
          sub: "Dernier changement : il y a 30j",
          arrow: true,
        },
        {
          icon: Fingerprint,
          iconBg: "bg-[hsla(217,91%,60%,0.12)]",
          iconColor: "text-blue-600",
          name: "Biométrie",
          sub: "Empreinte / Face ID",
          toggle: true,
          checked: false,
        },
        {
          icon: KeyRound,
          iconBg: "bg-[hsla(258,90%,66%,0.12)]",
          iconColor: "text-[hsl(var(--tc-brand))]",
          name: "Contacts de confiance",
          sub: "2 contacts configurés",
          arrow: true,
        },
      ],
    },
    {
      title: "Comptes",
      items: [
        {
          icon: Phone,
          iconBg: "bg-[hsla(38,92%,50%,0.12)]",
          iconColor: "text-amber-600",
          name: "Portefeuilles liés",
          sub: "Mobile Money via Kkiapay",
          arrow: true,
          logos: true,
        },
        {
          icon: Globe,
          iconBg: "bg-[hsla(160,84%,39%,0.12)]",
          iconColor: "text-[hsl(var(--tc-green))]",
          name: "Langue",
          sub: "Français",
          arrow: true,
        },
        {
          icon: Phone,
          iconBg: "bg-[hsla(217,91%,60%,0.12)]",
          iconColor: "text-blue-600",
          name: "Mode USSD",
          sub: "Raccourci *784#",
          toggle: true,
          checked: false,
        },
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          icon: Bell,
          iconBg: "bg-[hsla(38,92%,50%,0.12)]",
          iconColor: "text-amber-600",
          name: "Push notifications",
          toggle: true,
          checked: true,
        },
        {
          icon: MessageSquare,
          iconBg: "bg-[hsla(160,84%,39%,0.12)]",
          iconColor: "text-[hsl(var(--tc-green))]",
          name: "Alertes SMS",
          toggle: true,
          checked: true,
        },
      ],
    },
  ];

  return (
    <div className="animate-fade-in pb-8 md:pb-10">
      <TopBar title="Paramètres" backTo="/profil" backLabel="Profil" />

      <div className="md:pt-2">
        {demoAccounts.length > 0 && (
          <div className="mx-4 md:mx-0 mt-3 mb-2 rounded-2xl border border-[hsla(160,35%,42%,0.2)] bg-[hsla(160,22%,96%,0.5)] dark:bg-[hsla(160,12%,14%,0.4)] p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[hsl(var(--tc-green))]" />
              <h3 className="text-xs font-semibold">Comptes démo (cet appareil)</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
              Utilisés pour la connexion rapide sur l'écran Connexion. Données locales uniquement.
            </p>
            <ul className="space-y-1.5 mb-2">
              {demoAccounts.map((a) => (
                <li
                  key={a.email}
                  className="flex items-center justify-between gap-2 text-xs bg-card/80 rounded-lg px-2 py-1.5 border border-border/60"
                >
                  <span className="truncate">
                    <span className="font-medium">{a.label}</span>
                    <span className="text-muted-foreground block truncate text-[10px]">{a.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      removeDemoAccount(a.email);
                      refreshDemo();
                      toast("Compte retiré", { duration: 2000 });
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-[hsl(var(--tc-red))]"
                    aria-label="Retirer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                clearDemoAccounts();
                refreshDemo();
                toast.success("Tous les comptes démo ont été effacés de l'appareil");
              }}
              className="text-[10px] font-medium text-[hsl(var(--tc-red))] underline"
            >
              Effacer tous les comptes mémorisés
            </button>
          </div>
        )}

        <div className="md:grid md:grid-cols-2 md:gap-6 md:px-0">
          {sections.map((section) => (
            <div key={section.title} className="md:rounded-2xl md:border md:border-border md:bg-card/40 md:overflow-hidden">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 md:px-5 pt-3 pb-1.5">
                {section.title}
              </h3>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors last:border-b-0"
                    onClick={() => {
                      if (item.onToggle) item.onToggle();
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                      >
                        <Icon className={`w-4 h-4 ${item.iconColor}`} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.sub && <p className="text-[10px] text-muted-foreground">{item.sub}</p>}
                        {item.logos && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {MOMO_LOGOS.map((logo) => (
                              <img
                                key={logo.alt}
                                src={logo.src}
                                alt={logo.alt}
                                className="h-6 w-auto object-contain rounded-md border border-border/50 bg-white px-1.5 py-0.5"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {item.toggle && (
                      <div
                        className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ml-2 ${
                          item.checked ? "bg-[hsl(var(--tc-green))]" : "bg-muted"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            item.checked ? "translate-x-4" : ""
                          }`}
                        />
                      </div>
                    )}
                    {item.arrow && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-4 md:px-0 pt-6 md:max-w-md space-y-2">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/connexion", { replace: true });
            }}
            className="w-full py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground"
          >
            Changer de compte
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/", { replace: true });
            }}
            className="w-full py-2.5 rounded-xl border border-[hsla(0,84%,60%,0.3)] text-[hsl(var(--tc-red))] text-sm font-semibold"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
