-- Trésor Bitcoin honnête : on-chain séparé du registre interne + sync tx + crédit cotisation

-- ── Colonnes trésor ─────────────────────────────────────────────────────────
ALTER TABLE public.btc_treasury_pool
  ADD COLUMN IF NOT EXISTS internal_sats BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS btc_price_xof NUMERIC(18,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS treasury_network TEXT NOT NULL DEFAULT 'mainnet';

COMMENT ON COLUMN public.btc_treasury_pool.internal_sats IS 'Sats comptables (FCFA→sats, stake, 2% cotisations) — hors chaîne';
COMMENT ON COLUMN public.btc_treasury_pool.on_chain_sats IS 'Sats réellement reçus sur l''adresse trésor (mempool.space)';

-- Réinitialiser les chiffres fictifs (source de vérité = sync + ledger)
UPDATE public.btc_treasury_pool
SET
  tvl_fcfa = 0,
  btc_reserve = 0,
  sats_liquid = 0,
  internal_sats = 0,
  on_chain_sats = COALESCE(on_chain_sats, 0),
  contributors = 0,
  updated_at = timezone('utc', now())
WHERE id = 1;

-- ── Transactions on-chain ingérées ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.btc_on_chain_txs (
  txid          TEXT PRIMARY KEY,
  sats          BIGINT NOT NULL CHECK (sats > 0),
  confirmed_at  TIMESTAMPTZ,
  ingested_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.btc_on_chain_txs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "btc_on_chain_txs_select" ON public.btc_on_chain_txs;
CREATE POLICY "btc_on_chain_txs_select" ON public.btc_on_chain_txs FOR SELECT USING (true);

-- ── Journal : dépôts on-chain + crédits cotisation ──────────────────────────
ALTER TABLE public.btc_ledger
  ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.btc_ledger DROP CONSTRAINT IF EXISTS btc_ledger_entry_type_check;
ALTER TABLE public.btc_ledger ADD CONSTRAINT btc_ledger_entry_type_check
  CHECK (entry_type IN ('buy_fcfa', 'stake', 'unstake', 'treasury_credit', 'on_chain_deposit'));

CREATE OR REPLACE VIEW public.btc_member_balances AS
SELECT
  profile_id,
  COALESCE(SUM(sats_delta) FILTER (WHERE entry_type IN ('buy_fcfa', 'unstake', 'treasury_credit')), 0)::bigint AS sats_available,
  COALESCE(SUM(sats_delta) FILTER (WHERE entry_type = 'stake'), 0)::bigint AS sats_staked
FROM public.btc_ledger
WHERE profile_id IS NOT NULL
GROUP BY profile_id;

-- ── Ingestion tx on-chain (service_role / edge function) ────────────────────
CREATE OR REPLACE FUNCTION public.rpc_btc_ingest_on_chain_tx(
  p_txid TEXT,
  p_sats BIGINT,
  p_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  p_price_xof NUMERIC DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_fcfa NUMERIC;
BEGIN
  IF p_txid IS NULL OR length(trim(p_txid)) = 0 THEN
    RAISE EXCEPTION 'txid requis';
  END IF;
  IF p_sats IS NULL OR p_sats <= 0 THEN
    RAISE EXCEPTION 'sats invalides';
  END IF;

  INSERT INTO public.btc_on_chain_txs (txid, sats, confirmed_at)
  VALUES (p_txid, p_sats, p_confirmed_at)
  ON CONFLICT (txid) DO NOTHING;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'duplicate', true, 'txid', p_txid);
  END IF;

  IF p_price_xof IS NOT NULL AND p_price_xof > 0 THEN
    v_fcfa := round((p_sats::numeric / 1e8) * p_price_xof, 2);
    UPDATE public.btc_treasury_pool
    SET btc_price_xof = p_price_xof
    WHERE id = 1;
  ELSE
    SELECT round((p_sats::numeric / 1e8) * COALESCE(btc_price_xof, 58500000), 2)
    INTO v_fcfa FROM public.btc_treasury_pool WHERE id = 1;
  END IF;

  UPDATE public.btc_treasury_pool
  SET
    on_chain_sats = COALESCE(on_chain_sats, 0) + p_sats,
    sats_liquid = sats_liquid + p_sats,
    btc_reserve = (COALESCE(on_chain_sats, 0) + p_sats)::numeric / 1e8,
    tvl_fcfa = tvl_fcfa + COALESCE(v_fcfa, 0),
    contributors = contributors + 1,
    updated_at = timezone('utc', now())
  WHERE id = 1;

  INSERT INTO public.btc_ledger (
    profile_id, entry_type, sats_delta, fcfa_amount, btc_price_xof, idempotency_key, metadata
  ) VALUES (
    NULL,
    'on_chain_deposit',
    p_sats,
    v_fcfa,
    p_price_xof,
    'onchain-' || p_txid,
    jsonb_build_object('txid', p_txid, 'source', 'mempool.space')
  );

  RETURN json_build_object('ok', true, 'txid', p_txid, 'sats', p_sats, 'fcfa', v_fcfa);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_btc_ingest_on_chain_tx(TEXT, BIGINT, TIMESTAMPTZ, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_btc_ingest_on_chain_tx(TEXT, BIGINT, TIMESTAMPTZ, NUMERIC) TO service_role;

-- ── Crédit trésor : 2 % de chaque cotisation réussie ────────────────────────
CREATE OR REPLACE FUNCTION public.fn_treasury_credit_from_contribution(
  p_profile_id UUID,
  p_group_id UUID,
  p_fcfa NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_credit_fcfa NUMERIC;
  v_price NUMERIC;
  v_sats BIGINT;
  v_key TEXT;
BEGIN
  IF p_fcfa IS NULL OR p_fcfa <= 0 THEN RETURN; END IF;

  v_credit_fcfa := round(p_fcfa * 0.02, 2);
  IF v_credit_fcfa < 1 THEN RETURN; END IF;

  SELECT COALESCE(btc_price_xof, 58500000) INTO v_price FROM public.btc_treasury_pool WHERE id = 1;
  v_sats := floor((v_credit_fcfa / v_price) * 100000000)::bigint;
  IF v_sats <= 0 THEN RETURN; END IF;

  v_key := 'contrib-' || p_group_id::text || '-' || p_profile_id::text || '-' || v_credit_fcfa::text;

  IF EXISTS (SELECT 1 FROM public.btc_ledger WHERE idempotency_key = v_key) THEN
    RETURN;
  END IF;

  UPDATE public.btc_treasury_pool
  SET
    internal_sats = internal_sats + v_sats,
    tvl_fcfa = tvl_fcfa + v_credit_fcfa,
    updated_at = timezone('utc', now())
  WHERE id = 1;

  INSERT INTO public.btc_ledger (
    profile_id, group_id, entry_type, sats_delta, fcfa_amount, btc_price_xof, idempotency_key, metadata
  ) VALUES (
    p_profile_id,
    p_group_id,
    'treasury_credit',
    v_sats,
    v_credit_fcfa,
    v_price,
    v_key,
    jsonb_build_object('rate', 0.02, 'source', 'contribution')
  );
END;
$$;

-- ── Achat FCFA → sats (registre interne, liquidité on-chain requise) ────────
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
    RAISE EXCEPTION 'Liquidité on-chain insuffisante (% sats disponibles). Déposez des BTC sur l''adresse trésor.', v_pool.sats_liquid;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_fcfa, updated_at = timezone('utc', now())
  WHERE id = v_uid;

  UPDATE public.btc_treasury_pool
  SET
    sats_liquid = sats_liquid - v_sats,
    internal_sats = internal_sats + v_sats,
    tvl_fcfa = tvl_fcfa + p_fcfa,
    btc_price_xof = p_price_xof,
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

-- ── Stake : registre interne uniquement ─────────────────────────────────────
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
    btc_price_xof = p_price_xof,
    updated_at = timezone('utc', now())
  WHERE id = 1;

  INSERT INTO public.btc_ledger (profile_id, entry_type, sats_delta, fcfa_amount, btc_price_xof, idempotency_key)
  VALUES (v_uid, 'stake', p_sats, v_fcfa, p_price_xof, p_idempotency_key);

  RETURN json_build_object('ok', true, 'staked_sats', p_sats, 'fcfa_equiv', v_fcfa);
END;
$$;

-- ── Hook cotisation → trésor ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_group_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_abs NUMERIC;
BEGIN
  v_status := public.fn_tx_payment_status(NEW);

  IF NOT public.fn_payment_success(v_status) OR NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'contribution' AND NEW.amount < 0 THEN
    v_abs := ABS(NEW.amount);

    UPDATE public.groups
    SET total_pool = total_pool + v_abs
    WHERE id = NEW.group_id;

    UPDATE public.group_members
    SET status = 'paid', paid_date = timezone('utc', now())
    WHERE group_id = NEW.group_id
      AND profile_id = NEW.profile_id
      AND status <> 'paid';

    PERFORM public.fn_treasury_credit_from_contribution(NEW.profile_id, NEW.group_id, v_abs);
  END IF;

  RETURN NEW;
END;
$$;

-- Stats publiques : séparer on-chain et registre
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
    'treasury_on_chain_sats', (SELECT COALESCE(on_chain_sats, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_internal_sats', (SELECT COALESCE(internal_sats, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_sats_liquid', (SELECT COALESCE(sats_liquid, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_apy', (SELECT COALESCE(apy, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_contributors', (SELECT COALESCE(contributors, 0) FROM public.btc_treasury_pool WHERE id = 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_stats() TO anon, authenticated;
