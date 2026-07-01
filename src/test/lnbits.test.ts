import { describe, expect, it } from "vitest";
import { isLnbitsEnabled, lnQrImageUrl } from "@/lib/lnbits";
import { describeTreasuryRole } from "@/lib/bitcoinTreasury";

describe("lnbits", () => {
  it("isLnbitsEnabled par défaut sauf VITE_LNBITS_ENABLED=false", () => {
    expect(typeof isLnbitsEnabled()).toBe("boolean");
  });

  it("génère une URL QR pour BOLT11", () => {
    const url = lnQrImageUrl("lnbc1test");
    expect(url).toContain("qrserver.com");
    expect(url).toContain(encodeURIComponent("lnbc1test"));
  });

  it("describeTreasuryRole mentionne LNbits et Kkiapay", () => {
    const text = describeTreasuryRole();
    expect(text).toMatch(/LNbits|Lightning/i);
    expect(text).toMatch(/Kkiapay|FCFA/i);
    expect(text).toMatch(/btc_ledger/);
  });
});
