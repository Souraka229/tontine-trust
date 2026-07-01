import { describe, it, expect } from "vitest";
import {
  describeCollectiveCustody,
  guardianRoleLabel,
} from "@/lib/groupGovernance";

describe("groupGovernance", () => {
  it("describeCollectiveCustody mentionne Bitsacco et le seuil 3/5", () => {
    const text = describeCollectiveCustody(3, 5);
    expect(text).toMatch(/3\/5/);
    expect(text).toMatch(/Bitsacco/i);
    expect(text).not.toMatch(/multisig opérationnel/i);
  });

  it("guardianRoleLabel traduit les rôles", () => {
    expect(guardianRoleLabel("admin")).toBe("Administrateur");
    expect(guardianRoleLabel("peer")).toBe("Pair élu");
  });
});
