/**
 * Elysium - Main Module Entry Point
 *
 * A FoundryVTT module featuring a cyberpunk-fantasy world powered by aether.
 */

import {
  resetToxicityOnLongRest,
  applyUnrefinedAetherUse,
} from "./aether-fuel/toxicity.js";
import {
  rollConstitutionSave,
  showToxicityWarning,
} from "./aether-fuel/consumption.js";
import {
  isAetherFuel,
  getModType,
  getAetherQuality,
  getDailyDoses,
} from "./utils/flags.js";
import { calculateToxicityDC } from "./utils/calculations.js";
import { useAethersLeap } from "./aethers-leap/leap.js";
import {
  useAethersDetection,
  rollDetectionCheck,
} from "./aethers-detection/detection.js";
import { injectToxicityDisplay } from "./ui/character-sheet.js";
import { handleGiftOfThousandStrikes } from "./gift-of-thousand-strikes/gift-handler.js";
import { handleAethersGraspUse } from "./aethers-grasp/grasp-handler.js";
import { validateEquipRequirements } from "./utils/equip-validation.js";
import { isMonkFocusItem } from "./utils/monk-abilities.js";
import "./utils/create-items.js"; // Loads item creator utilities for macros

console.log("Elysium | Loading...");

Hooks.once("init", function () {
  console.log("Elysium | Initializing...");
});

Hooks.once("ready", async function () {
  console.log("Elysium | Ready!");
  console.log("Elysium | All systems online.");

  // Make utilities available globally for console testing
  window.Elysium = {
    version: "0.1.0",
    createAetherItems: async function () {
      const pack = game.packs.get("elysium.aether-fuel");
      if (!pack) {
        ui.notifications.error("Aether Fuel compendium not found!");
        return;
      }

      const aetherQualities = [
        {
          name: "Unrefined Aether",
          img: "modules/elysium/assets/UnrefinedAether.png",
          quality: "unrefined",
          description:
            "Raw, unprocessed aether. Extremely dangerous - risk of toxicity buildup.",
        },
        {
          name: "Basic Refined Aether",
          img: "modules/elysium/assets/BasicRefined.png",
          quality: "basic-refined",
          description:
            "Clean, safe aether with no adverse effects. Standard fuel for most modifications.",
        },
        {
          name: "Rarefied Aether",
          img: "modules/elysium/assets/RarefiedAether.png",
          quality: "rarefied",
          description:
            "Higher quality refined aether. Enhanced power with minimal risks.",
        },
        {
          name: "Prometheum",
          img: "modules/elysium/assets/Prometheum.png",
          quality: "prometheum",
          description:
            "Premium aether quality. Most powerful stable aether available.",
        },
      ];

      for (const aether of aetherQualities) {
        const itemData = {
          name: aether.name,
          type: "consumable",
          img: aether.img,
          system: {
            type: { value: "potion" },
            uses: {
              value: 1,
              max: 1,
              recovery: [],
              autoDestroy: true,
            },
            description: { value: `<p>${aether.description}</p>` },
            activities: {
              use: {
                type: "utility",
                name: "Use",
                activation: { type: "action", value: 1 },
                consumption: {
                  targets: [{ type: "itemUses", value: 1 }],
                },
              },
            },
          },
          flags: {
            elysium: {
              isAetherFuel: true,
              aetherQuality: aether.quality,
            },
          },
        };

        await Item.create(itemData, { pack: pack.collection });
      }

      ui.notifications.info(
        "Created all 4 aether fuel items directly in the compendium!",
      );
      console.log("Elysium | Created aether fuel items in compendium.");
    },
    createAethersGrasp: async function () {
      const pack = game.packs.get("elysium.elysium-items");
      if (!pack) {
        ui.notifications.error("Elysium Items compendium not found!");
        return;
      }

      const aethersGrasp = {
        name: "Aether's Grasp",
        type: "equipment",
        img: "modules/elysium/assets/AethersGraspSquare.png",
        system: {
          type: {
            value: "trinket",
          },
          equipped: false,
          attunement: 1,
          rarity: "rare",
          description: {
            value: `
              <p>A hand modification that allows you to store spells on your fingers and cast them using aether fuel.</p>
              <h3>Features:</h3>
              <ul>
                <li><strong>Capacity:</strong> 5 spells (one per finger)</li>
                <li><strong>Spell Level:</strong> 1st level spells only</li>
                <li><strong>Imprint:</strong> Consume a spell scroll to store it on a finger</li>
                <li><strong>Cast:</strong> Use aether fuel to cast stored spells</li>
              </ul>
            `,
          },
          activities: {
            use: {
              type: "utility",
              name: "Use Aether's Grasp",
              activation: { type: "action", value: 1 },
            },
          },
        },
        flags: {
          elysium: {
            requiresAether: true,
            modType: "spell-storage",
            maxStoredSpells: 5,
            allowedSpellLevel: 1,
            storedSpells: [],
          },
        },
      };

      await Item.create(aethersGrasp, { pack: pack.collection });
      ui.notifications.info(
        "Created Aether's Grasp directly in the compendium!",
      );
      console.log("Elysium | Created Aether's Grasp in compendium.");
    },
  };

  console.log(
    "Elysium | Type Elysium.createAetherItems() to create aether fuel in compendium",
  );
  console.log(
    "Elysium | Type Elysium.createAethersGrasp() to create Aether's Grasp in compendium",
  );
});

