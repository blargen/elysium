/**
 * Aether's Edge Abilities
 * Implements Extra Attack, Battle Cry, and Elemental Strike
 */

import { useAetherPoweredItem } from "../utils/aether-items.js";

/**
 * Activate Extra Attack ability (Aggressive Stance)
 * Grants one additional weapon attack for this turn
 * @param {Actor} actor - The actor using the ability
 * @param {Item} item - The Aether's Edge item
 * @param {Item} selectedFuel - Optional pre-selected aether fuel
 * @returns {Promise<Object>} Result with success, fuelConsumed, etc.
 */
export async function activateExtraAttack(actor, item, selectedFuel = null) {
  return await useAetherPoweredItem(
    actor,
    item,
    async (actor, fuelQuality) => {
      // Create temporary Extra Attack effect
      const effectData = {
        name: "Extra Attack (Aether)",
        icon: "icons/skills/melee/sword-damaged-broken-glow-red.webp",
        origin: actor.uuid,
        changes: [], // No stat changes - this is detected by hooks
        flags: {
          elysium: {
            isExtraAttackEffect: true,
            expiresEndOfTurn: true,
          },
        },
      };

      const createdEffects = await actor.createEmbeddedDocuments(
        "ActiveEffect",
        [effectData],
      );

      console.log(
        `Elysium | Extra Attack granted to ${actor.name} (ends this turn)`,
      );

      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.info(
          `${actor.name} gains an Extra Attack this turn!`,
        );
      }

      return {
        extraAttackGranted: true,
        effect: createdEffects[0],
      };
    },
    selectedFuel,
  );
}

/**
 * Activate Battle Cry ability (Defensive Stance)
 * Grants +1 bonus to all allies within 10ft until your next turn
 * @param {Actor} actor - The actor using the ability
 * @param {Item} item - The Aether's Edge item
 * @param {Item} selectedFuel - Optional pre-selected aether fuel
 * @returns {Promise<Object>} Result with success, alliesAffected, etc.
 */
export async function activateBattleCry(actor, item, selectedFuel = null) {
  return await useAetherPoweredItem(
    actor,
    item,
    async (actor, fuelQuality) => {
      console.log(`Elysium | Battle Cry: Granting +1 bonus to nearby allies`);

      // Find allies within 10ft
      const allies = [];

      if (typeof canvas !== "undefined" && canvas.tokens) {
        const actorToken = canvas.tokens.placeables.find(
          (t) => t.actor === actor,
        );

        if (actorToken) {
          for (const token of canvas.tokens.placeables) {
            // Skip self
            if (token.actor === actor) continue;

            // Only allies (same disposition)
            if (token.document.disposition !== actorToken.document.disposition)
              continue;

            // Check distance (10ft)
            const distance = token.document.distanceTo(actorToken.document);
            if (distance <= 10) {
              allies.push(token.actor);
            }
          }
        }
      }

      // Grant +1 bonus to each ally
      let alliesAffected = 0;
      for (const ally of allies) {
        // Create temporary Battle Cry effect
        const effectData = {
          name: "Battle Cry",
          icon: "icons/skills/social/intimidation-impressing.webp",
          origin: actor.uuid,
          duration: {
            rounds: 1,
            turns: 1,
          },
          changes: [
            {
              key: "system.attributes.ac.bonus",
              mode: 2,
              value: "1",
            },
          ],
          flags: {
            elysium: {
              isBattleCryEffect: true,
            },
          },
        };

        await ally.createEmbeddedDocuments("ActiveEffect", [effectData]);
        alliesAffected++;
        console.log(`Elysium | Granted Battle Cry bonus to ${ally.name}`);
      }

      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.info(
          `Battle Cry! ${alliesAffected} allies gain +1 AC until your next turn!`,
        );
      }

      return {
        alliesAffected,
      };
    },
    selectedFuel,
  );
}

/**
 * Activate Elemental Strike ability (Balanced Stance)
 * Next melee attack deals +1d6 elemental damage
 * @param {Actor} actor - The actor using the ability
 * @param {Item} item - The Aether's Edge item
 * @param {Item} selectedFuel - Optional pre-selected aether fuel
 * @param {string} elementType - The damage type (fire, cold, lightning, thunder)
 * @returns {Promise<Object>} Result with success, elementType, etc.
 */
export async function activateElementalStrike(
  actor,
  item,
  selectedFuel = null,
  elementType = null,
) {
  // Validate element type before consuming fuel
  const validElements = ["fire", "cold", "lightning", "thunder"];

  if (!elementType || typeof elementType !== "string") {
    return {
      success: false,
      error: "Invalid element type: must provide element type",
    };
  }

  const normalizedElement = elementType.toLowerCase();

  if (!validElements.includes(normalizedElement)) {
    return {
      success: false,
      error: `Invalid element type: ${elementType}. Must be fire, cold, lightning, or thunder.`,
    };
  }

  return await useAetherPoweredItem(
    actor,
    item,
    async (actor, fuelQuality) => {
      // Create Elemental Strike effect
      const elementName =
        normalizedElement.charAt(0).toUpperCase() + normalizedElement.slice(1);

      const effectData = {
        name: `Elemental Strike: ${elementName}`,
        icon: getElementIcon(normalizedElement),
        origin: actor.uuid,
        changes: [], // Damage is added by hook, not active effect
        flags: {
          elysium: {
            isElementalStrikeEffect: true,
            elementType: normalizedElement,
            bonusDamage: "1d6",
            expiresOnHit: true,
          },
        },
      };

      const createdEffects = await actor.createEmbeddedDocuments(
        "ActiveEffect",
        [effectData],
      );

      console.log(
        `Elysium | Elemental Strike (${elementName}) granted to ${actor.name}`,
      );

      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.info(
          `${actor.name}'s next attack deals +1d6 ${elementName} damage!`,
        );
      }

      return {
        elementalStrikeGranted: true,
        elementType: normalizedElement,
        bonusDamage: "1d6",
        effect: createdEffects[0],
      };
    },
    selectedFuel,
  );
}

/**
 * Get icon path for element type
 * @param {string} element - Element type
 * @returns {string} Icon path
 */
function getElementIcon(element) {
  const icons = {
    fire: "icons/magic/fire/beam-jet-stream-yellow.webp",
    cold: "icons/magic/water/snowflake-ice-blue-white.webp",
    lightning: "icons/magic/lightning/bolt-strike-blue.webp",
    thunder: "icons/magic/sonic/explosion-shock-wave-teal.webp",
  };

  return icons[element] || "icons/magic/symbols/question-stone-yellow.webp";
}
