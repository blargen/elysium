/**
 * Tests for Aether Ammunition Detection
 *
 * Testing the ability to detect aether ammunition and retrieve its properties
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  isAetherAmmo,
  getAmmoDamageType,
  getAmmoConfig,
} from "../../scripts/aether-weapons/ammo-detection.js";

describe("Aether Ammunition Detection", () => {
  let mockAetherAmmo;
  let mockNormalAmmo;

  beforeEach(() => {
    // Mock aether ammunition (basic force round)
    mockAetherAmmo = {
      name: "Aether Revolver Round",
      type: "consumable",
      flags: {
        elysium: {
          isAetherAmmo: true,
          damageType: "force",
        },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };

    // Mock normal ammunition
    mockNormalAmmo = {
      name: "Regular Bullet",
      type: "consumable",
      flags: {},
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };
  });

  describe("isAetherAmmo", () => {
    test("returns true for ammo with isAetherAmmo flag", () => {
      const result = isAetherAmmo(mockAetherAmmo);
      expect(result).toBe(true);
    });

    test("returns false for normal ammo without flag", () => {
      const result = isAetherAmmo(mockNormalAmmo);
      expect(result).toBe(false);
    });

    test("returns false for ammo with flag set to false", () => {
      mockAetherAmmo.flags.elysium.isAetherAmmo = false;
      const result = isAetherAmmo(mockAetherAmmo);
      expect(result).toBe(false);
    });

    test("returns false for null item", () => {
      const result = isAetherAmmo(null);
      expect(result).toBe(false);
    });
  });

  describe("getAmmoDamageType", () => {
    test("returns damage type for aether ammo", () => {
      const damageType = getAmmoDamageType(mockAetherAmmo);
      expect(damageType).toBe("force");
    });

    test("returns damage type for fire ammo", () => {
      mockAetherAmmo.flags.elysium.damageType = "fire";
      const damageType = getAmmoDamageType(mockAetherAmmo);
      expect(damageType).toBe("fire");
    });

    test("returns damage type for poison ammo", () => {
      mockAetherAmmo.flags.elysium.damageType = "poison";
      const damageType = getAmmoDamageType(mockAetherAmmo);
      expect(damageType).toBe("poison");
    });
  });

  describe("getAmmoConfig", () => {
    test("returns config object with damage type", () => {
      const config = getAmmoConfig(mockAetherAmmo);

      expect(config).toEqual({
        damageType: "force",
      });
    });

    test("returns config for different damage types", () => {
      mockAetherAmmo.flags.elysium.damageType = "necrotic";
      const config = getAmmoConfig(mockAetherAmmo);

      expect(config).toEqual({
        damageType: "necrotic",
      });
    });
  });
});
