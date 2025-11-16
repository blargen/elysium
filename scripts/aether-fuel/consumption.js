/**
 * Aether Fuel Consumption
 *
 * Handles consuming aether fuel items and triggering effects
 */

import { isAetherFuel, getAetherQuality } from '../utils/flags.js';
import { applyUnrefinedAetherUse } from './toxicity.js';
import { calculateToxicityDC } from '../utils/calculations.js';
import { getDailyDoses } from '../utils/flags.js';

/**
 * Consume one use of an aether fuel item (single-use, deletes item)
 * @param {Item} item
 * @returns {Promise<boolean>} True if consumed, false if no uses remaining
 */
export async function consumeAetherFuelItem(item) {
  const currentUses = item.system?.uses?.value || 0;

  console.log(`Elysium | Consuming ${item.name}: ${currentUses} uses`);

  if (currentUses <= 0) {
    console.log(`Elysium | Cannot consume - no uses remaining`);
    return false; // Cannot consume
  }

  // Single-use item - just delete it
  await item.delete();

  console.log(`Elysium | ${item.name} consumed and deleted`);

  return true;
}

/**
 * Show dramatic toxicity warning before using unrefined aether
 * @param {Actor} actor
 * @returns {Promise<boolean>} True if user wants to proceed, false if cancelled
 */
export async function showToxicityWarning(actor) {
  const dailyDoses = actor.getFlag('elysium', 'dailyDoses') || 0;
  const atl = actor.getFlag('elysium', 'atl') || 0;
  const nextDC = 8 + 2 * (dailyDoses + 1);

  return new Promise((resolve) => {
    new Dialog({
      title: "⚠️ TOXICITY WARNING ⚠️",
      content: `
        <div style="
          border: 2px solid #D06C11;
          border-radius: 8px;
          padding: 15px;
          background: linear-gradient(135deg, rgba(208,108,17,0.1), rgba(0,0,0,0.8));
          color: #f0f8ff;
          text-align: center;
        ">
          <h3 style="
            color: #D06C11;
            font-size: 1.2rem;
            font-weight: bold;
            text-shadow: 0 0 8px rgba(208,108,17,0.8);
            margin-bottom: 10px;
          ">
            ☠️ UNREFINED AETHER IS TOXIC ☠️
          </h3>
          <p style="margin: 8px 0;">You remember the dangers of using raw aether!</p>

          <div style="
            background: rgba(17,117,208,0.1);
            border: 1px solid #1175D0;
            border-radius: 4px;
            padding: 10px;
            margin: 12px 0;
          ">
            <strong>Current Status:</strong><br>
            Daily Doses: <span style="color: #D06C11;">${dailyDoses}</span><br>
            Aether Toxicity Level (ATL): <span style="color: #D06C11;">${atl}</span><br>
            <span style="color: #D06C11; font-weight: bold; font-size: 1.1em;">
              Next Save DC: ${nextDC}
            </span>
          </div>

          <p style="color: #9bb8d3; font-size: 0.9em; margin-top: 8px;">
            Failed saves increase toxicity and apply debilitating conditions.
          </p>

          <p style="color: #D06C11; font-weight: bold; margin-top: 12px;">
            Are you sure you want to proceed?
          </p>
        </div>
      `,
      buttons: {
        proceed: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "⚡ Use Anyway",
          callback: () => resolve(true)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "❌ Cancel",
          callback: () => resolve(false)
        }
      },
      default: "cancel",
      close: () => resolve(false)
    }).render(true);
  });
}

/**
 * Roll a Constitution saving throw for aether toxicity
 * @param {Actor} actor
 * @param {number} dc - The DC for the save
 * @returns {Promise<Roll>} The roll result
 */
export async function rollConstitutionSave(actor, dc) {
  // dnd5e v4.1+ uses rollSavingThrow (was rollAbilitySave in older versions)
  const roll = await actor.rollSavingThrow({
    ability: 'con',
    targetValue: dc
  });
  return roll;
}

/**
 * Handle using an aether fuel item
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<Object|null>} { consumed, quality, toxicityApplied } or null if not aether fuel
 */
export async function handleAetherFuelUse(actor, item) {
  console.log(`Elysium | handleAetherFuelUse called for ${item.name}`);

  // Check if this is aether fuel
  if (!isAetherFuel(item)) {
    console.log(`Elysium | Not aether fuel, returning null`);
    return null;
  }

  const quality = getAetherQuality(item);
  console.log(`Elysium | Aether quality: ${quality}`);

  // Check if we can consume (before applying toxicity)
  const currentUses = item.system?.uses?.value || 0;
  if (currentUses <= 0) {
    console.log(`Elysium | Consumption failed - no uses remaining`);
    return { consumed: false, quality, toxicityApplied: false };
  }

  // Handle unrefined toxicity BEFORE consuming
  // (Actor updates can cause item collection to reload, reverting consumption)
  if (quality === 'unrefined') {
    const dailyDoses = getDailyDoses(actor);
    const dc = calculateToxicityDC(dailyDoses);

    // Roll CON save
    const roll = await rollConstitutionSave(actor, dc);

    // Apply toxicity effects (this updates the actor)
    await applyUnrefinedAetherUse(actor, roll);

    console.log(`Elysium | Toxicity applied, now consuming item`);
  }

  // Now consume the item AFTER all actor updates are complete
  const consumed = await consumeAetherFuelItem(item);

  if (!consumed) {
    console.log(`Elysium | Consumption failed unexpectedly`);
    return { consumed: false, quality, toxicityApplied: quality === 'unrefined' };
  }

  console.log(`Elysium | Consumption succeeded, quality: ${quality}`);

  return {
    consumed: true,
    quality,
    toxicityApplied: quality === 'unrefined'
  };
}
