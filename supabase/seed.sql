-- Seed trésor Bitcoin (singleton)
INSERT INTO public.btc_treasury_pool (id, tvl_fcfa, btc_reserve, sats_liquid, apy, contributors)
VALUES (1, 24800000, 0.42, 12500000, 8.4, 1284)
ON CONFLICT (id) DO UPDATE SET
  tvl_fcfa = EXCLUDED.tvl_fcfa,
  btc_reserve = EXCLUDED.btc_reserve,
  sats_liquid = EXCLUDED.sats_liquid,
  apy = EXCLUDED.apy,
  contributors = EXCLUDED.contributors,
  updated_at = timezone('utc', now());
