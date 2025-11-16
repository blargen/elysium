/**
 * Aether's Grasp - Forget From Finger
 *
 * Logic for removing stored spells from finger slots
 */

import { getStoredSpells, setStoredSpells } from '../utils/flags.js';

/**
 * Clear/forget a spell from a specific finger
 * @param {Item} aethersGraspItem
 * @param {number} fingerIndex - 0-4 (Thumb to Pinky)
 * @returns {Promise<Object|null>} The removed spell object or null if not found
 */
export async function clearSpellFromFinger(aethersGraspItem, fingerIndex) {
  const storedSpells = getStoredSpells(aethersGraspItem);

  // Find the spell being removed
  const removedSpell = storedSpells.find(s => s.fingerIndex === fingerIndex);

  if (!removedSpell) {
    return null;
  }

  // Filter out the spell at this finger
  const updatedSpells = storedSpells.filter(s => s.fingerIndex !== fingerIndex);

  // Save updated list
  await setStoredSpells(aethersGraspItem, updatedSpells);

  return removedSpell;
}
