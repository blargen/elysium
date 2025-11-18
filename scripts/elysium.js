/**
 * Elysium - Main Module Entry Point
 *
 * A FoundryVTT module featuring a cyberpunk-fantasy world powered by aether.
 */

import { resetToxicityOnLongRest, applyUnrefinedAetherUse } from './aether-fuel/toxicity.js';
import { rollConstitutionSave, showToxicityWarning } from './aether-fuel/consumption.js';
import { isAetherFuel, getModType, getAetherQuality, getDailyDoses, getStoredSpells, setStoredSpells } from './utils/flags.js';
import { calculateToxicityDC } from './utils/calculations.js';
import { findFirstLevelScrolls, canImprintMoreSpells, getAvailableFingerSlots, imprintSpellOnFinger, consumeScroll } from './aethers-grasp/imprint.js';
import { getStoredSpellByFinger, castSpellFromFinger } from './aethers-grasp/cast.js';
import { clearSpellFromFinger } from './aethers-grasp/forget.js';
import { getQualityModifiers } from './aether-fuel/fuel-selection.js';
import { handleAetherFuelUse as consumeAether } from './aether-fuel/consumption.js';
import { useAethersLeap } from './aethers-leap/leap.js';
import { useAethersDetection, rollDetectionCheck } from './aethers-detection/detection.js';
import { selectAetherFuel } from './utils/fuel-selection-dialog.js';
import './utils/create-items.js';  // Loads item creator utilities for macros

console.log('Elysium | Loading...');

Hooks.once('init', function() {
  console.log('Elysium | Initializing...');
});

Hooks.once('ready', async function() {
  console.log('Elysium | Ready!');
  console.log('Elysium | All systems online.');

  // Make utilities available globally for console testing
  window.Elysium = {
    version: '0.1.0',
    createAetherItems: async function() {
      const pack = game.packs.get('elysium.aether-fuel');
      if (!pack) {
        ui.notifications.error("Aether Fuel compendium not found!");
        return;
      }

      const aetherQualities = [
        {
          name: "Unrefined Aether",
          img: "modules/elysium/assets/UnrefinedAether.png",
          quality: "unrefined",
          description: "Raw, unprocessed aether. Extremely dangerous - risk of toxicity buildup."
        },
        {
          name: "Basic Refined Aether",
          img: "modules/elysium/assets/BasicRefined.png",
          quality: "basic-refined",
          description: "Clean, safe aether with no adverse effects. Standard fuel for most modifications."
        },
        {
          name: "Rarefied Aether",
          img: "modules/elysium/assets/RarefiedAether.png",
          quality: "rarefied",
          description: "Higher quality refined aether. Enhanced power with minimal risks."
        },
        {
          name: "Prometheum",
          img: "modules/elysium/assets/Prometheum.png",
          quality: "prometheum",
          description: "Premium aether quality. Most powerful stable aether available."
        }
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
              autoDestroy: true
            },
            description: { value: `<p>${aether.description}</p>` },
            activities: {
              use: {
                type: "utility",
                name: "Use",
                activation: { type: "action", value: 1 },
                consumption: {
                  targets: [{ type: "itemUses", value: 1 }]
                }
              }
            }
          },
          flags: {
            elysium: {
              isAetherFuel: true,
              aetherQuality: aether.quality
            }
          }
        };

        await Item.create(itemData, { pack: pack.collection });
      }

      ui.notifications.info("Created all 4 aether fuel items directly in the compendium!");
      console.log("Elysium | Created aether fuel items in compendium.");
    },
    createAethersGrasp: async function() {
      const pack = game.packs.get('elysium.elysium-items');
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
            value: "trinket"
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
            `
          },
          activities: {
            use: {
              type: "utility",
              name: "Use Aether's Grasp",
              activation: { type: "action", value: 1 }
            }
          }
        },
        flags: {
          elysium: {
            requiresAether: true,
            modType: "spell-storage",
            maxStoredSpells: 5,
            allowedSpellLevel: 1,
            storedSpells: []
          }
        }
      };

      await Item.create(aethersGrasp, { pack: pack.collection });
      ui.notifications.info("Created Aether's Grasp directly in the compendium!");
      console.log("Elysium | Created Aether's Grasp in compendium.");
    }
  };

  console.log('Elysium | Type Elysium.createAetherItems() to create aether fuel in compendium');
  console.log('Elysium | Type Elysium.createAethersGrasp() to create Aether\'s Grasp in compendium');
});

/**
 * Hook: Before Activity Usage (dnd5e v5.x)
 * Used to intercept Aether's Grasp and show toxicity warnings
 */
Hooks.on('dnd5e.preUseActivity', async (activity, usageConfig, dialogConfig, messageConfig) => {
  const item = activity.item;
  const actor = item.actor;

  // Handle Aether's Grasp - intercept and show custom dialog
  if (getModType(item) === 'spell-storage') {
    console.log(`Elysium | ${actor.name} is using Aether's Grasp`);
    await handleAethersGraspUse(actor, item);
    return false; // Prevent default item use
  }

  // Handle unrefined aether - show toxicity warning
  if (isAetherFuel(item) && getAetherQuality(item) === 'unrefined') {
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
});

