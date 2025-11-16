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
 * Consume one use of an aether fuel item
 * @param {Item} item
 * @returns {Promise<boolean>} True if consumed, false if no uses remaining
 */
export async function consumeAetherFuelItem(item) {
  const currentUses = item.system?.uses?.value || 0;
  const currentQuantity = item.system?.quantity || 1;

  console.log(`Elysium | Consuming ${item.name}: ${currentUses} uses, ${currentQuantity} quantity`);

  if (currentUses <= 0) {
    console.log(`Elysium | Cannot consume - no uses remaining`);
    return false; // Cannot consume
  }

  if (currentUses > 1) {
    // Decrement uses (multiple uses per item)
    await item.update({
      'system.uses.value': currentUses - 1
    });
    console.log(`Elysium | ${item.name} consumed (${currentUses - 1} uses remaining)`);
  } else if (currentQuantity > 1) {
    // Last use of this item, but more in the stack - decrement quantity and reset uses
    await item.update({
      'system.quantity': currentQuantity - 1,
      'system.uses.value': item.system.uses?.max || 1
    });
    console.log(`Elysium | ${item.name} consumed (${currentQuantity - 1} remaining in stack)`);
  } else {
    // Last use of last item - delete
    await item.delete();
    console.log(`Elysium | ${item.name} consumed and deleted (last one)`);
  }

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
        <div class="elysium-info-box-warning elysium-text-center">
          <h3 class="elysium-header elysium-header-toxicity">
            ☠️ UNREFINED AETHER IS TOXIC ☠️
          </h3>
          <p>You remember the dangers of using raw aether!</p>

          <div class="elysium-info-box">
            <strong>Current Status:</strong><br>
            Daily Doses: <span class="elysium-text-orange">${dailyDoses}</span><br>
            Aether Toxicity Level (ATL): <span class="elysium-text-orange">${atl}</span><br>
            <span class="elysium-text-orange" style="font-weight: bold; font-size: 1.1em;">
              Next Save DC: ${nextDC}
            </span>
          </div>

          <p class="elysium-text-muted" style="font-size: 0.9em; margin-top: 8px;">
            Failed saves increase toxicity and apply debilitating conditions.
          </p>

          <p class="elysium-text-orange" style="font-weight: bold; margin-top: 12px;">
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
