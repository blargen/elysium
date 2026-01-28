/**
 * Flag Management Utilities
 *
 * Helper functions for getting/setting flags on actors and items.
 * These are thin wrappers around Foundry's flag API.
 */

// ============================================================================
// ACTOR FLAGS (Toxicity Tracking)
// ============================================================================

/**
 * Get the number of unrefined aether doses taken today
 * @param {Actor} actor
 * @returns {number}
 */
export function getDailyDoses(actor) {
  return actor.getFlag("elysium", "dailyDoses") || 0;
}

/**
 * Set the number of unrefined aether doses taken today
 * @param {Actor} actor
 * @param {number} doses
 */
export async function setDailyDoses(actor, doses) {
  return await actor.setFlag("elysium", "dailyDoses", doses);
}

/**
 * Get the Aether Toxicity Level
 * @param {Actor} actor
 * @returns {number}
 */
export function getATL(actor) {
  return actor.getFlag("elysium", "atl") || 0;
}

/**
 * Set the Aether Toxicity Level
 * @param {Actor} actor
 * @param {number} atl
 */
export async function setATL(actor, atl) {
  return await actor.setFlag("elysium", "atl", atl);
}

// ============================================================================
// ITEM FLAGS (Aether Fuel & Mod Items)
// ============================================================================

/**
 * Check if an item is aether fuel
 * @param {Item} item
 * @returns {boolean}
 */
export function isAetherFuel(item) {
  return item.getFlag("elysium", "isAetherFuel") || false;
}

/**
 * Check if an item requires aether to function
 * @param {Item} item
 * @returns {boolean}
 */
export function requiresAether(item) {
  return item.getFlag("elysium", "requiresAether") || false;
}

/**
 * Get the aether quality of a fuel item
 * @param {Item} item
 * @returns {string|null} - "unrefined", "basic-refined", "rarefied", "prometheum", "wild", or null
 */
export function getAetherQuality(item) {
  return item.getFlag("elysium", "aetherQuality") || null;
}

/**
 * Get the mod type of an item
 * @param {Item} item
 * @returns {string|null} - "spell-storage", "weapon-enhancement", etc., or null
 */
export function getModType(item) {
  return item.getFlag("elysium", "modType") || null;
}

/**
 * Get the stored spells from an item (Aether's Grasp)
 * @param {Item} item
 * @returns {Array}
 */
export function getStoredSpells(item) {
  return item.getFlag("elysium", "storedSpells") || [];
}

/**
 * Set the stored spells on an item (Aether's Grasp)
 * @param {Item} item
 * @param {Array} spells
 */
export async function setStoredSpells(item, spells) {
  return await item.setFlag("elysium", "storedSpells", spells);
}

// ============================================================================
// SPELL DATA UTILITIES
// ============================================================================

/**
 * Extract a clean spell name from spell/scroll data
 * Handles DDB importer format and standard scroll naming conventions
 * @param {Object} spellData - Spell or scroll item data (or object with flags/name)
 * @returns {string} Clean spell name
 */
export function extractSpellName(spellData) {
  if (!spellData) return "Unknown Spell";

  // Try DDB importer original name first
  const ddbName = spellData.flags?.ddbimporter?.originalName;
  if (ddbName) return ddbName;

  // Fall back to extracting from item name
  const name = spellData.name || "";
  return name
    .replace(/^Spell Scroll:\s*/i, "")
    .replace(/^Scroll of\s*/i, "")
    .trim() || "Unknown Spell";
}
