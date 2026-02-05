/**
 * Damage Modification System
 *
 * Modifies weapon damage based on fire mode (normal vs overpower).
 */

/**
 * Check if weapon damage should be modified
 * @param {Object} item - The weapon item
 * @returns {boolean} True if should modify
 */
export function shouldModifyDamage(item) {
  if (!item) return false;

  const isAetherWeapon = item.getFlag?.("elysium", "isAetherWeapon");
  if (!isAetherWeapon) return false;

  const fireMode = item.getFlag?.("elysium", "currentFireMode");
  if (!fireMode) return false;

  return true;
}

/**
 * Get the damage formula for the current fire mode
 * @param {Object} item - The weapon item
 * @returns {string|null} Damage formula or null
 */
export function getDamageForMode(item) {
  const fireMode = item.getFlag?.("elysium", "currentFireMode");
  if (!fireMode) return null;

  if (fireMode === "normal") {
    return item.getFlag?.("elysium", "normalDamage") || null;
  }

  if (fireMode === "overpower") {
    return item.getFlag?.("elysium", "overpowerDamage") || null;
  }

  return null;
}

/**
 * Modify weapon damage based on fire mode
 * @param {Object} item - The weapon item
 * @returns {Object} Result with modified status and formulas
 */
export function modifyWeaponDamage(item) {
  if (!shouldModifyDamage(item)) {
    return { modified: false };
  }

  const newFormula = getDamageForMode(item);
  if (!newFormula) {
    return { modified: false };
  }

  // Get original damage info
  const damageParts = item.system?.damage?.parts || [];
  const originalFormula = damageParts[0]?.[0] || "";
  const damageType = damageParts[0]?.[1] || "piercing";

  return {
    modified: true,
    originalFormula,
    newFormula,
    damageType,
  };
}
