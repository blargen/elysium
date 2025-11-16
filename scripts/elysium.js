/**
 * Elysium - Main Module Entry Point
 *
 * A FoundryVTT module featuring a cyberpunk-fantasy world powered by aether.
 */

import { resetToxicityOnLongRest, applyUnrefinedAetherUse } from './aether-fuel/toxicity.js';
import { rollConstitutionSave, showToxicityWarning } from './aether-fuel/consumption.js';
import { isAetherFuel, getModType, getAetherQuality, getDailyDoses } from './utils/flags.js';
import { calculateToxicityDC } from './utils/calculations.js';
import { findFirstLevelScrolls, canImprintMoreSpells, getAvailableFingerSlots, imprintSpellOnFinger, consumeScroll } from './aethers-grasp/imprint.js';
import { getStoredSpellByFinger, castSpellFromFinger } from './aethers-grasp/cast.js';
import { getAvailableAetherFuel, getQualityModifiers } from './aether-fuel/fuel-selection.js';
import { handleAetherFuelUse as consumeAether } from './aether-fuel/consumption.js';

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
  // Show action selection dialog
  const action = await new Promise((resolve) => {
    new Dialog({
      title: "Aether's Grasp",
      content: `
        <div style="text-align: center; color: #f0f8ff;">
          <p>What would you like to do with <strong>Aether's Grasp</strong>?</p>
        </div>
      `,
      buttons: {
        imprint: {
          icon: '<i class="fas fa-scroll"></i>',
          label: "Imprint From Scroll",
          callback: () => resolve('imprint')
        },
        cast: {
          icon: '<i class="fas fa-hand-sparkles"></i>',
          label: "Cast From Finger",
          callback: () => resolve('cast')
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "cast"
    }).render(true);
  });

  if (action === 'imprint') {
    await handleImprintFromScroll(actor, aethersGrasp);
  } else if (action === 'cast') {
    await handleCastFromFinger(actor, aethersGrasp);
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
      ? `<td style="padding: 8px;">${slot.spell.spellData.name}</td>`
      : `<td style="padding: 8px;">
          <select name="finger-${slot.index}" style="width: 100%;">
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
        <td style="padding: 8px;"><strong>${slot.name}</strong></td>
        ${spellCell}
        <td style="padding: 8px;">${statusText}</td>
      </tr>
    `;
  });

  // Show dialog
  const selections = await new Promise((resolve) => {
    new Dialog({
      title: "Imprint Spells from Scrolls",
      content: `
        <div style="color: #f0f8ff;">
          <p style="text-align: center; margin-bottom: 12px;">
            Select which scrolls to imprint on empty fingers
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #1175D0;">
                <th style="padding: 8px; text-align: left;">Finger</th>
                <th style="padding: 8px; text-align: left;">Spell</th>
                <th style="padding: 8px; text-align: left;">Status</th>
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

  // Process each selection
  let imprintedCount = 0;
  for (const [fingerIndex, scrollId] of Object.entries(selections)) {
    const scroll = actor.items.get(scrollId);
    if (!scroll) continue;

    // In D&D 5e v5.x, spell scrolls have all spell data embedded directly
    // Use the scroll item data as the spell data
    const spellData = scroll.toObject();

    // Get spell name (try DDB importer flag first, then extract from scroll name)
    const spellName = scroll.flags?.ddbimporter?.originalName ||
                      scroll.name.replace(/^Spell Scroll:\s*/i, '').trim();

    // Imprint the spell
    const fingerIdx = parseInt(fingerIndex);
    const fingerName = slots[fingerIdx].name;
    await imprintSpellOnFinger(aethersGrasp, fingerIdx, spellData, scroll.name);

    // Consume the scroll
    await consumeScroll(scroll);

    ui.notifications.info(`Imprinted ${spellName} on ${fingerName}!`);
    imprintedCount++;
  }

  if (imprintedCount > 0) {
    console.log(`Elysium | Imprinted ${imprintedCount} spell(s) on Aether's Grasp`);
  }
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
      ? `<td style="padding: 8px; text-align: center;">
          <button class="cast-button" data-finger-index="${slot.index}" style="
            padding: 4px 12px;
            background: linear-gradient(135deg, #1175D0, #0a4a8a);
            border: 1px solid #1175D0;
            border-radius: 4px;
            color: #f0f8ff;
            cursor: pointer;
          ">Cast</button>
        </td>`
      : `<td style="padding: 8px; text-align: center; color: #666;">-</td>`;

    tableRows += `
      <tr>
        <td style="padding: 8px;"><strong>${slot.name}</strong></td>
        <td style="padding: 8px;">${spellName}</td>
        ${castCell}
      </tr>
    `;
  });

  // Show finger selection table
  const fingerIndex = await new Promise((resolve) => {
    new Dialog({
      title: "Cast Spell from Aether's Grasp",
      content: `
        <div style="color: #f0f8ff;">
          <p style="text-align: center; margin-bottom: 12px;">
            Select which finger to cast from
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #1175D0;">
                <th style="padding: 8px; text-align: left;">Finger</th>
                <th style="padding: 8px; text-align: left;">Spell</th>
                <th style="padding: 8px; text-align: center;">Cast</th>
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

  // Get available aether fuel
  const aetherItems = getAvailableAetherFuel(actor);
  if (aetherItems.length === 0) {
    ui.notifications.error("No aether fuel available to power the spell!");
    return;
  }

  // Show aether selection
  const aetherId = await new Promise((resolve) => {
    const buttons = {};

    aetherItems.forEach(aether => {
      const quality = aether.getFlag('elysium', 'aetherQuality');
      buttons[aether.id] = {
        label: aether.name,
        callback: () => resolve(aether.id)
      };
    });

    buttons.cancel = {
      label: "Cancel",
      callback: () => resolve(null)
    };

    new Dialog({
      title: "Select Aether Fuel",
      content: `<div style="text-align: center; color: #f0f8ff;"><p>Choose which aether to consume:</p></div>`,
      buttons,
      default: "cancel"
    }).render(true);
  });

  if (!aetherId) return;

  const aetherItem = actor.items.get(aetherId);

  // Check if unrefined and show toxicity warning
  const quality = getAetherQuality(aetherItem);
  if (quality === 'unrefined') {
    const proceed = await showToxicityWarning(actor);
    if (!proceed) {
      ui.notifications.warn("Unrefined aether use cancelled.");
      return;
    }
  }

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

console.log('Elysium | Hooks registered');
