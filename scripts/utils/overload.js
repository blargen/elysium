/**
 * Shared Overload Mechanics
 *
 * Reusable functions for items with risk/reward overload abilities.
 * Any item that can "overload" (risk going dormant for extra power) uses these.
 *
 * Used by: The Metatron (Healer's Gambit), The Elysium Defender (Overload)
 */

/**
 * Calculate the overload failure threshold based on ATL
 * Formula: 2 + (ATL * 2), capped at 20
 * @param {number} atl - Current Aether Toxicity Level
 * @returns {number} Roll at or below this value = failure
 */
export function calculateOverloadThreshold(atl) {
  const threshold = 2 + atl * 2;
  return Math.min(threshold, 20);
}

/**
 * Check if an overload stability roll failed
 * @param {number} roll - The d20 roll result
 * @param {number} threshold - The failure threshold
 * @returns {boolean} True if the item goes dormant
 */
export function isOverloadFailure(roll, threshold) {
  return roll <= threshold;
}

/**
 * Disable an item (set dormant until long rest)
 * @param {Item} item - The item to disable
 */
export async function disableItem(item) {
  await item.setFlag("elysium", "disabled", true);
}

/**
 * Enable an item (restore from dormant state)
 * @param {Item} item - The item to enable
 */
export async function enableItem(item) {
  await item.setFlag("elysium", "disabled", false);
}

/**
 * Check if an item is currently disabled/dormant
 * @param {Item} item - The item to check
 * @returns {boolean}
 */
export function isItemDisabled(item) {
  return item.getFlag("elysium", "disabled") || false;
}
