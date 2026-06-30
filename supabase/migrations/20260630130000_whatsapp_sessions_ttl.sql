-- TTL sur les sessions conversationnelles WhatsApp (24 h)

ALTER TABLE public.whatsapp_sessions
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (timezone('utc', now()) + interval '24 hours');

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires
    ON public.whatsapp_sessions (expires_at);
