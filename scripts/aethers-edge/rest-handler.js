/**
 * Aether's Edge Rest Handler
 * Handles long rest integration for stance and fighting style selection
 */

import { showStanceSelectionDialog } from "./stance-selection-dialog.js";
import { showFightingStyleDialog } from "./fighting-style-dialog.js";
import { applyStanceEffect, removeOldStance } from "./stance-handler.js";
import { grantTemporaryFightingStyle } from "../utils/fighting-styles.js";

/**
 * Update the Aether's Edge item to show only the activity for the current stance
 * @param {Item} item - The Aether's Edge item
 * @param {string} stance - The selected stance ("aggressive", "defensive", "balanced")
 * @returns {Promise<void>}
 */
async function updateItemActivities(item, stance) {
  // Define activity templates for each stance
  const activityTemplates = {
    aggressive: {
      type: "utility",
      name: "Extra Attack",
      activation: {
        type: "bonus",
        value: 1,
      },
      consumption: {
        targets: [],
      },
    },
    defensive: {
      type: "utility",
      name: "Battle Cry",
      activation: {
        type: "action",
        value: 1,
      },
      consumption: {
        targets: [],
      },
    },
    balanced: {
      type: "utility",
      name: "Elemental Strike",
      activation: {
        type: "bonus",
        value: 1,
      },
      consumption: {
        targets: [],
      },
    },
  };

  const activityData = activityTemplates[stance];
  if (!activityData) {
    console.error(`Elysium | Unknown stance: ${stance}`);
    return;
  }

  // Generate a proper 16-character ID
  const activityId = foundry.utils.randomID();

  // Clear all activities and add only the one for this stance
  const updates = {
    "system.activities": {
      [activityId]: activityData,
    },
  };

  await item.update(updates);
  console.log(
    `Elysium | Updated ${item.name} to show only ${activityData.name} activity`,
  );
}

/**
 * Handle long rest completion for Aether's Edge
 * Called by the dnd5e.restCompleted hook
 * @param {Actor} actor - The actor completing the rest
 * @param {Object} result - The rest result data
 * @returns {Promise<void>}
 */
export async function handleAethersEdgeLongRest(actor, result) {
  // Only handle long rests
  if (!result.longRest) return;

  // Check if actor has Aether's Edge equipped
  const aethersEdge = actor.items.find(
    (item) =>
      item.getFlag("elysium", "isAethersEdge") === true &&
      item.system.equipped === true,
  );

  if (!aethersEdge) {
    console.log(
      `Elysium | ${actor.name} does not have Aether's Edge equipped, skipping stance selection`,
    );
    return;
  }

  console.log(
    `Elysium | ${actor.name} has Aether's Edge, showing stance selection`,
  );

  // Get stance definitions from item flags
  const stances = aethersEdge.getFlag("elysium", "stances");

  if (!stances) {
    console.error(`Elysium | Aether's Edge missing stance definitions!`);
    return;
  }

  // Remove old stance before showing selection
  await removeOldStance(actor);

  // Show stance selection dialog
  const selectedStance = await showStanceSelectionDialog(actor, stances);

  if (!selectedStance) {
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn(`${actor.name} did not select a stance!`);
    }
    return;
  }

  // Apply the selected stance
  await applyStanceEffect(actor, selectedStance);

  // Update the item to show only the activity for this stance
  await updateItemActivities(aethersEdge, selectedStance);

  if (typeof ui !== "undefined" && ui.notifications) {
    ui.notifications.info(
      `${actor.name} enters ${stances[selectedStance].name}!`,
    );
  }

  // Show fighting style selection dialog
  const selectedStyle = await showFightingStyleDialog(actor);

  if (selectedStyle) {
    // Grant the temporary fighting style
    await grantTemporaryFightingStyle(actor, selectedStyle);

    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info(
        `${actor.name} temporarily learns ${selectedStyle}!`,
      );
    }
  } else {
    console.log(
      `Elysium | ${actor.name} chose not to learn a fighting style`,
    );
  }
}

/**
 * Register the Aether's Edge rest handler hook
 * Call this from elysium.js ready hook
 */
export function registerAethersEdgeRestHandler() {
  Hooks.on("dnd5e.restCompleted", handleAethersEdgeLongRest);

  console.log("Elysium | Aether's Edge rest handler registered");
}
