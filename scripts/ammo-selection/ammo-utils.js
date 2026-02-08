/**
 * Ammunition Selection - Utility Functions
 *
 * Helper functions for finding and consuming ammunition.
 * Built with TDD - integration tested with real ammo items!
 */

/**
 * Find all compatible ammunition for a weapon
 *
 * @param {Actor} actor - The actor whose inventory to search
 * @param {Item} weapon - The weapon to find ammo for
 * @returns {Item[]} Array of compatible ammo items
 */
export function findCompatibleAmmo(actor, weapon) {
  const weaponAmmoType = weapon.getFlag("elysium", "ammoType");

  return actor.items.filter((item) => {
    // Must be a consumable ammo item
    if (item.type !== "consumable") return false;
    if (item.system?.type?.value !== "ammo") return false;

    // Must have quantity available
    if ((item.system?.quantity ?? 0) <= 0) return false;

    // Must match weapon's ammo type
    const roundType = item.getFlag("elysium", "roundType");
    return roundType === weaponAmmoType;
  });
}

/**
 * Consume one round of ammunition
 *
 * @param {Item} item - The ammunition item to consume
 * @returns {Promise<boolean>} True if consumed successfully
 */
export async function consumeAmmo(item) {
  const newQuantity = item.system.quantity - 1;
  await item.update({ "system.quantity": newQuantity });
  return true;
}
