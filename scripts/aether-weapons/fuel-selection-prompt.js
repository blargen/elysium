/**
 * Fuel Selection Prompt
 *
 * Shows a dialog for selecting which aether fuel to use.
 * Built with TDD to match our high quality standards!
 */

import { getAetherQuality } from "../utils/flags.js";
import { getQualityDescription } from "../aether-fuel/fuel-selection.js";

/**
 * Create the fuel selection dialog configuration
 * @param {Array} fuels - Array of available fuel items
 * @returns {Object} Dialog configuration object
 */
export function createFuelSelectionDialog(fuels) {
  // Build fuel options HTML with images
  let fuelOptionsHtml = "";

  fuels.forEach((fuel, index) => {
    const quality = getAetherQuality(fuel);
    const qualityDesc = getQualityDescription(quality);
    const quantity = fuel.system?.quantity || 1;
    const img = fuel.img || "icons/svg/item-bag.svg";

    fuelOptionsHtml += `
      <div style="margin-bottom: 12px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; display: flex; align-items: center; gap: 12px;">
        <img src="${img}" style="width: 48px; height: 48px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1);" alt="${fuel.name}">
        <div style="flex: 1;">
          <div style="color: var(--aether-text-main); font-weight: 600; margin-bottom: 4px;">${fuel.name}</div>
          <div style="color: var(--aether-text-muted); font-size: 0.85rem;">Quantity: ${quantity}</div>
          ${qualityDesc ? `<div style="color: var(--aether-blue); font-size: 0.85rem;">${qualityDesc}</div>` : ""}
        </div>
      </div>
    `;
  });

  const content = `
    <div class="elysium-dialog-content">
      <h2 class="elysium-header">Select Aether Fuel</h2>
      <p style="text-align: center; margin-bottom: 16px; color: var(--aether-text-muted);">Choose which aether to consume for this action:</p>
      ${fuelOptionsHtml}
    </div>
  `;

  // Create buttons for each fuel
  const buttons = {};

  fuels.forEach((fuel, index) => {
    buttons[`fuel${index}`] = {
      label: fuel.name,
      callback: () => fuel,
    };
  });

  // Add cancel button
  buttons.cancel = {
    label: "Cancel",
    callback: () => null,
  };

  return {
    title: "Select Aether Fuel",
    content: content,
    buttons: buttons,
    default: "cancel",
    close: () => null,
  };
}

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

  const dialogConfig = createFuelSelectionDialog(fuels);
  const selectedFuel = await Dialog.wait(dialogConfig);
  return selectedFuel;
}
