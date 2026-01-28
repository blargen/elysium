/**
 * Aether's Grasp - Cast From Finger
 *
 * Logic for casting stored spells using aether fuel.
 * Spells are stored in the character's spellbook and can only be cast
 * through Aether's Grasp (direct casting is blocked by hooks).
 */

import { getStoredSpells } from "../utils/flags.js";
import { handleAetherFuelUse } from "../aether-fuel/consumption.js";

/**
 * Set of spell IDs currently authorized for casting through Aether's Grasp.
 * Used to allow our programmatic casts while blocking direct spellbook casts.
 */
export const authorizedGraspCasts = new Set();

/**
 * Get a spell from the actor's spellbook by ID
 * @param {Actor} actor - The actor
 * @param {string} spellbookItemId - The ID of the spell in the spellbook
 * @returns {Item|null} The spell item or null if not found
 */
export function getSpellFromSpellbook(actor, spellbookItemId) {
  return actor.items.get(spellbookItemId) || null;
}

/**
 * Get the spell stored on a specific finger
 * @param {Item} aethersGraspItem
 * @param {number} fingerIndex - 0-4 (Thumb to Pinky)
 * @returns {Object|null} The stored spell object or null
 */
export function getStoredSpellByFinger(aethersGraspItem, fingerIndex) {
  const storedSpells = getStoredSpells(aethersGraspItem);
  return storedSpells.find((s) => s.fingerIndex === fingerIndex) || null;
}

/**
 * Cast a spell from a finger using aether fuel
 * Casts the spell directly from the actor's spellbook.
 * @param {Actor} actor
 * @param {Object} storedSpell - The stored spell reference
 * @param {Object} modifiers - Reserved for future aether modifier system
 * @param {Item} aetherFuel - The aether fuel item to consume AFTER cast
 * @returns {Promise<Object>} { castResult }
 */
export async function castSpellFromFinger(
  actor,
  storedSpell,
  modifiers,
  aetherFuel,
) {
  const spellbookItemId = storedSpell.spellbookItemId;

  if (!spellbookItemId) {
    throw new Error("No spellbookItemId - spell must be in actor's spellbook");
  }

  // Authorize this cast (for blocking hook to allow it through)
  authorizedGraspCasts.add(spellbookItemId);

  try {
    // Get the spell from the spellbook
    const spell = getSpellFromSpellbook(actor, spellbookItemId);
    if (!spell) {
      throw new Error(`Spell not found in spellbook (id: ${spellbookItemId})`);
    }

    console.log(`Elysium | Casting from spellbook: ${spell.name}`);

    // Cast the spell directly from the spellbook
    const castResult = await spell.use({
      consumeSpellSlot: false,
      consumeUsage: false,
    });

    // Consume aether fuel only if cast was confirmed
    if (castResult && aetherFuel) {
      await handleAetherFuelUse(actor, aetherFuel);
    }

    return { castResult };
  } finally {
    // Always clean up authorization, even on error
    authorizedGraspCasts.delete(spellbookItemId);
  }
}
