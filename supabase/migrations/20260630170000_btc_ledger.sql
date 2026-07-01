-- Journal immuable des opérations Bitcoin (registre comptable membre + trésor)

CREATE TABLE IF NOT EXISTS public.btc_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id        UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  entry_type      TEXT NOT NULL CHECK (entry_type IN ('buy_fcfa', 'stake', 'unstake', 'treasury_credit')),
  sats_delta      BIGINT NOT NULL,
  fcfa_amount     NUMERIC(15,2),
  btc_price_xof   NUMERIC(18,2),
  idempotency_key TEXT UNIQUE,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_btc_ledger_profile ON public.btc_ledger (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_btc_ledger_type ON public.btc_ledger (entry_type);

ALTER TABLE public.btc_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "btc_ledger_select_own" ON public.btc_ledger;
CREATE POLICY "btc_ledger_select_own" ON public.btc_ledger
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "btc_ledger_insert_none" ON public.btc_ledger;
CREATE POLICY "btc_ledger_insert_none" ON public.btc_ledger
  FOR INSERT WITH CHECK (false);

-- Solde dérivé du journal (source de vérité)
CREATE OR REPLACE VIEW public.btc_member_balances AS
SELECT
  profile_id,
  COALESCE(SUM(sats_delta) FILTER (WHERE entry_type IN ('buy_fcfa', 'unstake')), 0)::bigint AS sats_available,
  COALESCE(SUM(sats_delta) FILTER (WHERE entry_type = 'stake'), 0)::bigint AS sats_staked
FROM public.btc_ledger
GROUP BY profile_id;

GRANT SELECT ON public.btc_member_balances TO authenticated;

-- Lie un membre au registre interne (pas de clé privée on-chain)
CREATE OR REPLACE FUNCTION public.rpc_btc_link_wallet()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_addr TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  v_addr := 'registre:' || left(replace(v_uid::text, '-', ''), 24);

  INSERT INTO public.btc_user_wallets (profile_id, address, sats, staked_sats, linked_at, updated_at)
  VALUES (v_uid, v_addr, 0, 0, timezone('utc', now()), timezone('utc', now()))
  ON CONFLICT (profile_id) DO UPDATE SET
    updated_at = timezone('utc', now())
  RETURNING address INTO v_addr;

  RETURN json_build_object('ok', true, 'address', v_addr);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_btc_link_wallet() TO authenticated;

-- Achat FCFA → sats au cours marché (débit wallet_balance, crédit ledger + pool)
CREATE OR REPLACE FUNCTION public.rpc_btc_buy_fcfa(
  p_fcfa NUMERIC,
  p_price_xof NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_sats BIGINT;
  v_pool public.btc_treasury_pool%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_fcfa IS NULL OR p_fcfa <= 0 THEN RAISE EXCEPTION 'Montant FCFA invalide'; END IF;
  IF p_price_xof IS NULL OR p_price_xof <= 0 THEN RAISE EXCEPTION 'Cours BTC invalide'; END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.btc_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN json_build_object('ok', true, 'duplicate', true);
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_prof.wallet_balance < p_fcfa THEN
    RAISE EXCEPTION 'Solde FCFA insuffisant';
  END IF;

  v_sats := floor((p_fcfa / p_price_xof) * 100000000)::bigint;
  IF v_sats <= 0 THEN RAISE EXCEPTION 'Montant trop faible pour convertir en sats'; END IF;

  SELECT * INTO v_pool FROM public.btc_treasury_pool WHERE id = 1 FOR UPDATE;
  IF v_pool.sats_liquid < v_sats THEN
    RAISE EXCEPTION 'Liquidité sats insuffisante dans le trésor';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_fcfa, updated_at = timezone('utc', now())
  WHERE id = v_uid;

  UPDATE public.btc_treasury_pool
  SET
    sats_liquid = sats_liquid - v_sats,
    btc_reserve = btc_reserve + (v_sats::numeric / 1e8),
    tvl_fcfa = tvl_fcfa + p_fcfa,
    updated_at = timezone('utc', now())
  WHERE id = 1;

  INSERT INTO public.btc_ledger (profile_id, entry_type, sats_delta, fcfa_amount, btc_price_xof, idempotency_key)
  VALUES (v_uid, 'buy_fcfa', v_sats, p_fcfa, p_price_xof, p_idempotency_key);

  INSERT INTO public.btc_user_wallets (profile_id, address, sats, staked_sats, linked_at, updated_at)
  VALUES (v_uid, 'registre:' || left(replace(v_uid::text, '-', ''), 24), v_sats, 0, timezone('utc', now()), timezone('utc', now()))
  ON CONFLICT (profile_id) DO UPDATE SET
    sats = btc_user_wallets.sats + v_sats,
    updated_at = timezone('utc', now());

  RETURN json_build_object('ok', true, 'sats', v_sats, 'fcfa', p_fcfa);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_btc_buy_fcfa(NUMERIC, NUMERIC, TEXT) TO authenticated;

-- Stake : sats disponibles → trésor collectif
CREATE OR REPLACE FUNCTION public.rpc_btc_stake(
  p_sats BIGINT,
  p_price_xof NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_wallet public.btc_user_wallets%ROWTYPE;
  v_fcfa NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_sats IS NULL OR p_sats <= 0 THEN RAISE EXCEPTION 'Montant sats invalide'; END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.btc_ledger WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN json_build_object('ok', true, 'duplicate', true);
  END IF;

  SELECT * INTO v_wallet FROM public.btc_user_wallets WHERE profile_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_wallet.sats < p_sats THEN
    RAISE EXCEPTION 'Solde sats insuffisant';
  END IF;

  v_fcfa := round((p_sats::numeric / 1e8) * p_price_xof, 2);

  UPDATE public.btc_user_wallets
  SET sats = sats - p_sats, staked_sats = staked_sats + p_sats, updated_at = timezone('utc', now())
  WHERE profile_id = v_uid;

  UPDATE public.btc_treasury_pool
  SET
    tvl_fcfa = tvl_fcfa + v_fcfa,
    btc_reserve = btc_reserve + (p_sats::numeric / 1e8),
    contributors = contributors + 1,
    updated_at = timezone('utc', now())
  WHERE id = 1;

  INSERT INTO public.btc_ledger (profile_id, entry_type, sats_delta, fcfa_amount, btc_price_xof, idempotency_key)
  VALUES (v_uid, 'stake', p_sats, v_fcfa, p_price_xof, p_idempotency_key);

  RETURN json_build_object('ok', true, 'staked_sats', p_sats, 'fcfa_equiv', v_fcfa);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_btc_stake(BIGINT, NUMERIC, TEXT) TO authenticated;

-- Stats publiques landing (lecture seule)
CREATE OR REPLACE FUNCTION public.rpc_public_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public AS $$
  SELECT json_build_object(
    'members_count', (SELECT count(*)::int FROM public.profiles),
    'treasury_tvl_fcfa', (SELECT COALESCE(tvl_fcfa, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_btc_reserve', (SELECT COALESCE(btc_reserve, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_apy', (SELECT COALESCE(apy, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_contributors', (SELECT COALESCE(contributors, 0) FROM public.btc_treasury_pool WHERE id = 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_stats() TO anon, authenticated;
