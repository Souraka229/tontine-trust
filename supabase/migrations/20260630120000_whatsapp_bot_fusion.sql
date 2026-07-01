-- Fusion bot WhatsApp : sessions conversationnelles + codes d'invitation courts (FlashBot)

ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_invite_code
    ON public.groups (invite_code)
    WHERE invite_code IS NOT NULL;

-- Codes courts pour groupes existants sans invite_code
UPDATE public.groups g
SET invite_code = 'TONT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
WHERE g.invite_code IS NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    phone       TEXT        PRIMARY KEY,
    profile_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
    flow        TEXT        NOT NULL CHECK (flow IN ('create', 'join')),
    step        TEXT        NOT NULL,
    payload     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_profile
    ON public.whatsapp_sessions (profile_id);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_sessions_service ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_service ON public.whatsapp_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_sessions_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_own ON public.whatsapp_sessions
    FOR ALL TO authenticated
    USING (
        profile_id = auth.uid()
        OR phone IN (
            SELECT p.phone FROM public.profiles p
            WHERE p.id = auth.uid() AND p.phone IS NOT NULL
        )
    )
    WITH CHECK (profile_id = auth.uid());

GRANT ALL ON public.whatsapp_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessions TO authenticated;
