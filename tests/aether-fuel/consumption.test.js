/**
 * Tests for Aether Fuel Consumption
 *
 * Testing the full flow of consuming aether fuel items in-game
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  handleAetherFuelUse,
  consumeAetherFuelItem,
  rollConstitutionSave
} from '../../scripts/aether-fuel/consumption.js';

describe('Aether Fuel Consumption', () => {
  let mockActor;
  let mockItem;

  beforeEach(() => {
    mockActor = {
      name: 'Test Character',
      flags: {},
      system: {
        abilities: {
          con: { mod: 2 }
        },
        attributes: {
          exhaustion: 0
        }
      },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function(scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
      rollAbilitySave: jest.fn(async function(ability, options) {
        // Mock returning a successful roll (old API)
        return { total: 15 };
      }),
      rollSavingThrow: jest.fn(async function(options) {
        // Mock returning a successful roll (new v4.1+ API)
        return [{ _total: 15, total: 15 }];
      }),
      toggleStatusEffect: jest.fn(async function(condition, options) {
        return this;
      }),
      update: jest.fn(async function(data) {
        if (data['system.attributes.exhaustion'] !== undefined) {
          this.system.attributes.exhaustion = data['system.attributes.exhaustion'];
        }
        return this;
      })
    };

    mockItem = {
      name: 'Test Aether',
      flags: {},
      system: {
        uses: { value: 5, max: 5 }
      },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      update: jest.fn(async function(data) {
        if (data['system.uses.value'] !== undefined) {
          this.system.uses.value = data['system.uses.value'];
        }
        return this;
      }),
      delete: jest.fn(async function() {
        return this;
      })
    };
  });

  describe('consumeAetherFuelItem', () => {
    test('deletes the item (single-use)', async () => {
      mockItem.system.uses.value = 1;

      await consumeAetherFuelItem(mockItem);

      expect(mockItem.delete).toHaveBeenCalled();
    });

    test('does not delete if no uses', async () => {
      mockItem.system.uses.value = 0;

      const result = await consumeAetherFuelItem(mockItem);

      expect(result).toBe(false); // Cannot consume
      expect(mockItem.delete).not.toHaveBeenCalled();
    });

    test('returns true on successful consumption', async () => {
      mockItem.system.uses.value = 1;

      const result = await consumeAetherFuelItem(mockItem);

      expect(result).toBe(true);
    });

    test('returns false when no uses remaining', async () => {
      mockItem.system.uses.value = 0;

      const result = await consumeAetherFuelItem(mockItem);

      expect(result).toBe(false);
    });
  });

  describe('rollConstitutionSave', () => {
    test('calls actor.rollSavingThrow with correct DC (v4.1+ API)', async () => {
      const dc = 12;

      await rollConstitutionSave(mockActor, dc);

      expect(mockActor.rollSavingThrow).toHaveBeenCalledWith({
        ability: 'con',
        targetValue: 12
      });
    });

    test('returns the roll result', async () => {
      mockActor.rollSavingThrow.mockResolvedValue([{ _total: 18, total: 18 }]);

      const roll = await rollConstitutionSave(mockActor, 15);

      // Roll is returned as-is (array format from v4.1+ API)
      expect(roll).toEqual([{ _total: 18, total: 18 }]);
    });
  });

  describe('handleAetherFuelUse', () => {
    test('consumes item and returns quality for basic-refined', async () => {
      mockItem.flags.elysium = {
        isAetherFuel: true,
        aetherQuality: 'basic-refined'
      };

      const result = await handleAetherFuelUse(mockActor, mockItem);

      expect(result).toEqual({
        consumed: true,
        quality: 'basic-refined',
        toxicityApplied: false
      });
      expect(mockItem.delete).toHaveBeenCalled();
    });

    test('applies toxicity for unrefined aether', async () => {
      mockItem.flags.elysium = {
        isAetherFuel: true,
        aetherQuality: 'unrefined'
      };
      mockActor.rollAbilitySave.mockResolvedValue({ total: 5 }); // Fail the save

      const result = await handleAetherFuelUse(mockActor, mockItem);

      expect(result.consumed).toBe(true);
      expect(result.quality).toBe('unrefined');
      expect(result.toxicityApplied).toBe(true);
      expect(mockActor.setFlag).toHaveBeenCalled();
    });

    test('does not consume item if not aether fuel', async () => {
      mockItem.flags.elysium = {
        isAetherFuel: false
      };

      const result = await handleAetherFuelUse(mockActor, mockItem);

      expect(result).toBeNull();
      expect(mockItem.update).not.toHaveBeenCalled();
    });

    test('does not consume if no uses remaining', async () => {
      mockItem.flags.elysium = {
        isAetherFuel: true,
        aetherQuality: 'basic-refined'
      };
      mockItem.system.uses.value = 0;

      const result = await handleAetherFuelUse(mockActor, mockItem);

      expect(result.consumed).toBe(false);
    });

    test('increments daily doses for unrefined', async () => {
      mockItem.flags.elysium = {
        isAetherFuel: true,
        aetherQuality: 'unrefined'
      };
      mockActor.flags.elysium = { dailyDoses: 2 };
      mockActor.rollAbilitySave.mockResolvedValue({ total: 20 }); // Pass the save

      await handleAetherFuelUse(mockActor, mockItem);

      // Should have called setFlag to increment dailyDoses
      const setFlagCalls = mockActor.setFlag.mock.calls;
      const dailyDosesCall = setFlagCalls.find(call => call[1] === 'dailyDoses');
      expect(dailyDosesCall).toBeTruthy();
      expect(dailyDosesCall[2]).toBe(3); // Incremented from 2 to 3
    });
  });
});
