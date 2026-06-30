import { Bell, Bitcoin, Home, PlusCircle, Search, User, Wallet } from "lucide-react";
import { formatFCFA, getBtcPool } from "@/lib/bitcoinWallet";

/** Aperçu fidèle à `Home.tsx` */
export function HomeScreenPreview() {
  return (
    <div className="bg-[hsl(270_33%_99%)] min-h-full text-left">
      <div className="tc-gradient-brand text-white px-3 pt-8 pb-4 relative">
        <div className="flex justify-between mb-3">
          <div className="w-7 h-7 rounded-full bg-white/20 text-[8px] font-bold flex items-center justify-center">AK</div>
          <Bell className="w-4 h-4 opacity-80" />
        </div>
        <p className="text-center text-[8px] text-white/70 mb-2">Mes soldes</p>
        <div className="rounded-xl bg-white/12 border border-white/20 px-3 py-3 text-center">
          <p className="text-[8px] text-white/75 uppercase">Solde disponible</p>
          <p className="text-lg font-bold mt-1">125 000</p>
          <p className="text-[7px] text-white/55">FCFA · TontineChain</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {["Cotiser", "Rejoindre", "Créer"].map((l) => (
            <div key={l} className="flex-1 py-1.5 rounded-lg bg-white/15 text-[7px] font-semibold text-center">{l}</div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-[9px] font-semibold mb-2">Mes groupes</p>
        <div className="rounded-lg border border-violet-100 bg-white p-2">
          <p className="text-[9px] font-semibold">Tontine Solidarité</p>
          <p className="text-[7px] text-slate-500">Tour 3/8 · 50 000 FCFA</p>
          <div className="h-1 rounded-full bg-violet-100 mt-1.5"><div className="h-full w-[38%] tc-gradient-brand rounded-full" /></div>
        </div>
      </div>
      <div className="flex justify-around border-t border-slate-200 bg-white py-1.5 mt-auto">
        {[
          { Icon: Home, label: "Accueil", active: true },
          { Icon: Wallet, label: "Portefeuille" },
          { Icon: Search, label: "Groupes" },
          { Icon: PlusCircle, label: "Cotiser" },
          { Icon: User, label: "Profil" },
        ].map(({ Icon, label, active }) => (
          <div key={label} className={`flex flex-col items-center gap-0.5 ${active ? "text-[hsl(266_62%_33%)]" : "text-slate-400"}`}>
            <Icon className="w-3 h-3" />
            <span className="text-[6px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Aperçu fidèle au bot WhatsApp — bulles gauche (bot) / droite (utilisateur) */
export function WhatsAppScreenPreview() {
  return (
    <div className="bg-[#0b141a] min-h-full h-full text-left flex flex-col">
      <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-[#25D366] shrink-0" aria-hidden />
        <div>
          <p className="text-white text-[9px] font-semibold leading-tight">TontineChain Bot</p>
          <p className="text-[#8696a0] text-[7px]">en ligne</p>
        </div>
      </div>
      <div className="flex-1 p-2.5 space-y-2 overflow-hidden">
        <div className="max-w-[88%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-2.5 py-1.5 text-[8px] text-[#e9edef]">
          Tapez /aide pour les commandes.
        </div>
        <div className="max-w-[72%] ml-auto rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-1.5 text-[8px] text-white text-center">
          /solde
        </div>
        <div className="max-w-[90%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-2.5 py-2 text-[8px] text-[#e9edef] leading-relaxed">
          <p className="font-semibold">Votre portefeuille</p>
          <p className="mt-0.5">Disponible : 125 000 FCFA</p>
        </div>
        <div className="max-w-[72%] ml-auto rounded-lg rounded-tr-sm bg-[#005c4b] px-2.5 py-1.5 text-[8px] text-white text-center">
          /aide
        </div>
        <div className="max-w-[92%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-2.5 py-1.5 text-[8px] text-[#e9edef]">
          /solde /groupes /cotiser /bitcoin
        </div>
      </div>
      <div className="shrink-0 px-2 pb-2.5">
        <div className="rounded-full bg-[#1f2c34] px-3 py-2 text-[8px] text-[#8696a0]">Message</div>
      </div>
    </div>
  );
}

/** Aperçu fidèle à `/crypto` */
export function CryptoScreenPreview() {
  const pool = getBtcPool();
  return (
    <div className="bg-white min-h-full text-left px-3 pt-7 pb-3">
      <p className="text-[10px] font-bold text-slate-800 mb-2">Trésor Bitcoin</p>
      <div className="rounded-xl tc-gradient-brand text-white p-3 mb-2">
        <p className="text-[8px] opacity-80">Trésor multisig</p>
        <p className="text-sm font-bold">{formatFCFA(pool.tvlFcfa)}</p>
        <p className="text-[7px] opacity-75 mt-0.5">{pool.btcReserve.toFixed(2)} BTC · {pool.apy}% APY</p>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-2 flex items-center gap-2">
        <Bitcoin className="w-4 h-4 text-amber-600" />
        <div>
          <p className="text-[8px] font-semibold text-amber-800">Prix live BTC/FCFA</p>
          <p className="text-[7px] text-slate-500">CoinGecko · mempool.space</p>
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-violet-200 p-2 text-center">
        <p className="text-[8px] font-semibold text-[hsl(266_62%_33%)]">Signer engagement secp256k1</p>
      </div>
    </div>
  );
}
