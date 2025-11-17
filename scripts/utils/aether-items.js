/**
 * Generic Aether Item Utility
 *
 * Reusable handler for all aether-powered items
 */

import { handleAetherFuelUse } from '../aether-fuel/consumption.js';

/**
 * Use an aether-powered item with automatic fuel handling
 *
 * @param {Actor} actor - The actor using the item
 * @param {Item} item - The aether-powered item being used
 * @param {Function} effectCallback - Async function that applies the item's effect, receives (actor, fuelQuality) as parameters
 * @param {Item} selectedFuel - Optional pre-selected fuel item (for testing or direct selection)
 * @returns {Promise<Object>} Result object with success, fuelConsumed, fuelQuality, and optional error
 *
 * @example
 * await useAetherPoweredItem(actor, jumpBoots, async (actor, quality) => {
 *   await applyJumpSpell(actor, quality);
 * });
 */
export async function useAetherPoweredItem(actor, item, effectCallback, selectedFuel = null) {
  console.log(`Elysium | useAetherPoweredItem: ${item.name} for ${actor.name}`);

  try {
    // If no fuel provided, check if actor has any aether fuel
    if (!selectedFuel) {
      const availableFuel = actor.items.contents.filter(i =>
        i.getFlag('elysium', 'isAetherFuel') &&
        (i.system?.uses?.value || 0) > 0
      );

      if (availableFuel.length === 0) {
        console.log(`Elysium | No aether fuel available`);
        return {
          success: false,
          reason: 'no-fuel',
          fuelConsumed: false
        };
      }

      // In real use, we'd show fuel selection dialog here
      // For now, just use the first available fuel
      selectedFuel = availableFuel[0];
    }

    // Consume the aether fuel (handles toxicity automatically)
    const consumptionResult = await handleAetherFuelUse(actor, selectedFuel);

    if (!consumptionResult || !consumptionResult.consumed) {
      console.log(`Elysium | Fuel consumption failed`);
      return {
        success: false,
        reason: 'consumption-failed',
        fuelConsumed: false
      };
    }

    const fuelQuality = consumptionResult.quality;
    console.log(`Elysium | Fuel consumed (${fuelQuality}), applying effect...`);

    // Apply the item's effect (pass actor and fuelQuality)
    const effectResult = await effectCallback(actor, fuelQuality);

    console.log(`Elysium | Effect applied successfully`);

    return {
      success: true,
      fuelConsumed: true,
      fuelQuality,
      toxicityApplied: consumptionResult.toxicityApplied,
      ...effectResult
    };

  } catch (error) {
    console.error(`Elysium | useAetherPoweredItem error:`, error);

    return {
      success: false,
      error: error.message,
      fuelConsumed: false
    };
  }
}
