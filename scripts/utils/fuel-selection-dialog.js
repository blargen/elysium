/**
 * Reusable Fuel Selection Dialog
 *
 * Shows a dialog to let the user choose which aether fuel to use
 */

import { getAvailableAetherFuel } from '../aether-fuel/fuel-selection.js';
import { getAetherQuality } from './flags.js';
import { showToxicityWarning } from '../aether-fuel/consumption.js';

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
    if (typeof ui !== 'undefined') {
      ui.notifications.error("No aether fuel available!");
    }
    return null;
  }

  // If Dialog doesn't exist (test environment), just return the first fuel
  if (typeof Dialog === 'undefined') {
    const firstFuel = aetherItems[0];
    // Still check for unrefined toxicity
    const quality = getAetherQuality(firstFuel);
    if (quality === 'unrefined') {
      const proceed = await showToxicityWarning(actor);
      if (!proceed) return null;
    }
    return firstFuel;
  }

  // Show aether selection dialog
  const aetherId = await new Promise((resolve) => {
    const buttons = {};

    aetherItems.forEach(aether => {
      const quality = aether.getFlag('elysium', 'aetherQuality');
      buttons[aether.id] = {
        label: aether.name,
        callback: () => resolve(aether.id)
      };
    });

    buttons.cancel = {
      label: "Cancel",
      callback: () => resolve(null)
    };

    new Dialog({
      title: "Select Aether Fuel",
      content: `<div class="elysium-dialog-content elysium-text-center"><p>Choose which aether to consume:</p></div>`,
      buttons,
      default: "cancel"
    }).render(true);
  });

  if (!aetherId) return null;

  const aetherItem = actor.items.get(aetherId);

  // Check if unrefined and show toxicity warning
  const quality = getAetherQuality(aetherItem);
  if (quality === 'unrefined') {
    const proceed = await showToxicityWarning(actor);
    if (!proceed) {
      ui.notifications.warn("Unrefined aether use cancelled.");
      return null;
    }
  }

  return aetherItem;
}
