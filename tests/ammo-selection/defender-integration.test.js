/**
 * Integration Tests: Ammo Selection + Elysium Defender
 *
 * TDD for hooking up ammo selection to the weapon!
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { findCompatibleAmmo } from "../../scripts/ammo-selection/ammo-utils.js";

// Load real weapon data
const weaponPath = join(process.cwd(), "src/packs/elysium-items/elysium-defender.json");
const realWeaponData = JSON.parse(readFileSync(weaponPath, "utf-8"));

// Load real ammo data
const ammoPath = join(process.cwd(), "src/packs/ammunition/aether-revolver-round/item.json");
const realAmmoData = JSON.parse(readFileSync(ammoPath, "utf-8"));

describe("Defender + Ammo Selection Integration", () => {
  let mockActor;
  let realWeapon;
  let realAmmo;

  beforeEach(() => {
    // Real weapon with Foundry methods
    realWeapon = {
      ...realWeaponData,
      getFlag: jest.fn((scope, key) => {
        return realWeaponData.flags?.[scope]?.[key];
      }),
      setFlag: jest.fn().mockResolvedValue(true),
    };

    // Real ammo with Foundry methods
    realAmmo = {
      ...realAmmoData,
      getFlag: jest.fn((scope, key) => {
        return realAmmoData.flags?.[scope]?.[key];
      }),
      update: jest.fn().mockResolvedValue(true),
    };

    // Mock actor with weapon and ammo
    mockActor = {
      name: "Test Character",
      items: {
        filter: jest.fn((callback) => {
          const items = [realAmmo];
          return items.filter(callback);
        }),
      },
    };
  });

  test("weapon should have ammoType flag", () => {
    expect(realWeapon.flags.elysium.ammoType).toBe("revolver");
  });

  test("should find compatible ammo for defender", () => {
    const ammo = findCompatibleAmmo(mockActor, realWeapon);

    expect(ammo).toHaveLength(1);
    expect(ammo[0].name).toBe("Aether Revolver Round");
  });

  test("handleWeaponFire should show ammo dialog", async () => {
    // Mock the dialog
    global.Dialog = {
      wait: jest.fn().mockResolvedValue(realAmmo),
    };

    // The function we're about to write
    const handleWeaponFire = async (actor, weapon) => {
      const { showAmmoSelectionDialog } = await import("../../scripts/ammo-selection/ammo-dialog.js");

      // Show ammo selection
      const selectedAmmo = await showAmmoSelectionDialog(actor, weapon);
      if (!selectedAmmo) return { cancelled: true };

      // Consume ammo
      const { consumeAmmo } = await import("../../scripts/ammo-selection/ammo-utils.js");
      await consumeAmmo(selectedAmmo);

      return {
        success: true,
        ammo: selectedAmmo,
      };
    };

    const result = await handleWeaponFire(mockActor, realWeapon);

    expect(result.success).toBe(true);
    expect(result.ammo.name).toBe("Aether Revolver Round");
    expect(global.Dialog.wait).toHaveBeenCalled();
    expect(realAmmo.update).toHaveBeenCalledWith({ "system.quantity": 19 });
  });

  test("handleWeaponFire should return cancelled if no ammo selected", async () => {
    global.Dialog = {
      wait: jest.fn().mockResolvedValue(null),
    };

    const handleWeaponFire = async (actor, weapon) => {
      const { showAmmoSelectionDialog } = await import("../../scripts/ammo-selection/ammo-dialog.js");

      const selectedAmmo = await showAmmoSelectionDialog(actor, weapon);
      if (!selectedAmmo) return { cancelled: true };

      const { consumeAmmo } = await import("../../scripts/ammo-selection/ammo-utils.js");
      await consumeAmmo(selectedAmmo);

      return {
        success: true,
        ammo: selectedAmmo,
      };
    };

    const result = await handleWeaponFire(mockActor, realWeapon);

    expect(result.cancelled).toBe(true);
  });
});
