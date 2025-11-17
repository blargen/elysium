/**
 * Aether's Leap Item
 *
 * Allows casting Jump spell on self using aether fuel
 */

import { useAetherPoweredItem } from '../utils/aether-items.js';

/**
 * Apply the Jump spell effect to an actor (Aether's Leap)
 *
 * Jump: You touch a willing creature. Once on each of its turns until the spell ends,
 * that creature can jump up to 30 feet by spending 10 feet of movement.
 * Duration: 1 minute (concentration)
 *
 * @param {Actor} actor - The actor to receive the Jump effect
 * @param {string} fuelQuality - The quality of aether fuel used
 * @returns {Promise<Object>} Result with success and effectApplied
 */
export async function applyLeapEffect(actor, fuelQuality) {
  console.log(`Elysium | Applying Leap effect to ${actor.name} (${fuelQuality} aether)`);

  try {
    // Create the Leap active effect
    const effectData = {
      name: "Aether's Leap",
      icon: 'modules/elysium/assets/AethersLeap.png',
      origin: actor.uuid,
      duration: {
        rounds: 10 // 1 minute = 10 rounds
      },
      flags: {
        dnd5e: {
          concentration: true // Requires concentration
        },
        elysium: {
          aetherPowered: true,
          fuelQuality: fuelQuality
        }
      },
      changes: [
        // The Jump spell doesn't add numerical bonuses in 5e
        // It's a narrative effect that allows jumping 30ft with 10ft movement
        // We document this in the effect description
      ]
    };

    await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);

    console.log(`Elysium | Leap effect applied successfully`);

    // Show a chat message about the effect
    if (typeof ChatMessage !== 'undefined') {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="elysium-chat-card">
            <h3 class="elysium-header">⚡ Aether's Leap</h3>
            <p><strong>${actor.name}</strong> activates their Aether's Leap!</p>
            <p class="elysium-effect-description">
              For the next minute, you can jump up to 30 feet by spending 10 feet of movement.
            </p>
            <p class="elysium-text-muted">
              Requires concentration. Powered by ${fuelQuality} aether.
            </p>
          </div>
        `
      });
    }

    return {
      success: true,
      effectApplied: true
    };

  } catch (error) {
    console.error(`Elysium | Failed to apply Leap effect:`, error);
    return {
      success: false,
      effectApplied: false,
      error: error.message
    };
  }
}

/**
 * Use an Aether's Leap item
 *
 * @param {Actor} actor - The actor using the item
 * @param {Item} item - The Aether's Leap item
 * @param {Item} selectedFuel - Optional pre-selected fuel (for testing)
 * @returns {Promise<Object>} Result object
 */
export async function useAethersLeap(actor, item, selectedFuel = null) {
  console.log(`Elysium | ${actor.name} using ${item.name}`);

  return await useAetherPoweredItem(actor, item, applyLeapEffect, selectedFuel);
}
