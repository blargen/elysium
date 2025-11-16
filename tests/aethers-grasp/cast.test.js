/**
 * Tests for Aether's Grasp - Cast From Finger
 *
 * Testing the logic for casting stored spells using aether fuel
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  getStoredSpellByFinger,
  createTemporarySpellItem,
  applyAetherModifiersToSpell,
  castSpellFromFinger
} from '../../scripts/aethers-grasp/cast.js';

describe('Aether\'s Grasp - Cast From Finger', () => {
  let mockActor;
  let mockAethersGrasp;

  beforeEach(() => {
    mockActor = {
      name: 'Test Character',
      createEmbeddedDocuments: jest.fn(async (type, data) => {
        return [{
          id: 'temp-spell-id',
          ...data[0],
          use: jest.fn(async () => ({ /* roll result */ })),
          delete: jest.fn(async () => true)
        }];
      })
    };

    mockAethersGrasp = {
      name: "Aether's Grasp",
      flags: {
        elysium: {
          storedSpells: [
            {
              id: 'spell-1',
              fingerIndex: 0,
              fingerName: 'Thumb',
              spellData: {
                name: 'Magic Missile',
                type: 'spell',
                system: {
                  level: 1,
                  preparation: { mode: 'prepared' },
                  damage: { parts: [['1d4+1', 'force']] },
                  attackBonus: 0
                }
              }
            },
            {
              id: 'spell-2',
              fingerIndex: 2,
              fingerName: 'Middle',
              spellData: {
                name: 'Shield',
                type: 'spell',
                system: { level: 1 }
              }
            }
          ]
        }
      },
      getFlag: function(scope, key) {
        return this.flags[scope]?.[key];
      }
    };
  });

  describe('getStoredSpellByFinger', () => {
    test('returns spell stored on specified finger', () => {
      const spell = getStoredSpellByFinger(mockAethersGrasp, 0);

      expect(spell).toBeTruthy();
      expect(spell.fingerName).toBe('Thumb');
      expect(spell.spellData.name).toBe('Magic Missile');
    });

    test('returns null when finger has no spell', () => {
      const spell = getStoredSpellByFinger(mockAethersGrasp, 1); // Index finger - empty

      expect(spell).toBeNull();
    });

    test('returns null for invalid finger index', () => {
      const spell = getStoredSpellByFinger(mockAethersGrasp, 10);

      expect(spell).toBeNull();
    });
  });

  describe('createTemporarySpellItem', () => {
    test('creates spell item with preparation mode set to atwill', () => {
      const spellData = {
        name: 'Magic Missile',
        system: {
          level: 1,
          preparation: { mode: 'prepared' }
        }
      };

      const tempData = createTemporarySpellItem(spellData);

      expect(tempData.system.preparation.mode).toBe('atwill');
    });

    test('marks spell as temporary with aethersGrasp flag', () => {
      const spellData = {
        name: 'Shield',
        system: { level: 1 }
      };

      const tempData = createTemporarySpellItem(spellData);

      expect(tempData.flags.aethersGrasp).toBeTruthy();
      expect(tempData.flags.aethersGrasp.temporary).toBe(true);
    });

    test('preserves original spell data', () => {
      const spellData = {
        name: 'Mage Armor',
        system: {
          level: 1,
          damage: { parts: [] }
        }
      };

      const tempData = createTemporarySpellItem(spellData);

      expect(tempData.name).toBe('Mage Armor');
      expect(tempData.system.level).toBe(1);
    });
  });

  describe('applyAetherModifiersToSpell', () => {
    test('applies attack bonus from rarefied aether', () => {
      const spellData = {
        name: 'Magic Missile',
        system: {
          attackBonus: 0,
          damage: { parts: [] }
        }
      };

      const modifiers = { attack: 1, damage: 1, spellAttack: 1, spellDamage: 1 };

      const modified = applyAetherModifiersToSpell(spellData, modifiers);

      expect(modified.system.attackBonus).toBe(1);
    });

    test('applies damage bonus from prometheum aether', () => {
      const spellData = {
        name: 'Burning Hands',
        system: {
          attackBonus: 0,
          damage: { parts: [['3d6', 'fire']] }
        }
      };

      const modifiers = { attack: 5, damage: 5, spellAttack: 5, spellDamage: 5 };

      const modified = applyAetherModifiersToSpell(spellData, modifiers);

      // Should add a damage part
      expect(modified.system.damage.parts.length).toBeGreaterThan(1);
      const bonusPart = modified.system.damage.parts[modified.system.damage.parts.length - 1];
      expect(bonusPart[0]).toBe('5');
      expect(bonusPart[1]).toBe('force');
    });

    test('handles zero modifiers (basic-refined aether)', () => {
      const spellData = {
        name: 'Shield',
        system: {
          attackBonus: 3,
          damage: { parts: [] }
        }
      };

      const modifiers = { attack: 0, damage: 0, spellAttack: 0, spellDamage: 0 };

      const modified = applyAetherModifiersToSpell(spellData, modifiers);

      expect(modified.system.attackBonus).toBe(3); // Unchanged
    });

    test('handles spells without damage parts', () => {
      const spellData = {
        name: 'Shield',
        system: {
          attackBonus: 0
          // No damage property
        }
      };

      const modifiers = { attack: 1, damage: 1, spellAttack: 1, spellDamage: 1 };

      const modified = applyAetherModifiersToSpell(spellData, modifiers);

      expect(modified.system.attackBonus).toBe(1);
      expect(modified.system.damage).toBeTruthy();
      expect(modified.system.damage.parts).toBeTruthy();
    });
  });

  describe('castSpellFromFinger', () => {
    test('creates temporary spell item on actor', async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = { attack: 0, damage: 0, spellAttack: 0, spellDamage: 0 };

      await castSpellFromFinger(mockActor, storedSpell, modifiers);

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        'Item',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Magic Missile',
            type: 'spell'
          })
        ])
      );
    });

    test('casts the spell without consuming spell slots', async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = { attack: 1, damage: 1, spellAttack: 1, spellDamage: 1 };

      const result = await castSpellFromFinger(mockActor, storedSpell, modifiers);

      expect(result.tempSpell.use).toHaveBeenCalledWith({
        consumeSpellSlot: false,
        consumeUsage: false
      });
    });

    test('applies aether modifiers before casting', async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = { attack: 5, damage: 5, spellAttack: 5, spellDamage: 5 };

      await castSpellFromFinger(mockActor, storedSpell, modifiers);

      const createdData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];
      expect(createdData.system.attackBonus).toBe(5);
    });

    test('returns the temporary spell for cleanup', async () => {
      const storedSpell = mockAethersGrasp.flags.elysium.storedSpells[0];
      const modifiers = { attack: 0, damage: 0, spellAttack: 0, spellDamage: 0 };

      const result = await castSpellFromFinger(mockActor, storedSpell, modifiers);

      expect(result.tempSpell).toBeTruthy();
      expect(result.tempSpell.id).toBe('temp-spell-id');
    });
  });
});
