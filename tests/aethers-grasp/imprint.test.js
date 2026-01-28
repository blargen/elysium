/**
 * Tests for Aether's Grasp - Imprint From Scroll
 *
 * Testing the logic for storing spells from scrolls onto finger slots
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  findFirstLevelScrolls,
  getAvailableFingerSlots,
  imprintSpellOnFinger,
  canImprintMoreSpells,
  consumeScroll,
  prepareImprintsFromSelections,
  createStoredSpellObject,
  convertScrollToSpell,
  addSpellToSpellbook,
  FINGER_NAMES,
} from "../../scripts/aethers-grasp/imprint.js";
import { getStoredSpells } from "../../scripts/utils/flags.js";

describe("Aether's Grasp - Imprint From Scroll", () => {
  let mockActor;
  let mockAethersGrasp;

  beforeEach(() => {
    mockActor = {
      name: "Test Character",
      items: {
        filter: function (callback) {
          return this._items.filter(callback);
        },
        get: function (id) {
          return this._items.find((i) => i.id === id);
        },
        _items: [],
      },
    };

    mockAethersGrasp = {
      name: "Aether's Grasp",
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

  describe("findFirstLevelScrolls", () => {
    test("returns empty array when no scrolls exist", () => {
      mockActor.items._items = [];

      const scrolls = findFirstLevelScrolls(mockActor);

      expect(scrolls).toEqual([]);
    });

    test("finds 1st level spell scrolls", () => {
      mockActor.items._items = [
        {
          id: "1",
          name: "Spell Scroll: Magic Missile",
          type: "consumable",
          system: {
            type: { value: "scroll" },
            identifier: "spell-scroll-1st-level",
            uses: { value: 1 },
          },
        },
        {
          id: "2",
          name: "Potion of Healing",
          type: "consumable",
          system: { type: { value: "potion" } },
        },
      ];

      const scrolls = findFirstLevelScrolls(mockActor);

      expect(scrolls).toHaveLength(1);
      expect(scrolls[0].name).toBe("Spell Scroll: Magic Missile");
    });

    test("filters out scrolls with 0 uses", () => {
      mockActor.items._items = [
        {
          id: "1",
          name: "Spell Scroll: Shield",
          type: "consumable",
          system: {
            type: { value: "scroll" },
            identifier: "spell-scroll-1st-level",
            uses: { value: 1 },
          },
        },
        {
          id: "2",
          name: "Spell Scroll: Mage Armor",
          type: "consumable",
          system: {
            type: { value: "scroll" },
            identifier: "spell-scroll-1st-level",
            uses: { value: 0 },
          },
        },
      ];

      const scrolls = findFirstLevelScrolls(mockActor);

      expect(scrolls).toHaveLength(1);
      expect(scrolls[0].name).toBe("Spell Scroll: Shield");
    });
  });

  describe("getAvailableFingerSlots", () => {
    test("returns all 5 slots when no spells stored", () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const slots = getAvailableFingerSlots(mockAethersGrasp);

      expect(slots).toHaveLength(5);
      expect(slots).toEqual([
        { index: 0, name: "Thumb", occupied: false, spell: null },
        { index: 1, name: "Index", occupied: false, spell: null },
        { index: 2, name: "Middle", occupied: false, spell: null },
        { index: 3, name: "Ring", occupied: false, spell: null },
        { index: 4, name: "Pinky", occupied: false, spell: null },
      ]);
    });

    test("marks occupied slots correctly", () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        { fingerIndex: 0, spellData: { name: "Magic Missile" } },
        { fingerIndex: 2, spellData: { name: "Shield" } },
      ];

      const slots = getAvailableFingerSlots(mockAethersGrasp);

      expect(slots[0].occupied).toBe(true);
      expect(slots[1].occupied).toBe(false);
      expect(slots[2].occupied).toBe(true);
      expect(slots[3].occupied).toBe(false);
      expect(slots[4].occupied).toBe(false);
    });
  });

  describe("canImprintMoreSpells", () => {
    test("returns true when no spells stored", () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      expect(canImprintMoreSpells(mockAethersGrasp)).toBe(true);
    });

    test("returns true when less than 5 spells stored", () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        { fingerIndex: 0, spellData: { name: "Magic Missile" } },
        { fingerIndex: 1, spellData: { name: "Shield" } },
      ];

      expect(canImprintMoreSpells(mockAethersGrasp)).toBe(true);
    });

    test("returns false when 5 spells stored (max capacity)", () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        { fingerIndex: 0, spellData: { name: "Spell 1" } },
        { fingerIndex: 1, spellData: { name: "Spell 2" } },
        { fingerIndex: 2, spellData: { name: "Spell 3" } },
        { fingerIndex: 3, spellData: { name: "Spell 4" } },
        { fingerIndex: 4, spellData: { name: "Spell 5" } },
      ];

      expect(canImprintMoreSpells(mockAethersGrasp)).toBe(false);
    });
  });

  describe("imprintSpellOnFinger", () => {
    test("stores spell data on specified finger", async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const spellData = {
        name: "Magic Missile",
        type: "spell",
        system: { level: 1 },
      };

      await imprintSpellOnFinger(
        mockAethersGrasp,
        0,
        spellData,
        "Spell Scroll: Magic Missile",
      );

      const setFlagCall = mockAethersGrasp.setFlag.mock.calls[0];
      expect(setFlagCall[0]).toBe("elysium");
      expect(setFlagCall[1]).toBe("storedSpells");

      const storedSpells = setFlagCall[2];
      expect(storedSpells).toHaveLength(1);
      expect(storedSpells[0].fingerIndex).toBe(0);
      expect(storedSpells[0].fingerName).toBe("Thumb");
      expect(storedSpells[0].spellData.name).toBe("Magic Missile");
      expect(storedSpells[0].originalScrollName).toBe(
        "Spell Scroll: Magic Missile",
      );
    });

    test("adds spell to existing stored spells", async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        {
          id: "existing-1",
          fingerIndex: 0,
          fingerName: "Thumb",
          spellData: { name: "Existing Spell" },
        },
      ];

      const spellData = {
        name: "Shield",
        type: "spell",
        system: { level: 1 },
      };

      await imprintSpellOnFinger(
        mockAethersGrasp,
        2,
        spellData,
        "Spell Scroll: Shield",
      );

      const storedSpells = mockAethersGrasp.setFlag.mock.calls[0][2];
      expect(storedSpells).toHaveLength(2);
      expect(storedSpells[0].spellData.name).toBe("Existing Spell");
      expect(storedSpells[1].spellData.name).toBe("Shield");
    });

    test("generates unique ID for each spell", async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const spellData = { name: "Test Spell", type: "spell" };

      await imprintSpellOnFinger(mockAethersGrasp, 0, spellData, "Scroll");

      const storedSpells = mockAethersGrasp.setFlag.mock.calls[0][2];
      expect(storedSpells[0].id).toBeTruthy();
      expect(typeof storedSpells[0].id).toBe("string");
    });
  });

  describe("consumeScroll", () => {
    test("reduces scroll uses by 1", async () => {
      const mockScroll = {
        id: "1",
        name: "Spell Scroll: Magic Missile",
        system: { uses: { value: 3, max: 3 }, quantity: 1 },
        update: jest.fn(async function (data) {
          this.system.uses.value = data["system.uses.value"];
          return this;
        }),
        delete: jest.fn(),
      };

      await consumeScroll(mockScroll);

      expect(mockScroll.update).toHaveBeenCalledWith({
        "system.uses.value": 2,
      });
      expect(mockScroll.delete).not.toHaveBeenCalled();
    });

    test("deletes scroll when uses reach 0 and quantity is 1", async () => {
      const mockScroll = {
        id: "1",
        name: "Spell Scroll: Shield",
        system: { uses: { value: 1, max: 1 }, quantity: 1 },
        update: jest.fn(),
        delete: jest.fn(async function () {
          return this;
        }),
      };

      await consumeScroll(mockScroll);

      expect(mockScroll.delete).toHaveBeenCalled();
      expect(mockScroll.update).not.toHaveBeenCalled();
    });

    test("reduces quantity and resets uses when uses reach 0 but quantity > 1", async () => {
      const mockScroll = {
        id: "1",
        name: "Spell Scroll: Mage Armor",
        system: { uses: { value: 1, max: 1 }, quantity: 3 },
        update: jest.fn(async function (data) {
          this.system.quantity = data["system.quantity"];
          this.system.uses.value = data["system.uses.value"];
          return this;
        }),
        delete: jest.fn(),
      };

      await consumeScroll(mockScroll);

      expect(mockScroll.update).toHaveBeenCalledWith({
        "system.quantity": 2,
        "system.uses.value": 1,
      });
      expect(mockScroll.delete).not.toHaveBeenCalled();
    });
  });

  describe("imprintSpellOnFinger - multiple scrolls", () => {
    test("can imprint multiple different scrolls on different fingers", async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const commandData = {
        name: "Command",
        type: "spell",
        system: { level: 1 },
      };

      const witchBoltData = {
        name: "Witch Bolt",
        type: "spell",
        system: { level: 1 },
      };

      // Imprint Command on Thumb (0)
      await imprintSpellOnFinger(
        mockAethersGrasp,
        0,
        commandData,
        "Spell Scroll: Command",
      );

      // Imprint Witch Bolt on Index (1)
      await imprintSpellOnFinger(
        mockAethersGrasp,
        1,
        witchBoltData,
        "Spell Scroll: Witch Bolt",
      );

      // Should have been called twice
      expect(mockAethersGrasp.setFlag).toHaveBeenCalledTimes(2);

      // Get the final state from the last setFlag call
      const finalSetFlagCall = mockAethersGrasp.setFlag.mock.calls[1];
      const finalStoredSpells = finalSetFlagCall[2];

      // Should have both spells stored
      expect(finalStoredSpells).toHaveLength(2);
      expect(finalStoredSpells[0].spellData.name).toBe("Command");
      expect(finalStoredSpells[0].fingerIndex).toBe(0);
      expect(finalStoredSpells[1].spellData.name).toBe("Witch Bolt");
      expect(finalStoredSpells[1].fingerIndex).toBe(1);
    });

    test("can imprint same scroll on multiple fingers when scroll has multiple uses", async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const witchBoltData = {
        name: "Witch Bolt",
        type: "spell",
        system: { level: 1 },
      };

      // Imprint same spell on Thumb (0)
      await imprintSpellOnFinger(
        mockAethersGrasp,
        0,
        witchBoltData,
        "Spell Scroll: Witch Bolt",
      );

      // Imprint same spell on Index (1)
      await imprintSpellOnFinger(
        mockAethersGrasp,
        1,
        witchBoltData,
        "Spell Scroll: Witch Bolt",
      );

      // Should have been called twice
      expect(mockAethersGrasp.setFlag).toHaveBeenCalledTimes(2);

      // Get the final state from the last setFlag call
      const finalSetFlagCall = mockAethersGrasp.setFlag.mock.calls[1];
      const finalStoredSpells = finalSetFlagCall[2];

      // Should have both fingers with the same spell stored
      expect(finalStoredSpells).toHaveLength(2);
      expect(finalStoredSpells[0].spellData.name).toBe("Witch Bolt");
      expect(finalStoredSpells[0].fingerIndex).toBe(0);
      expect(finalStoredSpells[1].spellData.name).toBe("Witch Bolt");
      expect(finalStoredSpells[1].fingerIndex).toBe(1);
    });
  });

  describe("prepareImprintsFromSelections", () => {
    let mockActorWithScrolls;
    let mockSlots;

    beforeEach(() => {
      mockActorWithScrolls = {
        name: "Test Character",
        items: {
          get: jest.fn((id) => {
            const scrolls = {
              "scroll-1": {
                id: "scroll-1",
                name: "Spell Scroll: Magic Missile",
                toObject: () => ({
                  name: "Spell Scroll: Magic Missile",
                  type: "consumable",
                  system: { level: 1 },
                }),
                flags: { ddbimporter: { originalName: "Magic Missile" } },
              },
              "scroll-2": {
                id: "scroll-2",
                name: "Spell Scroll: Shield",
                toObject: () => ({
                  name: "Spell Scroll: Shield",
                  type: "consumable",
                  system: { level: 1 },
                }),
                flags: {},
              },
            };
            return scrolls[id];
          }),
        },
      };

      mockSlots = FINGER_NAMES.map((name, index) => ({
        index,
        name,
        occupied: false,
        spell: null,
      }));
    });

    test("prepares imprints from valid selections", () => {
      const selections = { 0: "scroll-1", 2: "scroll-2" };

      const result = prepareImprintsFromSelections(
        mockActorWithScrolls,
        selections,
        mockSlots,
      );

      expect(result).toHaveLength(2);
      expect(result[0].fingerIdx).toBe(0);
      expect(result[0].fingerName).toBe("Thumb");
      expect(result[0].spellName).toBe("Magic Missile");
      expect(result[1].fingerIdx).toBe(2);
      expect(result[1].fingerName).toBe("Middle");
      expect(result[1].spellName).toBe("Shield");
    });

    test("skips invalid scroll IDs", () => {
      const selections = { 0: "scroll-1", 1: "invalid-scroll" };

      const result = prepareImprintsFromSelections(
        mockActorWithScrolls,
        selections,
        mockSlots,
      );

      expect(result).toHaveLength(1);
      expect(result[0].fingerIdx).toBe(0);
    });

    test("returns empty array for empty selections", () => {
      const selections = {};

      const result = prepareImprintsFromSelections(
        mockActorWithScrolls,
        selections,
        mockSlots,
      );

      expect(result).toHaveLength(0);
    });

    test("includes scroll reference for consumption", () => {
      const selections = { 0: "scroll-1" };

      const result = prepareImprintsFromSelections(
        mockActorWithScrolls,
        selections,
        mockSlots,
      );

      expect(result[0].scroll).toBeTruthy();
      expect(result[0].scroll.id).toBe("scroll-1");
      expect(result[0].scrollName).toBe("Spell Scroll: Magic Missile");
    });
  });

  describe("createStoredSpellObject", () => {
    test("creates stored spell reference with all required fields", () => {
      const imprint = {
        fingerIdx: 2,
        fingerName: "Middle",
        spellName: "Magic Missile",
        scrollName: "Spell Scroll: Magic Missile",
      };

      const result = createStoredSpellObject(imprint, "spellbook-item-123");

      expect(result.id).toBeTruthy();
      expect(result.fingerIndex).toBe(2);
      expect(result.fingerName).toBe("Middle");
      expect(result.spellName).toBe("Magic Missile");
      expect(result.originalScrollName).toBe("Spell Scroll: Magic Missile");
      expect(result.imprintedAt).toBeTruthy();
      expect(result.spellbookItemId).toBe("spellbook-item-123");
    });

    test("generates an ID for each imprint", () => {
      const imprint = {
        fingerIdx: 0,
        fingerName: "Thumb",
        spellName: "Spell 1",
        scrollName: "Scroll 1",
      };

      const result = createStoredSpellObject(imprint, "spellbook-item-456");

      // ID should be truthy (either from foundry.utils.randomID mock or fallback)
      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe("string");
    });

    test("does not store spell data - only stores reference to spellbook item", () => {
      const imprint = {
        fingerIdx: 0,
        fingerName: "Thumb",
        spellName: "Magic Missile",
        scrollName: "Scroll",
      };

      const result = createStoredSpellObject(imprint, "spellbook-item-789");

      // Should NOT have spellData property
      expect(result.spellData).toBeUndefined();
      // Should have spellbookItemId for reference
      expect(result.spellbookItemId).toBe("spellbook-item-789");
    });

    test("throws error if spellbookItemId is not provided", () => {
      const imprint = {
        fingerIdx: 0,
        fingerName: "Thumb",
        spellName: "Magic Missile",
        scrollName: "Scroll",
      };

      expect(() => createStoredSpellObject(imprint)).toThrow(
        "spellbookItemId is required"
      );
    });
  });

  describe("addSpellToSpellbook", () => {
    let mockActorForSpellbook;

    beforeEach(() => {
      mockActorForSpellbook = {
        name: "Test Wizard",
        createEmbeddedDocuments: jest.fn().mockResolvedValue([
          { id: "created-spell-id", name: "Magic Missile (Thumb)" },
        ]),
      };
    });

    test("creates spell item on actor with correct flags", async () => {
      const spellData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: {
          level: 1,
          preparation: { mode: "prepared" },
          uses: { value: 1, max: 1 },
          quantity: 1,
        },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        0,
        "grasp-item-id",
        "Thumb",
      );

      expect(mockActorForSpellbook.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            type: "spell",
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                fromAethersGrasp: true,
                fingerIndex: 0,
                graspItemId: "grasp-item-id",
              }),
            }),
          }),
        ]),
      );
    });

    test("converts consumable type to spell type", async () => {
      const spellData = {
        name: "Spell Scroll: Shield",
        type: "consumable",
        system: { level: 1 },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        1,
        "grasp-id",
        "Index",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.type).toBe("spell");
    });

    test("removes scroll-specific properties (uses, quantity)", async () => {
      const spellData = {
        name: "Spell Scroll: Fireball",
        type: "consumable",
        system: {
          level: 3,
          uses: { value: 1, max: 1 },
          quantity: 2,
        },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        2,
        "grasp-id",
        "Middle",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.uses).toBeUndefined();
      expect(createdData.system.quantity).toBeUndefined();
    });

    test("sets preparation mode to atwill", async () => {
      const spellData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: {
          level: 1,
          preparation: { mode: "prepared", prepared: false },
        },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        0,
        "grasp-id",
        "Thumb",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.preparation.mode).toBe("atwill");
      expect(createdData.system.preparation.prepared).toBe(true);
    });

    test("names spell with finger name suffix", async () => {
      const spellData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: { level: 1 },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        3,
        "grasp-id",
        "Ring",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.name).toBe("Magic Missile (Ring)");
    });

    test("returns the created spell item", async () => {
      const spellData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: { level: 1 },
        flags: {},
      };

      const result = await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        0,
        "grasp-id",
        "Thumb",
      );

      expect(result.id).toBe("created-spell-id");
    });

    test("preserves existing elysium flags on the spell", async () => {
      const spellData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: { level: 1 },
        flags: {
          elysium: { someOtherFlag: "value" },
        },
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        0,
        "grasp-id",
        "Thumb",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.flags.elysium.someOtherFlag).toBe("value");
      expect(createdData.flags.elysium.fromAethersGrasp).toBe(true);
    });

    test("removes activities so Foundry regenerates them", async () => {
      const spellData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: {
          level: 1,
          activities: {
            "dnd5eactivity000": {
              type: "attack",
              activation: { type: "action" },
            },
          },
        },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        0,
        "grasp-id",
        "Thumb",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.activities).toBeUndefined();
    });

    test("removes _id so Foundry generates new one", async () => {
      const spellData = {
        _id: "old-scroll-id",
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: { level: 1 },
        flags: {},
      };

      await addSpellToSpellbook(
        mockActorForSpellbook,
        spellData,
        0,
        "grasp-id",
        "Thumb",
      );

      const createdData =
        mockActorForSpellbook.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData._id).toBeUndefined();
    });
  });

  describe("convertScrollToSpell", () => {
    test("changes type from consumable to spell", () => {
      const scrollData = {
        name: "Spell Scroll: Fireball",
        type: "consumable",
        system: { level: 3 },
      };

      const result = convertScrollToSpell(scrollData, "Fireball", "Thumb");

      expect(result.type).toBe("spell");
    });

    test("removes scroll-specific properties", () => {
      const scrollData = {
        _id: "scroll-id",
        name: "Spell Scroll: Shield",
        type: "consumable",
        system: {
          level: 1,
          uses: { value: 1, max: 1 },
          quantity: 2,
          type: { value: "scroll" },
          price: { value: 100, denomination: "gp" },
          rarity: "common",
          weight: { value: 0, units: "lb" },
          container: null,
          equipped: false,
          identified: true,
          attuned: false,
          attunement: "none",
        },
      };

      const result = convertScrollToSpell(scrollData, "Shield", "Index");

      expect(result._id).toBeUndefined();
      expect(result.system.uses).toBeUndefined();
      expect(result.system.quantity).toBeUndefined();
      expect(result.system.type).toBeUndefined();
      expect(result.system.price).toBeUndefined();
      expect(result.system.rarity).toBeUndefined();
      expect(result.system.weight).toBeUndefined();
      expect(result.system.container).toBeUndefined();
      expect(result.system.equipped).toBeUndefined();
      expect(result.system.identified).toBeUndefined();
      expect(result.system.attuned).toBeUndefined();
      expect(result.system.attunement).toBeUndefined();
    });

    test("removes activities for Foundry to regenerate", () => {
      const scrollData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: {
          level: 1,
          activities: {
            "dnd5eactivity000": {
              type: "attack",
              activation: { type: "action" },
              damage: { parts: [["1d4+1", "force"]] },
            },
            "dnd5eactivity001": {
              type: "damage",
              damage: { parts: [["1d4+1", "force"]] },
            },
          },
        },
      };

      const result = convertScrollToSpell(scrollData, "Magic Missile", "Thumb");

      expect(result.system.activities).toBeUndefined();
    });

    test("sets preparation mode to atwill", () => {
      const scrollData = {
        name: "Spell Scroll: Shield",
        type: "consumable",
        system: { level: 1 },
      };

      const result = convertScrollToSpell(scrollData, "Shield", "Ring");

      expect(result.system.preparation.mode).toBe("atwill");
      expect(result.system.preparation.prepared).toBe(true);
    });

    test("sets spell name with finger identifier", () => {
      const scrollData = {
        name: "Spell Scroll: Burning Hands",
        type: "consumable",
        system: { level: 1 },
      };

      const result = convertScrollToSpell(scrollData, "Burning Hands", "Pinky");

      expect(result.name).toBe("Burning Hands (Pinky)");
    });

    test("preserves spell-relevant properties", () => {
      const scrollData = {
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: {
          level: 1,
          school: "evo",
          components: { value: "", vocal: true, somatic: true, material: false },
          range: { value: 120, units: "ft" },
          duration: { value: "", units: "inst" },
          target: { value: 3, type: "creature" },
          damage: { parts: [["1d4+1", "force"]] },
          actionType: "other",
          description: { value: "<p>You create three darts...</p>" },
        },
        flags: { ddbimporter: { originalName: "Magic Missile" } },
      };

      const result = convertScrollToSpell(scrollData, "Magic Missile", "Thumb");

      expect(result.system.level).toBe(1);
      expect(result.system.school).toBe("evo");
      expect(result.system.components.vocal).toBe(true);
      expect(result.system.range.value).toBe(120);
      expect(result.system.duration.units).toBe("inst");
      expect(result.system.damage.parts[0][0]).toBe("1d4+1");
      expect(result.system.actionType).toBe("other");
      expect(result.system.description.value).toContain("three darts");
      expect(result.flags.ddbimporter.originalName).toBe("Magic Missile");
    });
  });
});
