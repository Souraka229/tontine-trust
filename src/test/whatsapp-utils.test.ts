import { describe, it, expect } from "vitest";
import {
  parseCommand,
  parseFrequency,
  generateInviteCode,
  isCancelCommand,
  isConfirmCommand,
  formatFCFA,
  groupInitials,
} from "../../supabase/functions/_shared/whatsapp/utils";

describe("whatsapp utils", () => {
  it("parseCommand normalise slash et majuscules", () => {
    expect(parseCommand("/solde")).toEqual({ cmd: "SOLDE", args: [], raw: "/solde" });
    expect(parseCommand("  rejoindre tont-ab12  ")).toEqual({
      cmd: "REJOINDRE",
      args: ["TONT-AB12"],
      raw: "rejoindre tont-ab12",
    });
  });

  it("parseFrequency mappe les alias FlashBot", () => {
    expect(parseFrequency("MENSUELLE")).toBe("Mensuelle");
    expect(parseFrequency("weekly")).toBe("Hebdomadaire");
    expect(parseFrequency("invalide")).toBeNull();
  });

  it("generateInviteCode format TONT-XXXX", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^TONT-[A-Z2-9]{4}$/);
  });

  it("isCancelCommand et isConfirmCommand", () => {
    expect(isCancelCommand("ANNULER")).toBe(true);
    expect(isCancelCommand("SOLDE")).toBe(false);
    expect(isConfirmCommand("OUI")).toBe(true);
    expect(isConfirmCommand("NON")).toBe(false);
  });

  it("formatFCFA et groupInitials", () => {
    expect(formatFCFA(50000)).toContain("50");
    expect(formatFCFA(50000)).toContain("FCFA");
    expect(groupInitials("Tontine Amis")).toBe("TA");
  });
});

describe("whatsapp router (aide)", () => {
  it("retourne le menu sans auth", async () => {
    const { executeWhatsAppCommand } = await import(
      "../../supabase/functions/_shared/whatsapp/router"
    );
    const fakeSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
      }),
    };
    const result = await executeWhatsAppCommand("AIDE", {
      supabase: fakeSupabase as never,
    });
    expect(result.success).toBe(true);
    expect(result.reply).toContain("CREER");
    expect(result.reply).toContain("/solde");
  });
});
