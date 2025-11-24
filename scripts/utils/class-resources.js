/**
 * Class Resource Detection
 * Detects and returns class-specific resources for enhancement
 */

/**
 * Get class resource for enhancement
 * @param {Actor} actor
 * @param {string} itemType - "ki-enhancement", "spell-storage"
 * @returns {Object} { name, value, max, cost, label }
 */
export function getClassResourceForItem(actor, itemType) {
  switch (itemType) {
    case "ki-enhancement": {
      // Monk: Focus Points (stored in "Monk's Focus" item)
      const monkFocus = actor.items.find((i) => i.name === "Monk's Focus");
      return {
        name: "Focus Points",
        value: monkFocus?.system?.uses?.value || 0,
        max: monkFocus?.system?.uses?.max || 0,
        cost: "1 focus point",
        label: "Enhance",
      };
    }

    case "spell-storage": {
      // Wizard: Level 1 Spell Slots
      return {
        name: "Level 1 Spell Slots",
        value: actor.system?.spells?.spell1?.value || 0,
        max: actor.system?.spells?.spell1?.max || 0,
        cost: "1 spell slot",
        label: "Upcast",
      };
    }

    default:
      return {
        name: "",
        value: 0,
        max: 0,
        cost: "",
        label: "",
      };
  }
}
