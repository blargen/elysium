/**
 * Equipment Validation Utilities
 * Validates class and level requirements before allowing equipment
 */

/**
 * Check if an actor meets the requirements to equip an item
 * @param {Actor} actor - The actor trying to equip the item
 * @param {Item} item - The item being equipped
 * @returns {{allowed: boolean, reason: string}} Validation result
 */
export function validateEquipRequirements(actor, item) {
  // Check for required class
  const requiredClass = item.getFlag("elysium", "requiredClass");
  if (requiredClass) {
    if (!actor.classes?.[requiredClass]) {
      return {
        allowed: false,
        reason: `This modification requires the ${requiredClass} class`,
      };
    }

    // Check for required level in that class
    const requiredLevel = item.getFlag("elysium", "requiredLevel");
    if (requiredLevel) {
      const classLevel = actor.classes[requiredClass].system.levels;
      if (classLevel < requiredLevel) {
        return {
          allowed: false,
          reason: `This modification requires ${requiredClass} level ${requiredLevel} or higher`,
        };
      }
    }
  }

  // Check attunement
  if (item.system.attunement === "required" && !item.system.attuned) {
    return {
      allowed: false,
      reason: "This modification must be attuned before equipping",
    };
  }

  return { allowed: true, reason: "" };
}
