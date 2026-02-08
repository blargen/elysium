/**
 * Ammunition Selection Dialog
 *
 * Shows a dialog for selecting which ammunition to fire.
 * Built with TDD!
 */

import { findCompatibleAmmo } from "./ammo-utils.js";
import { showCardSelectionDialog } from "../ui/card-selection-dialog.js";

/**
 * Show ammunition selection dialog
 *
 * @param {Actor} actor - The actor whose inventory to search
 * @param {Item} weapon - The weapon to find ammo for
 * @returns {Promise<Item|null>} Selected ammo item or null if cancelled
 */
export async function showAmmoSelectionDialog(actor, weapon) {
  // Find compatible ammunition
  const ammoItems = findCompatibleAmmo(actor, weapon);

  // No ammo available
  if (ammoItems.length === 0) {
    ui?.notifications?.warn(
      `No compatible ammunition found for ${weapon.name}!`
    );
    return null;
  }

  // Show card selection dialog
  return await showCardSelectionDialog({
    title: "Select Ammunition",
    description: "Choose which rounds to fire:",
    items: ammoItems,
    getImage: (ammo) => ammo.img || "icons/svg/item-bag.svg",
    getTitle: (ammo) => ammo.name,
    getSubtitle: (ammo) => {
      const qty = ammo.system?.quantity || 0;
      return `${qty} ${qty === 1 ? "round" : "rounds"}`;
    },
    getMetadata: (ammo) => {
      const roundType = ammo.getFlag?.("elysium", "roundType");
      return roundType ? `Type: ${roundType}` : "";
    },
  });
}
