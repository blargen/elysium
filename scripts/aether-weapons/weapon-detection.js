/**
 * Aether Weapon Detection
 *
 * Functions to detect and identify aether weapons.
 */

/**
 * Check if an item is an aether weapon
 * @param {Object} item - The item to check
 * @returns {boolean} True if the item is an aether weapon
 */
export function isAetherWeapon(item) {
  if (!item) return false;
  return item.getFlag?.("elysium", "isAetherWeapon") === true;
}

/**
 * Check if a weapon is locked (unusable due to toxicity failure)
 * @param {Object} item - The weapon to check
 * @returns {boolean} True if the weapon is locked
 */
export function isWeaponLocked(item) {
  if (!item) return false;
  return item.getFlag?.("elysium", "locked") === true;
}

/**
 * Lock a weapon (make it unusable until long rest)
 * @param {Object} item - The weapon to lock
 * @returns {Promise<Object>} The weapon item
 */
export async function lockWeapon(item) {
  await item.setFlag("elysium", "locked", true);
  return item;
}

/**
 * Unlock a weapon (make it usable again)
 * @param {Object} item - The weapon to unlock
 * @returns {Promise<Object>} The weapon item
 */
export async function unlockWeapon(item) {
  await item.setFlag("elysium", "locked", false);
  return item;
}

/**
 * Get weapon configuration (damage formulas, type, etc.)
 * @param {Object} item - The weapon to get config for
 * @returns {Object|null} Config object or null if not an aether weapon
 */
export function getWeaponConfig(item) {
  if (!isAetherWeapon(item)) return null;

  return {
    normalDamage: item.getFlag("elysium", "normalDamage"),
    overpowerDamage: item.getFlag("elysium", "overpowerDamage"),
    weaponType: item.getFlag("elysium", "weaponType"),
  };
}

/**
 * Get the damage formula for a weapon based on mode
 * @param {Object} item - The aether weapon
 * @param {boolean} isOverpower - True for overpower mode, false for normal
 * @returns {string} Damage formula (e.g., "2d6" or "4d6")
 */
export function getDamageFormula(item, isOverpower = false) {
  const config = getWeaponConfig(item);

  return isOverpower ? config.overpowerDamage : config.normalDamage;
}
