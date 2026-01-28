/**
 * Tests for The Metatron - Healer's Gambit
 *
 * A risky ability that casts Mass Healing Word (3rd level) using a 2nd level slot + aether.
 *
 * Mechanics:
 * 1. Costs 2nd level spell slot + 1 aether
 * 2. ALWAYS gain 1 ATL (Aether Toxicity Level) - overloading the mod poisons them
 * 3. Roll d20: failure threshold = 2 + (new ATL * 2)
 * 4. On failure: The Metatron is disabled until long rest
 * 5. Cast Mass Healing Word regardless of roll result
 *
 * Risk compounds: Each use increases ATL, making future gambles riskier.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  calculateFailureThreshold,
  isGambitFailure,
  disableMetatron,
  enableMetatron,
  executeHealersGambit,
} from "../../scripts/the-metatron/metatron-gambit.js";

describe("The Metatron - Healer's Gambit", () => {
  let mockActor;
  let mockMetatron;

  beforeEach(() => {
    mockActor = {
      name: "Test Cleric",
      getFlag: jest.fn((scope, key) => {
        if (key === "atl") return 0; // Default ATL
        return null;
      }),
      setFlag: jest.fn(async () => {}),
      createEmbeddedDocuments: jest.fn(async (type, data) => {
        return [
          {
            id: "temp-spell-id",
            ...data[0],
            use: jest.fn(async () => ({})),
            delete: jest.fn(async () => true),
          },
        ];
      }),
    };

    mockMetatron = {
      name: "The Metatron",
      flags: { elysium: { disabled: false } },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
    };

    // Mock global ui
    global.ui = {
      notifications: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    // Mock ChatMessage for dramatic announcements
    global.ChatMessage = {
      create: jest.fn(async () => ({})),
    };
  });

  describe("calculateFailureThreshold", () => {
    test("ATL 0 -> threshold 2 (base case before gaining ATL)", () => {
      expect(calculateFailureThreshold(0)).toBe(2);
    });

    test("ATL 1 -> threshold 4 (first gambit use)", () => {
      expect(calculateFailureThreshold(1)).toBe(4);
    });

    test("ATL 2 -> threshold 6", () => {
      expect(calculateFailureThreshold(2)).toBe(6);
    });

    test("ATL 3 -> threshold 8", () => {
      expect(calculateFailureThreshold(3)).toBe(8);
    });

    test("ATL 5 -> threshold 12", () => {
      expect(calculateFailureThreshold(5)).toBe(12);
    });

    test("threshold caps at 20 (always possible to succeed)", () => {
      expect(calculateFailureThreshold(10)).toBe(20);
      expect(calculateFailureThreshold(15)).toBe(20);
    });
  });

  describe("isGambitFailure", () => {
    test("roll of 1 always fails", () => {
      expect(isGambitFailure(1, 2)).toBe(true);
      expect(isGambitFailure(1, 4)).toBe(true);
      expect(isGambitFailure(1, 20)).toBe(true);
    });

    test("roll equal to threshold fails", () => {
      expect(isGambitFailure(4, 4)).toBe(true);
      expect(isGambitFailure(6, 6)).toBe(true);
    });

    test("roll above threshold succeeds", () => {
      expect(isGambitFailure(5, 4)).toBe(false);
      expect(isGambitFailure(7, 6)).toBe(false);
      expect(isGambitFailure(20, 12)).toBe(false);
    });

    test("roll of 20 always succeeds (unless threshold is 20)", () => {
      expect(isGambitFailure(20, 2)).toBe(false);
      expect(isGambitFailure(20, 10)).toBe(false);
      expect(isGambitFailure(20, 19)).toBe(false);
    });
  });

  describe("disableMetatron", () => {
    test("sets disabled flag to true", async () => {
      await disableMetatron(mockMetatron);

      expect(mockMetatron.setFlag).toHaveBeenCalledWith(
        "elysium",
        "disabled",
        true,
      );
    });
  });

  describe("enableMetatron", () => {
    test("sets disabled flag to false", async () => {
      mockMetatron.flags.elysium.disabled = true;

      await enableMetatron(mockMetatron);

      expect(mockMetatron.setFlag).toHaveBeenCalledWith(
        "elysium",
        "disabled",
        false,
      );
    });
  });

  describe("executeHealersGambit", () => {
    test("increases actor ATL by 1", async () => {
      mockActor.getFlag = jest.fn(() => 0);

      await executeHealersGambit(mockActor, mockMetatron, { roll: 20 });

      expect(mockActor.setFlag).toHaveBeenCalledWith("elysium", "atl", 1);
    });

    test("increases existing ATL by 1", async () => {
      mockActor.getFlag = jest.fn(() => 2);

      await executeHealersGambit(mockActor, mockMetatron, { roll: 20 });

      expect(mockActor.setFlag).toHaveBeenCalledWith("elysium", "atl", 3);
    });

    test("disables Metatron on failed roll", async () => {
      mockActor.getFlag = jest.fn(() => 0); // Will become ATL 1, threshold 4

      await executeHealersGambit(mockActor, mockMetatron, { roll: 3 }); // 3 <= 4, fails

      expect(mockMetatron.setFlag).toHaveBeenCalledWith(
        "elysium",
        "disabled",
        true,
      );
    });

    test("does not disable Metatron on successful roll", async () => {
      mockActor.getFlag = jest.fn(() => 0); // Will become ATL 1, threshold 4

      await executeHealersGambit(mockActor, mockMetatron, { roll: 5 }); // 5 > 4, succeeds

      expect(mockMetatron.setFlag).not.toHaveBeenCalledWith(
        "elysium",
        "disabled",
        true,
      );
    });

    test("casts Mass Healing Word regardless of roll result", async () => {
      mockActor.getFlag = jest.fn(() => 0);

      // Test with failed roll
      await executeHealersGambit(mockActor, mockMetatron, { roll: 1 });

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Mass Healing Word",
          }),
        ]),
      );
    });

    test("creates Mass Healing Word at 3rd level", async () => {
      mockActor.getFlag = jest.fn(() => 0);

      await executeHealersGambit(mockActor, mockMetatron, { roll: 20 });

      const createdData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.level).toBe(3);
    });

    test("returns result with roll, threshold, and success status", async () => {
      mockActor.getFlag = jest.fn(() => 1); // Will become ATL 2, threshold 6

      const result = await executeHealersGambit(mockActor, mockMetatron, {
        roll: 5,
      });

      expect(result.roll).toBe(5);
      expect(result.threshold).toBe(6);
      expect(result.success).toBe(false); // 5 <= 6
      expect(result.newATL).toBe(2);
    });

    test("ATL increase happens before threshold calculation", async () => {
      // Starting ATL 0, will become 1
      // Threshold should be 2 + (1 * 2) = 4, not 2 + (0 * 2) = 2
      mockActor.getFlag = jest.fn(() => 0);

      const result = await executeHealersGambit(mockActor, mockMetatron, {
        roll: 3,
      });

      expect(result.newATL).toBe(1);
      expect(result.threshold).toBe(4); // Based on NEW ATL
      expect(result.success).toBe(false); // 3 <= 4
    });
  });
});
