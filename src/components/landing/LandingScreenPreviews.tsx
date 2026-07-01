import { Bitcoin, Home, MessageCircle, PlusCircle, Search, User, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/bitcoinWallet";

/** Aperçu fidèle à `Home.tsx` */
export function HomeScreenPreview() {
  return (
    <div className="min-h-full bg-background text-foreground text-left flex flex-col">
      <div className="tc-gradient-hero text-white px-3 pt-8 pb-4">
        <p className="text-center text-[8px] text-white/70 mb-2">Mes soldes</p>
        <div className="rounded-xl bg-white/12 border border-white/20 px-3 py-3 text-center">
          <p className="text-[8px] text-white/75 uppercase">Solde disponible</p>
          <p className="text-lg font-bold mt-1">0</p>
          <p className="text-[7px] text-white/55">FCFA · HACKBIT</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {["Cotiser", "Rejoindre", "Créer"].map((l) => (
            <div key={l} className="flex-1 py-1.5 rounded-lg bg-white/15 text-[7px] font-semibold text-center">{l}</div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2 flex-1">
        <p className="text-[9px] font-semibold mb-2">Mes groupes</p>
        <div className="rounded-lg border border-border p-2 text-center text-[8px] text-muted-foreground">
          Aucun groupe encore
        </div>
      </div>
      <div className="mt-auto border-t border-border flex justify-around py-2 bg-card text-[7px] text-muted-foreground">
        <span className="text-[hsl(var(--tc-green))] font-semibold flex flex-col items-center gap-0.5"><Home className="w-3 h-3" />Accueil</span>
        <span className="flex flex-col items-center gap-0.5"><Wallet className="w-3 h-3" />Portefeuille</span>
        <span className="flex flex-col items-center gap-0.5"><Search className="w-3 h-3" />Groupes</span>
        <span className="flex flex-col items-center gap-0.5"><PlusCircle className="w-3 h-3" />Cotiser</span>
        <span className="flex flex-col items-center gap-0.5"><User className="w-3 h-3" />Profil</span>
      </div>
    </div>
  );
}

/** Aperçu fidèle au bot WhatsApp */
export function WhatsAppScreenPreview() {
  return (
    <div className="min-h-full h-full bg-[#0b141a] text-left flex flex-col">
      <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-full bg-[#25D366] shrink-0" aria-hidden />
        <div>
          <p className="text-white text-[9px] font-semibold leading-tight">HACKBIT Bot</p>
          <p className="text-[#8696a0] text-[7px]">en ligne</p>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-hidden">
        <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-2 py-1.5 text-[7px] text-[#e9edef]">
          Tapez /aide pour les commandes.
        </div>
        <div className="max-w-[72%] ml-auto rounded-lg rounded-tr-sm bg-[#005c4b] px-2 py-1 text-[7px] text-white text-center">
          /solde
        </div>
        <div className="max-w-[90%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-2 py-1.5 text-[7px] text-[#e9edef]">
          <p className="font-semibold">Votre portefeuille</p>
          <p>Disponible : 125 000 FCFA</p>
        </div>
        <div className="max-w-[72%] ml-auto rounded-lg rounded-tr-sm bg-[#005c4b] px-2 py-1 text-[7px] text-white text-center">
          /aide
        </div>
        <div className="max-w-[92%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-2 py-1.5 text-[7px] text-[#e9edef]">
          /solde · /groupes · /cotiser · /bitcoin
        </div>
      </div>
      <div className="shrink-0 px-2 pb-2">
        <div className="rounded-full bg-[#1f2c34] px-3 py-1.5 text-[7px] text-[#8696a0]">Message</div>
      </div>
    </div>
  );
}

/** Aperçu fidèle à `CryptoLiquidity.tsx` */
export function CryptoScreenPreview({ tvlFcfa, btcReserve }: { tvlFcfa: number; btcReserve: number }) {
  return (
    <div className="min-h-full bg-background text-left px-3 pt-7 pb-3">
      <p className="text-[10px] font-bold mb-2">Trésor Bitcoin</p>
      <div className="rounded-xl tc-gradient-brand text-white p-3 mb-2">
        <p className="text-[8px] opacity-80">Garde collective 3/5</p>
        <p className="text-sm font-bold">{formatFCFA(tvlFcfa)}</p>
        <p className="text-[7px] opacity-75 mt-0.5">{btcReserve.toFixed(2)} BTC en réserve</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 flex items-center gap-2">
        <Bitcoin className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <p className="text-[8px] font-semibold text-amber-800">Prix live · CoinGecko</p>
          <p className="text-[7px] text-slate-500">Acheter sats · Staker · Preuve</p>
        </div>
      </div>
    </div>
  );
}
