/**
 * Tests for Aether's Grasp - Cast From Finger
 *
 * Testing the logic for casting stored spells using aether fuel
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  getStoredSpellByFinger,
  castSpellFromFinger,
  authorizedGraspCasts,
  getSpellFromSpellbook,
} from "../../scripts/aethers-grasp/cast.js";

describe("Aether's Grasp - Cast From Finger", () => {
  let mockActor;
  let mockAethersGrasp;
  let mockSpellbookSpell;

  beforeEach(() => {
    // Mock spell in actor's spellbook with use() method
    mockSpellbookSpell = {
      id: "spellbook-spell-1",
      name: "Magic Missile (Thumb)",
      type: "spell",
      use: jest.fn(async () => ({ success: true })),
    };

    mockActor = {
      name: "Test Character",
      items: {
        get: jest.fn((id) => {
          if (id === "spellbook-spell-1") return mockSpellbookSpell;
          if (id === "spellbook-spell-2") return {
            id: "spellbook-spell-2",
            name: "Shield (Middle)",
            type: "spell",
            use: jest.fn(async () => ({ success: true })),
          };
          return undefined;
        }),
      },
    };

    // Stored spell references (no spellData - just links to spellbook)
    mockAethersGrasp = {
      name: "Aether's Grasp",
      flags: {
        elysium: {
          storedSpells: [
            {
              id: "spell-1",
              fingerIndex: 0,
              fingerName: "Thumb",
              spellName: "Magic Missile",
              spellbookItemId: "spellbook-spell-1",
            },
            {
              id: "spell-2",
              fingerIndex: 2,
              fingerName: "Middle",
              spellName: "Shield",
              spellbookItemId: "spellbook-spell-2",
            },
          ],
        },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };
  });

  describe("getStoredSpellByFinger", () => {
    test("returns spell stored on specified finger", () => {
      const spell = getStoredSpellByFinger(mockAethersGrasp, 0);

      expect(spell).toBeTruthy();
      expect(spell.fingerName).toBe("Thumb");
      expect(spell.spellName).toBe("Magic Missile");
      expect(spell.spellbookItemId).toBe("spellbook-spell-1");
    });

    test("returns null when finger has no spell", () => {
      const spell = getStoredSpellByFinger(mockAethersGrasp, 1); // Index finger - empty

      expect(spell).toBeNull();
    });

    test("returns null for invalid finger index", () => {
      const spell = getStoredSpellByFinger(mockAethersGrasp, 10);

      expect(spell).toBeNull();
    });
  });

  describe("castSpellFromFinger", () => {
    test("gets spell from actor spellbook and calls use()", async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = {};

      await castSpellFromFinger(mockActor, storedSpell, modifiers);

      expect(mockActor.items.get).toHaveBeenCalledWith("spellbook-spell-1");
      expect(mockSpellbookSpell.use).toHaveBeenCalledWith({
        consumeSpellSlot: false,
        consumeUsage: false,
      });
    });

    test("returns castResult from spell.use()", async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = {};

      const result = await castSpellFromFinger(mockActor, storedSpell, modifiers);

      expect(result.castResult).toEqual({ success: true });
    });

    test("throws error if spellbookItemId is missing", async () => {
      const storedSpellNoId = {
        id: "spell-bad",
        fingerIndex: 0,
        fingerName: "Thumb",
        spellName: "Magic Missile",
        // No spellbookItemId
      };
      const modifiers = {};

      await expect(
        castSpellFromFinger(mockActor, storedSpellNoId, modifiers)
      ).rejects.toThrow("No spellbookItemId");
    });

    test("throws error if spell not found in spellbook", async () => {
      const storedSpellBadId = {
        id: "spell-bad",
        fingerIndex: 0,
        fingerName: "Thumb",
        spellName: "Magic Missile",
        spellbookItemId: "nonexistent-spell",
      };
      const modifiers = {};

      await expect(
        castSpellFromFinger(mockActor, storedSpellBadId, modifiers)
      ).rejects.toThrow("Spell not found in spellbook");
    });

    test("authorizes spell ID before casting and cleans up after", async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = {};

      // Verify authorization is added during cast
      let wasAuthorized = false;
      mockSpellbookSpell.use = jest.fn(async () => {
        wasAuthorized = authorizedGraspCasts.has("spellbook-spell-1");
        return { success: true };
      });

      await castSpellFromFinger(mockActor, storedSpell, modifiers);

      expect(wasAuthorized).toBe(true);
      // Should be cleaned up after
      expect(authorizedGraspCasts.has("spellbook-spell-1")).toBe(false);
    });

    test("cleans up authorization even on error", async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = {};

      mockSpellbookSpell.use = jest.fn(async () => {
        throw new Error("Cast failed");
      });

      await expect(
        castSpellFromFinger(mockActor, storedSpell, modifiers)
      ).rejects.toThrow("Cast failed");

      // Should still be cleaned up
      expect(authorizedGraspCasts.has("spellbook-spell-1")).toBe(false);
    });
  });

  describe("authorizedGraspCasts", () => {
    beforeEach(() => {
      authorizedGraspCasts.clear();
    });

    test("is a Set", () => {
      expect(authorizedGraspCasts).toBeInstanceOf(Set);
    });

    test("can add and check spell IDs", () => {
      authorizedGraspCasts.add("spell-123");
      expect(authorizedGraspCasts.has("spell-123")).toBe(true);
      expect(authorizedGraspCasts.has("spell-456")).toBe(false);
    });

    test("can remove spell IDs", () => {
      authorizedGraspCasts.add("spell-123");
      authorizedGraspCasts.delete("spell-123");
      expect(authorizedGraspCasts.has("spell-123")).toBe(false);
    });
  });

  describe("getSpellFromSpellbook", () => {
    test("finds spell by spellbookItemId", () => {
      const mockActorWithSpells = {
        items: {
          get: jest.fn().mockReturnValue({
            id: "spell-in-spellbook",
            name: "Magic Missile (Thumb)",
          }),
        },
      };

      const result = getSpellFromSpellbook(mockActorWithSpells, "spell-in-spellbook");

      expect(mockActorWithSpells.items.get).toHaveBeenCalledWith("spell-in-spellbook");
      expect(result.id).toBe("spell-in-spellbook");
    });

    test("returns null if spell not found", () => {
      const mockActorWithSpells = {
        items: {
          get: jest.fn().mockReturnValue(undefined),
        },
      };

      const result = getSpellFromSpellbook(mockActorWithSpells, "nonexistent-id");

      expect(result).toBeNull();
    });
  });
});
