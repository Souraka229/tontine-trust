-- Seed trésor : valeurs nulles (données réelles via sync on-chain + ledger)
INSERT INTO public.btc_treasury_pool (id, tvl_fcfa, btc_reserve, sats_liquid, internal_sats, on_chain_sats, apy, contributors)
VALUES (1, 0, 0, 0, 0, 0, 8.4, 0)
ON CONFLICT (id) DO UPDATE SET
  tvl_fcfa = 0,
  btc_reserve = 0,
  sats_liquid = 0,
  internal_sats = 0,
  apy = EXCLUDED.apy,
  updated_at = timezone('utc', now());