/**
 * Hook: After Activity Consumption (dnd5e v5.x)
 * Apply custom effects after system consumes the item
 */
Hooks.on('dnd5e.postActivityConsumption', async (activity, usageConfig, messageConfig, updates) => {
  const item = activity.item;
  const actor = item.actor;

  // Handle aether fuel items - item already consumed by system
  if (isAetherFuel(item)) {
    console.log(`Elysium | ${actor.name} used aether fuel: ${item.name}`);
    const quality = getAetherQuality(item);

    // Apply toxicity for unrefined aether
    if (quality === 'unrefined') {
      const dailyDoses = getDailyDoses(actor);
      const dc = calculateToxicityDC(dailyDoses);

      // Roll CON save
      const roll = await rollConstitutionSave(actor, dc);

      // Apply toxicity effects
      await applyUnrefinedAetherUse(actor, roll);

      console.log(`Elysium | Toxicity applied for ${quality} aether`);
    } else {
      console.log(`Elysium | ${quality} aether consumed safely (no toxicity)`);
    }
  }
});

/**
 * Handle Aether's Grasp usage - show action selection dialog
 */
async function handleAethersGraspUse(actor, aethersGrasp) {
  // Build action option cards
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">What would you like to do with <strong>Aether's Grasp</strong>?</p>

      <div class="elysium-action-option" data-action="imprint">
        <img src="modules/elysium/assets/ImprintFromScroll.png" class="elysium-action-icon" alt="Imprint">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Imprint From Scroll</div>
          <div class="elysium-action-desc">Store a spell from a scroll onto a finger</div>
        </div>
      </div>

      <div class="elysium-action-option" data-action="cast">
        <img src="modules/elysium/assets/CastFromFinger.png" class="elysium-action-icon" alt="Cast">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Cast From Finger</div>
          <div class="elysium-action-desc">Cast a stored spell using aether fuel</div>
        </div>
      </div>

      <div class="elysium-action-option" data-action="forget">
        <img src="modules/elysium/assets/ForgetFromFinger.png" class="elysium-action-icon" alt="Forget">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Forget From Finger</div>
          <div class="elysium-action-desc">Remove a stored spell from a finger</div>
        </div>
      </div>
    </div>
  `;

  // Show action selection dialog
  const action = await new Promise((resolve) => {
    new Dialog({
      title: "Aether's Grasp",
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      render: (html) => {
        html.find('.elysium-action-option').click((event) => {
          const actionType = event.currentTarget.dataset.action;
          resolve(actionType);
          html.closest('.dialog').find('.dialog-button.cancel').click();
        });
      },
      default: "cancel"
    }).render(true);
  });

  if (action === 'imprint') {
    await handleImprintFromScroll(actor, aethersGrasp);
  } else if (action === 'cast') {
    await handleCastFromFinger(actor, aethersGrasp);
  } else if (action === 'forget') {
    await handleForgetFromFinger(actor, aethersGrasp);
  }
}

/**
 * Handle Imprint From Scroll action
 */
async function handleImprintFromScroll(actor, aethersGrasp) {
  // Find available scrolls
  const scrolls = findFirstLevelScrolls(actor);
  if (scrolls.length === 0) {
    ui.notifications.warn("You have no 1st level spell scrolls to imprint!");
    return;
  }

  // Get finger slots
  const slots = getAvailableFingerSlots(aethersGrasp);

  // Build table HTML
  let tableRows = '';
  slots.forEach(slot => {
    const statusText = slot.occupied ? 'Occupied' : 'Empty';
    const spellCell = slot.occupied
      ? `<td>${slot.spell.spellData.name}</td>`
      : `<td>
          <select name="finger-${slot.index}" class="elysium-select" style="width: 100%;">
            <option value="">-- Select Spell --</option>
            ${scrolls.map(scroll => {
              // Extract spell name from scroll (remove "Scroll of " prefix)
              const spellName = scroll.name.replace(/^Scroll of /i, '').trim();
              return `<option value="${scroll.id}">${spellName}</option>`;
            }).join('')}
          </select>
        </td>`;

    tableRows += `
      <tr>
        <td><strong>${slot.name}</strong></td>
        ${spellCell}
        <td>${statusText}</td>
      </tr>
    `;
  });

  // Show dialog
  const selections = await new Promise((resolve) => {
    new Dialog({
      title: "Imprint Spells from Scrolls",
      content: `
        <div class="elysium-dialog-content">
          <p class="elysium-dialog-text">
            Select which scrolls to imprint on empty fingers
          </p>
          <table class="elysium-table">
            <thead>
              <tr>
                <th>Finger</th>
                <th>Spell</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `,
      buttons: {
        imprint: {
          icon: '<i class="fas fa-magic"></i>',
          label: "Imprint Selected",
          callback: (html) => {
            const selections = {};
            slots.forEach(slot => {
              if (!slot.occupied) {
                const select = html.find(`select[name="finger-${slot.index}"]`)[0];
                if (select && select.value) {
                  selections[slot.index] = select.value;
                }
              }
            });
            resolve(selections);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "imprint",
      close: () => resolve(null)
    }).render(true);
  });

  if (!selections || Object.keys(selections).length === 0) {
    ui.notifications.info("No spells selected for imprinting.");
    return;
  }

  // Step 1: Collect all spell data and validate scrolls BEFORE consuming anything
  const imprintsToMake = [];
  for (const [fingerIndex, scrollId] of Object.entries(selections)) {
    const scroll = actor.items.get(scrollId);
    if (!scroll) {
      console.warn(`Elysium | Scroll ${scrollId} not found, skipping`);
      continue;
    }

    // In D&D 5e v5.x, spell scrolls have all spell data embedded directly
    // Use the scroll item data as the spell data
    const spellData = scroll.toObject();

    // Get spell name (try DDB importer flag first, then extract from scroll name)
    const spellName = scroll.flags?.ddbimporter?.originalName ||
                      scroll.name.replace(/^Spell Scroll:\s*/i, '').trim();

    const fingerIdx = parseInt(fingerIndex);
    const fingerName = slots[fingerIdx].name;

    imprintsToMake.push({
      fingerIdx,
      fingerName,
      spellData,
      spellName,
      scroll,
      scrollName: scroll.name
    });
  }

  if (imprintsToMake.length === 0) {
    ui.notifications.warn("No valid scrolls found to imprint.");
    return;
  }

  // Step 2: Track stored spells locally to avoid flag caching issues
  let currentStoredSpells = getStoredSpells(aethersGrasp);

  // Step 3: Imprint all spells
  for (const imprint of imprintsToMake) {
    // Create stored spell object (same logic as imprintSpellOnFinger)
    const storedSpell = {
      id: foundry?.utils?.randomID?.() || `spell-${Date.now()}-${Math.random()}`,
      fingerIndex: imprint.fingerIdx,
      fingerName: imprint.fingerName,
      spellData: foundry?.utils?.duplicate?.(imprint.spellData) || JSON.parse(JSON.stringify(imprint.spellData)),
      imprintedAt: Date.now(),
      originalScrollName: imprint.scrollName
    };

    // Add to local tracking array
    currentStoredSpells.push(storedSpell);
  }

  // Step 4: Save all imprints at once
  await setStoredSpells(aethersGrasp, currentStoredSpells);

  // Step 5: Consume all scrolls and show notifications
  for (const imprint of imprintsToMake) {
    await consumeScroll(imprint.scroll);
    ui.notifications.info(`Imprinted ${imprint.spellName} on ${imprint.fingerName}!`);
  }

  console.log(`Elysium | Imprinted ${imprintsToMake.length} spell(s) on Aether's Grasp`);
}

