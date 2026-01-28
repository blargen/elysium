/**
 * The Metatron - Meditation of Forgetfulness
 *
 * Handles removing stored spells from The Metatron's slots.
 */

import { getStoredSpells, setStoredSpells } from "../utils/flags.js";

/**
 * Clear a spell from a specific slot
 * @param {Item} metatron - The Metatron item
 * @param {number} slotIndex - The slot index (0-4)
 * @returns {Object|null} The removed spell data or null
 */
export async function clearSpellFromSlot(metatron, slotIndex) {
  const storedSpells = getStoredSpells(metatron);

  // Find the spell at this slot
  const removedSpell = storedSpells.find((s) => s.slotIndex === slotIndex);

  // If no spell at this slot, return null
  if (!removedSpell) {
    return null;
  }

  // Filter out the removed spell
  const updatedSpells = storedSpells.filter((s) => s.slotIndex !== slotIndex);

  // Save updated list
  await setStoredSpells(metatron, updatedSpells);

  return removedSpell;
}

/**
 * Clear multiple spells at once
 * @param {Item} metatron - The Metatron item
 * @param {number[]} slotIndices - Array of slot indices to clear
 * @returns {Object[]} Array of removed spell data
 */
export async function clearMultipleSpells(metatron, slotIndices) {
  const storedSpells = getStoredSpells(metatron);

  // Find all spells to remove
  const removedSpells = storedSpells.filter((s) =>
    slotIndices.includes(s.slotIndex),
  );

  // If no valid spells to remove, return empty array
  if (removedSpells.length === 0) {
    return [];
  }

  // Filter out all removed spells
  const updatedSpells = storedSpells.filter(
    (s) => !slotIndices.includes(s.slotIndex),
  );

  // Save updated list
  await setStoredSpells(metatron, updatedSpells);

  return removedSpells;
}
