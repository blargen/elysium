/**
 * Fuel Enhancement Dialog
 * Generic dialog for selecting aether fuel + class resource enhancement
 */

import { showToxicityWarning } from "../aether-fuel/consumption.js";
import { getAetherQuality } from "../utils/flags.js";

/**
 * Show fuel selection + class resource enhancement dialog
 * @param {Object} options
 * @param {Actor} options.actor
 * @param {string} options.resourceName - "Focus Points", "Level 1 Spell Slots"
 * @param {number} options.resourceValue - Current value
 * @param {number} options.resourceMax - Max value
 * @param {string} options.enhancementLabel - "Enhance", "Upcast"
 * @param {string} options.enhancementCost - "1 focus point", "1 spell slot"
 * @returns {Promise<{aetherFuel: Item, enhanced: boolean}|null>}
 */
export async function showFuelEnhancementDialog(options) {
  const {
    actor,
    resourceName,
    resourceValue,
    resourceMax,
    enhancementLabel,
    enhancementCost,
  } = options;

  // Get available aether fuel
  const aetherFuel = actor.items.filter(
    (i) =>
      i.getFlag("elysium", "isAetherFuel") === true &&
      (i.system.uses?.value || 0) > 0,
  );

  if (aetherFuel.length === 0) {
    ui.notifications.warn("No aether fuel available!");
    return null;
  }

  // Build dialog HTML
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">
        Select aether fuel and enhancement mode
      </p>

      <!-- Aether Fuel Selection -->
      <h3 class="elysium-header" style="font-size: 0.9rem; margin: 12px 0 8px 0;">Select Aether Fuel</h3>
      ${aetherFuel
        .map(
          (fuel, index) => {
            const quantity = fuel.system?.quantity || 1;
            const img = fuel.img || "icons/svg/item-bag.svg";
            return `
        <label class="elysium-fuel-option">
          <input type="radio" name="aether-fuel" value="${fuel.id}" ${index === 0 ? "checked" : ""} class="elysium-checkbox">
          <img src="${img}" class="elysium-fuel-icon" alt="${fuel.name}">
          <div class="elysium-fuel-info">
            <div class="elysium-fuel-name">${fuel.name}</div>
            <div class="elysium-fuel-uses">${quantity} available</div>
          </div>
        </label>
      `;
          },
        )
        .join("")}

      <!-- Class Resource Display + Enhancement -->
      <div class="elysium-info-box" style="margin-top: 16px; padding: 12px;">
        <div style="margin-bottom: 12px;">
          <strong class="elysium-text-blue">${resourceName}:</strong>
          <span class="${resourceValue > 0 ? "elysium-text-blue" : "elysium-text-orange"}" style="font-size: 1.2rem; font-weight: bold; margin-left: 8px;">
            ${resourceValue} / ${resourceMax}
          </span>
        </div>
        <label style="display: flex; align-items: center; justify-content: space-between; cursor: ${resourceValue > 0 ? "pointer" : "not-allowed"};">
          <div>
            <strong style="color: ${resourceValue > 0 ? "var(--aether-text-main)" : "var(--aether-text-muted)"};">
              ${enhancementLabel} (costs ${enhancementCost})
            </strong>
          </div>
          <div class="elysium-toggle-switch">
            <input type="checkbox" name="enhancement" ${resourceValue > 0 ? "" : "disabled"}>
            <span class="elysium-toggle-slider"></span>
          </div>
        </label>
      </div>
    </div>
  `;

  // Show dialog and wait for user input
  return new Promise((resolve) => {
    new Dialog({
      title: "Select Fuel & Enhancement",
      content: content,
      buttons: {
        activate: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "Continue",
          callback: async (html) => {
            const selectedFuelId = html
              .find('input[name="aether-fuel"]:checked')
              .val();
            const enhanced = html
              .find('input[name="enhancement"]')
              .is(":checked");
            const selectedFuel = actor.items.get(selectedFuelId);

            // Check if unrefined aether - show toxicity warning
            const aetherQuality = getAetherQuality(selectedFuel);
            if (aetherQuality === "unrefined") {
              const proceed = await showToxicityWarning(actor);
              if (!proceed) {
                resolve(null); // User cancelled
                return;
              }
            }

            resolve({
              aetherFuel: selectedFuel,
              enhanced: enhanced,
            });
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: "activate",
    }).render(true);
  });
}
