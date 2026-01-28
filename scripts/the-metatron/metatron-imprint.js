/**
 * The Metatron - Prayer of Creation (Imprint)
 *
 * Handles imprinting spells from the Cleric spell list onto The Metatron's slots.
 * Unlike Aether's Grasp which uses scrolls, The Metatron draws directly from
 * the full 1st level Cleric spell list.
 *
 * Slots are named after forms of sacred prayer:
 * - Supplication, Invocation, Litany, Benediction, Consecration
 */

import { getStoredSpells, setStoredSpells } from "../utils/flags.js";

/**
 * Sacred prayer slot names for The Metatron
 */
export const SLOT_NAMES = [
  "Supplication",
  "Invocation",
  "Litany",
  "Benediction",
  "Consecration",
];

/**
 * Maximum number of spell slots
 */
export const MAX_SLOTS = 5;

/**
 * Get all 1st level Cleric spells from the provided spell list
 * @param {Array} spellList - Array of spell objects to filter
 * @returns {Array} Filtered list of 1st level spells
 */
export async function getFirstLevelClericSpells(spellList) {
  return spellList.filter((spell) => spell.system?.level === 1);
}

/**
 * Get the available slots on The Metatron
 * @param {Item} metatron - The Metatron item
 * @returns {Array} Array of slot objects with occupation status
 */
export function getAvailableSlots(metatron) {
  const storedSpells = getStoredSpells(metatron);

  return SLOT_NAMES.map((name, index) => {
    const storedSpell = storedSpells.find((s) => s.slotIndex === index);
    return {
      index,
      name,
      occupied: !!storedSpell,
      spell: storedSpell || null,
    };
  });
}

/**
 * Check if The Metatron can store more spells
 * @param {Item} metatron - The Metatron item
 * @returns {boolean} True if there are empty slots
 */
export function canImprintMoreSpells(metatron) {
  const storedSpells = getStoredSpells(metatron);
  return storedSpells.length < MAX_SLOTS;
}

/**
 * Imprint a spell onto a slot of The Metatron
 * @param {Item} metatron - The Metatron item
 * @param {number} slotIndex - The slot index (0-4)
 * @param {Object} spellData - The spell data to store
 */
export async function imprintSpellOnSlot(metatron, slotIndex, spellData) {
  // Get current stored spells
  const currentStoredSpells = getStoredSpells(metatron);

  // Create new stored spell object
  const storedSpell = {
    id: foundry?.utils?.randomID?.() || `spell-${Date.now()}-${Math.random()}`,
    slotIndex,
    slotName: SLOT_NAMES[slotIndex],
    spellData:
      foundry?.utils?.duplicate?.(spellData) ||
      JSON.parse(JSON.stringify(spellData)),
    imprintedAt: Date.now(),
  };

  // Add to stored spells
  currentStoredSpells.push(storedSpell);

  // Save to item flags
  await setStoredSpells(metatron, currentStoredSpells);
}