/**
 * Hook: Before Activity Usage (dnd5e v5.x)
 * Used to intercept Aether's Grasp and show toxicity warnings
 */
Hooks.on(
  "dnd5e.preUseActivity",
  async (activity, usageConfig, dialogConfig, messageConfig) => {
    const item = activity.item;
    const actor = item.actor;

    // Handle Aether's Grasp - intercept and show custom dialog
    if (getModType(item) === "spell-storage") {
      console.log(`Elysium | ${actor.name} is using Aether's Grasp`);
      await handleAethersGraspUse(actor, item);
      return false; // Prevent default item use
    }

    // Handle Gift of a Thousand Strikes
    if (getModType(item) === "ki-enhancement") {
      console.log(
        `Elysium | ${actor.name} is using Gift of a Thousand Strikes`,
      );
      await handleGiftOfThousandStrikes(actor, item);
      return false; // Prevent default item use
    }

    // Handle unrefined aether - show toxicity warning
    if (isAetherFuel(item) && getAetherQuality(item) === "unrefined") {
      const proceed = await showToxicityWarning(actor);
      if (!proceed) {
        ui.notifications.warn("Unrefined aether use cancelled.");
        return false; // Cancel the activity
      }

      // User wants to proceed - skip the system configuration dialog
      if (dialogConfig) {
        dialogConfig.configure = false;
      }
    }
  },
);

/**
 * Hook: After Activity Consumption (dnd5e v5.x)
 * Apply custom effects after system consumes the item
 */
Hooks.on(
  "dnd5e.postActivityConsumption",
  async (activity, usageConfig, messageConfig, updates) => {
    const item = activity.item;
    const actor = item.actor;

    // Handle aether fuel items - item already consumed by system
    if (isAetherFuel(item)) {
      console.log(`Elysium | ${actor.name} used aether fuel: ${item.name}`);
      const quality = getAetherQuality(item);

      // Apply toxicity for unrefined aether
      if (quality === "unrefined") {
        const dailyDoses = getDailyDoses(actor);
        const dc = calculateToxicityDC(dailyDoses);

        // Roll CON save
        const roll = await rollConstitutionSave(actor, dc);

        // Apply toxicity effects
        await applyUnrefinedAetherUse(actor, roll);

        console.log(`Elysium | Toxicity applied for ${quality} aether`);
      } else {
        console.log(
          `Elysium | ${quality} aether consumed safely (no toxicity)`,
        );
      }
    }
  },
);

/**
 * Hook: Long Rest Completed
 * Reset toxicity and remove all aether effects when a long rest completes
 */
