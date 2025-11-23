/**
 * Gift of a Thousand Strikes
 * A monk nervous system modification that allows using aether instead of/with ki
 */

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
    if (!['aether-only', 'aether-and-ki'].includes(mode)) {
      return {
        success: false,
        reason: 'Invalid mode specified'
      };
    }

    // Check if actor is a monk
    if (!actor.classes?.monk) {
      return {
        success: false,
        reason: 'This modification requires the monk class'
      };
    }

    // Check monk level requirement
    const monkLevel = actor.classes.monk.system.levels;
    const requiredLevel = item.getFlag('elysium', 'requiredLevel') || 2;

    if (monkLevel < requiredLevel) {
      return {
        success: false,
        reason: `This modification requires monk level ${requiredLevel} or higher`
      };
    }

    // Validate aether fuel
    if (!aetherFuel) {
      return {
        success: false,
        reason: 'No aether fuel selected'
      };
    }

    // Check if aether fuel is depleted
    if (aetherFuel.system.uses.value <= 0) {
      return {
        success: false,
        reason: 'Aether fuel is depleted'
      };
    }

    // Get monk abilities
    const abilities = item.getFlag('elysium', 'monkAbilities');
    if (!abilities || !abilities[ability]) {
      return {
        success: false,
        reason: 'Invalid ability specified'
      };
    }

    const abilityData = abilities[ability];
    let enhanced = false;
    let effect = abilityData.normalEffect;
    let bonus = null;

    // Handle aether-and-ki mode
    if (mode === 'aether-and-ki') {
      // Check if actor has ki points
      const kiPoints = actor.system?.attributes?.ki?.value || 0;

      if (kiPoints <= 0) {
        return {
          success: false,
          reason: 'No ki points available'
        };
      }

      // Use enhanced effect
      enhanced = true;
      effect = abilityData.enhancedEffect;
      bonus = abilityData.enhancedBonus;

      // Consume ki point
      await actor.update({
        'system.attributes.ki.value': kiPoints - 1
      });
    }

    // Consume aether fuel
    await aetherFuel.update({
      'system.uses.value': aetherFuel.system.uses.value - 1
    });

    // Get aether quality
    const quality = aetherFuel.getFlag('elysium', 'aetherQuality');

    return {
      success: true,
      ability: ability,
      enhanced: enhanced,
      effect: effect,
      bonus: bonus,
      quality: quality
    };

  } catch (error) {
    console.error('Elysium | Gift of a Thousand Strikes error:', error);
    return {
      success: false,
      reason: `Error: ${error.message}`
    };
  }
}
