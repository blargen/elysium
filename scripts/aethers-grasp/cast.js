/**
 * Aether's Grasp - Cast From Finger
 *
 * Logic for casting stored spells using aether fuel
 */

import { getStoredSpells } from '../utils/flags.js';

/**
 * Get the spell stored on a specific finger
 * @param {Item} aethersGraspItem
 * @param {number} fingerIndex - 0-4 (Thumb to Pinky)
 * @returns {Object|null} The stored spell object or null
 */
export function getStoredSpellByFinger(aethersGraspItem, fingerIndex) {
  const storedSpells = getStoredSpells(aethersGraspItem);
  return storedSpells.find(s => s.fingerIndex === fingerIndex) || null;
}

/**
 * Create a temporary spell item data object for casting
 * @param {Object} spellData - Original spell data
 * @returns {Object} Modified spell data for temporary casting
 */
export function createTemporarySpellItem(spellData) {
  // Deep copy the spell data
  const tempData = foundry?.utils?.duplicate?.(spellData) || JSON.parse(JSON.stringify(spellData));

  // Modify for casting without spell slots
  if (tempData.system.preparation) {
    tempData.system.preparation.mode = 'atwill';
  }

  // Mark as temporary
  if (!tempData.flags) tempData.flags = {};
  tempData.flags.aethersGrasp = {
    temporary: true,
    castTime: Date.now()
  };

  return tempData;
}

/**
 * Apply aether modifiers to a spell
 * @param {Object} spellData - Spell data to modify
 * @param {Object} modifiers - { attack, damage, spellAttack, spellDamage }
 * @returns {Object} Modified spell data
 */
export function applyAetherModifiersToSpell(spellData, modifiers) {
  // Deep copy
  const modified = foundry?.utils?.duplicate?.(spellData) || JSON.parse(JSON.stringify(spellData));

  // Apply attack bonus
  if (modifiers.attack !== 0 || modifiers.spellAttack !== 0) {
    const attackBonus = modifiers.spellAttack || modifiers.attack;
    modified.system.attackBonus = (modified.system.attackBonus || 0) + attackBonus;
  }

  // Apply damage bonus
  if (modifiers.damage !== 0 || modifiers.spellDamage !== 0) {
    const damageBonus = modifiers.spellDamage || modifiers.damage;

    // Ensure damage structure exists
    if (!modified.system.damage) {
      modified.system.damage = { parts: [] };
    }
    if (!modified.system.damage.parts) {
      modified.system.damage.parts = [];
    }

    // Add damage bonus as a new damage part
    if (damageBonus > 0) {
      modified.system.damage.parts.push([String(damageBonus), 'force']);
    }
  }

  return modified;
}

/**
 * Cast a spell from a finger using aether fuel
 * @param {Actor} actor
 * @param {Object} storedSpell - The stored spell object
 * @param {Object} modifiers - Aether modifiers to apply
 * @returns {Promise<Object>} { tempSpell, castResult }
 */
export async function castSpellFromFinger(actor, storedSpell, modifiers) {
  // Create temporary spell data
  let tempData = createTemporarySpellItem(storedSpell.spellData);

  // Apply aether modifiers
  tempData = applyAetherModifiersToSpell(tempData, modifiers);

  // Create temporary spell item on actor
  const createdItems = await actor.createEmbeddedDocuments('Item', [tempData]);
  const tempSpell = createdItems[0];

  // Cast the spell without consuming spell slots
  const castResult = await tempSpell.use({
    consumeSpellSlot: false,
    consumeUsage: false
  });

  return {
    tempSpell,
    castResult
  };
}
