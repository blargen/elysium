/**
 * Aether's Grasp - Handler
 * Orchestrates all Aether's Grasp UI workflows (imprint, cast, forget)
 */

import {
  findFirstLevelScrolls,
  getAvailableFingerSlots,
  consumeScroll,
} from "./imprint.js";
import { getStoredSpellByFinger, castSpellFromFinger } from "./cast.js";
import { getStoredSpells, setStoredSpells } from "../utils/flags.js";
import { getQualityModifiers } from "../aether-fuel/fuel-selection.js";
import { handleAetherFuelUse as consumeAether } from "../aether-fuel/consumption.js";
import { selectAetherFuel } from "../utils/fuel-selection-dialog.js";
import { showFuelEnhancementDialog } from "../ui/fuel-enhancement-dialog.js";
import { getClassResourceForItem } from "../utils/class-resources.js";

/**
 * Handle Aether's Grasp usage - show action selection dialog
 */
export async function handleAethersGraspUse(actor, aethersGrasp) {
  // Step 1: Validate class and level requirements FIRST
  if (!actor.classes?.wizard) {
    ui.notifications.error("This modification requires the wizard class");
    return;
  }

  const wizardLevel = actor.classes.wizard.system.levels;
  const requiredLevel = aethersGrasp.getFlag("elysium", "requiredLevel") || 3;

  if (wizardLevel < requiredLevel) {
    ui.notifications.error(
      `This modification requires wizard level ${requiredLevel} or higher`,
    );
    return;
  }

  // Check if item is equipped
  if (!aethersGrasp.system.equipped) {
    ui.notifications.error("This modification must be equipped to use");
    return;
  }

  // Check if item is attuned
  if (
    aethersGrasp.system.attunement === "required" &&
    !aethersGrasp.system.attuned
  ) {
    ui.notifications.error("This modification requires attunement");
    return;
  }

  // Step 2: Build action option cards
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
          callback: () => resolve(null),
        },
      },
      render: (html) => {
        html.find(".elysium-action-option").click((event) => {
          const actionType = event.currentTarget.dataset.action;
          resolve(actionType);
          html.closest(".dialog").find(".dialog-button.cancel").click();
        });
      },
      default: "cancel",
    }).render(true);
  });

  // Step 3: Execute selected action
  if (action === "imprint") {
    await handleImprintFromScroll(actor, aethersGrasp);
  } else if (action === "cast") {
    await handleCastFromFinger(actor, aethersGrasp);
  } else if (action === "forget") {
    await handleForgetFromFinger(actor, aethersGrasp);
  }
}

/**
 * Handle Imprint From Scroll action
 */
