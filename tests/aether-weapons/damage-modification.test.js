/**
 * Tests for Damage Modification Hook
 *
 * Tests that weapon damage is modified based on fire mode (normal vs overpower).
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  shouldModifyDamage,
  getDamageForMode,
  modifyWeaponDamage,
} from "../../scripts/aether-weapons/damage-modification.js";

describe("Damage Modification", () => {
  describe("Should Modify Check", () => {
    test("should modify for aether weapons with fire mode set", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "currentFireMode") return "normal";
          return undefined;
        },
      };

      expect(shouldModifyDamage(item)).toBe(true);
    });

    test("should NOT modify for non-aether weapons", () => {
      const item = {
        getFlag: () => undefined,
      };

      expect(shouldModifyDamage(item)).toBe(false);
    });

    test("should NOT modify if no fire mode set", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          return undefined;
        },
      };

      expect(shouldModifyDamage(item)).toBe(false);
    });
  });

  describe("Get Damage for Mode", () => {
    test("should return normal damage for normal mode", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "currentFireMode") return "normal";
          return undefined;
        },
      };

      expect(getDamageForMode(item)).toBe("2d6");
    });

    test("should return overpower damage for overpower mode", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          if (scope === "elysium" && key === "currentFireMode")
            return "overpower";
          return undefined;
        },
      };

      expect(getDamageForMode(item)).toBe("4d6");
    });

    test("should return null if no damage configured", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "currentFireMode") return "normal";
          return undefined;
        },
      };

      expect(getDamageForMode(item)).toBeNull();
    });
  });

  describe("Modify Weapon Damage", () => {
    test("should modify damage formula for normal fire", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "currentFireMode") return "normal";
          return undefined;
        },
        system: {
          damage: {
            parts: [["1d8", "piercing"]],
          },
        },
      };

      const result = modifyWeaponDamage(item);

      expect(result.modified).toBe(true);
      expect(result.newFormula).toBe("2d6");
    });

    test("should modify damage formula for overpower", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          if (scope === "elysium" && key === "currentFireMode")
            return "overpower";
          return undefined;
        },
        system: {
          damage: {
            parts: [["1d8", "piercing"]],
          },
        },
      };

      const result = modifyWeaponDamage(item);

      expect(result.modified).toBe(true);
      expect(result.newFormula).toBe("4d6");
    });

    test("should preserve damage type when modifying", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "currentFireMode") return "normal";
          return undefined;
        },
        system: {
          damage: {
            parts: [["1d8", "force"]],
          },
        },
      };

      const result = modifyWeaponDamage(item);

      expect(result.damageType).toBe("force");
    });

    test("should NOT modify if criteria not met", () => {
      const item = {
        getFlag: () => undefined,
        system: {
          damage: {
            parts: [["1d8", "piercing"]],
          },
        },
      };

      const result = modifyWeaponDamage(item);

      expect(result.modified).toBe(false);
    });

    test("should include original formula in result", () => {
      const item = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          if (scope === "elysium" && key === "currentFireMode")
            return "overpower";
          return undefined;
        },
        system: {
          damage: {
            parts: [["2d6", "piercing"]],
          },
        },
      };

      const result = modifyWeaponDamage(item);

      expect(result.originalFormula).toBe("2d6");
    });
  });
});
