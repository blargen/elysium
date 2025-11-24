/**
 * Gift of a Thousand Strikes
 * A monk nervous system modification that allows using aether instead of/with ki
 */

import { handleAetherFuelUse } from "../aether-fuel/consumption.js";
import { triggerMonkAbility, isMonkFocusItem } from "../utils/monk-abilities.js";

/**
 * Use Gift of a Thousand Strikes to perform a monk ability
 * @param {Actor} actor - The monk actor
 * @param {Item} item - The Gift of a Thousand Strikes item
 * @param {Object} options - Usage options
 * @param {string} options.mode - 'aether-only' or 'aether-and-ki'
 * @param {string} options.ability - 'flurry-of-blows', 'patient-defense', or 'step-of-wind'
 * @param {Item} options.aetherFuel - The aether fuel item to consume
 * @returns {Promise<Object>} Result object with success status and details
 */
export async function useGiftOfThousandStrikes(actor, item, options) {
  try {
    const { mode, ability, aetherFuel } = options;

    // Validate mode
    if (!["aether-only", "aether-and-ki"].includes(mode)) {
      return {
        success: false,
        reason: "Invalid mode specified",
      };
    }

    // Check if actor is a monk
    if (!actor.classes?.monk) {
      return {
        success: false,
        reason: "This modification requires the monk class",
      };
    }

    // Check monk level requirement
    const monkLevel = actor.classes.monk.system.levels;
    const requiredLevel = item.getFlag("elysium", "requiredLevel") || 2;

    if (monkLevel < requiredLevel) {
      return {
        success: false,
        reason: `This modification requires monk level ${requiredLevel} or higher`,
      };
    }

    // Validate aether fuel
    if (!aetherFuel) {
      return {
        success: false,
        reason: "No aether fuel selected",
      };
    }

    // Check if aether fuel is depleted
    if (aetherFuel.system.uses.value <= 0) {
      return {
        success: false,
        reason: "Aether fuel is depleted",
      };
    }

    // Get monk abilities
    const abilities = item.getFlag("elysium", "monkAbilities");
    if (!abilities || !abilities[ability]) {
      return {
        success: false,
        reason: "Invalid ability specified",
      };
    }

    const abilityData = abilities[ability];
    let enhanced = false;
    let effect = abilityData.normalEffect;
    let bonus = null;

    // Handle aether-and-ki mode
    if (mode === "aether-and-ki") {
      // Check if actor has focus points (D&D 5e 2024 - stored in Monk's Focus item)
      const monkFocus = actor.items.find((i) => isMonkFocusItem(i));
      const focusPoints = monkFocus?.system?.uses?.value || 0;
      console.log("Elysium | Focus points available:", focusPoints);

      if (focusPoints <= 0) {
        return {
          success: false,
          reason: "No focus points available",
        };
      }

      // Use enhanced effect
      enhanced = true;
      effect = abilityData.enhancedEffect;
      bonus = abilityData.enhancedBonus;

      // NOTE: We don't manually consume focus points here!
      // The monk ability activity will auto-consume when triggered (it has "Consume Item Use?" checked)
      console.log(
        "Elysium | Enhanced mode: monk ability will auto-consume focus when triggered",
      );
    }

    // Consume aether fuel and trigger toxicity workflow if unrefined
    await handleAetherFuelUse(actor, aetherFuel);

    // Get aether quality
    const quality = aetherFuel.getFlag("elysium", "aetherQuality");

    // Trigger the monk ability with appropriate focus handling
    let abilityTriggered = false;

    try {
      if (enhanced) {
        // Enhanced mode: Trigger ability and let it consume focus naturally
        console.log(
          `Elysium | Enhanced mode: Triggering monk ability "${ability}" (will auto-consume focus)`,
        );
        abilityTriggered = await triggerMonkAbility(actor, ability);

        if (!abilityTriggered) {
          console.warn(
            "Elysium | Could not trigger monk ability automatically - player should trigger manually",
          );
        }
      } else {
        // Aether-only mode: Set flag to prevent focus consumption
        console.log(
          `Elysium | Aether-only mode: Triggering monk ability "${ability}" WITHOUT consuming focus`,
        );

        // Set prevention flag (if actor supports it)
        if (typeof actor.setFlag === "function") {
          await actor.setFlag("elysium", "preventFocusConsumption", true);
        }

        try {
          // Trigger the ability (focus consumption will be blocked by hook)
          abilityTriggered = await triggerMonkAbility(actor, ability);

          if (!abilityTriggered) {
            console.warn(
              "Elysium | Could not trigger monk ability automatically - player should trigger manually",
            );
          }
        } finally {
          // Always clear the flag, even if triggering failed (if actor supports it)
          if (typeof actor.unsetFlag === "function") {
            await actor.unsetFlag("elysium", "preventFocusConsumption");
            console.log("Elysium | Cleared focus consumption prevention flag");
          }
        }
      }
    } catch (flagError) {
      console.warn("Elysium | Error with flag system:", flagError);
      // Continue anyway - the ability triggering might still work
    }

    // Apply bonus effects in enhanced mode
    if (enhanced && abilityTriggered) {
      console.log(`Elysium | Applying enhanced bonus: ${bonus}`);

      if (bonus === "ac-bonus-2") {
        // Patient Defense: +2 AC until start of next turn
        try {
          await actor.createEmbeddedDocuments("ActiveEffect", [
            {
              name: "Gift Enhancement: Patient Defense",
              icon: item.img || "assets/GiftOfAThousandStrikes.png",
              origin: item.uuid,
              duration: {
                turns: 1,
              },
              changes: [
                {
                  key: "system.attributes.ac.bonus",
                  mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                  value: "2",
                },
              ],
              flags: {
                elysium: {
                  isAetherEffect: true,
                },
              },
            },
          ]);
          console.log("Elysium | Applied +2 AC effect");
        } catch (error) {
          console.error("Elysium | Failed to apply +2 AC effect:", error);
          ui.notifications.warn(
            "Could not apply AC bonus effect - please add manually",
          );
        }
      } else if (bonus === "triple-jump") {
        // Step of the Wind: Triple jump distance
        // This is typically handled narratively or with a reminder
        console.log("Elysium | Jump distance tripled (narrative bonus)");
      } else if (bonus === "extra-strike") {
        // Flurry of Blows: 3rd strike
        // This is complex - would need to add an extra attack
        console.log(
          "Elysium | Extra strike available (player should make 3rd attack)",
        );
      }
    }

    return {
      success: true,
      ability: ability,
      enhanced: enhanced,
      effect: effect,
      bonus: bonus,
      quality: quality,
      abilityTriggered: abilityTriggered,
    };
  } catch (error) {
    console.error("Elysium | Gift of a Thousand Strikes error:", error);
    return {
      success: false,
      reason: `Error: ${error.message}`,
    };
  }
}
