/**
 * Tests for Aether Weapon Detection
 *
 * Testing the ability to detect if a weapon is an aether weapon
 * and retrieve its configuration.
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  isAetherWeapon,
  isWeaponLocked,
  lockWeapon,
  unlockWeapon,
  getWeaponConfig,
  getDamageFormula,
} from "../../scripts/aether-weapons/weapon-detection.js";

describe("Aether Weapon Detection", () => {
  let mockAetherWeapon;
  let mockNormalWeapon;

  beforeEach(() => {
    // Mock an aether weapon (like our revolver)
    mockAetherWeapon = {
      name: "Aether Revolver",
      type: "weapon",
      flags: {
        elysium: {
          isAetherWeapon: true,
          weaponType: "revolver",
          normalDamage: "2d6",
          overpowerDamage: "4d6",
        },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };

    // Mock a normal weapon
    mockNormalWeapon = {
      name: "Longsword",
      type: "weapon",
      flags: {},
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };
  });

  describe("isAetherWeapon", () => {
    test("returns true for weapon with isAetherWeapon flag", () => {
      const result = isAetherWeapon(mockAetherWeapon);
      expect(result).toBe(true);
    });

    test("returns false for normal weapon without flag", () => {
      const result = isAetherWeapon(mockNormalWeapon);
      expect(result).toBe(false);
    });

    test("returns false for weapon with flag set to false", () => {
      mockAetherWeapon.flags.elysium.isAetherWeapon = false;
      const result = isAetherWeapon(mockAetherWeapon);
      expect(result).toBe(false);
    });

    test("returns false for null item", () => {
      const result = isAetherWeapon(null);
      expect(result).toBe(false);
    });

    test("returns false for undefined item", () => {
      const result = isAetherWeapon(undefined);
      expect(result).toBe(false);
    });
  });

  describe("isWeaponLocked", () => {
    test("returns true when weapon has locked flag set to true", () => {
      mockAetherWeapon.flags.elysium.locked = true;
      const result = isWeaponLocked(mockAetherWeapon);
      expect(result).toBe(true);
    });

    test("returns false when weapon has no locked flag", () => {
      const result = isWeaponLocked(mockAetherWeapon);
      expect(result).toBe(false);
    });

    test("returns false when weapon locked flag is explicitly false", () => {
      mockAetherWeapon.flags.elysium.locked = false;
      const result = isWeaponLocked(mockAetherWeapon);
      expect(result).toBe(false);
    });

    test("returns false for null weapon", () => {
      const result = isWeaponLocked(null);
      expect(result).toBe(false);
    });
  });

  describe("lockWeapon", () => {
    test("sets locked flag to true on weapon", async () => {
      mockAetherWeapon.setFlag = async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      };

      await lockWeapon(mockAetherWeapon);

      expect(mockAetherWeapon.flags.elysium.locked).toBe(true);
    });

    test("returns the weapon", async () => {
      mockAetherWeapon.setFlag = async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      };

      const result = await lockWeapon(mockAetherWeapon);

      expect(result).toBe(mockAetherWeapon);
    });
  });

  describe("unlockWeapon", () => {
    test("sets locked flag to false on weapon", async () => {
      mockAetherWeapon.flags.elysium.locked = true;
      mockAetherWeapon.setFlag = async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      };

      await unlockWeapon(mockAetherWeapon);

      expect(mockAetherWeapon.flags.elysium.locked).toBe(false);
    });

    test("returns the weapon", async () => {
      mockAetherWeapon.flags.elysium.locked = true;
      mockAetherWeapon.setFlag = async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      };

      const result = await unlockWeapon(mockAetherWeapon);

      expect(result).toBe(mockAetherWeapon);
    });
  });

  describe("getWeaponConfig", () => {
    test("returns config object with normalDamage and overpowerDamage", () => {
      const config = getWeaponConfig(mockAetherWeapon);

      expect(config).toEqual({
        normalDamage: "2d6",
        overpowerDamage: "4d6",
        weaponType: "revolver",
      });
    });

    test("returns null for non-aether weapon", () => {
      const config = getWeaponConfig(mockNormalWeapon);
      expect(config).toBeNull();
    });

    test("returns null for null weapon", () => {
      const config = getWeaponConfig(null);
      expect(config).toBeNull();
    });

    test("returns config even if weapon is locked", () => {
      mockAetherWeapon.flags.elysium.locked = true;
      const config = getWeaponConfig(mockAetherWeapon);

      expect(config).toEqual({
        normalDamage: "2d6",
        overpowerDamage: "4d6",
        weaponType: "revolver",
      });
    });

    test("handles missing optional fields gracefully", () => {
      delete mockAetherWeapon.flags.elysium.weaponType;
      const config = getWeaponConfig(mockAetherWeapon);

      expect(config).toEqual({
        normalDamage: "2d6",
        overpowerDamage: "4d6",
        weaponType: undefined,
      });
    });
  });

  describe("getDamageFormula", () => {
    test("returns normal damage formula when overpower is false", () => {
      const formula = getDamageFormula(mockAetherWeapon, false);
      expect(formula).toBe("2d6");
    });

    test("returns overpower damage formula when overpower is true", () => {
      const formula = getDamageFormula(mockAetherWeapon, true);
      expect(formula).toBe("4d6");
    });

    test("defaults to normal damage if overpower not specified", () => {
      const formula = getDamageFormula(mockAetherWeapon);
      expect(formula).toBe("2d6");
    });
  });
});