Hooks.on("dnd5e.restCompleted", async (actor, restData) => {
  if (!restData.longRest) return;

  console.log(`Elysium | ${actor.name} completed a long rest`);

  const resetOccurred = await resetToxicityOnLongRest(actor);

  // Remove all aether-related active effects
  const aetherEffects = actor.effects.filter(
    (effect) =>
      effect.origin?.includes("elysium") ||
      effect.getFlag("elysium", "isAetherEffect"),
  );

  if (aetherEffects.length > 0) {
    console.log(
      `Elysium | Removing ${aetherEffects.length} aether effects from ${actor.name}`,
    );
    await Promise.all(aetherEffects.map((effect) => effect.delete()));
  }

  if (resetOccurred || aetherEffects.length > 0) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div style="
          border: 2px solid #1175D0;
          border-radius: 8px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(17,117,208,0.1), rgba(0,0,0,0.8));
          color: #f0f8ff;
          text-align: center;
        ">
          <h3 style="color: #1175D0; text-shadow: 0 0 6px rgba(17,117,208,0.8); margin: 0 0 8px 0;">
            🌅 AETHER RECOVERY 🌅
          </h3>
          <p style="margin: 4px 0;"><strong>${actor.name}</strong> completes a long rest</p>
          <p style="color: #9bb8d3; font-size: 0.9em; margin: 4px 0;">
            Their body purges the accumulated aether toxins and effects.
          </p>
          ${aetherEffects.length > 0 ? `<p style="color: #9bb8d3; font-size: 0.8em; margin-top: 4px;">Removed ${aetherEffects.length} aether effect(s)</p>` : ""}
        </div>
      `,
    });

    ui.notifications.info(`${actor.name} recovers from aether effects!`);
  }
});

/**
 * Hook: Activity Used (D&D 5e v5.x compatible)
 * Handle aether-powered items like Aether's Leap
 *
 * Uses postActivityConsumption to trigger after the activity is used
 * This hook fires AFTER the item's normal consumption (if any)
 */
Hooks.on(
  "dnd5e.postActivityConsumption",
  async (activity, usageConfig, messageConfig, updates) => {
    const item = activity.item;
    const actor = item?.actor;

    console.log(
      `Elysium | postActivityConsumption fired for: ${item?.name}, activity: ${activity?.name}`,
    );

    if (!actor) {
      console.log(`Elysium | No actor found, returning`);
      return;
    }

    // Check for Aether's Detection "Detect" activity by name
    if (
      item.getFlag("elysium", "isAethersDetection") &&
      activity.name === "Detect"
    ) {
      console.log(
        `Elysium | Detected Detection roll activity: ${activity.name}`,
      );
      await rollDetectionCheck(actor, item);
      return false; // Prevent default activity
    }

    // Check for Aether's Detection "Activate" activity by name
    if (
      item.getFlag("elysium", "isAethersDetection") &&
      activity.name?.includes("Activate")
    ) {
      console.log(
        `Elysium | Detected Activate Detection activity: ${activity.name}`,
      );
      await useAethersDetection(actor, item);
      return; // Activity handled
    }

    // Check if this is an Aether's Leap item
    if (item.getFlag("elysium", "isAethersLeap")) {
      console.log(`Elysium | Detected Aether's Leap item: ${item.name}`);
      await useAethersLeap(actor, item);
    }
  },
);

/**
 * Hook: Character Sheet Render (V2 only)
 * Inject toxicity display into D&D 5e character sheets
 */
Hooks.on("renderActorSheetV2", (sheet, html, data) => {
  console.log(
    "Elysium | V2 character sheet rendered, checking for toxicity display",
  );
  injectToxicityDisplay(sheet, html);
});

/**
 * Hook: Before Item Update
 * 1. Validate class/level requirements when equipping Elysium items
 * 2. Prevent focus consumption when using Gift in aether-only mode
 */
Hooks.on("preUpdateItem", (item, changes, options, userId) => {
  const actor = item.actor;

  // Check for focus consumption prevention (Gift of a Thousand Strikes aether-only mode)
  if (
    actor &&
    isMonkFocusItem(item) &&
    changes.system?.uses?.value !== undefined
  ) {
    const preventFlag = actor.getFlag("elysium", "preventFocusConsumption");
    if (preventFlag) {
      console.log(
        "Elysium | Preventing focus consumption (aether-only mode active)",
      );
      return false; // Block the focus consumption
    }
  }

  // Validate equipping requirements
  if (changes.system?.equipped === true && !item.system.equipped) {
    if (!actor) return true; // No actor, allow (item not on character sheet)

    // Check if this is an Elysium mod item
    const requiredClass = item.getFlag("elysium", "requiredClass");
    const requiredLevel = item.getFlag("elysium", "requiredLevel");

    if (requiredClass || requiredLevel) {
      const validation = validateEquipRequirements(actor, item);
      if (!validation.allowed) {
        ui.notifications.error(validation.reason);
        console.log(
          `Elysium | Blocked equipping ${item.name}: ${validation.reason}`,
        );
        return false; // Prevent the update
      }
    }
  }

  return true; // Allow the update
});

console.log("Elysium | Hooks registered");
