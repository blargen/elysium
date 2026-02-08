/**
 * Ammunition Selection Dialog Tests
 *
 * TDD for the ammo selection dialog UI
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { showAmmoSelectionDialog } from "../../scripts/ammo-selection/ammo-dialog.js";

// Load real ammo data
const ammoPath = join(process.cwd(), "src/packs/ammunition/aether-revolver-round/item.json");
const realAmmoData = JSON.parse(readFileSync(ammoPath, "utf-8"));

describe("Ammunition Selection Dialog", () => {
  let mockActor;
  let mockWeapon;
  let realAmmoItem;

  beforeEach(() => {
    // Real ammo item
    realAmmoItem = {
      ...realAmmoData,
      getFlag: jest.fn((scope, key) => {
        return realAmmoData.flags?.[scope]?.[key];
      }),
    };

    // Mock weapon
    mockWeapon = {
      name: "The Elysium Defender",
      getFlag: jest.fn((scope, key) => {
        if (scope === "elysium" && key === "ammoType") return "revolver";
        return null;
      }),
    };

    // Mock actor with ammo
    mockActor = {
      name: "Test Character",
      items: {
        filter: jest.fn((callback) => {
          const items = [realAmmoItem];
          return items.filter(callback);
        }),
      },
    };
  });

  // Note: Dialog tests moved to card-selection-dialog.test.js
  // These tests are skipped pending proper mocking of the new Dialog-based component
  describe.skip("showAmmoSelectionDialog", () => {
    test("should return null if no ammo available", async () => {
      // Actor has no ammo
      mockActor.items.filter.mockReturnValue([]);

      // Mock ui.notifications
      global.ui = {
        notifications: {
          warn: jest.fn(),
        },
      };

      const result = await showAmmoSelectionDialog(mockActor, mockWeapon);

      expect(result).toBeNull();
    });
  });
});
