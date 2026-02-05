/**
 * Overpower Prompt System
 *
 * Shows a dialog when players use aether weapons, letting them choose between
 * Normal Fire and Overpower modes. Displays current toxicity status to help
 * players make informed decisions.
 */

import { calculateToxicityDC } from "../utils/calculations.js";

/**
 * Check if weapon should show overpower prompt
 * @param {Object} weapon - The weapon item
 * @returns {boolean} True if should show prompt
 */
export function shouldShowOverpowerPrompt(weapon) {
  if (!weapon) return false;
  return weapon.getFlag?.("elysium", "isAetherWeapon") === true;
}

/**
 * Create the overpower dialog configuration
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Object} Dialog configuration object
 */
export function createOverpowerDialog(weapon, actor) {
  // Get weapon damage formulas
  const normalDamage = weapon.getFlag("elysium", "normalDamage") || "0";
  const overpowerDamage = weapon.getFlag("elysium", "overpowerDamage") || "0";

  // Get current toxicity status
  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const currentATL = actor.getFlag("elysium", "atl") || 0;

  // Calculate what the DC will be if they use overpower
  const nextDC = calculateToxicityDC(dailyDoses);

  // Build dialog content with Elysium styling
  const content = `
    <div class="elysium-dialog-content">
      <h2 class="elysium-header">Select Fire Mode</h2>

      <div style="margin-bottom: 16px; padding: 8px; background: rgba(17, 117, 208, 0.1); border-radius: 4px;">
        <h3 style="color: var(--aether-blue); margin: 0 0 8px 0;">Current Status</h3>
        <p style="margin: 4px 0;"><strong>Daily Doses:</strong> ${dailyDoses}</p>
        <p style="margin: 4px 0;"><strong>Aether Toxicity Level (ATL):</strong> ${currentATL}</p>
      </div>

      <div style="margin-bottom: 12px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px;">
        <h4 style="color: var(--aether-text-main); margin: 0 0 6px 0;">🎯 Normal Fire</h4>
        <p style="margin: 4px 0;"><strong>Damage:</strong> ${normalDamage}</p>
        <p style="margin: 4px 0; color: var(--aether-text-muted);">Standard attack, no aether required, no risk.</p>
      </div>

      <div style="margin-bottom: 12px; padding: 8px; background: rgba(208, 108, 17, 0.15); border: 1px solid rgba(208, 108, 17, 0.4); border-radius: 4px;">
        <h4 style="color: var(--aether-orange); margin: 0 0 6px 0;">⚡ Overpower</h4>
        <p style="margin: 4px 0;"><strong>Damage:</strong> ${overpowerDamage}</p>
        <p style="margin: 4px 0; color: var(--aether-warning);"><strong>Requires:</strong> Aether fuel</p>
        <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 8px 0;" />
        <h5 class="elysium-header-toxicity" style="font-size: 0.9rem; margin: 8px 0 4px 0;">⚠️ Risk</h5>
        <p style="margin: 4px 0;"><strong>Guaranteed:</strong> +1 ATL (will be ${currentATL + 1})</p>
        <p style="margin: 4px 0;"><strong>CON Save:</strong> DC ${nextDC}</p>
        <p style="margin: 4px 0; color: var(--aether-orange);"><strong>If failed:</strong> weapon lock until long rest</p>
      </div>
    </div>
  `;

  return {
    title: "Fire Mode Selection",
    content: content,
    buttons: {
      normal: {
        label: "Normal Fire",
        callback: () => "normal",
      },
      overpower: {
        label: "Overpower",
        callback: () => "overpower",
      },
    },
    default: "normal",
    close: () => null,
  };
}

/**
 * Handle the user's choice from the dialog
 * @param {string|null} choice - The choice ('normal', 'overpower', or null)
 * @returns {Object} Result object with mode and cancelled status
 */
export function handleOverpowerChoice(choice) {
  if (choice === null || choice === undefined) {
    return { cancelled: true };
  }

  return {
    mode: choice,
    cancelled: false,
  };
}
