/**
 * Elysium - Main Module Entry Point
 *
 * A FoundryVTT module featuring a cyberpunk-fantasy world powered by aether.
 */

// Hook registry and initialization
import { initializeHooks } from "./hooks/hook-registry.js";
import { registerItemHooks } from "./hooks/item-hooks.js";

// Item-specific hooks
import { registerAetherFuelHooks } from "./aether-fuel/fuel-hooks.js";
import { registerAethersGraspHooks } from "./aethers-grasp/grasp-hooks.js";
import { registerMetatronHooks } from "./the-metatron/metatron-hooks.js";
import { registerAethersEdgeHooks } from "./aethers-edge/edge-hooks.js";
import { registerAethersLeapHooks } from "./aethers-leap/leap-hooks.js";
import { registerAethersDetectionHooks } from "./aethers-detection/detection-hooks.js";
import { registerGiftHooks } from "./gift-of-thousand-strikes/gift-hooks.js";
import { registerAethersEdgeRestHandler } from "./aethers-edge/rest-handler.js";
import { registerDefenderHooks } from "./elysium-defender/defender-hooks.js";

// UI hooks
import { injectToxicityDisplay } from "./ui/character-sheet.js";

// Dev tools (loads item creator utilities)
import "./utils/create-items.js";

console.log("Elysium | Loading...");

Hooks.once("init", function () {
  console.log("Elysium | Initializing...");
});

Hooks.once("ready", function () {
  console.log("Elysium | Ready!");

  // Initialize the central hook dispatcher
  initializeHooks();

  // Register cross-cutting hooks
  registerItemHooks();

  // Register item-specific hooks
  registerAetherFuelHooks();
  registerAethersGraspHooks();
  registerMetatronHooks();
  registerAethersEdgeHooks();
  registerAethersLeapHooks();
  registerAethersDetectionHooks();
  registerGiftHooks();

  registerDefenderHooks();

  // Register rest handlers
  registerAethersEdgeRestHandler();

  console.log("Elysium | All systems online.");
});

// Character sheet UI injection
Hooks.on("renderActorSheetV2", (sheet, html) => {
  injectToxicityDisplay(sheet, html);
});

console.log("Elysium | Module loaded");
