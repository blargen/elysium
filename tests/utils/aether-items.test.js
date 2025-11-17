/**
 * Tests for Generic Aether Item Utility
 *
 * Testing the reusable aether-powered item handler
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { useAetherPoweredItem } from '../../scripts/utils/aether-items.js';

describe('Generic Aether Item Utility', () => {
  let mockActor;
  let mockItem;
  let mockAetherFuel;
  let mockEffectCallback;

  beforeEach(() => {
    mockActor = {
      name: 'Test Character',
      flags: {},
      items: {
        contents: [],
        filter: function(fn) {
          return this.contents.filter(fn);
        }
      },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function(scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      })
    };

    mockItem = {
      name: 'Test Aether Item',
      id: 'test-item-123',
      flags: {
        elysium: {
          requiresAether: true
        }
      },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      }
    };

    mockAetherFuel = {
      name: 'Basic Refined Aether',
      flags: {
        elysium: {
          isAetherFuel: true,
          aetherQuality: 'basic-refined'
        }
      },
      system: {
        uses: { value: 5, max: 5 },
        quantity: 1
      },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      update: jest.fn(async function(data) {
        if (data['system.uses.value'] !== undefined) {
          this.system.uses.value = data['system.uses.value'];
        }
        return this;
      })
    };

    mockEffectCallback = jest.fn(async (actor, fuelQuality) => {
      return { success: true, quality: fuelQuality };
    });

    // Add aether fuel to actor's inventory
    mockActor.items.contents = [mockAetherFuel];
  });

  describe('useAetherPoweredItem', () => {
    test('returns false if actor has no aether fuel', async () => {
      mockActor.items.contents = []; // No fuel

      const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no-fuel');
      expect(mockEffectCallback).not.toHaveBeenCalled();
    });

    test('consumes aether fuel when used', async () => {
      const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      expect(mockAetherFuel.update).toHaveBeenCalledWith({
        'system.uses.value': 4
      });
      expect(result.success).toBe(true);
    });

    test('calls effect callback with actor and fuel quality', async () => {
      await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      expect(mockEffectCallback).toHaveBeenCalledWith(mockActor, 'basic-refined');
    });

    test('returns effect callback result', async () => {
      const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      expect(result.success).toBe(true);
      expect(result.quality).toBe('basic-refined');
    });

    test('handles unrefined aether toxicity', async () => {
      mockAetherFuel.flags.elysium.aetherQuality = 'unrefined';
      mockActor.rollSavingThrow = jest.fn(async () => [{ _total: 15, total: 15 }]);

      const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      expect(mockActor.setFlag).toHaveBeenCalled(); // Toxicity tracking
      expect(result.success).toBe(true);
    });

    test('handles effect callback errors gracefully', async () => {
      mockEffectCallback = jest.fn(async () => {
        throw new Error('Effect failed');
      });

      const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Effect failed');
    });

    test('consumes fuel even if effect callback fails', async () => {
      mockEffectCallback = jest.fn(async () => {
        throw new Error('Effect failed');
      });

      await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      // Fuel IS consumed even if effect fails (like a spell slot used for a fizzled spell)
      expect(mockAetherFuel.system.uses.value).toBe(4);
    });

    test('works with different aether qualities', async () => {
      const qualities = ['unrefined', 'basic-refined', 'rarefied', 'prometheum', 'wild'];

      for (const quality of qualities) {
        mockAetherFuel.flags.elysium.aetherQuality = quality;
        mockAetherFuel.system.uses.value = 5; // Reset
        mockActor.rollSavingThrow = jest.fn(async () => [{ _total: 20, total: 20 }]);

        const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

        expect(result.success).toBe(true);
        expect(mockEffectCallback).toHaveBeenCalledWith(mockActor, quality);
      }
    });

    test('returns fuel consumption details', async () => {
      const result = await useAetherPoweredItem(mockActor, mockItem, mockEffectCallback, mockAetherFuel);

      expect(result).toMatchObject({
        success: true,
        fuelConsumed: true,
        fuelQuality: 'basic-refined'
      });
    });
  });
});
