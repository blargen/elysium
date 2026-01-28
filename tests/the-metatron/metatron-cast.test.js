/**
 * Tests for The Metatron - Psalm of Casting
 *
 * Testing the logic for casting stored spells using aether fuel.
 *
 * Casting modes:
 * - Basic (aether only): Cast at level 1
 * - Enhanced (aether + spell slot):
 *   - Non-healing spells: Auto-upcast to level 2
 *   - Touch healing spells (Cure Wounds): Choose Extended Range | Upcast | Max Healing
 *   - Ranged healing spells (Healing Word): Choose Upcast | Max Healing
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  getStoredSpellBySlot,
  isHealingSpell,
  isTouchSpell,
  getHealingEnhancementOptions,
  createTemporarySpellItem,
  applyHealingEnhancement,
  castSpellFromSlot,
} from "../../scripts/the-metatron/metatron-cast.js";

describe("The Metatron - Psalm of Casting", () => {
  let mockActor;
  let mockMetatron;

  beforeEach(() => {
    mockActor = {
      name: "Test Cleric",
      system: {
        spells: {
          spell1: { value: 3, max: 3 }, // 3 1st level spell slots
        },
      },
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
      update: jest.fn(async () => {}),
    };

    mockMetatron = {
      name: "The Metatron",
      flags: {
        elysium: {
          storedSpells: [
            {
              id: "spell-1",
              slotIndex: 0,
              slotName: "Supplication",
              spellData: {
                name: "Cure Wounds",
                type: "spell",
                system: {
                  level: 1,
                  actionType: "heal",
                  range: { value: null, units: "touch" },
                  damage: { parts: [["1d8 + @mod", "healing"]] },
                },
              },
            },
            {
              id: "spell-2",
              slotIndex: 1,
              slotName: "Invocation",
              spellData: {
                name: "Healing Word",
                type: "spell",
                system: {
                  level: 1,
                  actionType: "heal",
                  range: { value: 60, units: "ft" },
                  damage: { parts: [["1d4 + @mod", "healing"]] },
                },
              },
            },
            {
              id: "spell-3",
              slotIndex: 2,
              slotName: "Litany",
              spellData: {
                name: "Guiding Bolt",
                type: "spell",
                system: {
                  level: 1,
                  actionType: "rsak",
                  range: { value: 120, units: "ft" },
                  damage: { parts: [["4d6", "radiant"]] },
                },
              },
            },
          ],
        },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };
  });

  describe("getStoredSpellBySlot", () => {
    test("returns spell stored on specified slot", () => {
      const spell = getStoredSpellBySlot(mockMetatron, 0);

      expect(spell).toBeTruthy();
      expect(spell.slotName).toBe("Supplication");
      expect(spell.spellData.name).toBe("Cure Wounds");
    });

    test("returns null when slot has no spell", () => {
      const spell = getStoredSpellBySlot(mockMetatron, 4); // Consecration - empty

      expect(spell).toBeNull();
    });

    test("returns null for invalid slot index", () => {
      const spell = getStoredSpellBySlot(mockMetatron, 10);

      expect(spell).toBeNull();
    });
  });

  describe("isHealingSpell", () => {
    test("returns true for Cure Wounds (actionType heal)", () => {
      const cureWounds = mockMetatron.flags.elysium.storedSpells[0].spellData;
      expect(isHealingSpell(cureWounds)).toBe(true);
    });

    test("returns true for Healing Word (actionType heal)", () => {
      const healingWord = mockMetatron.flags.elysium.storedSpells[1].spellData;
      expect(isHealingSpell(healingWord)).toBe(true);
    });

    test("returns false for Guiding Bolt (attack spell)", () => {
      const guidingBolt = mockMetatron.flags.elysium.storedSpells[2].spellData;
      expect(isHealingSpell(guidingBolt)).toBe(false);
    });
  });

  describe("isTouchSpell", () => {
    test("returns true for Cure Wounds (touch range)", () => {
      const cureWounds = mockMetatron.flags.elysium.storedSpells[0].spellData;
      expect(isTouchSpell(cureWounds)).toBe(true);
    });

    test("returns false for Healing Word (60ft range)", () => {
      const healingWord = mockMetatron.flags.elysium.storedSpells[1].spellData;
      expect(isTouchSpell(healingWord)).toBe(false);
    });

    test("returns false for Guiding Bolt (120ft range)", () => {
      const guidingBolt = mockMetatron.flags.elysium.storedSpells[2].spellData;
      expect(isTouchSpell(guidingBolt)).toBe(false);
    });
  });

  describe("getHealingEnhancementOptions", () => {
    test("returns 3 options for touch healing spell (Cure Wounds)", () => {
      const cureWounds = mockMetatron.flags.elysium.storedSpells[0].spellData;
      const options = getHealingEnhancementOptions(cureWounds);

      expect(options).toHaveLength(3);
      expect(options.map((o) => o.id)).toEqual([
        "extendedRange",
        "upcast",
        "maxHealing",
      ]);
    });

    test("returns 2 options for ranged healing spell (Healing Word)", () => {
      const healingWord = mockMetatron.flags.elysium.storedSpells[1].spellData;
      const options = getHealingEnhancementOptions(healingWord);

      expect(options).toHaveLength(2);
      expect(options.map((o) => o.id)).toEqual(["upcast", "maxHealing"]);
    });

    test("returns empty array for non-healing spell", () => {
      const guidingBolt = mockMetatron.flags.elysium.storedSpells[2].spellData;
      const options = getHealingEnhancementOptions(guidingBolt);

      expect(options).toHaveLength(0);
    });

    test("extended range option has descriptive label", () => {
      const cureWounds = mockMetatron.flags.elysium.storedSpells[0].spellData;
      const options = getHealingEnhancementOptions(cureWounds);
      const extendedRange = options.find((o) => o.id === "extendedRange");

      expect(extendedRange.label).toContain("40");
    });
  });

  describe("createTemporarySpellItem", () => {
    test("creates spell item with preparation mode set to atwill", () => {
      const spellData = {
        name: "Cure Wounds",
        system: {
          level: 1,
          preparation: { mode: "prepared" },
        },
      };

      const tempData = createTemporarySpellItem(spellData);

      expect(tempData.system.preparation.mode).toBe("atwill");
    });

    test("marks spell as temporary with metatron flag", () => {
      const spellData = {
        name: "Bless",
        system: { level: 1 },
      };

      const tempData = createTemporarySpellItem(spellData);

      expect(tempData.flags.metatron).toBeTruthy();
      expect(tempData.flags.metatron.temporary).toBe(true);
    });
  });

  describe("applyHealingEnhancement", () => {
    test("extendedRange: converts touch to 40ft", () => {
      const spellData = {
        name: "Cure Wounds",
        system: {
          range: { value: null, units: "touch" },
        },
      };

      const modified = applyHealingEnhancement(spellData, "extendedRange");

      expect(modified.system.range.value).toBe(40);
      expect(modified.system.range.units).toBe("ft");
    });

    test("upcast: increases spell level to 2", () => {
      const spellData = {
        name: "Cure Wounds",
        system: { level: 1 },
      };

      const modified = applyHealingEnhancement(spellData, "upcast");

      expect(modified.system.level).toBe(2);
    });

    test("maxHealing: adds maxHealing flag for midi-qol", () => {
      const spellData = {
        name: "Cure Wounds",
        system: { level: 1 },
      };

      const modified = applyHealingEnhancement(spellData, "maxHealing");

      expect(modified.flags.metatron.maxHealing).toBe(true);
    });
  });

  describe("castSpellFromSlot", () => {
    test("creates temporary spell item on actor", async () => {
      const storedSpell = mockMetatron.flags.elysium.storedSpells[0];

      await castSpellFromSlot(mockActor, storedSpell, {});

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Cure Wounds",
            type: "spell",
          }),
        ]),
      );
    });

    test("basic mode: casts without consuming spell slots", async () => {
      const storedSpell = mockMetatron.flags.elysium.storedSpells[0];

      const result = await castSpellFromSlot(mockActor, storedSpell, {
        enhanced: false,
      });

      expect(result.tempSpell.use).toHaveBeenCalledWith(
        expect.objectContaining({
          consumeSpellSlot: false,
        }),
      );
    });

    test("enhanced mode: non-healing spell auto-upcasts to level 2", async () => {
      const storedSpell = mockMetatron.flags.elysium.storedSpells[2]; // Guiding Bolt

      await castSpellFromSlot(mockActor, storedSpell, { enhanced: true });

      const createdData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.level).toBe(2);
    });

    test("enhanced mode: healing spell applies chosen enhancement", async () => {
      const storedSpell = mockMetatron.flags.elysium.storedSpells[0]; // Cure Wounds

      await castSpellFromSlot(mockActor, storedSpell, {
        enhanced: true,
        healingEnhancement: "extendedRange",
      });

      const createdData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.range.value).toBe(40);
      expect(createdData.system.range.units).toBe("ft");
    });

    test("returns the temporary spell for cleanup", async () => {
      const storedSpell = mockMetatron.flags.elysium.storedSpells[0];

      const result = await castSpellFromSlot(mockActor, storedSpell, {});

      expect(result.tempSpell).toBeTruthy();
      expect(result.tempSpell.id).toBe("temp-spell-id");
    });
  });
});
