/**
 * Aether Fuel Selection Logic
 *
 * Pure functions for finding and filtering available aether fuel
 */

import { isAetherFuel } from '../utils/flags.js';

/**
 * Get all available aether fuel items from an actor's inventory
 * @param {Actor} actor
 * @returns {Array<Item>} Items that are aether fuel with uses > 0
 */
export function getAvailableAetherFuel(actor) {
  return actor.items.filter(item => {
    // Must be flagged as aether fuel
    if (!isAetherFuel(item)) return false;

    // Must have uses remaining
    const uses = item.system?.uses?.value || 0;
    return uses > 0;
  });
}

/**
 * Get the user-friendly description for an aether quality
 * @param {string} quality - "unrefined", "basic-refined", "rarefied", "prometheum", "wild"
 * @returns {string} Description with emoji
 */
export function getQualityDescription(quality) {
  const descriptions = {
    'unrefined': '⚠️ TOXIC - Risk of toxicity buildup',
    'basic-refined': '⚪ Neutral - Safe, no bonuses',
    'rarefied': '🟢 Enhanced - Provides bonuses',
    'prometheum': '🟣 Premium - Significant bonuses',
    'wild': '🌀 Chaotic - Wild Magic effects'
  };

  return descriptions[quality] || '';
}

/**
 * Get the modifiers for an aether quality
 * Unrefined has NO spell modifiers - the toxicity system IS the cost!
 * @param {string} quality
 * @returns {Object|null} { attack, damage, spellAttack, spellDamage } or null for wild
 */
export function getQualityModifiers(quality) {
  const modifiers = {
    'unrefined': { attack: 0, damage: 0, spellAttack: 0, spellDamage: 0 },  // Toxicity is the cost!
    'basic-refined': { attack: 0, damage: 0, spellAttack: 0, spellDamage: 0 },
    'rarefied': { attack: 1, damage: 1, spellAttack: 1, spellDamage: 1 },
    'prometheum': { attack: 5, damage: 5, spellAttack: 5, spellDamage: 5 },
    'wild': null  // Determined by wild magic roll
  };

  // Special case: wild returns null
  if (quality === 'wild') return null;

  return modifiers[quality] || { attack: 0, damage: 0, spellAttack: 0, spellDamage: 0 };
}
