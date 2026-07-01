-- TontineChain — Trésor Bitcoin + preuves + activation groupe (Supabase-only)

-- ============================================================================
-- 1. Trésor Bitcoin global (singleton)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.btc_treasury_pool (
    id              SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    tvl_fcfa        NUMERIC(18,2) NOT NULL DEFAULT 24800000,
    btc_reserve     NUMERIC(18,8) NOT NULL DEFAULT 0.42,
    sats_liquid     BIGINT      NOT NULL DEFAULT 12500000,
    apy             NUMERIC(6,2) NOT NULL DEFAULT 8.4,
    contributors    INTEGER     NOT NULL DEFAULT 1284,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.btc_treasury_pool (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Portefeuille sats par utilisateur
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.btc_user_wallets (
    profile_id      UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    address         TEXT        NOT NULL,
    sats            BIGINT      NOT NULL DEFAULT 0 CHECK (sats >= 0),
    staked_sats     BIGINT      NOT NULL DEFAULT 0 CHECK (staked_sats >= 0),
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 3. Preuves d'engagement Bitcoin (secp256k1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bitcoin_commitments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID        REFERENCES public.groups(id) ON DELETE SET NULL,
    profile_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    commitment_text TEXT        NOT NULL,
    document_hash   TEXT        NOT NULL,
    signature       TEXT        NOT NULL,
    pubkey_hint     TEXT        DEFAULT NULL,
    amount_fcfa     NUMERIC(15,2) DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bitcoin_commitments_group ON public.bitcoin_commitments (group_id);
CREATE INDEX IF NOT EXISTS idx_bitcoin_commitments_profile ON public.bitcoin_commitments (profile_id);

-- ============================================================================
-- 4. RLS
-- ============================================================================
ALTER TABLE public.btc_treasury_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btc_user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitcoin_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "btc_pool_select" ON public.btc_treasury_pool;
CREATE POLICY "btc_pool_select" ON public.btc_treasury_pool FOR SELECT USING (true);
DROP POLICY IF EXISTS "btc_pool_update" ON public.btc_treasury_pool;
CREATE POLICY "btc_pool_update" ON public.btc_treasury_pool FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "btc_wallet_select_own" ON public.btc_user_wallets;
CREATE POLICY "btc_wallet_select_own" ON public.btc_user_wallets FOR SELECT USING (auth.uid() = profile_id);
DROP POLICY IF EXISTS "btc_wallet_upsert_own" ON public.btc_user_wallets;
CREATE POLICY "btc_wallet_upsert_own" ON public.btc_user_wallets FOR ALL USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "btc_commitments_select" ON public.bitcoin_commitments;
CREATE POLICY "btc_commitments_select" ON public.bitcoin_commitments FOR SELECT USING (true);
DROP POLICY IF EXISTS "btc_commitments_insert" ON public.bitcoin_commitments;
CREATE POLICY "btc_commitments_insert" ON public.bitcoin_commitments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 5. Activation de groupe (sans Convex)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_activate_group(p_group_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    g public.groups%ROWTYPE;
BEGIN
    SELECT * INTO g FROM public.groups WHERE id = p_group_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Groupe introuvable';
    END IF;
    IF g.status <> 'pending' THEN
        RAISE EXCEPTION 'Le groupe n''est pas en attente d''activation';
    END IF;
    IF g.members_count < g.max_members THEN
        RAISE EXCEPTION 'Le groupe n''est pas complet (% / % membres)', g.members_count, g.max_members;
    END IF;

    UPDATE public.groups
    SET
        status = 'active',
        current_round = 1,
        cotisation_deadline_at = timezone('utc', now()) + public.fn_freq_interval(g.frequency),
        next_payout_date = timezone('utc', now()) + public.fn_freq_interval(g.frequency)
    WHERE id = p_group_id;

    UPDATE public.group_members
    SET status = 'waiting', paid_date = NULL
    WHERE group_id = p_group_id
      AND status IS DISTINCT FROM 'excluded';

    RETURN json_build_object('ok', true, 'group_id', p_group_id, 'status', 'active');
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_activate_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_activate_group(UUID) TO service_role;
