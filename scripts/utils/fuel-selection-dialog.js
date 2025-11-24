/**
 * Reusable Fuel Selection Dialog
 *
 * Shows a dialog to let the user choose which aether fuel to use
 */

import {
  getAvailableAetherFuel,
  getQualityDescription,
} from "../aether-fuel/fuel-selection.js";
import { getAetherQuality } from "./flags.js";
import { showToxicityWarning } from "../aether-fuel/consumption.js";

/**
 * Show fuel selection dialog and return the selected fuel item
 *
 * @param {Actor} actor - The actor using the fuel
 * @returns {Promise<Item|null>} The selected fuel item, or null if cancelled
 */
export async function selectAetherFuel(actor) {
  // Get available aether fuel
  const aetherItems = getAvailableAetherFuel(actor);

  if (aetherItems.length === 0) {
    if (typeof ui !== "undefined") {
      ui.notifications.error("No aether fuel available!");
    }
    return null;
  }

  // If Dialog doesn't exist (test environment), just return the first fuel
  if (typeof Dialog === "undefined") {
    const firstFuel = aetherItems[0];
    // Still check for unrefined toxicity
    const quality = getAetherQuality(firstFuel);
    if (quality === "unrefined") {
      const proceed = await showToxicityWarning(actor);
      if (!proceed) return null;
    }
    return firstFuel;
  }

  // Build HTML content with fuel options
  let fuelOptionsHtml = "";
  aetherItems.forEach((aether) => {
    const quality = getAetherQuality(aether);
    const qualityDesc = getQualityDescription(quality);
    const uses = aether.system?.uses?.value || 0;
    const maxUses = aether.system?.uses?.max || 0;
    const img = aether.img || "icons/svg/item-bag.svg";

    fuelOptionsHtml += `
      <div class="elysium-fuel-option" data-fuel-id="${aether.id}">
        <img src="${img}" class="elysium-fuel-icon" alt="${aether.name}">
        <div class="elysium-fuel-info">
          <div class="elysium-fuel-name">${aether.name}</div>
          <div class="elysium-fuel-uses">${uses} / ${maxUses} uses</div>
          ${qualityDesc ? `<div class="elysium-fuel-quality">${qualityDesc}</div>` : ""}
        </div>
      </div>
    `;
  });

  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">Choose which aether to consume:</p>
      ${fuelOptionsHtml}
    </div>
  `;

  // Show aether selection dialog
  const aetherId = await new Promise((resolve) => {
    new Dialog({
      title: "Select Aether Fuel",
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      render: (html) => {
        html.find(".elysium-fuel-option").click((event) => {
          const fuelId = event.currentTarget.dataset.fuelId;
          resolve(fuelId);
          html.closest(".dialog").find(".dialog-button.cancel").click();
        });
      },
      default: "cancel",
    }).render(true);
  });

  if (!aetherId) return null;

  const aetherItem = actor.items.get(aetherId);

  // Check if unrefined and show toxicity warning
  const quality = getAetherQuality(aetherItem);
  if (quality === "unrefined") {
    const proceed = await showToxicityWarning(actor);
    if (!proceed) {
      ui.notifications.warn("Unrefined aether use cancelled.");
      return null;
    }
  }

  return aetherItem;
}
