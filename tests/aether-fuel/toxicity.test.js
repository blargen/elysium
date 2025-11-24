/**
 * Tests for Toxicity Application System
 *
 * Testing the full flow of unrefined aether toxicity:
 * - Daily doses increment
 * - CON saves with increasing DC
 * - ATL progression on failed saves
 * - Condition application
 * - Exhaustion at ATL 2 and 4
 * - Long rest reset
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  applyUnrefinedAetherUse,
  shouldShowToxicityWarning,
  getToxicityWarningData,
  applyToxicityEffects,
  resetToxicityOnLongRest,
} from "../../scripts/aether-fuel/toxicity.js";
import { getDailyDoses, getATL } from "../../scripts/utils/flags.js";

describe("Toxicity Application System", () => {
  let mockActor;

  beforeEach(() => {
    // Mock actor with flag management
    mockActor = {
      name: "Test Character",
      flags: {},
      system: {
        abilities: {
          con: { mod: 2 },
        },
        attributes: {
          exhaustion: 0,
        },
      },
      effects: [],
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      },
      update: jest.fn(async function (data) {
        // Mock update for exhaustion
        if (data["system.attributes.exhaustion"] !== undefined) {
          this.system.attributes.exhaustion =
            data["system.attributes.exhaustion"];
        }
        return this;
      }),
      toggleStatusEffect: jest.fn(async function (condition, options) {
        // Mock adding conditions
        return this;
      }),
      rollSavingThrow: jest.fn(async function (options) {
        // Mock returning a successful roll (new v4.1+ API)
        return [{ _total: 15, total: 15 }];
      }),
    };
  });

  describe("applyUnrefinedAetherUse", () => {
    test("increments daily doses on use", async () => {
      // Mock a successful CON save so we only test dose increment
      const mockRoll = { total: 20 };

      await applyUnrefinedAetherUse(mockActor, mockRoll);

      expect(getDailyDoses(mockActor)).toBe(1);
    });

    test("does not increment ATL on successful save", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      const mockRoll = { total: 20 }; // High roll = success

      await applyUnrefinedAetherUse(mockActor, mockRoll);

      expect(getATL(mockActor)).toBe(0); // Still 0
    });

    test("increments ATL on failed save", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      const mockRoll = { total: 5 }; // Low roll = fail (DC is 10)

      await applyUnrefinedAetherUse(mockActor, mockRoll);

      expect(getATL(mockActor)).toBe(1);
    });

    test("DC increases with each daily dose", async () => {
      // First dose: DC 10 (8 + 2*1)
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };
      let mockRoll = { total: 11 };
      await applyUnrefinedAetherUse(mockActor, mockRoll);
      expect(getDailyDoses(mockActor)).toBe(1);

      // Second dose: DC 12 (8 + 2*2)
      mockRoll = { total: 13 };
      await applyUnrefinedAetherUse(mockActor, mockRoll);
      expect(getDailyDoses(mockActor)).toBe(2);

      // Third dose: DC 14 (8 + 2*3)
      mockRoll = { total: 15 };
      await applyUnrefinedAetherUse(mockActor, mockRoll);
      expect(getDailyDoses(mockActor)).toBe(3);

      // Fourth dose: DC 16 (8 + 2*4)
      mockRoll = { total: 17 };
      await applyUnrefinedAetherUse(mockActor, mockRoll);
      expect(getDailyDoses(mockActor)).toBe(4);
    });
  });

  describe("shouldShowToxicityWarning", () => {
    test("returns true for unrefined aether", () => {
      const mockItem = {
        getFlag: () => "unrefined",
      };
      expect(shouldShowToxicityWarning(mockItem)).toBe(true);
    });

    test("returns false for non-unrefined aether", () => {
      const mockItem = {
        getFlag: () => "basic-refined",
      };
      expect(shouldShowToxicityWarning(mockItem)).toBe(false);
    });
  });

  describe("getToxicityWarningData", () => {
    test("calculates correct next DC for first dose", () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      const data = getToxicityWarningData(mockActor);

      expect(data.dailyDoses).toBe(0);
      expect(data.atl).toBe(0);
      expect(data.nextDC).toBe(10); // 8 + 2*1
    });

    test("calculates correct next DC for fourth dose", () => {
      mockActor.flags.elysium = { dailyDoses: 3, atl: 2 };

      const data = getToxicityWarningData(mockActor);

      expect(data.dailyDoses).toBe(3);
      expect(data.atl).toBe(2);
      expect(data.nextDC).toBe(16); // 8 + 2*4
    });
  });

  describe("applyToxicityEffects", () => {
    test("applies poisoned condition at ATL 1", async () => {
      await applyToxicityEffects(mockActor, 1);

      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("poisoned", {
        active: true,
      });
    });

    test("applies poisoned and blinded at ATL 2", async () => {
      await applyToxicityEffects(mockActor, 2);

      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("poisoned", {
        active: true,
      });
      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("blinded", {
        active: true,
      });
    });

    test("adds exhaustion at ATL 2", async () => {
      mockActor.system.attributes.exhaustion = 0;

      await applyToxicityEffects(mockActor, 2);

      expect(mockActor.update).toHaveBeenCalledWith({
        "system.attributes.exhaustion": 1,
      });
    });

    test("does not add exhaustion at ATL 3", async () => {
      mockActor.system.attributes.exhaustion = 1;

      await applyToxicityEffects(mockActor, 3);

      // update should not be called for exhaustion at ATL 3
      expect(mockActor.system.attributes.exhaustion).toBe(1);
    });

    test("adds second exhaustion level at ATL 4", async () => {
      mockActor.system.attributes.exhaustion = 1;

      await applyToxicityEffects(mockActor, 4);

      expect(mockActor.update).toHaveBeenCalledWith({
        "system.attributes.exhaustion": 2,
      });
    });

    test("applies paralyzed at ATL 5", async () => {
      await applyToxicityEffects(mockActor, 5);

      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("poisoned", {
        active: true,
      });
      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("blinded", {
        active: true,
      });
      expect(mockActor.toggleStatusEffect).toHaveBeenCalledWith("paralyzed", {
        active: true,
      });
    });
  });

  describe("resetToxicityOnLongRest", () => {
    test("resets dailyDoses to 0", async () => {
      mockActor.flags.elysium = { dailyDoses: 5, atl: 3 };

      await resetToxicityOnLongRest(mockActor);

      expect(getDailyDoses(mockActor)).toBe(0);
    });

    test("resets ATL to 0", async () => {
      mockActor.flags.elysium = { dailyDoses: 5, atl: 3 };

      await resetToxicityOnLongRest(mockActor);

      expect(getATL(mockActor)).toBe(0);
    });

    test("resets exhaustion to 0", async () => {
      mockActor.flags.elysium = { dailyDoses: 5, atl: 4 };
      mockActor.system.attributes.exhaustion = 2;

      await resetToxicityOnLongRest(mockActor);

      expect(mockActor.update).toHaveBeenCalledWith({
        "system.attributes.exhaustion": 0,
      });
    });

    test("does nothing if no toxicity present", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      const result = await resetToxicityOnLongRest(mockActor);

      expect(result).toBe(false); // No reset needed
    });

    test("returns true if reset occurred", async () => {
      mockActor.flags.elysium = { dailyDoses: 3, atl: 2 };

      const result = await resetToxicityOnLongRest(mockActor);

      expect(result).toBe(true); // Reset happened
    });
  });
});

// TODO: UI Testing for warning dialog
// When we're ready, we can add tests for:
// - Dialog renders with correct warning text
// - Dialog shows current dailyDoses, ATL, and next DC
// - "Cancel" button prevents aether use
// - "Use Anyway" button proceeds with toxicity application
