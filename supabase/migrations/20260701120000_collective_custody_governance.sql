-- Garde collective inspirée coopératives / Bitsacco : 3 validations sur 5 gardiens pour débloquer la cagnotte.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS governance_threshold INTEGER NOT NULL DEFAULT 3
    CHECK (governance_threshold >= 1),
  ADD COLUMN IF NOT EXISTS governance_quorum INTEGER NOT NULL DEFAULT 5
    CHECK (governance_quorum >= 1);

ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS round_number INTEGER,
  ADD COLUMN IF NOT EXISTS approval_count INTEGER NOT NULL DEFAULT 0 CHECK (approval_count >= 0);

COMMENT ON COLUMN public.groups.governance_threshold IS 'Signatures gardiens requises (ex. 3 sur 5)';
COMMENT ON COLUMN public.groups.governance_quorum IS 'Nombre de gardiens désignés pour le groupe';

CREATE TABLE IF NOT EXISTS public.group_guardians (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_label  TEXT NOT NULL DEFAULT 'gardien'
    CHECK (role_label IN ('admin', 'senior', 'peer', 'witness', 'escrow')),
  turn_order  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (group_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_group_guardians_group ON public.group_guardians (group_id);

CREATE TABLE IF NOT EXISTS public.payout_guardian_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
  guardian_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (payout_request_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_guardian_approvals_pr ON public.payout_guardian_approvals (payout_request_id);

ALTER TABLE public.group_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_guardian_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_guardians_select" ON public.group_guardians FOR SELECT USING (true);
CREATE POLICY "payout_guardian_approvals_select" ON public.payout_guardian_approvals FOR SELECT USING (true);
CREATE POLICY "payout_guardian_approvals_insert" ON public.payout_guardian_approvals
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Désigne jusqu'à 5 gardiens parmi les membres (admin en premier, puis ordre de tour).
CREATE OR REPLACE FUNCTION public.fn_assign_group_guardians(p_group_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_member_count INTEGER;
  v_quorum       INTEGER;
  v_threshold    INTEGER;
  v_rank         INTEGER := 0;
  r              RECORD;
  v_labels       TEXT[] := ARRAY['admin', 'senior', 'peer', 'witness', 'escrow'];
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM public.group_members
  WHERE group_id = p_group_id AND status IS DISTINCT FROM 'excluded';

  IF v_member_count < 2 THEN
    RAISE EXCEPTION 'Au moins 2 membres requis pour la garde collective';
  END IF;

  v_quorum := LEAST(5, v_member_count);
  v_threshold := CASE
    WHEN v_quorum >= 5 THEN 3
    WHEN v_quorum = 4 THEN 3
    WHEN v_quorum = 3 THEN 2
    ELSE 2
  END;

  DELETE FROM public.group_guardians WHERE group_id = p_group_id;

  FOR r IN
    SELECT gm.profile_id, gm.role, gm.turn_order
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.status IS DISTINCT FROM 'excluded'
    ORDER BY
      CASE WHEN gm.role = 'admin' THEN 0 ELSE 1 END,
      COALESCE(gm.turn_order, 9999),
      gm.joined_at
    LIMIT 5
  LOOP
    v_rank := v_rank + 1;
    INSERT INTO public.group_guardians (group_id, profile_id, role_label, turn_order)
    VALUES (
      p_group_id,
      r.profile_id,
      CASE
        WHEN r.role = 'admin' THEN 'admin'
        ELSE v_labels[LEAST(v_rank, array_length(v_labels, 1))]
      END,
      r.turn_order
    );
  END LOOP;

  UPDATE public.groups
  SET governance_quorum = v_quorum, governance_threshold = v_threshold
  WHERE id = p_group_id;

  RETURN json_build_object(
    'ok', true,
    'quorum', v_quorum,
    'threshold', v_threshold,
    'guardians_assigned', v_rank
  );
END;
$$;

-- Approuver un décaissement en tant que gardien (3/5 → status approved).
CREATE OR REPLACE FUNCTION public.rpc_guardian_approve_payout(p_payout_request_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_pr        public.payout_requests%ROWTYPE;
  v_g         public.groups%ROWTYPE;
  v_threshold INTEGER;
  v_new_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_pr FROM public.payout_requests WHERE id = p_payout_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de versement introuvable';
  END IF;

  IF v_pr.status NOT IN ('pending_approval', 'pending_approvals', 'pending_signature') THEN
    RAISE EXCEPTION 'Cette demande n''est plus en attente de validation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_guardians
    WHERE group_id = v_pr.group_id AND profile_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Vous n''êtes pas gardien de ce groupe';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payout_guardian_approvals
    WHERE payout_request_id = p_payout_request_id AND guardian_id = v_uid
  ) THEN
    RETURN json_build_object('ok', true, 'already_approved', true, 'approval_count', v_pr.approval_count);
  END IF;

  INSERT INTO public.payout_guardian_approvals (payout_request_id, guardian_id)
  VALUES (p_payout_request_id, v_uid);

  v_new_count := v_pr.approval_count + 1;

  SELECT * INTO v_g FROM public.groups WHERE id = v_pr.group_id;
  v_threshold := COALESCE(v_g.governance_threshold, 3);

  UPDATE public.payout_requests
  SET
    approval_count = v_new_count,
    status = CASE WHEN v_new_count >= v_threshold THEN 'approved' ELSE 'pending_approvals' END,
    updated_at = timezone('utc', now())
  WHERE id = p_payout_request_id;

  RETURN json_build_object(
    'ok', true,
    'approval_count', v_new_count,
    'threshold', v_threshold,
    'fully_approved', v_new_count >= v_threshold
  );
END;
$$;

-- Activation : assigner les gardiens automatiquement.
CREATE OR REPLACE FUNCTION public.rpc_activate_group(p_group_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  g public.groups%ROWTYPE;
  v_gov json;
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

  v_gov := public.fn_assign_group_guardians(p_group_id);

  RETURN json_build_object('ok', true, 'group_id', p_group_id, 'status', 'active', 'governance', v_gov);
END;
$$;

-- Versement bloqué tant que la garde collective n'a pas validé (3/5).
CREATE OR REPLACE FUNCTION public.fn_tontine_finalize_paid_rounds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_cnt    INTEGER := 0;
  g        RECORD;
  v_total  INTEGER;
  v_paid   INTEGER;
  v_benef  UUID;
  v_pool   NUMERIC;
  v_next   INTEGER;
  v_pr_id  UUID;
BEGIN
  FOR g IN
    SELECT * FROM public.groups
    WHERE status = 'active'
      AND current_round > 0
  LOOP
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.group_members
    WHERE group_id = g.id
      AND status IS DISTINCT FROM 'excluded';

    SELECT COUNT(*)::INTEGER INTO v_paid
    FROM public.group_members
    WHERE group_id = g.id
      AND status = 'paid';

    IF g.cotisation_deadline_at < timezone('utc', now()) AND v_paid < v_total THEN
      UPDATE public.group_members
      SET status = 'late'
      WHERE group_id = g.id
        AND status = 'waiting';

      v_pool := v_total * g.contribution_amount;
      v_paid := v_total;

      UPDATE public.groups SET total_pool = v_pool WHERE id = g.id;
    ELSE
      v_pool := g.total_pool;
    END IF;

    IF v_total = 0 OR v_paid <> v_total THEN
      CONTINUE;
    END IF;

    SELECT profile_id INTO v_benef
    FROM public.group_members
    WHERE group_id = g.id
      AND turn_order = g.current_round
    LIMIT 1;

    IF v_benef IS NULL OR v_pool <= 0 THEN
      CONTINUE;
    END IF;

    -- Garde collective : payout_request approuvé par seuil de gardiens
    SELECT pr.id INTO v_pr_id
    FROM public.payout_requests pr
    WHERE pr.group_id = g.id
      AND COALESCE(pr.round_number, g.current_round) = g.current_round
      AND pr.status = 'approved'
      AND pr.approval_count >= COALESCE(g.governance_threshold, 3)
    ORDER BY pr.created_at DESC
    LIMIT 1;

    IF v_pr_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.transactions (
      profile_id, group_id, type, name, amount, talypay_status
    ) VALUES (
      v_benef,
      g.id,
      'payout'::public.transaction_type,
      'Versement cagnotte · tour ' || g.current_round::text || ' · garde ' || COALESCE(g.governance_threshold, 3) || '/' || COALESCE(g.governance_quorum, 5),
      v_pool,
      'simulated_success'
    );

    v_next := g.current_round + 1;

    UPDATE public.groups
    SET
      total_pool = 0,
      current_round = v_next,
      cotisation_deadline_at = CASE
        WHEN v_next > total_rounds THEN NULL
        ELSE timezone('utc', now()) + public.fn_freq_interval(frequency)
      END,
      next_payout_date = CASE
        WHEN v_next > total_rounds THEN NULL
        ELSE timezone('utc', now()) + public.fn_freq_interval(frequency)
      END,
      status = CASE
        WHEN v_next > total_rounds THEN 'completed'::public.group_status
        ELSE status
      END
    WHERE id = g.id;

    UPDATE public.group_members
    SET status = 'waiting', paid_date = NULL
    WHERE group_id = g.id
      AND status IS DISTINCT FROM 'excluded';

    UPDATE public.payout_requests
    SET status = 'executed', updated_at = timezone('utc', now())
    WHERE id = v_pr_id;

    v_cnt := v_cnt + 1;
  END LOOP;

  RETURN v_cnt;
END;
$$;

-- Rétro-assignation pour groupes déjà actifs
DO $$
DECLARE
  gid UUID;
BEGIN
  FOR gid IN
    SELECT g.id FROM public.groups g
    WHERE g.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM public.group_guardians gg WHERE gg.group_id = g.id)
  LOOP
    PERFORM public.fn_assign_group_guardians(gid);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assign_group_guardians(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assign_group_guardians(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_guardian_approve_payout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_guardian_approve_payout(UUID) TO service_role;
