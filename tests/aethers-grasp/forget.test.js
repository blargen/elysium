/**
 * Tests for Aether's Grasp - Forget From Finger
 *
 * Testing the spell removal/clearing functionality
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  clearSpellFromFinger,
  removeSpellFromSpellbook,
} from "../../scripts/aethers-grasp/forget.js";

describe("Forget From Finger", () => {
  let mockAethersGrasp;

  beforeEach(() => {
    mockAethersGrasp = {
      name: "Aether's Grasp",
      flags: {
        elysium: {
          storedSpells: [
            {
              fingerIndex: 0,
              fingerName: "Thumb",
              scrollId: "scroll-1",
              spellData: {
                name: "Spell Scroll: Fireball",
                flags: {
                  ddbimporter: {
                    originalName: "Fireball",
                  },
                },
                system: {
                  level: 3,
                },
              },
            },
            {
              fingerIndex: 2,
              fingerName: "Middle Finger",
              scrollId: "scroll-2",
              spellData: {
                name: "Spell Scroll: Magic Missile",
                flags: {
                  ddbimporter: {
                    originalName: "Magic Missile",
                  },
                },
                system: {
                  level: 1,
                },
              },
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

  describe("clearSpellFromFinger", () => {
    test("removes spell from occupied finger", async () => {
      const removed = await clearSpellFromFinger(mockAethersGrasp, 0);

      expect(removed).toBeTruthy();
      expect(removed.fingerName).toBe("Thumb");
      expect(removed.spellData.flags.ddbimporter.originalName).toBe("Fireball");
    });

    test("returns null when clearing from empty finger", async () => {
      const removed = await clearSpellFromFinger(mockAethersGrasp, 1); // Index Finger is empty

      expect(removed).toBeNull();
    });

    test("updates storedSpells array correctly", async () => {
      await clearSpellFromFinger(mockAethersGrasp, 0); // Remove Thumb

      expect(mockAethersGrasp.setFlag).toHaveBeenCalledWith(
        "elysium",
        "storedSpells",
        expect.arrayContaining([
          expect.objectContaining({
            fingerIndex: 2,
            fingerName: "Middle Finger",
          }),
        ]),
      );

      // Should only have 1 spell left (Middle Finger)
      const updatedSpells = mockAethersGrasp.setFlag.mock.calls[0][2];
      expect(updatedSpells.length).toBe(1);
    });

    test("removes correct spell when multiple spells stored", async () => {
      await clearSpellFromFinger(mockAethersGrasp, 2); // Remove Middle Finger

      const updatedSpells = mockAethersGrasp.setFlag.mock.calls[0][2];

      // Should only have Thumb left
      expect(updatedSpells.length).toBe(1);
      expect(updatedSpells[0].fingerIndex).toBe(0);
      expect(updatedSpells[0].fingerName).toBe("Thumb");
    });

    test("returns full spell object on successful removal", async () => {
      const removed = await clearSpellFromFinger(mockAethersGrasp, 2);

      expect(removed).toEqual({
        fingerIndex: 2,
        fingerName: "Middle Finger",
        scrollId: "scroll-2",
        spellData: {
          name: "Spell Scroll: Magic Missile",
          flags: {
            ddbimporter: {
              originalName: "Magic Missile",
            },
          },
          system: {
            level: 1,
          },
        },
      });
    });

    test("handles clearing last remaining spell", async () => {
      // Clear first spell
      await clearSpellFromFinger(mockAethersGrasp, 0);

      // Update mock to reflect new state (only Middle Finger remains)
      mockAethersGrasp.flags.elysium.storedSpells = [
        {
          fingerIndex: 2,
          fingerName: "Middle Finger",
          scrollId: "scroll-2",
          spellData: {
            name: "Spell Scroll: Magic Missile",
            flags: {
              ddbimporter: {
                originalName: "Magic Missile",
              },
            },
            system: {
              level: 1,
            },
          },
        },
      ];

      // Clear last spell
      await clearSpellFromFinger(mockAethersGrasp, 2);

      const updatedSpells = mockAethersGrasp.setFlag.mock.calls[1][2];
      expect(updatedSpells.length).toBe(0);
    });

    test("does not modify array when clearing empty finger", async () => {
      const initialLength = mockAethersGrasp.flags.elysium.storedSpells.length;

      await clearSpellFromFinger(mockAethersGrasp, 4); // Pinky is empty

      // setFlag should not be called if nothing was removed
      expect(mockAethersGrasp.setFlag).not.toHaveBeenCalled();
    });

    test("handles item with no stored spells", async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const removed = await clearSpellFromFinger(mockAethersGrasp, 0);

      expect(removed).toBeNull();
      expect(mockAethersGrasp.setFlag).not.toHaveBeenCalled();
    });
  });

  describe("removeSpellFromSpellbook", () => {
    let mockActor;

    beforeEach(() => {
      mockActor = {
        name: "Test Wizard",
        items: {
          get: jest.fn(),
        },
        deleteEmbeddedDocuments: jest.fn().mockResolvedValue([]),
      };
    });

    test("removes spell from actor's spellbook by ID", async () => {
      const mockSpell = {
        id: "spellbook-spell-123",
        name: "Magic Missile (Thumb)",
        delete: jest.fn().mockResolvedValue(true),
      };
      mockActor.items.get.mockReturnValue(mockSpell);

      await removeSpellFromSpellbook(mockActor, "spellbook-spell-123");

      expect(mockActor.items.get).toHaveBeenCalledWith("spellbook-spell-123");
      expect(mockSpell.delete).toHaveBeenCalled();
    });

    test("does nothing if spell not found in spellbook", async () => {
      mockActor.items.get.mockReturnValue(undefined);

      // Should not throw
      await removeSpellFromSpellbook(mockActor, "nonexistent-id");

      expect(mockActor.items.get).toHaveBeenCalledWith("nonexistent-id");
    });

    test("does nothing if spellbookItemId is null", async () => {
      await removeSpellFromSpellbook(mockActor, null);

      expect(mockActor.items.get).not.toHaveBeenCalled();
    });

    test("does nothing if spellbookItemId is undefined", async () => {
      await removeSpellFromSpellbook(mockActor, undefined);

      expect(mockActor.items.get).not.toHaveBeenCalled();
    });

    test("logs when spell is removed", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const mockSpell = {
        id: "spell-123",
        name: "Shield (Index)",
        delete: jest.fn().mockResolvedValue(true),
      };
      mockActor.items.get.mockReturnValue(mockSpell);

      await removeSpellFromSpellbook(mockActor, "spell-123");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Shield (Index)"),
      );
      consoleSpy.mockRestore();
    });
  });
});
