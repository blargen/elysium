/**
 * Aether's Grasp - Imprint From Scroll
 *
 * Logic for storing spells from scrolls onto finger slots
 */

import { getStoredSpells, setStoredSpells } from "../utils/flags.js";

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const MAX_STORED_SPELLS = 5;

/**
 * Find all spell scrolls in actor's inventory with uses > 0
 * DM controls what scrolls players have access to - no filtering by level or class
 * @param {Actor} actor
 * @returns {Array<Item>}
 */
export function findFirstLevelScrolls(actor) {
  return actor.items.filter((item) => {
    // Just check if it's a scroll with uses remaining
    return (
      item.type === "consumable" &&
      item.system.type?.value === "scroll" &&
      (item.system.uses?.value || 0) > 0
    );
  });
}

/**
 * Get information about all 5 finger slots (occupied or available)
 * @param {Item} aethersGraspItem
 * @returns {Array<Object>} Array of { index, name, occupied, spell? }
 */
export function getAvailableFingerSlots(aethersGraspItem) {
  const storedSpells = getStoredSpells(aethersGraspItem);

  return FINGER_NAMES.map((name, index) => {
    const spell = storedSpells.find((s) => s.fingerIndex === index);

    return {
      index,
      name,
      occupied: !!spell,
      spell: spell || null,
    };
  });
}

/**
 * Check if more spells can be imprinted (max 5)
 * @param {Item} aethersGraspItem
 * @returns {boolean}
 */
export function canImprintMoreSpells(aethersGraspItem) {
  const storedSpells = getStoredSpells(aethersGraspItem);
  return storedSpells.length < MAX_STORED_SPELLS;
}

/**
 * Imprint a spell onto a finger slot
 * @param {Item} aethersGraspItem
 * @param {number} fingerIndex - 0-4 (Thumb to Pinky)
 * @param {Object} spellData - Full spell item data
 * @param {string} originalScrollName - Name of the scroll consumed
 * @returns {Promise<Object>} The stored spell object
 */
export async function imprintSpellOnFinger(
  aethersGraspItem,
  fingerIndex,
  spellData,
  originalScrollName,
) {
  const storedSpells = getStoredSpells(aethersGraspItem);

  // Create the stored spell object
  const storedSpell = {
    id: foundry?.utils?.randomID?.() || `spell-${Date.now()}-${Math.random()}`, // Fallback for tests
    fingerIndex,
    fingerName: FINGER_NAMES[fingerIndex],
    spellData:
      foundry?.utils?.duplicate?.(spellData) ||
      JSON.parse(JSON.stringify(spellData)), // Deep copy
    imprintedAt: Date.now(),
    originalScrollName,
  };

  // Add to stored spells array
  const updatedSpells = [...storedSpells, storedSpell];

  // Save to item flags
  await setStoredSpells(aethersGraspItem, updatedSpells);

  return storedSpell;
}

/**
 * Consume a scroll (reduce uses or delete if depleted)
 * @param {Item} scrollItem
 * @returns {Promise<boolean>} True if consumed successfully
 */
export async function consumeScroll(scrollItem) {
  const currentUses = scrollItem.system.uses?.value || 0;
  const maxUses = scrollItem.system.uses?.max || 1;
  const quantity = scrollItem.system.quantity || 1;

  if (currentUses <= 1) {
    // Last use of this scroll
    if (quantity <= 1) {
      // Delete the scroll entirely
      await scrollItem.delete();
    } else {
      // Reduce quantity and reset uses
      await scrollItem.update({
        "system.quantity": quantity - 1,
        "system.uses.value": maxUses,
      });
    }
  } else {
    // Just reduce uses
    await scrollItem.update({
      "system.uses.value": currentUses - 1,
    });
  }

  return true;
}
