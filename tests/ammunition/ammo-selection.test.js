/**
 * Ammunition Selection System Integration Tests
 *
 * Using REAL ammunition items from compendium - badass integration testing!
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { findCompatibleAmmo, consumeAmmo } from "../../scripts/ammo-selection/ammo-utils.js";

// Load the REAL aether revolver round from compendium source
const ammoPath = join(process.cwd(), "src/packs/ammunition/aether-revolver-round/item.json");
const realAmmoData = JSON.parse(readFileSync(ammoPath, "utf-8"));

describe("Ammunition Selection System - Integration Tests", () => {
  let mockActor;
  let mockWeapon;
  let realAmmoItem;

  beforeEach(() => {
    // Create a real ammo item with Foundry-like methods
    realAmmoItem = {
      ...realAmmoData,
      // Add the methods Foundry items have
      getFlag: jest.fn((scope, key) => {
        return realAmmoData.flags?.[scope]?.[key];
      }),
      update: jest.fn().mockResolvedValue(true),
    };

    // Mock weapon - The Elysium Defender
    mockWeapon = {
      name: "The Elysium Defender",
      getFlag: jest.fn((scope, key) => {
        if (scope === "elysium" && key === "ammoType") return "revolver";
        return null;
      }),
    };

    // Mock actor with the real ammo in inventory
    mockActor = {
      name: "Test Character",
      items: {
        filter: jest.fn((callback) => {
          // Simulate Foundry's filter that passes items to the callback
          const items = [realAmmoItem];
          return items.filter(callback);
        }),
      },
    };
  });

  describe("findCompatibleAmmo", () => {
    test("should find real aether revolver round for revolver weapon", () => {
      // THE TEST - using real data!
      const result = findCompatibleAmmo(mockActor, mockWeapon);

      // Should find the real ammo
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Aether Revolver Round");
      expect(result[0].flags.elysium.roundType).toBe("revolver");
    });

    test("real ammo item should have correct structure", () => {
      // Verify the real item has what we expect
      expect(realAmmoItem.type).toBe("consumable");
      expect(realAmmoItem.system.type.value).toBe("ammo");
      expect(realAmmoItem.system.quantity).toBeGreaterThan(0);
      expect(realAmmoItem.flags.elysium.isAetherAmmo).toBe(true);
      expect(realAmmoItem.flags.elysium.roundType).toBe("revolver");
    });

    test("should not find ammo if weapon uses different ammo type", () => {
      // Change weapon to rifle
      mockWeapon.getFlag = jest.fn((scope, key) => {
        if (scope === "elysium" && key === "ammoType") return "rifle";
        return null;
      });

      const result = findCompatibleAmmo(mockActor, mockWeapon);

      expect(result).toHaveLength(0);
    });
  });

  describe("consumeAmmo", () => {
    test("should decrease real ammo quantity by 1", async () => {
      const originalQuantity = realAmmoItem.system.quantity;
      await consumeAmmo(realAmmoItem);

      expect(realAmmoItem.update).toHaveBeenCalledWith({
        "system.quantity": originalQuantity - 1,
      });
    });
  });
});
