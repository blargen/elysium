/**
 * Overpower Prompt System
 *
 * Shows a dialog when players use aether weapons, letting them choose between
 * Normal Fire and Overpower modes. Displays current toxicity status to help
 * players make informed decisions.
 */

import { calculateToxicityDC } from "../utils/calculations.js";
import { showCardSelectionDialog } from "../ui/card-selection-dialog.js";

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
 * Show the overpower/fire mode selection dialog
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Promise<string|null>} Selected mode ("normal" or "overpower") or null if cancelled
 */
export async function showOverpowerDialog(weapon, actor) {
  // Get weapon damage formulas
  const normalDamage = weapon.getFlag("elysium", "normalDamage") || "2d6";
  const overpowerDamage = weapon.getFlag("elysium", "overpowerDamage") || "4d6";

  // Get current toxicity status
  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const currentATL = actor.getFlag("elysium", "atl") || 0;

  // Calculate what the DC will be if they use overpower
  const nextDC = calculateToxicityDC(dailyDoses);

  // Get weapon image
  const weaponImg = weapon.img || "icons/svg/sword.svg";

  // Create choice objects
  const choices = [
    {
      id: "normal",
      name: "🎯 Normal Fire",
      img: weaponImg,
      damage: normalDamage,
      subtitle: `${normalDamage} + DEX damage`,
      metadata: "Standard attack, no risk",
    },
    {
      id: "overpower",
      name: "⚡ Overpower",
      img: weaponImg,
      damage: overpowerDamage,
      subtitle: `${overpowerDamage} + DEX damage`,
      metadata: `⚠️ +1 ATL, DC ${nextDC} CON save or weapon locks`,
    },
  ];

  // Add toxicity info to description
  const description = `
    <div style="margin-bottom: 12px; padding: 8px; background: rgba(17, 117, 208, 0.1); border-radius: 4px; text-align: left;">
      <strong style="color: var(--aether-blue);">Current Status:</strong>
      Daily Doses: ${dailyDoses} | ATL: ${currentATL}
    </div>
  `;

  // Show card selection
  const selectedChoice = await showCardSelectionDialog({
    title: "Select Fire Mode",
    description: description,
    items: choices,
    getImage: (choice) => choice.img,
    getTitle: (choice) => choice.name,
    getSubtitle: (choice) => choice.subtitle,
    getMetadata: (choice) => choice.metadata,
  });

  console.log("Elysium | showOverpowerDialog - selectedChoice:", selectedChoice);

  // Return the mode ID or null
  const result = selectedChoice ? selectedChoice.id : null;
  console.log("Elysium | showOverpowerDialog - returning:", result);
  return result;
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
