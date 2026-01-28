/**
 * Aether's Grasp - Forget From Finger
 *
 * Logic for removing stored spells from finger slots
 */

import { getStoredSpells, setStoredSpells } from "../utils/flags.js";

/**
 * Remove a spell from the actor's spellbook
 * Called when forgetting a finger to clean up the linked spell
 * @param {Actor} actor - The actor whose spellbook to modify
 * @param {string} spellbookItemId - The ID of the spell to remove
 */
export async function removeSpellFromSpellbook(actor, spellbookItemId) {
  if (!spellbookItemId) return;

  const spell = actor.items.get(spellbookItemId);
  if (!spell) return;

  console.log(`Elysium | Removing ${spell.name} from spellbook`);
  await spell.delete();
}

/**
 * Clear/forget a spell from a specific finger
 * @param {Item} aethersGraspItem
 * @param {number} fingerIndex - 0-4 (Thumb to Pinky)
 * @returns {Promise<Object|null>} The removed spell object or null if not found
 */
export async function clearSpellFromFinger(aethersGraspItem, fingerIndex) {
  const storedSpells = getStoredSpells(aethersGraspItem);

  // Find the spell being removed
  const removedSpell = storedSpells.find((s) => s.fingerIndex === fingerIndex);

  if (!removedSpell) {
    return null;
  }

  // Filter out the spell at this finger
  const updatedSpells = storedSpells.filter(
    (s) => s.fingerIndex !== fingerIndex,
  );

  // Save updated list
  await setStoredSpells(aethersGraspItem, updatedSpells);

  return removedSpell;
}
