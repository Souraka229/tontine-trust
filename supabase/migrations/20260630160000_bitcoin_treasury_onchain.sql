-- Trésor Bitcoin : colonnes de réconciliation on-chain (mempool.space)

ALTER TABLE public.btc_treasury_pool
  ADD COLUMN IF NOT EXISTS treasury_address TEXT DEFAULT 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ADD COLUMN IF NOT EXISTS on_chain_sats BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_chain_sync TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.btc_treasury_pool.treasury_address IS 'Adresse Bitcoin publique du trésor (lecture mempool.space)';
COMMENT ON COLUMN public.btc_treasury_pool.on_chain_sats IS 'Dernier solde on-chain synchronisé (sats)';
COMMENT ON COLUMN public.btc_treasury_pool.last_chain_sync IS 'Horodatage dernière synchro mempool.space';
