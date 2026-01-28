/**
 * Tests for The Metatron - Meditation of Forgetfulness
 *
 * Testing the logic for removing stored spells from slots.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  clearSpellFromSlot,
  clearMultipleSpells,
} from "../../scripts/the-metatron/metatron-forget.js";
import { getStoredSpells } from "../../scripts/utils/flags.js";

describe("The Metatron - Meditation of Forgetfulness", () => {
  let mockMetatron;

  beforeEach(() => {
    mockMetatron = {
      name: "The Metatron",
      flags: {
        elysium: {
          storedSpells: [
            {
              id: "spell-1",
              slotIndex: 0,
              slotName: "Supplication",
              spellData: { name: "Cure Wounds" },
            },
            {
              id: "spell-2",
              slotIndex: 2,
              slotName: "Litany",
              spellData: { name: "Guiding Bolt" },
            },
            {
              id: "spell-3",
              slotIndex: 4,
              slotName: "Consecration",
              spellData: { name: "Bless" },
            },
          ],
        },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
    };
  });

  describe("clearSpellFromSlot", () => {
    test("removes spell from specified slot", async () => {
      await clearSpellFromSlot(mockMetatron, 0);

      const updatedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(updatedSpells).toHaveLength(2);
      expect(updatedSpells.find((s) => s.slotIndex === 0)).toBeUndefined();
    });

    test("preserves other spells when removing one", async () => {
      await clearSpellFromSlot(mockMetatron, 2);

      const updatedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(updatedSpells).toHaveLength(2);
      expect(updatedSpells.find((s) => s.slotIndex === 0)).toBeTruthy();
      expect(updatedSpells.find((s) => s.slotIndex === 4)).toBeTruthy();
    });

    test("returns the removed spell data", async () => {
      const removed = await clearSpellFromSlot(mockMetatron, 0);

      expect(removed).toBeTruthy();
      expect(removed.spellData.name).toBe("Cure Wounds");
      expect(removed.slotName).toBe("Supplication");
    });

    test("returns null when slot is empty", async () => {
      const removed = await clearSpellFromSlot(mockMetatron, 1); // Invocation - empty

      expect(removed).toBeNull();
      expect(mockMetatron.setFlag).not.toHaveBeenCalled();
    });

    test("returns null for invalid slot index", async () => {
      const removed = await clearSpellFromSlot(mockMetatron, 10);

      expect(removed).toBeNull();
      expect(mockMetatron.setFlag).not.toHaveBeenCalled();
    });
  });

  describe("clearMultipleSpells", () => {
    test("removes multiple spells at once", async () => {
      await clearMultipleSpells(mockMetatron, [0, 2]);

      const updatedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(updatedSpells).toHaveLength(1);
      expect(updatedSpells[0].slotIndex).toBe(4);
      expect(updatedSpells[0].spellData.name).toBe("Bless");
    });

    test("returns array of removed spells", async () => {
      const removed = await clearMultipleSpells(mockMetatron, [0, 4]);

      expect(removed).toHaveLength(2);
      expect(removed[0].spellData.name).toBe("Cure Wounds");
      expect(removed[1].spellData.name).toBe("Bless");
    });

    test("only removes valid slots", async () => {
      const removed = await clearMultipleSpells(mockMetatron, [0, 1, 10]); // 1 and 10 are invalid

      expect(removed).toHaveLength(1);
      expect(removed[0].spellData.name).toBe("Cure Wounds");
    });

    test("returns empty array when no valid slots", async () => {
      const removed = await clearMultipleSpells(mockMetatron, [1, 3]); // Both empty

      expect(removed).toHaveLength(0);
      expect(mockMetatron.setFlag).not.toHaveBeenCalled();
    });

    test("can clear all spells at once", async () => {
      await clearMultipleSpells(mockMetatron, [0, 2, 4]);

      const updatedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(updatedSpells).toHaveLength(0);
    });
  });
});
