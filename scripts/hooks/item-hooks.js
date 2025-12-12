/**
 * Item Hooks
 *
 * Cross-cutting item hooks for equip validation and focus consumption prevention.
 */

import { validateEquipRequirements } from "../utils/equip-validation.js";
import { isMonkFocusItem } from "../utils/monk-abilities.js";

/**
 * Register item-related hooks
 */
export function registerItemHooks() {
  Hooks.on("preUpdateItem", handlePreUpdateItem);
  console.log("Elysium | Item hooks registered");
}

/**
 * Handle pre-update item
 * 1. Validate class/level requirements when equipping Elysium items
 * 2. Prevent focus consumption when using Gift in aether-only mode
 */
function handlePreUpdateItem(item, changes, options, userId) {
  const actor = item.actor;

  // Check for focus consumption prevention (Gift aether-only mode)
  if (shouldPreventFocusConsumption(actor, item, changes)) {
    console.log("Elysium | Preventing focus consumption (aether-only mode active)");
    return false;
  }

  // Validate equipping and attunement requirements
  if (!validateEquipOrAttune(actor, item, changes)) {
    return false;
  }

  return true;
}

/**
 * Check if focus consumption should be prevented
 */
function shouldPreventFocusConsumption(actor, item, changes) {
  if (!actor) return false;
  if (!isMonkFocusItem(item)) return false;
  if (changes.system?.uses?.value === undefined) return false;

  return actor.getFlag("elysium", "preventFocusConsumption");
}

/**
 * Validate equipping or attuning to an item
 */
function validateEquipOrAttune(actor, item, changes) {
  if (!actor) return true;

  const isEquipping = changes.system?.equipped === true && !item.system.equipped;
  const isAttuning = changes.system?.attuned === true && !item.system.attuned;

  if (!isEquipping && !isAttuning) return true;

  // Check if this is an Elysium mod item with requirements
  const requiredClass = item.getFlag("elysium", "requiredClass");
  const requiredLevel = item.getFlag("elysium", "requiredLevel");

  if (!requiredClass && !requiredLevel) return true;

  const validation = validateEquipRequirements(actor, item);
  if (!validation.allowed) {
    ui.notifications.error(validation.reason);
    console.log(
      `Elysium | Blocked ${isAttuning ? "attuning" : "equipping"} ${item.name}: ${validation.reason}`
    );
    return false;
  }

  return true;
}
