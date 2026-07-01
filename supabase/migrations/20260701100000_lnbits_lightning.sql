-- LNbits Lightning : dépôts trésor + registre btc_ledger

ALTER TABLE public.btc_treasury_pool
  ADD COLUMN IF NOT EXISTS ln_sats BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.btc_treasury_pool.ln_sats IS 'Sats reçus via LNbits (Lightning Network)';

CREATE TABLE IF NOT EXISTS public.btc_ln_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_hash    TEXT UNIQUE NOT NULL,
  bolt11          TEXT NOT NULL,
  amount_msat     BIGINT NOT NULL,
  sats            BIGINT NOT NULL CHECK (sats > 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  purpose         TEXT NOT NULL DEFAULT 'treasury_deposit'
                  CHECK (purpose IN ('treasury_deposit', 'member_payout', 'contribution')),
  profile_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_id        UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  memo            TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_btc_ln_payments_status ON public.btc_ln_payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_btc_ln_payments_profile ON public.btc_ln_payments (profile_id, created_at DESC);

ALTER TABLE public.btc_ln_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "btc_ln_payments_select_own" ON public.btc_ln_payments;
CREATE POLICY "btc_ln_payments_select_own" ON public.btc_ln_payments
  FOR SELECT USING (profile_id IS NULL OR auth.uid() = profile_id);

DROP POLICY IF EXISTS "btc_ln_payments_select_public_deposit" ON public.btc_ln_payments;
CREATE POLICY "btc_ln_payments_select_public_deposit" ON public.btc_ln_payments
  FOR SELECT USING (purpose = 'treasury_deposit');

ALTER TABLE public.btc_ledger DROP CONSTRAINT IF EXISTS btc_ledger_entry_type_check;
ALTER TABLE public.btc_ledger ADD CONSTRAINT btc_ledger_entry_type_check
  CHECK (entry_type IN (
    'buy_fcfa', 'stake', 'unstake', 'treasury_credit',
    'on_chain_deposit', 'ln_deposit'
  ));

CREATE OR REPLACE FUNCTION public.rpc_btc_ingest_ln_payment(
  p_payment_hash TEXT,
  p_sats BIGINT,
  p_bolt11 TEXT DEFAULT NULL,
  p_price_xof NUMERIC DEFAULT NULL,
  p_profile_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_fcfa NUMERIC;
  v_ln_row public.btc_ln_payments%ROWTYPE;
BEGIN
  IF p_payment_hash IS NULL OR length(trim(p_payment_hash)) = 0 THEN
    RAISE EXCEPTION 'payment_hash requis';
  END IF;
  IF p_sats IS NULL OR p_sats <= 0 THEN
    RAISE EXCEPTION 'sats invalides';
  END IF;

  SELECT * INTO v_ln_row FROM public.btc_ln_payments WHERE payment_hash = p_payment_hash;

  IF FOUND AND v_ln_row.status = 'paid' THEN
    RETURN json_build_object('ok', true, 'duplicate', true, 'payment_hash', p_payment_hash);
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.btc_ln_payments (
      payment_hash, bolt11, amount_msat, sats, status, purpose, profile_id, memo, paid_at
    ) VALUES (
      p_payment_hash,
      COALESCE(p_bolt11, ''),
      p_sats * 1000,
      p_sats,
      'paid',
      'treasury_deposit',
      p_profile_id,
      'LNbits ingest',
      timezone('utc', now())
    );
  ELSE
    UPDATE public.btc_ln_payments
    SET status = 'paid', paid_at = timezone('utc', now())
    WHERE payment_hash = p_payment_hash;
  END IF;

  IF EXISTS (SELECT 1 FROM public.btc_ledger WHERE idempotency_key = 'ln-' || p_payment_hash) THEN
    RETURN json_build_object('ok', true, 'duplicate', true, 'payment_hash', p_payment_hash);
  END IF;

  IF p_price_xof IS NOT NULL AND p_price_xof > 0 THEN
    v_fcfa := round((p_sats::numeric / 1e8) * p_price_xof, 2);
    UPDATE public.btc_treasury_pool SET btc_price_xof = p_price_xof WHERE id = 1;
  ELSE
    SELECT round((p_sats::numeric / 1e8) * COALESCE(btc_price_xof, 58500000), 2)
    INTO v_fcfa FROM public.btc_treasury_pool WHERE id = 1;
  END IF;

  UPDATE public.btc_treasury_pool
  SET
    ln_sats = ln_sats + p_sats,
    sats_liquid = sats_liquid + p_sats,
    tvl_fcfa = tvl_fcfa + COALESCE(v_fcfa, 0),
    contributors = contributors + 1,
    updated_at = timezone('utc', now())
  WHERE id = 1;

  INSERT INTO public.btc_ledger (
    profile_id, entry_type, sats_delta, fcfa_amount, btc_price_xof, idempotency_key, metadata
  ) VALUES (
    p_profile_id,
    'ln_deposit',
    p_sats,
    v_fcfa,
    p_price_xof,
    'ln-' || p_payment_hash,
    jsonb_build_object('payment_hash', p_payment_hash, 'source', 'lnbits')
  );

  RETURN json_build_object('ok', true, 'payment_hash', p_payment_hash, 'sats', p_sats, 'fcfa', v_fcfa);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_btc_ingest_ln_payment(TEXT, BIGINT, TEXT, NUMERIC, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_btc_ingest_ln_payment(TEXT, BIGINT, TEXT, NUMERIC, UUID) TO service_role;

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
    'treasury_ln_sats', (SELECT COALESCE(ln_sats, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_internal_sats', (SELECT COALESCE(internal_sats, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_sats_liquid', (SELECT COALESCE(sats_liquid, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_apy', (SELECT COALESCE(apy, 0) FROM public.btc_treasury_pool WHERE id = 1),
    'treasury_contributors', (SELECT COALESCE(contributors, 0) FROM public.btc_treasury_pool WHERE id = 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_public_stats() TO anon, authenticated;
