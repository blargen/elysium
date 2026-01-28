/**
 * The Metatron Handler
 * Main entry point for The Metatron item interactions
 *
 * Handles validation and routes to appropriate action handlers:
 * - Prayer of Creation (imprint spells from Cleric spell list)
 * - Psalm of Casting (cast stored spells with aether)
 * - Meditation of Forgetfulness (forget stored spells)
 * - Healer's Gambit (risky Mass Healing Word)
 */

import { canImprintMoreSpells, getAvailableSlots } from "./metatron-imprint.js";
import { clearSpellFromSlot } from "./metatron-forget.js";
import { executeHealersGambit } from "./metatron-gambit.js";
import { castSpellFromSlot } from "./metatron-cast.js";
import { getStoredSpells, setStoredSpells } from "../utils/flags.js";
import { showPsalmCastingDialog } from "./psalm-casting-dialog.js";
import { getQualityModifiers } from "../aether-fuel/fuel-selection.js";
import {
  selectStoredSpellDialog,
  confirmHealersGambit,
} from "../ui/metatron-dialogs.js";

/**
 * Handle The Metatron item use - show action selection dialog
 * @param {Actor} actor - The actor using the item
 * @param {Item} item - The Metatron item
 */
export async function handleMetatronUse(actor, item) {
  // Step 1: Check if The Metatron is disabled (from failed Healer's Gambit)
  if (item.getFlag("elysium", "disabled")) {
    ui.notifications.error(
      "The Metatron is dormant and cannot be used until you complete a long rest",
    );
    return;
  }

  // Step 2: Validate class requirement
  if (!actor.classes?.cleric) {
    ui.notifications.error("This modification requires the cleric class");
    return;
  }

  // Step 3: Validate level requirement
  const clericLevel = actor.classes.cleric.system.levels;
  const requiredLevel = item.getFlag("elysium", "requiredLevel") || 3;

  if (clericLevel < requiredLevel) {
    ui.notifications.error(
      `This modification requires cleric level ${requiredLevel} or higher`,
    );
    return;
  }

  // Step 4: Check if item is equipped
  if (!item.system.equipped) {
    ui.notifications.error("This modification must be equipped to use");
    return;
  }

  // Step 5: Check if item is attuned (if required)
  if (item.system.attunement === "required" && !item.system.attuned) {
    ui.notifications.error("This modification requires attunement");
    return;
  }

  // Step 6: Build action option cards
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">What would you like to do with <strong>The Metatron</strong>?</p>

      <div class="elysium-action-option" data-action="imprint">
        <img src="modules/elysium/assets/icons/MetatronImprint.png" class="elysium-action-icon" alt="Prayer">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Prayer of Creation</div>
          <div class="elysium-action-desc">Imprint a 1st level Cleric spell</div>
        </div>
      </div>

      <div class="elysium-action-option" data-action="cast">
        <img src="modules/elysium/assets/icons/TheMetatron.png" class="elysium-action-icon" alt="Psalm">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Psalm of Casting</div>
          <div class="elysium-action-desc">Cast a stored spell using aether fuel</div>
        </div>
      </div>

      <div class="elysium-action-option" data-action="forget">
        <img src="modules/elysium/assets/icons/MetatronForgetSpell.png" class="elysium-action-icon" alt="Meditation">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Meditation of Forgetfulness</div>
          <div class="elysium-action-desc">Remove a stored spell</div>
        </div>
      </div>

      <div class="elysium-action-option" data-action="gambit">
        <img src="modules/elysium/assets/icons/TheMetatron.png" class="elysium-action-icon" alt="Gambit">
        <div class="elysium-action-info">
          <div class="elysium-action-name">Healer's Gambit</div>
          <div class="elysium-action-desc">Cast Mass Healing Word (risky!)</div>
        </div>
      </div>
    </div>
  `;

  // Show action selection dialog
  const action = await new Promise((resolve) => {
    new Dialog({
      title: "The Metatron",
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

  // Step 7: Execute selected action
  if (action === "imprint") {
    await handlePrayerOfCreation(actor, item);
  } else if (action === "cast") {
    await handlePsalmOfCasting(actor, item);
  } else if (action === "forget") {
    await handleMeditationOfForgetfulness(actor, item);
  } else if (action === "gambit") {
    await handleHealersGambitAction(actor, item);
  }
}

/**
 * Prayer of Creation - Imprint a spell onto The Metatron
 */
// Official 1st level Cleric spells from the PHB
export const FIRST_LEVEL_CLERIC_SPELLS = [
  "Bane",
  "Bless",
  "Command",
  "Create or Destroy Water",
  "Cure Wounds",
  "Detect Evil and Good",
  "Detect Magic",
  "Detect Poison and Disease",
  "Guiding Bolt",
  "Healing Word",
  "Inflict Wounds",
  "Protection from Evil and Good",
  "Purify Food and Drink",
  "Sanctuary",
  "Shield of Faith",
];

async function handlePrayerOfCreation(actor, item) {
  // Check if we can imprint more spells
  if (!canImprintMoreSpells(item)) {
    ui.notifications.warn("All prayer slots are full. Use Meditation of Forgetfulness to clear a slot.");
    return;
  }

  // Get spells from compendium
  const spellsPack = game.packs.get("dnd5e.spells");
  if (!spellsPack) {
    ui.notifications.error("Could not find spell compendium.");
    return;
  }

  const allSpells = await spellsPack.getDocuments();
  const clericSpells = allSpells
    .filter((spell) => FIRST_LEVEL_CLERIC_SPELLS.includes(spell.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (clericSpells.length === 0) {
    ui.notifications.error("No valid cleric spells found.");
    return;
  }

  // Get prayer slots
  const slots = getAvailableSlots(item);

  // Build table HTML with dropdowns for empty slots
  let tableRows = "";
  slots.forEach((slot) => {
    const spellCell = slot.occupied
      ? `<td>${slot.spell.spellData.name}</td>`
      : `<td>
          <select name="slot-${slot.index}" class="elysium-select" style="width: 100%;">
            <option value="">-- Select Prayer --</option>
            ${clericSpells.map((spell) => `<option value="${spell.id}">${spell.name}</option>`).join("")}
          </select>
        </td>`;

    const statusClass = slot.occupied ? "elysium-text-orange" : "elysium-text-blue";
    const statusText = slot.occupied ? "Occupied" : "Empty";

    tableRows += `
      <tr>
        <td><strong>${slot.name}</strong></td>
        ${spellCell}
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  });

  // Show dialog with table
  const selections = await new Promise((resolve) => {
    new Dialog({
      title: "Prayer of Creation",
      content: `
        <div class="elysium-dialog-content">
          <p class="elysium-dialog-text">
            Select 1st level Cleric spells to imprint on empty prayer slots:
          </p>
          <table class="elysium-table">
            <thead>
              <tr>
                <th>Prayer Slot</th>
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
          icon: '<i class="fas fa-pray"></i>',
          label: "Imprint Selected",
          callback: (html) => {
            const selections = {};
            slots.forEach((slot) => {
              if (!slot.occupied) {
                const select = html.find(`select[name="slot-${slot.index}"]`)[0];
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

  // Collect spell data for all selections
  const imprintsToMake = [];
  for (const [slotIndex, spellId] of Object.entries(selections)) {
    const spell = clericSpells.find((s) => s.id === spellId);
    if (!spell) continue;

    const slotIdx = parseInt(slotIndex);
    const slotName = slots[slotIdx].name;

    imprintsToMake.push({
      slotIdx,
      slotName,
      spellData: spell.toObject(),
      spellName: spell.name,
    });
  }

  if (imprintsToMake.length === 0) {
    ui.notifications.warn("No valid spells found to imprint.");
    return;
  }

  // Track stored spells locally to avoid flag caching issues
  let currentStoredSpells = getStoredSpells(item);

  // Imprint all spells
  for (const imprint of imprintsToMake) {
    const storedSpell = {
      id: foundry?.utils?.randomID?.() || `spell-${Date.now()}-${Math.random()}`,
      slotIndex: imprint.slotIdx,
      slotName: imprint.slotName,
      spellData: foundry?.utils?.duplicate?.(imprint.spellData) || JSON.parse(JSON.stringify(imprint.spellData)),
      imprintedAt: Date.now(),
    };
    currentStoredSpells.push(storedSpell);
  }

  // Save all imprints at once
  await setStoredSpells(item, currentStoredSpells);

  // Announce
  const spellList = imprintsToMake.map((i) => `<strong>${i.spellName}</strong> → ${i.slotName}`).join("<br>");
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="aether-message aether-message-success">
        <h3>Prayer of Creation</h3>
        <p><strong>${actor.name}</strong> imprints prayers into The Metatron:</p>
        <p>${spellList}</p>
      </div>
    `,
  });

  ui.notifications.info(`Imprinted ${imprintsToMake.length} spell(s) on The Metatron!`);
}

/**
 * Psalm of Casting - Cast a stored spell using aether
 */
async function handlePsalmOfCasting(actor, item) {
  const storedSpells = getStoredSpells(item);
  if (storedSpells.length === 0) {
    ui.notifications.warn("No spells stored in The Metatron.");
    return;
  }

  // Build table HTML with Cast buttons
  const slots = getAvailableSlots(item);
  let tableRows = "";
  slots.forEach((slot) => {
    const spellName = slot.occupied ? slot.spell.spellData.name : "(Empty)";

    const castCell = slot.occupied
      ? `<td class="center">
          <button class="cast-button elysium-button-cast" data-slot-index="${slot.index}">Cast</button>
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

  // Show slot selection table
  const slotIndex = await new Promise((resolve) => {
    new Dialog({
      title: "Psalm of Casting",
      content: `
        <div class="elysium-dialog-content">
          <p class="elysium-dialog-text">
            Select which prayer to cast:
          </p>
          <table class="elysium-table">
            <thead>
              <tr>
                <th>Prayer Slot</th>
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
        html.find(".cast-button").click((event) => {
          const index = parseInt(event.currentTarget.dataset.slotIndex);
          resolve(index);
          html.closest(".dialog").find(".dialog-button.cancel").click();
        });
      },
    }).render(true);
  });

  if (slotIndex === null) return;

  // Get the stored spell
  const storedSpell = storedSpells.find((s) => s.slotIndex === slotIndex);
  if (!storedSpell) {
    ui.notifications.error("Spell not found!");
    return;
  }

  // Get spell slot info for the dialog
  const spellSlots = actor.system?.spells?.spell1?.value || 0;
  const maxSpellSlots = actor.system?.spells?.spell1?.max || 0;

  // Show the Psalm of Casting dialog with spell-specific options
  const castingSelection = await showPsalmCastingDialog({
    actor,
    storedSpell,
    spellSlots,
    maxSpellSlots,
  });

  if (!castingSelection) {
    ui.notifications.info("Spell casting cancelled.");
    return;
  }

  // Get quality modifiers from selected fuel
  const quality = castingSelection.aetherFuel.getFlag("elysium", "aetherQuality");
  const modifiers = getQualityModifiers(quality);
  modifiers.enhanced = castingSelection.enhanced;
  modifiers.healingEnhancement = castingSelection.healingEnhancement;

  // Cast the spell (consumes resources AFTER user confirms in casting dialog)
  const { tempSpell, castResult } = await castSpellFromSlot(
    actor,
    storedSpell,
    modifiers,
    castingSelection.aetherFuel,
  );

  // Clean up temporary spell if instant, otherwise let it persist
  if (castResult) {
    const duration = tempSpell.system.duration;
    const isInstant =
      !duration ||
      duration.units === "inst" ||
      duration.units === "instantaneous" ||
      duration.value === 0;

    if (isInstant) {
      setTimeout(async () => {
        try {
          await tempSpell.delete();
        } catch (e) {
          // Already cleaned up
        }
      }, 2000);
    }
  }
}

