-- Idempotence webhook WhatsApp (évite double traitement multi-instances)

CREATE TABLE IF NOT EXISTS public.whatsapp_processed_messages (
    message_id    TEXT        PRIMARY KEY,
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_processed_at
    ON public.whatsapp_processed_messages (processed_at);

ALTER TABLE public.whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_processed_service ON public.whatsapp_processed_messages;
CREATE POLICY whatsapp_processed_service ON public.whatsapp_processed_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.whatsapp_processed_messages TO service_role;
