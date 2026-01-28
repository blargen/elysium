/**
 * Tests for The Metatron - Prayer of Creation (Imprint)
 *
 * Testing the logic for imprinting spells from the Cleric spell list
 * Key difference from Aether's Grasp: no scrolls needed, picks from spell list
 *
 * Slots are named after forms of sacred prayer:
 * - Supplication, Invocation, Litany, Benediction, Consecration
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  getFirstLevelClericSpells,
  getAvailableSlots,
  imprintSpellOnSlot,
  canImprintMoreSpells,
} from "../../scripts/the-metatron/metatron-imprint.js";
import { FIRST_LEVEL_CLERIC_SPELLS } from "../../scripts/the-metatron/metatron-handler.js";

// Mock Cleric spell list (1st level spells)
const MOCK_CLERIC_SPELLS = [
  {
    name: "Bless",
    type: "spell",
    system: { level: 1, school: "enc", description: { value: "Buff allies" } },
  },
  {
    name: "Cure Wounds",
    type: "spell",
    system: {
      level: 1,
      school: "evo",
      description: { value: "Heal a creature" },
      actionType: "heal",
    },
  },
  {
    name: "Guiding Bolt",
    type: "spell",
    system: { level: 1, school: "evo", description: { value: "Radiant attack" } },
  },
  {
    name: "Healing Word",
    type: "spell",
    system: {
      level: 1,
      school: "evo",
      description: { value: "Bonus action heal" },
      actionType: "heal",
    },
  },
  {
    name: "Shield of Faith",
    type: "spell",
    system: { level: 1, school: "abj", description: { value: "+2 AC" } },
  },
];

describe("FIRST_LEVEL_CLERIC_SPELLS", () => {
  // Official PHB 1st level Cleric spells
  const OFFICIAL_PHB_CLERIC_SPELLS = [
    "Bane",
    "Bless",
    "Command",
    "Create or Destroy Water",
    "Cure Wounds",
    "Detect Evil and Good",
    "Detect Magic",
    "Detect Poison and Disease",
    "Guiding Bolt",
    "Healing Word",
    "Inflict Wounds",
    "Protection from Evil and Good",
    "Purify Food and Drink",
    "Sanctuary",
    "Shield of Faith",
  ];

  test("contains exactly 15 spells", () => {
    expect(FIRST_LEVEL_CLERIC_SPELLS).toHaveLength(15);
  });

  test("contains only official PHB 1st level Cleric spells", () => {
    for (const spell of FIRST_LEVEL_CLERIC_SPELLS) {
      expect(OFFICIAL_PHB_CLERIC_SPELLS).toContain(spell);
    }
  });

  test("contains all official PHB 1st level Cleric spells", () => {
    for (const spell of OFFICIAL_PHB_CLERIC_SPELLS) {
      expect(FIRST_LEVEL_CLERIC_SPELLS).toContain(spell);
    }
  });

  test("does not contain non-cleric spells", () => {
    const nonClericSpells = [
      "Magic Missile",
      "Shield",
      "Burning Hands",
      "Charm Person",
      "Sleep",
      "Thunderwave",
      "Faerie Fire",
      "Hunter's Mark",
    ];

    for (const spell of nonClericSpells) {
      expect(FIRST_LEVEL_CLERIC_SPELLS).not.toContain(spell);
    }
  });

  test("does not contain higher level Cleric spells", () => {
    const higherLevelClericSpells = [
      "Spiritual Weapon", // 2nd level
      "Spirit Guardians", // 3rd level
      "Mass Healing Word", // 3rd level
      "Death Ward", // 4th level
      "Raise Dead", // 5th level
    ];

    for (const spell of higherLevelClericSpells) {
      expect(FIRST_LEVEL_CLERIC_SPELLS).not.toContain(spell);
    }
  });
});

describe("The Metatron - Prayer of Creation (Imprint)", () => {
  let mockMetatron;

  beforeEach(() => {
    mockMetatron = {
      name: "The Metatron",
      flags: { elysium: {} },
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

  describe("getFirstLevelClericSpells", () => {
    test("returns list of 1st level Cleric spells", async () => {
      // Mock the compendium lookup
      const spells = await getFirstLevelClericSpells(MOCK_CLERIC_SPELLS);

      expect(spells.length).toBeGreaterThan(0);
      expect(spells.every((s) => s.system.level === 1)).toBe(true);
    });

    test("filters out non-1st level spells", async () => {
      const mixedSpells = [
        ...MOCK_CLERIC_SPELLS,
        { name: "Spiritual Weapon", type: "spell", system: { level: 2 } },
        { name: "Spirit Guardians", type: "spell", system: { level: 3 } },
      ];

      const spells = await getFirstLevelClericSpells(mixedSpells);

      expect(spells.every((s) => s.system.level === 1)).toBe(true);
      expect(spells.find((s) => s.name === "Spiritual Weapon")).toBeUndefined();
    });
  });

  describe("getAvailableSlots", () => {
    test("returns all 5 slots with sacred prayer names when no spells stored", () => {
      mockMetatron.flags.elysium.storedSpells = [];

      const slots = getAvailableSlots(mockMetatron);

      expect(slots).toHaveLength(5);
      expect(slots).toEqual([
        { index: 0, name: "Supplication", occupied: false, spell: null },
        { index: 1, name: "Invocation", occupied: false, spell: null },
        { index: 2, name: "Litany", occupied: false, spell: null },
        { index: 3, name: "Benediction", occupied: false, spell: null },
        { index: 4, name: "Consecration", occupied: false, spell: null },
      ]);
    });

    test("marks occupied slots correctly", () => {
      mockMetatron.flags.elysium.storedSpells = [
        { slotIndex: 0, spellData: { name: "Bless" } },
        { slotIndex: 2, spellData: { name: "Cure Wounds" } },
      ];

      const slots = getAvailableSlots(mockMetatron);

      expect(slots[0].occupied).toBe(true);
      expect(slots[0].spell.spellData.name).toBe("Bless");
      expect(slots[0].name).toBe("Supplication");
      expect(slots[1].occupied).toBe(false);
      expect(slots[1].name).toBe("Invocation");
      expect(slots[2].occupied).toBe(true);
      expect(slots[2].spell.spellData.name).toBe("Cure Wounds");
      expect(slots[2].name).toBe("Litany");
      expect(slots[3].occupied).toBe(false);
      expect(slots[3].name).toBe("Benediction");
      expect(slots[4].occupied).toBe(false);
      expect(slots[4].name).toBe("Consecration");
    });
  });

  describe("canImprintMoreSpells", () => {
    test("returns true when no spells stored", () => {
      mockMetatron.flags.elysium.storedSpells = [];

      expect(canImprintMoreSpells(mockMetatron)).toBe(true);
    });

    test("returns true when less than 5 spells stored", () => {
      mockMetatron.flags.elysium.storedSpells = [
        { slotIndex: 0, spellData: { name: "Bless" } },
        { slotIndex: 1, spellData: { name: "Cure Wounds" } },
      ];

      expect(canImprintMoreSpells(mockMetatron)).toBe(true);
    });

    test("returns false when 5 spells stored (max capacity)", () => {
      mockMetatron.flags.elysium.storedSpells = [
        { slotIndex: 0, spellData: { name: "Spell 1" } },
        { slotIndex: 1, spellData: { name: "Spell 2" } },
        { slotIndex: 2, spellData: { name: "Spell 3" } },
        { slotIndex: 3, spellData: { name: "Spell 4" } },
        { slotIndex: 4, spellData: { name: "Spell 5" } },
      ];

      expect(canImprintMoreSpells(mockMetatron)).toBe(false);
    });
  });

  describe("imprintSpellOnSlot", () => {
    test("stores spell data on specified slot with sacred name", async () => {
      mockMetatron.flags.elysium.storedSpells = [];

      const spellData = {
        name: "Cure Wounds",
        type: "spell",
        system: { level: 1 },
      };

      await imprintSpellOnSlot(mockMetatron, 0, spellData);

      const setFlagCall = mockMetatron.setFlag.mock.calls[0];
      expect(setFlagCall[0]).toBe("elysium");
      expect(setFlagCall[1]).toBe("storedSpells");

      const storedSpells = setFlagCall[2];
      expect(storedSpells).toHaveLength(1);
      expect(storedSpells[0].slotIndex).toBe(0);
      expect(storedSpells[0].slotName).toBe("Supplication");
      expect(storedSpells[0].spellData.name).toBe("Cure Wounds");
    });

    test("uses correct sacred name for each slot", async () => {
      const slotNames = [
        "Supplication",
        "Invocation",
        "Litany",
        "Benediction",
        "Consecration",
      ];

      for (let i = 0; i < 5; i++) {
        mockMetatron.flags.elysium.storedSpells = [];
        mockMetatron.setFlag.mockClear();

        const spellData = { name: `Spell ${i}`, type: "spell" };
        await imprintSpellOnSlot(mockMetatron, i, spellData);

        const storedSpells = mockMetatron.setFlag.mock.calls[0][2];
        expect(storedSpells[0].slotName).toBe(slotNames[i]);
      }
    });

    test("adds spell to existing stored spells", async () => {
      mockMetatron.flags.elysium.storedSpells = [
        {
          id: "existing-1",
          slotIndex: 0,
          slotName: "Supplication",
          spellData: { name: "Bless" },
        },
      ];

      const spellData = {
        name: "Healing Word",
        type: "spell",
        system: { level: 1 },
      };

      await imprintSpellOnSlot(mockMetatron, 2, spellData);

      const storedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(storedSpells).toHaveLength(2);
      expect(storedSpells[0].spellData.name).toBe("Bless");
      expect(storedSpells[0].slotName).toBe("Supplication");
      expect(storedSpells[1].spellData.name).toBe("Healing Word");
      expect(storedSpells[1].slotIndex).toBe(2);
      expect(storedSpells[1].slotName).toBe("Litany");
    });

    test("generates unique ID for each spell", async () => {
      mockMetatron.flags.elysium.storedSpells = [];

      const spellData = { name: "Guiding Bolt", type: "spell" };

      await imprintSpellOnSlot(mockMetatron, 0, spellData);

      const storedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(storedSpells[0].id).toBeTruthy();
      expect(typeof storedSpells[0].id).toBe("string");
    });

    test("records imprint timestamp", async () => {
      mockMetatron.flags.elysium.storedSpells = [];

      const spellData = { name: "Shield of Faith", type: "spell" };
      const beforeTime = Date.now();

      await imprintSpellOnSlot(mockMetatron, 0, spellData);

      const storedSpells = mockMetatron.setFlag.mock.calls[0][2];
      expect(storedSpells[0].imprintedAt).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe("imprintSpellOnSlot - multiple spells", () => {
    test("can imprint multiple different spells on different slots", async () => {
      mockMetatron.flags.elysium.storedSpells = [];

      const blessData = { name: "Bless", type: "spell", system: { level: 1 } };
      const cureData = { name: "Cure Wounds", type: "spell", system: { level: 1 } };

      // Imprint Bless on Supplication
      await imprintSpellOnSlot(mockMetatron, 0, blessData);

      // Imprint Cure Wounds on Invocation
      await imprintSpellOnSlot(mockMetatron, 1, cureData);

      expect(mockMetatron.setFlag).toHaveBeenCalledTimes(2);

      const finalStoredSpells = mockMetatron.setFlag.mock.calls[1][2];
      expect(finalStoredSpells).toHaveLength(2);
      expect(finalStoredSpells[0].spellData.name).toBe("Bless");
      expect(finalStoredSpells[0].slotName).toBe("Supplication");
      expect(finalStoredSpells[1].spellData.name).toBe("Cure Wounds");
      expect(finalStoredSpells[1].slotName).toBe("Invocation");
    });

    test("can imprint same spell on multiple slots", async () => {
      mockMetatron.flags.elysium.storedSpells = [];

      const cureData = { name: "Cure Wounds", type: "spell", system: { level: 1 } };

      // Imprint same spell on Supplication
      await imprintSpellOnSlot(mockMetatron, 0, cureData);

      // Imprint same spell on Invocation
      await imprintSpellOnSlot(mockMetatron, 1, cureData);

      expect(mockMetatron.setFlag).toHaveBeenCalledTimes(2);

      const finalStoredSpells = mockMetatron.setFlag.mock.calls[1][2];
      expect(finalStoredSpells).toHaveLength(2);
      expect(finalStoredSpells[0].spellData.name).toBe("Cure Wounds");
      expect(finalStoredSpells[0].slotName).toBe("Supplication");
      expect(finalStoredSpells[1].spellData.name).toBe("Cure Wounds");
      expect(finalStoredSpells[1].slotName).toBe("Invocation");
    });
  });
});
