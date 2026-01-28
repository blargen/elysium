/**
 * Aether's Grasp - Imprint From Scroll
 *
 * Logic for storing spells from scrolls onto finger slots
 */

import { getStoredSpells, setStoredSpells, extractSpellName } from "../utils/flags.js";

export const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
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

/**
 * Prepare imprint data from user selections
 * Validates scrolls exist and builds imprint objects
 * @param {Actor} actor - The actor with scrolls in inventory
 * @param {Object} selections - Map of fingerIndex -> scrollId from dialog
 * @param {Array} slots - Finger slots from getAvailableFingerSlots
 * @returns {Array} Array of imprint objects ready to be processed
 */
export function prepareImprintsFromSelections(actor, selections, slots) {
  const imprintsToMake = [];

  for (const [fingerIndex, scrollId] of Object.entries(selections)) {
    const scroll = actor.items.get(scrollId);
    if (!scroll) {
      console.warn(`Elysium | Scroll ${scrollId} not found, skipping`);
      continue;
    }

    const spellData = scroll.toObject();
    const spellName = extractSpellName(scroll);
    const fingerIdx = parseInt(fingerIndex);
    const fingerName = slots[fingerIdx]?.name || FINGER_NAMES[fingerIdx];

    imprintsToMake.push({
      fingerIdx,
      fingerName,
      spellData,
      spellName,
      scroll,
      scrollName: scroll.name,
    });
  }

  return imprintsToMake;
}

/**
 * Create a stored spell object for saving to item flags
 * The spell data itself lives in the actor's spellbook - we only store a reference.
 * @param {Object} imprint - Imprint data from prepareImprintsFromSelections
 * @param {string} spellbookItemId - The ID of the spell item in the actor's spellbook (required)
 * @returns {Object} Stored spell object ready for flag storage
 */
export function createStoredSpellObject(imprint, spellbookItemId) {
  if (!spellbookItemId) {
    throw new Error("spellbookItemId is required - spells must be stored in the actor's spellbook");
  }

  return {
    id: foundry?.utils?.randomID?.() || `spell-${Date.now()}-${Math.random()}`,
    fingerIndex: imprint.fingerIdx,
    fingerName: imprint.fingerName,
    spellName: imprint.spellName, // Display name only - actual spell is in spellbook
    imprintedAt: Date.now(),
    originalScrollName: imprint.scrollName,
    spellbookItemId: spellbookItemId, // Links to the spell in the actor's spellbook
  };
}

/**
 * Look up a spell in the compendium by name
 * @param {string} spellName - The spell name to look up
 * @returns {Promise<Object|null>} The spell item data or null if not found
 */
export async function findSpellInCompendium(spellName) {
  // Try multiple compendiums in order of preference
  const compendiumIds = [
    "dnd5e.spells24",      // 2024 spells (D&D Modern Content)
    "dnd5e.spells",        // SRD spells
    "world.spells",        // World spells (if any)
  ];

  for (const packId of compendiumIds) {
    const pack = game.packs.get(packId);
    if (!pack) continue;

    // Get the index and search for the spell
    const index = await pack.getIndex();
    const entry = index.find(e =>
      e.name.toLowerCase() === spellName.toLowerCase()
    );

    if (entry) {
      // Get the full document
      const spell = await pack.getDocument(entry._id);
      console.log(`Elysium | Found ${spellName} in ${packId}`);
      return spell.toObject();
    }
  }

  console.warn(`Elysium | Could not find spell "${spellName}" in any compendium`);
  return null;
}

/**
 * Convert a spell scroll to proper spell item data
 * This is a fallback if compendium lookup fails
 * @param {Object} scrollData - The scroll item data
 * @param {string} spellName - Clean spell name
 * @param {string} fingerName - Finger name for display
 * @returns {Object} Clean spell item data
 */
export function convertScrollToSpell(scrollData, spellName, fingerName) {
  // Start with a deep copy
  const spellData =
    foundry?.utils?.duplicate?.(scrollData) ||
    JSON.parse(JSON.stringify(scrollData));

  // Change type from consumable to spell
  spellData.type = "spell";

  // Delete scroll-specific properties that don't belong on spells
  delete spellData._id; // Let Foundry generate new ID
  delete spellData.system.uses; // Spells don't have uses
  delete spellData.system.quantity; // Spells don't have quantity
  delete spellData.system.type; // Remove consumable type info
  delete spellData.system.price; // Remove price
  delete spellData.system.rarity; // Remove rarity (or keep it?)
  delete spellData.system.weight; // Remove weight
  delete spellData.system.container; // Remove container
  delete spellData.system.equipped; // Remove equipped state
  delete spellData.system.identified; // Remove identified state
  delete spellData.system.attuned; // Remove attunement
  delete spellData.system.attunement; // Remove attunement requirement

  // Delete activities so Foundry regenerates them for the new spell type
  // This is crucial - scroll activities are configured for consumable behavior
  delete spellData.system.activities;

  // Set proper spell preparation mode
  if (!spellData.system.preparation) {
    spellData.system.preparation = {};
  }
  spellData.system.preparation.mode = "atwill";
  spellData.system.preparation.prepared = true;

  // Set the spell name with finger identifier
  spellData.name = `${spellName} (${fingerName})`;

  return spellData;
}

/**
 * Add a spell to the actor's spellbook with Aether's Grasp flags
 * Looks up the spell in the compendium for clean data, falls back to scroll conversion
 * @param {Actor} actor - The actor to add the spell to
 * @param {Object} scrollData - The scroll data (used to extract spell name and as fallback)
 * @param {number} fingerIndex - The finger slot this spell is linked to
 * @param {string} graspItemId - The ID of the Aether's Grasp item
 * @param {string} fingerName - Name of the finger for display
 * @returns {Promise<Item>} The created spell item
 */
export async function addSpellToSpellbook(actor, scrollData, fingerIndex, graspItemId, fingerName) {
  // Extract the clean spell name
  const spellName = extractSpellName(scrollData);

  // Try to find the spell in the compendium first (preferred - clean data)
  let spellData = await findSpellInCompendium(spellName);

  if (spellData) {
    // Found in compendium - use clean spell data
    delete spellData._id; // Let Foundry generate new ID
    spellData.name = `${spellName} (${fingerName})`;

    // Set preparation mode to atwill
    if (!spellData.system.preparation) {
      spellData.system.preparation = {};
    }
    spellData.system.preparation.mode = "atwill";
    spellData.system.preparation.prepared = true;
  } else {
    // Fallback: convert scroll to spell (less reliable)
    console.warn(`Elysium | Falling back to scroll conversion for ${spellName}`);
    spellData = convertScrollToSpell(scrollData, spellName, fingerName);
  }

  // Add Elysium flags to identify this as a Grasp spell
  if (!spellData.flags) spellData.flags = {};
  spellData.flags.elysium = {
    ...(spellData.flags.elysium || {}),
    fromAethersGrasp: true,
    fingerIndex: fingerIndex,
    fingerName: fingerName,
    graspItemId: graspItemId,
  };

  // Create the spell on the actor
  const createdItems = await actor.createEmbeddedDocuments("Item", [spellData]);
  return createdItems[0];
}