/**
 * Meditation of Forgetfulness - Clear a stored spell
 */
async function handleMeditationOfForgetfulness(actor, item) {
  const storedSpells = getStoredSpells(item);
  if (storedSpells.length === 0) {
    ui.notifications.warn("No spells stored in The Metatron.");
    return;
  }

  // Select stored spell to forget
  const selectedStored = await selectStoredSpellDialog(
    item,
    "Meditation of Forgetfulness",
    "Choose a spell to forget:",
  );
  if (!selectedStored) return;

  const spellName = selectedStored.spellData?.name || "Unknown Spell";
  const slotName = selectedStored.slotName;

  // Clear the slot
  await clearSpellFromSlot(item, selectedStored.slotIndex);

  // Announce
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="aether-message aether-message-success">
        <h3>Meditation of Forgetfulness</h3>
        <p><strong>${actor.name}</strong> releases <strong>${spellName}</strong> from the <strong>${slotName}</strong> slot. The prayer fades from The Metatron.</p>
      </div>
    `,
  });
}

/**
 * Healer's Gambit - Risky Mass Healing Word
 */
async function handleHealersGambitAction(actor, item) {
  const currentATL = actor.getFlag("elysium", "atl") || 0;

  // Show confirmation dialog
  const confirmed = await confirmHealersGambit(actor, currentATL);
  if (!confirmed) return;

  // Execute the gambit
  const result = await executeHealersGambit(actor, item);

  // Announce result
  if (result.success) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="aether-message aether-message-success">
          <h3>Healer's Gambit - Success!</h3>
          <p><strong>${actor.name}</strong> rolled <strong>${result.roll}</strong> (needed >${result.threshold}).</p>
          <p>The divine power flows through The Metatron!</p>
          <p class="elysium-text-muted">ATL increased to ${result.newATL}</p>
        </div>
      `,
    });
  } else {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="aether-message aether-message-toxicity">
          <h3>Healer's Gambit - Failed!</h3>
          <p><strong>${actor.name}</strong> rolled <strong>${result.roll}</strong> (needed >${result.threshold}).</p>
          <p>The connection shatters! <strong>The Metatron goes dormant</strong> until a long rest.</p>
          <p class="elysium-text-muted">ATL increased to ${result.newATL}</p>
        </div>
      `,
    });
  }
}
