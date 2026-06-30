/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_KKIAPAY_PUBLIC_KEY?: string;
  readonly VITE_KKIAPAY_PRIVATE_KEY?: string;
  readonly VITE_KKIAPAY_SECRET?: string;
  readonly VITE_KKIAPAY_SANDBOX?: string;
  readonly VITE_TALYPAY_TOKEN?: string;
  /** Adresse Bitcoin trésor (lecture mempool.space). */
  readonly VITE_BTC_TREASURY_ADDRESS?: string;
  /** "false" pour désactiver le règlement immédiat fictif (prod + webhooks). */
  readonly VITE_DEMO_PAYMENTS?: string;
}
