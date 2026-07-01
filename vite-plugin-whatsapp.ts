import type { Plugin, ViteDevServer } from "vite";
import { loadEnv } from "vite";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CMD_TIMEOUT_MS = 25_000;

/** Webhook WhatsApp local : POST /api/whatsapp/webhook { "from": "+229...", "body": "/solde" } */
export function whatsappApiPlugin(): Plugin {
  let server: ViteDevServer;
  let executeWhatsAppCommand: (
    msg: string,
    ctx: Record<string, unknown>,
  ) => Promise<{ reply: string; success: boolean }>;
  let supabase: SupabaseClient | null = null;
  let serviceRole = false;

  async function ensureHandlers() {
    if (!executeWhatsAppCommand) {
      const mod = await server.ssrLoadModule("/src/lib/whatsappCommands.ts");
      executeWhatsAppCommand = (
        mod as {
          executeWhatsAppCommand: typeof executeWhatsAppCommand;
        }
      ).executeWhatsAppCommand;
    }
    return executeWhatsAppCommand;
  }

  async function ensureSupabase(env: Record<string, string>): Promise<SupabaseClient> {
    if (supabase) return supabase;
    const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (serviceKey && supabaseUrl) {
      supabase = createClient(supabaseUrl, serviceKey);
      serviceRole = true;
      return supabase;
    }
    const supabaseMod = await server.ssrLoadModule("/src/lib/supabase.ts");
    supabase = (supabaseMod as { supabase: SupabaseClient }).supabase;
    serviceRole = false;
    return supabase;
  }

  return {
    name: "whatsapp-api",
    configureServer(devServer) {
      server = devServer;
      const env = loadEnv(devServer.config.mode, devServer.config.root, "");

      void ensureHandlers().catch(() => {
        /* preload best-effort */
      });

      devServer.middlewares.use("/api/whatsapp/webhook", (req, res) => {
        if (req.method === "GET") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              serviceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
              hint: "POST { from, body } — ajoutez SUPABASE_SERVICE_ROLE_KEY pour CREER et /solde",
            }),
          );
          return;
        }

        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "GET (health) ou POST uniquement" }));
          return;
        }

        let raw = "";
        req.on("data", (chunk) => {
          raw += chunk;
        });
        req.on("end", async () => {
          try {
            const payload = JSON.parse(raw || "{}") as { from?: string; body?: string };
            const run = await ensureHandlers();
            const client = await ensureSupabase(env);

            const result = await Promise.race([
              run(payload.body ?? "", {
                supabase: client,
                phone: payload.from,
                serviceRole,
                appOrigin: `http://localhost:${devServer.config.server?.port ?? 8080}`,
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Commande WhatsApp timeout (25s)")), CMD_TIMEOUT_MS),
              ),
            ]);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ reply: result.reply, success: result.success }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }));
          }
        });
      });
    },
  };
}
