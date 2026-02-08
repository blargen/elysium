/**
 * Fuel Selection Prompt
 *
 * Shows a dialog for selecting which aether fuel to use.
 * Built with TDD to match our high quality standards!
 */

import { getAetherQuality } from "../utils/flags.js";
import { getQualityDescription } from "../aether-fuel/fuel-selection.js";
import { showCardSelectionDialog } from "../ui/card-selection-dialog.js";

/**
 * Show the fuel selection prompt and return selected fuel
 * @param {Array} fuels - Array of available fuel items
 * @returns {Promise<Object|null>} Selected fuel item or null if cancelled
 */
export async function showFuelSelectionPrompt(fuels) {
  // No fuels available
  if (!fuels || fuels.length === 0) {
    return null;
  }

  // Show card selection dialog
  return await showCardSelectionDialog({
    title: "Select Aether Fuel",
    description: "Choose which aether to consume for this action:",
    items: fuels,
    getImage: (fuel) => fuel.img || "icons/svg/item-bag.svg",
    getTitle: (fuel) => fuel.name,
    getSubtitle: (fuel) => {
      const quantity = fuel.system?.quantity || 1;
      return `Quantity: ${quantity}`;
    },
    getMetadata: (fuel) => {
      const quality = getAetherQuality(fuel);
      return getQualityDescription(quality);
    },
  });
}