/**
 * Handle Cast From Finger action
 */
async function handleCastFromFinger(actor, aethersGrasp) {
  const slots = getAvailableFingerSlots(aethersGrasp);
  const occupiedSlots = slots.filter(s => s.occupied);

  if (occupiedSlots.length === 0) {
    ui.notifications.warn("No spells stored in Aether's Grasp!");
    return;
  }

  // Build table HTML
  let tableRows = '';
  slots.forEach(slot => {
    const spellName = slot.occupied
      ? (slot.spell.spellData.flags?.ddbimporter?.originalName ||
         slot.spell.spellData.name.replace(/^Spell Scroll:\s*/i, '').trim())
      : '(Empty)';

    const castCell = slot.occupied
      ? `<td class="center">
          <button class="cast-button elysium-button-cast" data-finger-index="${slot.index}">Cast</button>
        </td>`
      : `<td class="center elysium-text-muted">-</td>`;

    tableRows += `
      <tr>
        <td><strong>${slot.name}</strong></td>
        <td>${spellName}</td>
        ${castCell}
      </tr>
    `;
  });

  // Show finger selection table
  const fingerIndex = await new Promise((resolve) => {
    new Dialog({
      title: "Cast Spell from Aether's Grasp",
      content: `
        <div class="elysium-dialog-content">
          <p class="elysium-dialog-text">
            Select which finger to cast from
          </p>
          <table class="elysium-table">
            <thead>
              <tr>
                <th>Finger</th>
                <th>Spell</th>
                <th class="center">Cast</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "cancel",
      close: () => resolve(null),
      render: (html) => {
        // Attach click handlers to cast buttons
        html.find('.cast-button').click((event) => {
          const index = parseInt(event.currentTarget.dataset.fingerIndex);
          resolve(index);
          // Close the dialog
          html.closest('.dialog').find('.dialog-button.cancel').click();
        });
      }
    }).render(true);
  });

  if (fingerIndex === null) return;

  // Get the stored spell
  const storedSpell = getStoredSpellByFinger(aethersGrasp, fingerIndex);
  if (!storedSpell) {
    ui.notifications.error("Spell not found!");
    return;
  }

  // Select aether fuel (shows dialog with toxicity warning)
  const aetherItem = await selectAetherFuel(actor);
  if (!aetherItem) return;  // User cancelled or no fuel available

  // Consume aether and get modifiers
  const result = await consumeAether(actor, aetherItem);
  if (!result || !result.consumed) {
    ui.notifications.error("Failed to consume aether!");
    return;
  }

  // Get quality modifiers
  const modifiers = getQualityModifiers(result.quality);

  // Cast the spell!
  const { tempSpell } = await castSpellFromFinger(actor, storedSpell, modifiers);

  // Check if spell has duration - if so, don't delete it immediately
  const duration = tempSpell.system.duration;
  const isInstant = !duration ||
                  duration.units === "inst" ||
                  duration.units === "instantaneous" ||
                  duration.value === 0;

  if (isInstant) {
    // Instant spells can be cleaned up quickly
    setTimeout(async () => {
      try {
        await tempSpell.delete();
        console.log("Elysium | Cleaned up instant spell");
      } catch (e) {
        // Already cleaned up
      }
    }, 2000);
  } else {
    // Duration spells - let them persist for their duration
    console.log(`Elysium | Spell ${tempSpell.name} has duration, will persist`);
    ui.notifications.info(`${storedSpell.spellData.name} will remain active for its duration`);
  }

  ui.notifications.info(`Cast ${storedSpell.spellData.name} from ${storedSpell.fingerName} using ${result.quality} aether!`);
}

/**
 * Handle Forget From Finger action
 */
async function handleForgetFromFinger(actor, aethersGrasp) {
  const slots = getAvailableFingerSlots(aethersGrasp);
  const occupiedSlots = slots.filter(s => s.occupied);

  if (occupiedSlots.length === 0) {
    ui.notifications.warn("No spells stored in Aether's Grasp to forget!");
    return;
  }

  // Build table HTML
  let tableRows = '';
  slots.forEach(slot => {
    const spellName = slot.occupied
      ? (slot.spell.spellData.flags?.ddbimporter?.originalName ||
         slot.spell.spellData.name.replace(/^Spell Scroll:\s*/i, '').trim())
      : '(Empty)';

    const forgetCell = slot.occupied
      ? `<td class="center">
          <input type="checkbox" name="forget-${slot.index}" class="forget-checkbox elysium-checkbox" data-finger-index="${slot.index}">
        </td>`
      : `<td class="center">
          <input type="checkbox" disabled>
        </td>`;

    tableRows += `
      <tr>
        <td><strong>${slot.name}</strong></td>
        <td>${spellName}</td>
        ${forgetCell}
      </tr>
    `;
  });

  // Show dialog
  const selectedFingers = await new Promise((resolve) => {
    new Dialog({
      title: "Forget Spells from Aether's Grasp",
      content: `
        <div class="elysium-dialog-content">
          <p class="elysium-dialog-text">
            Select which spells to forget
          </p>
          <table class="elysium-table">
            <thead>
              <tr>
                <th>Finger</th>
                <th>Spell</th>
                <th class="center">Forget</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `,
      buttons: {
        forget: {
          icon: '<i class="fas fa-eraser"></i>',
          label: "Forget Selected",
          callback: (html) => {
            const selected = [];
            html.find('.forget-checkbox:checked').each((i, checkbox) => {
              selected.push(parseInt(checkbox.dataset.fingerIndex));
            });
            resolve(selected);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "forget",
      close: () => resolve(null)
    }).render(true);
  });

  if (!selectedFingers || selectedFingers.length === 0) {
    ui.notifications.info("No spells selected to forget.");
    return;
  }

  // Step 1: Get current stored spells (avoid flag caching issues)
  let currentStoredSpells = getStoredSpells(aethersGrasp);

  // Step 2: Collect spells to remove and filter them out locally
  const removedSpells = [];
  for (const fingerIndex of selectedFingers) {
    const removedSpell = currentStoredSpells.find(s => s.fingerIndex === fingerIndex);
    if (removedSpell) {
      removedSpells.push(removedSpell);
    }
  }

  if (removedSpells.length === 0) {
    ui.notifications.warn("No valid spells found to forget.");
    return;
  }

  // Step 3: Filter out all selected spells at once
  const updatedSpells = currentStoredSpells.filter(
    spell => !selectedFingers.includes(spell.fingerIndex)
  );

  // Step 4: Save updated list once
  await setStoredSpells(aethersGrasp, updatedSpells);

  // Step 5: Show notifications
  for (const removedSpell of removedSpells) {
    const spellName = removedSpell.spellData.flags?.ddbimporter?.originalName ||
                      removedSpell.spellData.name.replace(/^Spell Scroll:\s*/i, '').trim();
    ui.notifications.info(`Forgot ${spellName} from ${removedSpell.fingerName}!`);
  }

  console.log(`Elysium | Forgot ${removedSpells.length} spell(s) from Aether's Grasp`);
}

/**
 * Hook: Long Rest Completed
 * Reset toxicity when a long rest completes
 */
Hooks.on('dnd5e.restCompleted', async (actor, restData) => {
  if (!restData.longRest) return;

  console.log(`Elysium | ${actor.name} completed a long rest`);

  const resetOccurred = await resetToxicityOnLongRest(actor);

  if (resetOccurred) {
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
            Their body purges the accumulated aether toxins.
          </p>
        </div>
      `
    });

    ui.notifications.info(`${actor.name} recovers from aether toxicity!`);
  }
});

/**
 * Hook: Activity Used (D&D 5e v5.x compatible)
 * Handle aether-powered items like Aether's Leap
 *
 * Uses postActivityConsumption to trigger after the activity is used
 * This hook fires AFTER the item's normal consumption (if any)
 */
Hooks.on('dnd5e.postActivityConsumption', async (activity, usageConfig, messageConfig, updates) => {
  const item = activity.item;
  const actor = item?.actor;

  console.log(`Elysium | postActivityConsumption fired for: ${item?.name}, activity: ${activity?.name}`);

  if (!actor) {
    console.log(`Elysium | No actor found, returning`);
    return;
  }

  // Check for Aether's Detection "Detect" activity by name
  if (item.getFlag('elysium', 'isAethersDetection') && activity.name === 'Detect') {
    console.log(`Elysium | Detected Detection roll activity: ${activity.name}`);
    await rollDetectionCheck(actor, item);
    return false; // Prevent default activity
  }

  // Check for Aether's Detection "Activate" activity by name
  if (item.getFlag('elysium', 'isAethersDetection') && activity.name?.includes('Activate')) {
    console.log(`Elysium | Detected Activate Detection activity: ${activity.name}`);
    await useAethersDetection(actor, item);
    return; // Activity handled
  }

  // Check if this is an Aether's Leap item
  if (item.getFlag('elysium', 'isAethersLeap')) {
    console.log(`Elysium | Detected Aether's Leap item: ${item.name}`);
    await useAethersLeap(actor, item);
  }
});

console.log('Elysium | Hooks registered');
