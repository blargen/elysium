/**
 * Tests for Flag Management Utilities
 *
 * Flags are stored on actors (toxicity) and items (aether fuel, spell storage)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  // Actor toxicity flags
  getDailyDoses,
  setDailyDoses,
  getATL,
  setATL,
  // Item aether flags
  getAetherQuality,
  isAetherFuel,
  requiresAether,
  getStoredSpells,
  setStoredSpells,
  getModType
} from '../../scripts/utils/flags.js';

describe('Flag Management - Actor Toxicity', () => {
  let mockActor;

  beforeEach(() => {
    mockActor = {
      flags: {},
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: async function(scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
      }
    };
  });

  describe('getDailyDoses', () => {
    test('returns 0 when no flag is set', () => {
      expect(getDailyDoses(mockActor)).toBe(0);
    });

    test('returns the current daily doses when flag is set', () => {
      mockActor.flags.elysium = { dailyDoses: 3 };
      expect(getDailyDoses(mockActor)).toBe(3);
    });
  });

  describe('setDailyDoses', () => {
    test('sets the daily doses flag', async () => {
      await setDailyDoses(mockActor, 5);
      expect(mockActor.getFlag('elysium', 'dailyDoses')).toBe(5);
    });
  });

  describe('getATL', () => {
    test('returns 0 when no flag is set', () => {
      expect(getATL(mockActor)).toBe(0);
    });

    test('returns the current ATL when flag is set', () => {
      mockActor.flags.elysium = { atl: 2 };
      expect(getATL(mockActor)).toBe(2);
    });
  });

  describe('setATL', () => {
    test('sets the ATL flag', async () => {
      await setATL(mockActor, 4);
      expect(mockActor.getFlag('elysium', 'atl')).toBe(4);
    });
  });
});

describe('Flag Management - Item Aether', () => {
  let mockItem;

  beforeEach(() => {
    mockItem = {
      flags: {},
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: async function(scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
      }
    };
  });

  describe('isAetherFuel', () => {
    test('returns false when no flag is set', () => {
      expect(isAetherFuel(mockItem)).toBe(false);
    });

    test('returns true when isAetherFuel flag is true', () => {
      mockItem.flags.elysium = { isAetherFuel: true };
      expect(isAetherFuel(mockItem)).toBe(true);
    });

    test('returns false when isAetherFuel flag is false', () => {
      mockItem.flags.elysium = { isAetherFuel: false };
      expect(isAetherFuel(mockItem)).toBe(false);
    });
  });

  describe('requiresAether', () => {
    test('returns false when no flag is set', () => {
      expect(requiresAether(mockItem)).toBe(false);
    });

    test('returns true when requiresAether flag is true', () => {
      mockItem.flags.elysium = { requiresAether: true };
      expect(requiresAether(mockItem)).toBe(true);
    });
  });

  describe('getAetherQuality', () => {
    test('returns null when no flag is set', () => {
      expect(getAetherQuality(mockItem)).toBeNull();
    });

    test('returns the aether quality when flag is set', () => {
      mockItem.flags.elysium = { aetherQuality: 'rarefied' };
      expect(getAetherQuality(mockItem)).toBe('rarefied');
    });
  });

  describe('getModType', () => {
    test('returns null when no flag is set', () => {
      expect(getModType(mockItem)).toBeNull();
    });

    test('returns the mod type when flag is set', () => {
      mockItem.flags.elysium = { modType: 'spell-storage' };
      expect(getModType(mockItem)).toBe('spell-storage');
    });
  });

  describe('getStoredSpells', () => {
    test('returns empty array when no flag is set', () => {
      expect(getStoredSpells(mockItem)).toEqual([]);
    });

    test('returns the stored spells array when flag is set', () => {
      const spells = [
        { id: '1', spellData: { name: 'Magic Missile' } },
        { id: '2', spellData: { name: 'Shield' } }
      ];
      mockItem.flags.elysium = { storedSpells: spells };
      expect(getStoredSpells(mockItem)).toEqual(spells);
    });
  });

  describe('setStoredSpells', () => {
    test('sets the stored spells array', async () => {
      const spells = [{ id: '1', spellData: { name: 'Fireball' } }];
      await setStoredSpells(mockItem, spells);
      expect(mockItem.getFlag('elysium', 'storedSpells')).toEqual(spells);
    });
  });
});
