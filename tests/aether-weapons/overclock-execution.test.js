/**
 * Tests for Overclock Execution Logic
 *
 * Tests the "Oh Shit Button" - the dangerous overclock that:
 * - GUARANTEES +1 ATL (no roll)
 * - Requires CON save or weapon locks
 * - Consumes aether fuel
 * - Applies toxicity conditions
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  checkAetherFuelAvailable,
  executeOverclock,
  validateOverclockResult,
} from "../../scripts/aether-weapons/overclock-execution.js";
import { calculateToxicityDC } from "../../scripts/utils/calculations.js";

describe("Overclock Execution", () => {
  describe("Aether Fuel Availability Check", () => {
    test("should return true when actor has aether fuel", () => {
      const actor = {
        items: [
          {
            name: "Basic Refined Aether",
            system: { uses: { value: 3 } },
            getFlag: jest.fn((scope, key) => {
              if (scope === "elysium" && key === "isAetherFuel") return true;
              return undefined;
            }),
          },
        ],
      };

      expect(checkAetherFuelAvailable(actor)).toBe(true);
    });

    test("should return false when actor has no aether fuel", () => {
      const actor = {
        items: [],
      };

      expect(checkAetherFuelAvailable(actor)).toBe(false);
    });

    test("should return false when all aether fuel is depleted", () => {
      const actor = {
        items: [
          {
            name: "Basic Refined Aether",
            system: { uses: { value: 0 } },
            getFlag: jest.fn((scope, key) => {
              if (scope === "elysium" && key === "isAetherFuel") return true;
              return undefined;
            }),
          },
        ],
      };

      expect(checkAetherFuelAvailable(actor)).toBe(false);
    });

    test("should handle null actor", () => {
      expect(checkAetherFuelAvailable(null)).toBe(false);
    });
  });

  describe("Overclock Execution - Basic Flow", () => {
    test("should increment daily doses", async () => {
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 2;
          if (scope === "elysium" && key === "atl") return 1;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const saveRoll = {
        total: 15,
        dice: [{ results: [{ result: 15 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      expect(actor.setFlag).toHaveBeenCalledWith("elysium", "dailyDoses", 3);
    });

    test("should ALWAYS increase ATL by 1 (guaranteed)", async () => {
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 1;
          if (scope === "elysium" && key === "atl") return 2;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      // Even with a high roll (success), ATL still increases
      const saveRoll = {
        total: 20,
        dice: [{ results: [{ result: 20 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      // Should set ATL to 3 (was 2, guaranteed +1)
      expect(actor.setFlag).toHaveBeenCalledWith("elysium", "atl", 3);
      expect(result.newATL).toBe(3);
    });

    test("should calculate correct DC based on current doses", async () => {
      const currentDoses = 3;
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return currentDoses;
          if (scope === "elysium" && key === "atl") return 2;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const saveRoll = {
        total: 15,
        dice: [{ results: [{ result: 15 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      const expectedDC = calculateToxicityDC(currentDoses); // DC 18
      expect(result.dc).toBe(expectedDC);
    });
  });

  describe("Overclock Execution - CON Save Results", () => {
    test("should NOT lock weapon if CON save succeeds", async () => {
      const currentDoses = 0;
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return currentDoses;
          if (scope === "elysium" && key === "atl") return 0;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const dc = calculateToxicityDC(currentDoses); // DC 12
      const saveRoll = {
        total: dc + 1, // Success
        dice: [{ results: [{ result: dc + 1 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      expect(result.weaponLocked).toBe(false);
      expect(result.saveSuccess).toBe(true);
      // Weapon should NOT have lock flag set
      expect(weapon.setFlag).not.toHaveBeenCalledWith(
        "elysium",
        "isLocked",
        true
      );
    });

    test("should lock weapon if CON save fails", async () => {
      const currentDoses = 0;
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return currentDoses;
          if (scope === "elysium" && key === "atl") return 0;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const dc = calculateToxicityDC(currentDoses); // DC 12
      const saveRoll = {
        total: dc - 1, // Failure
        dice: [{ results: [{ result: dc - 1 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      expect(result.weaponLocked).toBe(true);
      expect(result.saveSuccess).toBe(false);
      // Weapon should have lock flag set
      expect(weapon.setFlag).toHaveBeenCalledWith("elysium", "isLocked", true);
    });

    test("should lock weapon on exact DC (failure)", async () => {
      const currentDoses = 2;
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return currentDoses;
          if (scope === "elysium" && key === "atl") return 1;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const dc = calculateToxicityDC(currentDoses); // DC 16
      const saveRoll = {
        total: dc, // Exact DC is failure
        dice: [{ results: [{ result: dc }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      expect(result.weaponLocked).toBe(true);
      expect(result.saveSuccess).toBe(false);
    });
  });

  describe("Overclock Execution - Aether Consumption", () => {
    test("should consume one use of aether fuel", async () => {
      const actor = {
        getFlag: jest.fn(() => 0),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 3, max: 5 } },
      };

      const saveRoll = {
        total: 15,
        dice: [{ results: [{ result: 15 }] }],
      };

      await executeOverclock(actor, weapon, aetherFuel, saveRoll);

      // Should update uses to 2 (was 3)
      expect(aetherFuel.update).toHaveBeenCalledWith({
        "system.uses.value": 2,
      });
    });

    test("should delete aether fuel when last use consumed", async () => {
      const actor = {
        getFlag: jest.fn(() => 0),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const saveRoll = {
        total: 15,
        dice: [{ results: [{ result: 15 }] }],
      };

      await executeOverclock(actor, weapon, aetherFuel, saveRoll);

      // Should delete (was last use)
      expect(aetherFuel.delete).toHaveBeenCalled();
    });
  });

  describe("Result Validation", () => {
    test("should validate successful overclock result", () => {
      const result = {
        success: true,
        newDailyDoses: 2,
        newATL: 2,
        dc: 14,
        saveSuccess: true,
        weaponLocked: false,
      };

      expect(validateOverclockResult(result)).toBe(true);
    });

    test("should validate failed overclock with weapon lock", () => {
      const result = {
        success: true,
        newDailyDoses: 3,
        newATL: 3,
        dc: 16,
        saveSuccess: false,
        weaponLocked: true,
      };

      expect(validateOverclockResult(result)).toBe(true);
    });

    test("should reject result missing required fields", () => {
      const result = {
        success: true,
        newDailyDoses: 1,
        // Missing other required fields
      };

      expect(validateOverclockResult(result)).toBe(false);
    });

    test("should reject null result", () => {
      expect(validateOverclockResult(null)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("should handle high ATL levels", async () => {
      const actor = {
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 5;
          if (scope === "elysium" && key === "atl") return 8;
          return 0;
        }),
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const saveRoll = {
        total: 25, // High roll
        dice: [{ results: [{ result: 25 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      // Should still increment ATL even at high levels
      expect(result.newATL).toBe(9);
    });

    test("should handle first-time overclock (zero doses)", async () => {
      const actor = {
        getFlag: jest.fn(() => 0), // No flags set yet
        setFlag: jest.fn(),
        toggleStatusEffect: jest.fn(),
        update: jest.fn(),
        rollSavingThrow: jest.fn(async () => ({ total: 15 })),
        system: {
          attributes: {
            exhaustion: 0,
          },
        },
        items: {
          filter: jest.fn(() => []),
        },
      };

      const weapon = {
        getFlag: jest.fn(),
        setFlag: jest.fn(),
      };

      const aetherFuel = {
        name: "Basic Refined Aether",
        update: jest.fn(),
        delete: jest.fn(),
        system: { uses: { value: 1, max: 5 } },
      };

      const saveRoll = {
        total: 15,
        dice: [{ results: [{ result: 15 }] }],
      };

      const result = await executeOverclock(
        actor,
        weapon,
        aetherFuel,
        saveRoll
      );

      expect(result.newDailyDoses).toBe(1);
      expect(result.newATL).toBe(1);
      expect(result.dc).toBe(12); // First use DC
    });
  });
});
