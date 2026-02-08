/**
 * Ammunition Selection Dialog
 *
 * Shows a dialog for selecting which ammunition to fire.
 * Built with TDD!
 */

import { findCompatibleAmmo } from "./ammo-utils.js";
import { showCardSelectionDialog } from "../ui/card-selection-dialog.js";

/**
 * Show ammunition selection dialog with optional overclock toggle
 *
 * @param {Actor} actor - The actor whose inventory to search
 * @param {Item} weapon - The weapon to find ammo for
 * @param {Object} options - Optional configuration
 * @param {boolean} options.showOverclock - Whether to show overclock toggle
 * @returns {Promise<Object|null>} { ammo: Item, isOverclock: boolean } or null if cancelled
 */
export async function showAmmoSelectionDialog(actor, weapon, options = {}) {
  const { showOverclock = true } = options;

  // Find compatible ammunition
  const ammoItems = findCompatibleAmmo(actor, weapon);

  // No ammo available
  if (ammoItems.length === 0) {
    ui?.notifications?.warn(
      `No compatible ammunition found for ${weapon.name}!`
    );
    return null;
  }

  // Get weapon damage values (required flags!)
  const normalDamage = weapon.getFlag("elysium", "normalDamage");
  const overclockDamage = weapon.getFlag("elysium", "overclockDamage");

  if (!normalDamage) {
    console.error(`Elysium | ${weapon.name} missing normalDamage flag!`);
    ui.notifications.error(`${weapon.name} is misconfigured (missing normalDamage flag)`);
    return null;
  }

  if (!overclockDamage) {
    console.error(`Elysium | ${weapon.name} missing overclockDamage flag!`);
    ui.notifications.error(`${weapon.name} is misconfigured (missing overclockDamage flag)`);
    return null;
  }

  // Get toxicity info for overclock warning
  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const nextDC = 10 + 2 * (dailyDoses + 1);

  // Show card selection dialog with overclock card
  const result = await showCardSelectionDialog({
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
    overclock: showOverclock
      ? {
          enabled: true,
          name: "Overclock",
          image: "modules/elysium/assets/icons/ElysiumDefenderOverloadFinal.png",
          description: `Overclock The Defender to deal significantly more damage (${overclockDamage} instead of ${normalDamage}).`,
          warning: `Guaranteed +1 Aether Toxicity! DC ${nextDC} CON save or weapon locks until rest!`,
          defaultChecked: false,
        }
      : undefined,
  });

  if (!result) return null;

  // Return ammo and overclock state
  return {
    ammo: result.item,
    isOverclock: result.isOverclock || false,
  };
}
