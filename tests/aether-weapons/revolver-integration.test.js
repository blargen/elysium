/**
 * Integration Tests for Aether Revolver
 *
 * Tests that the revolver item data works correctly with our utility functions
 */

import { describe, test, expect } from "@jest/globals";
import {
  isAetherWeapon,
  getWeaponConfig,
  getDamageFormula,
  isWeaponLocked,
} from "../../scripts/aether-weapons/weapon-detection.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const revolverPath = path.join(
  __dirname,
  "../../src/packs/weapons/elysium-defender/item.json"
);

// Helper to load revolver JSON with mock getFlag method
function loadRevolver() {
  const data = JSON.parse(fs.readFileSync(revolverPath, "utf-8"));

  // Add getFlag method for our utilities
  data.getFlag = function (scope, key) {
    return this.flags?.[scope]?.[key];
  };

  return data;
}

describe("Aether Revolver Integration", () => {
  describe("Weapon Detection", () => {
    test("revolver is detected as aether weapon", () => {
      const revolver = loadRevolver();
      expect(isAetherWeapon(revolver)).toBe(true);
    });

    test("revolver is not locked by default", () => {
      const revolver = loadRevolver();
      expect(isWeaponLocked(revolver)).toBe(false);
    });
  });

  describe("Weapon Configuration", () => {
    test("revolver has correct damage formulas", () => {
      const revolver = loadRevolver();
      const config = getWeaponConfig(revolver);

      expect(config.normalDamage).toBe("2d6");
      expect(config.overpowerDamage).toBe("4d6");
    });

    test("revolver has correct weapon type", () => {
      const revolver = loadRevolver();
      const config = getWeaponConfig(revolver);

      expect(config.weaponType).toBe("revolver");
    });

    test("getDamageFormula returns normal damage", () => {
      const revolver = loadRevolver();
      expect(getDamageFormula(revolver, false)).toBe("2d6");
    });

    test("getDamageFormula returns overpower damage", () => {
      const revolver = loadRevolver();
      expect(getDamageFormula(revolver, true)).toBe("4d6");
    });
  });

  describe("Item Structure", () => {
    test("revolver has required name", () => {
      const revolver = loadRevolver();
      expect(revolver.name).toBeDefined();
      expect(revolver.name).toBe("The Elysium Defender");
    });

    test("revolver is weapon type", () => {
      const revolver = loadRevolver();
      expect(revolver.type).toBe("weapon");
    });

    test("revolver has unique _id", () => {
      const revolver = loadRevolver();
      expect(revolver._id).toBeDefined();
      expect(revolver._id).toMatch(/^[a-zA-Z0-9]+$/);
    });

    test("revolver has image path", () => {
      const revolver = loadRevolver();
      expect(revolver.img).toBeDefined();
      expect(revolver.img).toContain("elysium-defender");
    });

    test("revolver has elysium flags", () => {
      const revolver = loadRevolver();
      expect(revolver.flags.elysium).toBeDefined();
      expect(revolver.flags.elysium.isAetherWeapon).toBe(true);
    });
  });

  describe("Weapon Properties", () => {
    test("revolver has damage configuration", () => {
      const revolver = loadRevolver();
      expect(revolver.system.damage).toBeDefined();
    });

    test("revolver uses ammunition", () => {
      const revolver = loadRevolver();
      // Weapon should have ammo property or consume configuration
      expect(
        revolver.system.properties?.amm || revolver.system.consume
      ).toBeDefined();
    });

    test("revolver is ranged weapon", () => {
      const revolver = loadRevolver();
      expect(revolver.system.actionType).toBe("rwak"); // Ranged weapon attack
    });
  });
});
