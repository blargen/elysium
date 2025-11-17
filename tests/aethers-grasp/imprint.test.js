/**
 * Tests for Aether's Grasp - Imprint From Scroll
 *
 * Testing the logic for storing spells from scrolls onto finger slots
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  findFirstLevelScrolls,
  getAvailableFingerSlots,
  imprintSpellOnFinger,
  canImprintMoreSpells,
  consumeScroll
} from '../../scripts/aethers-grasp/imprint.js';
import { getStoredSpells } from '../../scripts/utils/flags.js';

describe('Aether\'s Grasp - Imprint From Scroll', () => {
  let mockActor;
  let mockAethersGrasp;

  beforeEach(() => {
    mockActor = {
      name: 'Test Character',
      items: {
        filter: function(callback) {
          return this._items.filter(callback);
        },
        get: function(id) {
          return this._items.find(i => i.id === id);
        },
        _items: []
      }
    };

    mockAethersGrasp = {
      name: "Aether's Grasp",
      flags: { elysium: {} },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function(scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      })
    };
  });

  describe('findFirstLevelScrolls', () => {
    test('returns empty array when no scrolls exist', () => {
      mockActor.items._items = [];

      const scrolls = findFirstLevelScrolls(mockActor);

      expect(scrolls).toEqual([]);
    });

    test('finds 1st level spell scrolls', () => {
      mockActor.items._items = [
        {
          id: '1',
          name: 'Spell Scroll: Magic Missile',
          type: 'consumable',
          system: {
            type: { value: 'scroll' },
            identifier: 'spell-scroll-1st-level',
            uses: { value: 1 }
          }
        },
        {
          id: '2',
          name: 'Potion of Healing',
          type: 'consumable',
          system: { type: { value: 'potion' } }
        }
      ];

      const scrolls = findFirstLevelScrolls(mockActor);

      expect(scrolls).toHaveLength(1);
      expect(scrolls[0].name).toBe('Spell Scroll: Magic Missile');
    });

    test('filters out scrolls with 0 uses', () => {
      mockActor.items._items = [
        {
          id: '1',
          name: 'Spell Scroll: Shield',
          type: 'consumable',
          system: {
            type: { value: 'scroll' },
            identifier: 'spell-scroll-1st-level',
            uses: { value: 1 }
          }
        },
        {
          id: '2',
          name: 'Spell Scroll: Mage Armor',
          type: 'consumable',
          system: {
            type: { value: 'scroll' },
            identifier: 'spell-scroll-1st-level',
            uses: { value: 0 }
          }
        }
      ];

      const scrolls = findFirstLevelScrolls(mockActor);

      expect(scrolls).toHaveLength(1);
      expect(scrolls[0].name).toBe('Spell Scroll: Shield');
    });
  });

  describe('getAvailableFingerSlots', () => {
    test('returns all 5 slots when no spells stored', () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const slots = getAvailableFingerSlots(mockAethersGrasp);

      expect(slots).toHaveLength(5);
      expect(slots).toEqual([
        { index: 0, name: 'Thumb', occupied: false, spell: null },
        { index: 1, name: 'Index', occupied: false, spell: null },
        { index: 2, name: 'Middle', occupied: false, spell: null },
        { index: 3, name: 'Ring', occupied: false, spell: null },
        { index: 4, name: 'Pinky', occupied: false, spell: null }
      ]);
    });

    test('marks occupied slots correctly', () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        { fingerIndex: 0, spellData: { name: 'Magic Missile' } },
        { fingerIndex: 2, spellData: { name: 'Shield' } }
      ];

      const slots = getAvailableFingerSlots(mockAethersGrasp);

      expect(slots[0].occupied).toBe(true);
      expect(slots[1].occupied).toBe(false);
      expect(slots[2].occupied).toBe(true);
      expect(slots[3].occupied).toBe(false);
      expect(slots[4].occupied).toBe(false);
    });
  });

  describe('canImprintMoreSpells', () => {
    test('returns true when no spells stored', () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      expect(canImprintMoreSpells(mockAethersGrasp)).toBe(true);
    });

    test('returns true when less than 5 spells stored', () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        { fingerIndex: 0, spellData: { name: 'Magic Missile' } },
        { fingerIndex: 1, spellData: { name: 'Shield' } }
      ];

      expect(canImprintMoreSpells(mockAethersGrasp)).toBe(true);
    });

    test('returns false when 5 spells stored (max capacity)', () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        { fingerIndex: 0, spellData: { name: 'Spell 1' } },
        { fingerIndex: 1, spellData: { name: 'Spell 2' } },
        { fingerIndex: 2, spellData: { name: 'Spell 3' } },
        { fingerIndex: 3, spellData: { name: 'Spell 4' } },
        { fingerIndex: 4, spellData: { name: 'Spell 5' } }
      ];

      expect(canImprintMoreSpells(mockAethersGrasp)).toBe(false);
    });
  });

  describe('imprintSpellOnFinger', () => {
    test('stores spell data on specified finger', async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const spellData = {
        name: 'Magic Missile',
        type: 'spell',
        system: { level: 1 }
      };

      await imprintSpellOnFinger(mockAethersGrasp, 0, spellData, 'Spell Scroll: Magic Missile');

      const setFlagCall = mockAethersGrasp.setFlag.mock.calls[0];
      expect(setFlagCall[0]).toBe('elysium');
      expect(setFlagCall[1]).toBe('storedSpells');

      const storedSpells = setFlagCall[2];
      expect(storedSpells).toHaveLength(1);
      expect(storedSpells[0].fingerIndex).toBe(0);
      expect(storedSpells[0].fingerName).toBe('Thumb');
      expect(storedSpells[0].spellData.name).toBe('Magic Missile');
      expect(storedSpells[0].originalScrollName).toBe('Spell Scroll: Magic Missile');
    });

    test('adds spell to existing stored spells', async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [
        {
          id: 'existing-1',
          fingerIndex: 0,
          fingerName: 'Thumb',
          spellData: { name: 'Existing Spell' }
        }
      ];

      const spellData = {
        name: 'Shield',
        type: 'spell',
        system: { level: 1 }
      };

      await imprintSpellOnFinger(mockAethersGrasp, 2, spellData, 'Spell Scroll: Shield');

      const storedSpells = mockAethersGrasp.setFlag.mock.calls[0][2];
      expect(storedSpells).toHaveLength(2);
      expect(storedSpells[0].spellData.name).toBe('Existing Spell');
      expect(storedSpells[1].spellData.name).toBe('Shield');
    });

    test('generates unique ID for each spell', async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const spellData = { name: 'Test Spell', type: 'spell' };

      await imprintSpellOnFinger(mockAethersGrasp, 0, spellData, 'Scroll');

      const storedSpells = mockAethersGrasp.setFlag.mock.calls[0][2];
      expect(storedSpells[0].id).toBeTruthy();
      expect(typeof storedSpells[0].id).toBe('string');
    });
  });

  describe('consumeScroll', () => {
    test('reduces scroll uses by 1', async () => {
      const mockScroll = {
        id: '1',
        name: 'Spell Scroll: Magic Missile',
        system: { uses: { value: 3, max: 3 }, quantity: 1 },
        update: jest.fn(async function(data) {
          this.system.uses.value = data['system.uses.value'];
          return this;
        }),
        delete: jest.fn()
      };

      await consumeScroll(mockScroll);

      expect(mockScroll.update).toHaveBeenCalledWith({
        'system.uses.value': 2
      });
      expect(mockScroll.delete).not.toHaveBeenCalled();
    });

    test('deletes scroll when uses reach 0 and quantity is 1', async () => {
      const mockScroll = {
        id: '1',
        name: 'Spell Scroll: Shield',
        system: { uses: { value: 1, max: 1 }, quantity: 1 },
        update: jest.fn(),
        delete: jest.fn(async function() {
          return this;
        })
      };

      await consumeScroll(mockScroll);

      expect(mockScroll.delete).toHaveBeenCalled();
      expect(mockScroll.update).not.toHaveBeenCalled();
    });

    test('reduces quantity and resets uses when uses reach 0 but quantity > 1', async () => {
      const mockScroll = {
        id: '1',
        name: 'Spell Scroll: Mage Armor',
        system: { uses: { value: 1, max: 1 }, quantity: 3 },
        update: jest.fn(async function(data) {
          this.system.quantity = data['system.quantity'];
          this.system.uses.value = data['system.uses.value'];
          return this;
        }),
        delete: jest.fn()
      };

      await consumeScroll(mockScroll);

      expect(mockScroll.update).toHaveBeenCalledWith({
        'system.quantity': 2,
        'system.uses.value': 1
      });
      expect(mockScroll.delete).not.toHaveBeenCalled();
    });
  });

  describe('imprintSpellOnFinger - multiple scrolls', () => {
    test('can imprint multiple different scrolls on different fingers', async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const commandData = {
        name: 'Command',
        type: 'spell',
        system: { level: 1 }
      };

      const witchBoltData = {
        name: 'Witch Bolt',
        type: 'spell',
        system: { level: 1 }
      };

      // Imprint Command on Thumb (0)
      await imprintSpellOnFinger(mockAethersGrasp, 0, commandData, 'Spell Scroll: Command');

      // Imprint Witch Bolt on Index (1)
      await imprintSpellOnFinger(mockAethersGrasp, 1, witchBoltData, 'Spell Scroll: Witch Bolt');

      // Should have been called twice
      expect(mockAethersGrasp.setFlag).toHaveBeenCalledTimes(2);

      // Get the final state from the last setFlag call
      const finalSetFlagCall = mockAethersGrasp.setFlag.mock.calls[1];
      const finalStoredSpells = finalSetFlagCall[2];

      // Should have both spells stored
      expect(finalStoredSpells).toHaveLength(2);
      expect(finalStoredSpells[0].spellData.name).toBe('Command');
      expect(finalStoredSpells[0].fingerIndex).toBe(0);
      expect(finalStoredSpells[1].spellData.name).toBe('Witch Bolt');
      expect(finalStoredSpells[1].fingerIndex).toBe(1);
    });

    test('can imprint same scroll on multiple fingers when scroll has multiple uses', async () => {
      mockAethersGrasp.flags.elysium.storedSpells = [];

      const witchBoltData = {
        name: 'Witch Bolt',
        type: 'spell',
        system: { level: 1 }
      };

      // Imprint same spell on Thumb (0)
      await imprintSpellOnFinger(mockAethersGrasp, 0, witchBoltData, 'Spell Scroll: Witch Bolt');

      // Imprint same spell on Index (1)
      await imprintSpellOnFinger(mockAethersGrasp, 1, witchBoltData, 'Spell Scroll: Witch Bolt');

      // Should have been called twice
      expect(mockAethersGrasp.setFlag).toHaveBeenCalledTimes(2);

      // Get the final state from the last setFlag call
      const finalSetFlagCall = mockAethersGrasp.setFlag.mock.calls[1];
      const finalStoredSpells = finalSetFlagCall[2];

      // Should have both fingers with the same spell stored
      expect(finalStoredSpells).toHaveLength(2);
      expect(finalStoredSpells[0].spellData.name).toBe('Witch Bolt');
      expect(finalStoredSpells[0].fingerIndex).toBe(0);
      expect(finalStoredSpells[1].spellData.name).toBe('Witch Bolt');
      expect(finalStoredSpells[1].fingerIndex).toBe(1);
    });
  });
});