async function handleImprintFromScroll(actor, aethersGrasp) {
  // Find available spell scrolls (DM controls what scrolls players have)
  const scrolls = findFirstLevelScrolls(actor);
  if (scrolls.length === 0) {
    ui.notifications.warn("You have no spell scrolls to imprint!");
    return;
  }

  // Get finger slots
  const slots = getAvailableFingerSlots(aethersGrasp);

  // Build table HTML
  let tableRows = "";
  slots.forEach((slot) => {
    const statusText = slot.occupied ? "Occupied" : "Empty";
    const spellCell = slot.occupied
      ? `<td>${slot.spell.spellData.name}</td>`
      : `<td>
          <select name="finger-${slot.index}" class="elysium-select" style="width: 100%;">
            <option value="">-- Select Spell --</option>
            ${scrolls
              .map((scroll) => {
                // Extract spell name from scroll (remove "Scroll of " prefix)
                const spellName = scroll.name
                  .replace(/^Scroll of /i, "")
                  .trim();
                return `<option value="${scroll.id}">${spellName}</option>`;
              })
              .join("")}
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
            slots.forEach((slot) => {
              if (!slot.occupied) {
                const select = html.find(
                  `select[name="finger-${slot.index}"]`,
                )[0];
                if (select && select.value) {
                  selections[slot.index] = select.value;
                }
              }
            });
            resolve(selections);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: "imprint",
      close: () => resolve(null),
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
    const spellName =
      scroll.flags?.ddbimporter?.originalName ||
      scroll.name.replace(/^Spell Scroll:\s*/i, "").trim();

    const fingerIdx = parseInt(fingerIndex);
    const fingerName = slots[fingerIdx].name;

    imprintsToMake.push({
      fingerIdx,
      fingerName,
      spellData,
      spellName,
      scroll,
      scrollName: scroll.name,
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
      id:
        foundry?.utils?.randomID?.() || `spell-${Date.now()}-${Math.random()}`,
      fingerIndex: imprint.fingerIdx,
      fingerName: imprint.fingerName,
      spellData:
        foundry?.utils?.duplicate?.(imprint.spellData) ||
        JSON.parse(JSON.stringify(imprint.spellData)),
      imprintedAt: Date.now(),
      originalScrollName: imprint.scrollName,
    };

    // Add to local tracking array
    currentStoredSpells.push(storedSpell);
  }

  // Step 4: Save all imprints at once
  await setStoredSpells(aethersGrasp, currentStoredSpells);

  // Step 5: Consume all scrolls and show notifications
  for (const imprint of imprintsToMake) {
    await consumeScroll(imprint.scroll);
    ui.notifications.info(
      `Imprinted ${imprint.spellName} on ${imprint.fingerName}!`,
    );
  }

  console.log(
    `Elysium | Imprinted ${imprintsToMake.length} spell(s) on Aether's Grasp`,
  );
}

/**
 * Handle Cast From Finger action
 */
async function handleCastFromFinger(actor, aethersGrasp) {
  const slots = getAvailableFingerSlots(aethersGrasp);
  const occupiedSlots = slots.filter((s) => s.occupied);

  if (occupiedSlots.length === 0) {
    ui.notifications.warn("No spells stored in Aether's Grasp!");
    return;
  }

  // Build table HTML
  let tableRows = "";
  slots.forEach((slot) => {
    const spellName = slot.occupied
      ? slot.spell.spellData.flags?.ddbimporter?.originalName ||
        slot.spell.spellData.name.replace(/^Spell Scroll:\s*/i, "").trim()
      : "(Empty)";

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
          callback: () => resolve(null),
        },
      },
      default: "cancel",
      close: () => resolve(null),
      render: (html) => {
        // Attach click handlers to cast buttons
        html.find(".cast-button").click((event) => {
          const index = parseInt(event.currentTarget.dataset.fingerIndex);
          resolve(index);
          // Close the dialog
          html.closest(".dialog").find(".dialog-button.cancel").click();
        });
      },
    }).render(true);
  });

  if (fingerIndex === null) return;

  // Get the stored spell
  const storedSpell = getStoredSpellByFinger(aethersGrasp, fingerIndex);
  if (!storedSpell) {
    ui.notifications.error("Spell not found!");
    return;
  }

  // Select fuel + enhancement mode (wizard uses spell slots for upcasting)
  const resource = getClassResourceForItem(actor, "spell-storage");
  const fuelSelection = await showFuelEnhancementDialog({
    actor,
    resourceName: resource.name,
    resourceValue: resource.value,
    resourceMax: resource.max,
    enhancementLabel: resource.label,
    enhancementCost: resource.cost,
  });

  if (!fuelSelection) {
    ui.notifications.info("Spell casting cancelled.");
    return;
  }

  // Get quality modifiers (don't consume yet!)
  const quality = fuelSelection.aetherFuel.getFlag("elysium", "aetherQuality");
  const modifiers = getQualityModifiers(quality);
  modifiers.enhanced = fuelSelection.enhanced;

  // Cast the spell! (This will consume aether + spell slot AFTER user confirms)
  const { tempSpell } = await castSpellFromFinger(
    actor,
    storedSpell,
    modifiers,
    fuelSelection.aetherFuel,
  );

  // Check if spell has duration - if so, don't delete it immediately
  const duration = tempSpell.system.duration;
  const isInstant =
    !duration ||
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
    ui.notifications.info(
      `${storedSpell.spellData.name} will remain active for its duration`,
    );
  }
}

/**
 * Handle Forget From Finger action
 */
async function handleForgetFromFinger(actor, aethersGrasp) {
  const slots = getAvailableFingerSlots(aethersGrasp);
  const occupiedSlots = slots.filter((s) => s.occupied);

  if (occupiedSlots.length === 0) {
    ui.notifications.warn("No spells stored in Aether's Grasp to forget!");
    return;
  }

  // Build table HTML
  let tableRows = "";
  slots.forEach((slot) => {
    const spellName = slot.occupied
      ? slot.spell.spellData.flags?.ddbimporter?.originalName ||
        slot.spell.spellData.name.replace(/^Spell Scroll:\s*/i, "").trim()
      : "(Empty)";

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
            html.find(".forget-checkbox:checked").each((i, checkbox) => {
              selected.push(parseInt(checkbox.dataset.fingerIndex));
            });
            resolve(selected);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: "forget",
      close: () => resolve(null),
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
    const removedSpell = currentStoredSpells.find(
      (s) => s.fingerIndex === fingerIndex,
    );
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
    (spell) => !selectedFingers.includes(spell.fingerIndex),
  );

  // Step 4: Save updated list once
  await setStoredSpells(aethersGrasp, updatedSpells);

  // Step 5: Show notifications
  for (const removedSpell of removedSpells) {
    const spellName =
      removedSpell.spellData.flags?.ddbimporter?.originalName ||
      removedSpell.spellData.name.replace(/^Spell Scroll:\s*/i, "").trim();
    ui.notifications.info(
      `Forgot ${spellName} from ${removedSpell.fingerName}!`,
    );
  }

  console.log(
    `Elysium | Forgot ${removedSpells.length} spell(s) from Aether's Grasp`,
  );
}
