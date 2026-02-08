/**
 * Tests for Overpower Toxicity System
 *
 * The "Oh Shit Button" - guaranteed toxicity increase with weapon lock risk
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { applyOverpowerToxicity } from "../../scripts/aether-weapons/overpower-toxicity.js";
import { getDailyDoses, getATL } from "../../scripts/utils/flags.js";
import { isWeaponLocked } from "../../scripts/aether-weapons/weapon-detection.js";

describe("Overpower Toxicity System", () => {
  let mockActor;
  let mockWeapon;

  beforeEach(() => {
    // Mock actor with toxicity tracking
    mockActor = {
      name: "Test Character",
      flags: { elysium: { dailyDoses: 0, atl: 0 } },
      system: {
        abilities: { con: { mod: 2 } },
        attributes: { exhaustion: 0 },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      },
      update: jest.fn(async function (data) {
        if (data["system.attributes.exhaustion"] !== undefined) {
          this.system.attributes.exhaustion = data["system.attributes.exhaustion"];
        }
        return this;
      }),
      toggleStatusEffect: jest.fn(async function () {
        return this;
      }),
    };

    // Mock aether weapon
    mockWeapon = {
      name: "Aether Revolver",
      flags: { elysium: { isAetherWeapon: true, locked: false } },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      },
    };
  });

  describe("applyOverpowerToxicity", () => {
    test("increments daily doses", async () => {
      const mockRoll = { total: 20 }; // Success

      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(getDailyDoses(mockActor)).toBe(1);
    });

    test("automatically increases ATL by 1 (guaranteed)", async () => {
      const mockRoll = { total: 20 }; // Even on success!

      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(getATL(mockActor)).toBe(1); // Always increases
    });

    test("increases ATL even with perfect roll", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      const mockRoll = { total: 30 }; // Impossible to fail

      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(getATL(mockActor)).toBe(1); // Still increases!
    });

    test("locks weapon on failed save", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      const mockRoll = { total: 5 }; // Fail (DC is 12)

      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(isWeaponLocked(mockWeapon)).toBe(true);
    });

    test("keeps weapon unlocked on successful save", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      const mockRoll = { total: 15 }; // Pass (DC is 12)

      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(isWeaponLocked(mockWeapon)).toBe(false);
    });

    test("applies toxicity conditions for new ATL level", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      const mockRoll = { total: 15 }; // Success

      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      // Should apply poisoned condition (ATL 1)
      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("poisoned", {
        active: true,
      });
    });

    test("returns success result on passed save", async () => {
      const mockRoll = { total: 15 };

      const result = await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(result.saveSuccess).toBe(true);
      expect(result.weaponLocked).toBe(false);
      expect(result.newATL).toBe(1);
      expect(result.newDailyDoses).toBe(1);
    });

    test("returns failure result on failed save", async () => {
      const mockRoll = { total: 5 };

      const result = await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);

      expect(result.saveSuccess).toBe(false);
      expect(result.weaponLocked).toBe(true);
      expect(result.newATL).toBe(1);
      expect(result.newDailyDoses).toBe(1);
    });

    test("DC increases with multiple overpower uses", async () => {
      // First overpower: DC 12 (10 + 2*1)
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      let mockRoll = { total: 13 };
      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);
      expect(getDailyDoses(mockActor)).toBe(1);
      expect(getATL(mockActor)).toBe(1);

      // Second overpower: DC 14 (10 + 2*2)
      mockRoll = { total: 15 };
      await applyOverpowerToxicity(mockActor, mockWeapon, mockRoll);
      expect(getDailyDoses(mockActor)).toBe(2);
      expect(getATL(mockActor)).toBe(2); // Guaranteed increase
    });
  });
});
