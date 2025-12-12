/**
 * Aether's Edge Hooks
 *
 * Handles activity-based abilities (Extra Attack, Battle Cry, Elemental Strike).
 */

import { registerPostActivityConsumptionHandler } from "../hooks/hook-registry.js";
import {
  activateExtraAttack,
  activateBattleCry,
  activateElementalStrike,
} from "./edge-abilities.js";

/**
 * Register Aether's Edge hooks
 */
export function registerAethersEdgeHooks() {
  registerPostActivityConsumptionHandler(
    (item) => item.getFlag("elysium", "isAethersEdge"),
    handleEdgeActivity
  );

  console.log("Elysium | Aether's Edge hooks registered");
}

/**
 * Handle Aether's Edge activities
 */
async function handleEdgeActivity(actor, item, activity) {
  console.log(`Elysium | Detected Aether's Edge activity: ${activity.name}`);

  switch (activity.name) {
    case "Extra Attack":
      await activateExtraAttack(actor, item);
      break;

    case "Battle Cry":
      await activateBattleCry(actor, item);
      break;

    case "Elemental Strike":
      const elementType = await promptElementSelection();
      if (elementType) {
        await activateElementalStrike(actor, item, null, elementType);
      }
      break;
  }
}

/**
 * Prompt user to select element type for Elemental Strike
 */
async function promptElementSelection() {
  return Dialog.prompt({
    title: "Elemental Strike",
    content: `
      <form>
        <div class="form-group">
          <label>Choose element type:</label>
          <select name="element" class="elysium-select">
            <option value="fire">Fire</option>
            <option value="cold">Cold</option>
            <option value="lightning">Lightning</option>
            <option value="thunder">Thunder</option>
          </select>
        </div>
      </form>
    `,
    callback: (html) => html.find('[name="element"]').val(),
    rejectClose: false,
  });
}
