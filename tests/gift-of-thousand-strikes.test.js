/**
 * Tests for Gift of a Thousand Strikes
 * A monk nervous system modification that allows using aether instead of/with ki
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { useGiftOfThousandStrikes } from '../scripts/gift-of-thousand-strikes.js';

describe('Gift of a Thousand Strikes', () => {
  let mockActor;
  let mockItem;
  let mockAetherFuel;

  beforeEach(() => {
    // Mock actor with monk class
    mockActor = {
      name: 'Test Monk',
      classes: {
        monk: { system: { levels: 2 } }
      },
      items: {
        filter: jest.fn(),
        find: jest.fn()
      },
      getFlag: jest.fn(),
      setFlag: jest.fn(),
      update: jest.fn()
    };

    // Mock Gift of a Thousand Strikes item
    mockItem = {
      name: 'Gift of a Thousand Strikes',
      actor: mockActor,
      getFlag: jest.fn((namespace, key) => {
        const flags = {
          'elysium.requiresAether': true,
          'elysium.modType': 'ki-enhancement',
          'elysium.requiredClass': 'monk',
          'elysium.requiredLevel': 2,
          'elysium.allowsKiBoost': true,
          'elysium.monkAbilities': {
            'flurry-of-blows': {
              label: 'Flurry of Strikes',
              normalEffect: 'Make 2 unarmed strikes',
              enhancedEffect: 'Make 3 unarmed strikes',
              enhancedBonus: 'extra-strike'
            },
            'patient-defense': {
              label: 'Patient Defense',
              normalEffect: 'Dodge action',
              enhancedEffect: 'Dodge + +2 AC',
              enhancedBonus: 'ac-bonus-2'
            },
            'step-of-wind': {
              label: 'Step of the Wind',
              normalEffect: 'Jump distance doubled',
              enhancedEffect: 'Jump distance tripled',
              enhancedBonus: 'triple-jump'
            }
          }
        };
        return flags[`${namespace}.${key}`];
      })
    };

    // Mock aether fuel
    mockAetherFuel = {
      name: 'Basic Refined Aether',
      system: { uses: { value: 5, max: 5 } },
      getFlag: jest.fn(() => 'basic-refined'),
      update: jest.fn()
    };

    mockActor.items.filter.mockReturnValue([mockAetherFuel]);
  });

  describe('Monk Level Requirement', () => {
    test('should activate for monk level 2+', async () => {
      mockActor.classes.monk.system.levels = 2;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
    });

    test('should fail for monk level 1', async () => {
      mockActor.classes.monk.system.levels = 1;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('level 2');
    });

    test('should fail for non-monk', async () => {
      mockActor.classes = {};

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('monk');
    });
  });

  describe('Aether Only Mode', () => {
    test('should activate Flurry of Strikes without consuming ki', async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.ability).toBe('flurry-of-blows');
      expect(result.enhanced).toBe(false);
      expect(result.effect).toContain('2 unarmed strikes');
      expect(mockAetherFuel.update).toHaveBeenCalled();
    });

    test('should activate Patient Defense without consuming ki', async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'patient-defense',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.ability).toBe('patient-defense');
      expect(result.enhanced).toBe(false);
      expect(result.effect).toContain('Dodge');
    });

    test('should activate Step of the Wind without consuming ki', async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'step-of-wind',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.ability).toBe('step-of-wind');
      expect(result.enhanced).toBe(false);
      expect(result.effect).toContain('doubled');
    });

    test('should consume aether fuel', async () => {
      await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(mockAetherFuel.update).toHaveBeenCalledWith({
        'system.uses.value': 4
      });
    });
  });

  describe('Aether + Ki Mode (Enhanced)', () => {
    test('should enhance Flurry of Strikes to 3 strikes', async () => {
      mockActor.system = { attributes: { ki: { value: 3, max: 3 } } };

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-and-ki',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);
      expect(result.effect).toContain('3 unarmed strikes');
      expect(result.bonus).toBe('extra-strike');
    });

    test('should enhance Patient Defense with +2 AC', async () => {
      mockActor.system = { attributes: { ki: { value: 3, max: 3 } } };

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-and-ki',
        ability: 'patient-defense',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);
      expect(result.effect).toContain('+2 AC');
      expect(result.bonus).toBe('ac-bonus-2');
    });

    test('should enhance Step of the Wind to triple jump', async () => {
      mockActor.system = { attributes: { ki: { value: 3, max: 3 } } };

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-and-ki',
        ability: 'step-of-wind',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);
      expect(result.effect).toContain('tripled');
      expect(result.bonus).toBe('triple-jump');
    });

    test('should consume both aether and ki', async () => {
      // Mock ki points
      mockActor.system = { attributes: { ki: { value: 3, max: 3 } } };

      await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-and-ki',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      // Should consume aether
      expect(mockAetherFuel.update).toHaveBeenCalledWith({
        'system.uses.value': 4
      });

      // Should consume ki
      expect(mockActor.update).toHaveBeenCalledWith({
        'system.attributes.ki.value': 2
      });
    });

    test('should fail if no ki points available', async () => {
      mockActor.system = { attributes: { ki: { value: 0, max: 3 } } };

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-and-ki',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('ki');
    });
  });

  describe('Aether Fuel Integration', () => {
    test('should fail if no aether fuel selected', async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: null
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('aether');
    });

    test('should fail if aether fuel is depleted', async () => {
      mockAetherFuel.system.uses.value = 0;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('depleted');
    });

    test('should work with unrefined aether (with toxicity)', async () => {
      mockAetherFuel.getFlag = jest.fn(() => 'unrefined');

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(true);
      expect(result.quality).toBe('unrefined');
      // Toxicity should be handled by aether fuel system
    });
  });

  describe('Error Handling', () => {
    test('should fail gracefully with invalid ability', async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'aether-only',
        ability: 'invalid-ability',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Invalid');
    });

    test('should fail gracefully with invalid mode', async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: 'invalid-mode',
        ability: 'flurry-of-blows',
        aetherFuel: mockAetherFuel
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('mode');
    });
  });
});
