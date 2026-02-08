/**
 * Aether Ammunition Detection
 *
 * Functions to detect and identify aether ammunition.
 */

/**
 * Check if an item is aether ammunition
 * @param {Object} item - The item to check
 * @returns {boolean} True if the item is aether ammo
 */
export function isAetherAmmo(item) {
  if (!item) return false;
  return item.getFlag?.("elysium", "isAetherAmmo") === true;
}

/**
 * Get the damage type for aether ammunition
 * @param {Object} item - The ammunition item
 * @returns {string} The damage type (e.g., "force", "fire", "poison")
 */
export function getAmmoDamageType(item) {
  return item.getFlag("elysium", "damageType");
}

/**
 * Get ammunition configuration
 * @param {Object} item - The ammunition item
 * @returns {Object} Config object with damage type and other properties
 */
export function getAmmoConfig(item) {
  return {
    damageType: item.getFlag("elysium", "damageType"),
  };
}
