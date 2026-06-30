import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeWhatsAppCommand } from "../_shared/whatsapp/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROCESSED_IDS = new Set<string>();

async function markAsRead(messageId: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId || !messageId) return;

  await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => undefined);
}

async function sendWhatsAppReply(to: string, text: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) return;

  await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: text },
    }),
  }).catch(() => undefined);
}

interface MetaJob {
  from: string;
  text: string;
  messageId?: string;
}

function extractMetaMessages(body: Record<string, unknown>): MetaJob[] {
  const out: MetaJob[] = [];
  const entries = (body.entry as Array<Record<string, unknown>>) ?? [];
  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) ?? [];
    for (const change of changes) {
      const value = (change.value as Record<string, unknown>) ?? {};
      const messages = (value.messages as Array<Record<string, unknown>>) ?? [];
      for (const msg of messages) {
        if (msg.type !== "text") continue;
        const from = String(msg.from ?? "");
        const textBody = (msg.text as { body?: string } | undefined)?.body ?? "";
        if (from && textBody) {
          out.push({ from, text: textBody, messageId: String(msg.id ?? "") });
        }
      }
    }
  }
  return out;
}

async function isDuplicateMessage(supabase: SupabaseClient, messageId: string): Promise<boolean> {
  if (PROCESSED_IDS.has(messageId)) return true;
  const { data } = await supabase
    .from("whatsapp_processed_messages")
    .select("message_id")
    .eq("message_id", messageId)
    .maybeSingle();
  if (data) return true;
  await supabase.from("whatsapp_processed_messages").insert({ message_id: messageId }).catch(() => undefined);
  PROCESSED_IDS.add(messageId);
  if (PROCESSED_IDS.size > 2000) PROCESSED_IDS.clear();
  return false;
}

async function processJob(supabase: SupabaseClient, job: MetaJob, appOrigin: string) {
  if (job.messageId) {
    if (await isDuplicateMessage(supabase, job.messageId)) return null;
    await markAsRead(job.messageId);
  }

  const result = await executeWhatsAppCommand(job.text, {
    supabase,
    phone: job.from,
    serviceRole: true,
    appOrigin,
  });
  await sendWhatsAppReply(job.from, result.reply);
  return { from: job.from, ...result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "tontinechain";

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const appOrigin = Deno.env.get("APP_ORIGIN") ?? "https://tontinechain.app";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const metaMessages = extractMetaMessages(body);
  const simpleFrom = typeof body.from === "string" ? body.from : undefined;
  const simpleBody = typeof body.body === "string" ? body.body : undefined;

  const jobs: MetaJob[] =
    metaMessages.length > 0
      ? metaMessages
      : simpleFrom && simpleBody
        ? [{ from: simpleFrom, text: simpleBody }]
        : [];

  if (!jobs.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const job of jobs) {
    const r = await processJob(supabase, job, appOrigin);
    if (r) results.push(r);
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
