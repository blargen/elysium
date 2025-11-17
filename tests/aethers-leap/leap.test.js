/**
 * Tests for Aether's Leap Item
 *
 * Testing the Leap spell aether-powered item
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { applyLeapEffect, useAethersLeap } from '../../scripts/aethers-leap/leap.js';

describe("Aether's Leap", () => {
  let mockActor;
  let mockItem;
  let mockAetherFuel;

  beforeEach(() => {
    mockActor = {
      name: 'Test Character',
      flags: {},
      items: {
        contents: []
      },
      appliedEffects: [],
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function(scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
      createEmbeddedDocuments: jest.fn(async function(type, data) {
        // Mock creating active effects
        const effect = { name: data[0].name, ...data[0] };
        this.appliedEffects.push(effect);
        return [effect];
      })
    };

    mockItem = {
      name: "Aether's Leap",
      id: 'aethers-leap-123',
      flags: {
        elysium: {
          isAethersLeap: true,
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

    // Add aether fuel to actor's inventory
    mockActor.items.contents = [mockAetherFuel];
  });

  describe('applyLeapEffect', () => {
    test('applies Leap spell effect to actor', async () => {
      await applyLeapEffect(mockActor, 'basic-refined');

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        'ActiveEffect',
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Leap')
          })
        ])
      );
    });

    test('Leap effect lasts 1 minute (10 rounds)', async () => {
      await applyLeapEffect(mockActor, 'basic-refined');

      const createCall = mockActor.createEmbeddedDocuments.mock.calls[0];
      const effectData = createCall[1][0];

      expect(effectData.duration).toMatchObject({
        rounds: 10
      });
    });

    test('Leap effect requires concentration', async () => {
      await applyLeapEffect(mockActor, 'basic-refined');

      const createCall = mockActor.createEmbeddedDocuments.mock.calls[0];
      const effectData = createCall[1][0];

      expect(effectData.flags?.dnd5e?.concentration).toBe(true);
    });

    test('returns success result', async () => {
      const result = await applyLeapEffect(mockActor, 'basic-refined');

      expect(result).toMatchObject({
        success: true,
        effectApplied: true
      });
    });
  });

  describe('useAethersLeap', () => {
    test('consumes aether fuel when used', async () => {
      await useAethersLeap(mockActor, mockItem, mockAetherFuel);

      expect(mockAetherFuel.update).toHaveBeenCalledWith({
        'system.uses.value': 4
      });
    });

    test('applies Leap effect to actor', async () => {
      await useAethersLeap(mockActor, mockItem, mockAetherFuel);

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalled();
      expect(mockActor.appliedEffects.length).toBe(1);
      expect(mockActor.appliedEffects[0].name).toContain('Leap');
    });

    test('returns success with fuel and effect details', async () => {
      const result = await useAethersLeap(mockActor, mockItem, mockAetherFuel);

      expect(result).toMatchObject({
        success: true,
        fuelConsumed: true,
        fuelQuality: 'basic-refined',
        effectApplied: true
      });
    });

    test('fails gracefully if no aether fuel available', async () => {
      mockActor.items.contents = []; // No fuel

      const result = await useAethersLeap(mockActor, mockItem);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no-fuel');
      expect(mockActor.createEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test('works with different aether qualities', async () => {
      const qualities = ['unrefined', 'basic-refined', 'rarefied', 'prometheum'];

      for (const quality of qualities) {
        mockAetherFuel.flags.elysium.aetherQuality = quality;
        mockAetherFuel.system.uses.value = 5; // Reset
        mockActor.appliedEffects = []; // Reset
        mockActor.createEmbeddedDocuments.mockClear();
        mockActor.rollSavingThrow = jest.fn(async () => [{ _total: 20, total: 20 }]);

        const result = await useAethersLeap(mockActor, mockItem, mockAetherFuel);

        expect(result.success).toBe(true);
        expect(result.fuelQuality).toBe(quality);
        expect(mockActor.createEmbeddedDocuments).toHaveBeenCalled();
      }
    });
  });
});
