/**
 * The Metatron - Dialog Helpers
 *
 * Reusable dialog components for The Metatron's actions.
 * Uses existing Elysium CSS classes and patterns.
 */

import { SLOT_NAMES, getAvailableSlots } from "../the-metatron/metatron-imprint.js";
import { getStoredSpells } from "../utils/flags.js";

/**
 * Show a dialog to select a spell from a list
 * @param {Array} spells - Array of spell objects
 * @param {string} title - Dialog title
 * @param {string} prompt - Prompt text
 * @returns {Promise<Object|null>} Selected spell or null
 */
export async function selectSpellDialog(spells, title, prompt) {
  if (spells.length === 0) {
    ui.notifications.warn("No spells available.");
    return null;
  }

  // Build spell options as table rows
  let spellRows = "";
  spells.forEach((spell) => {
    const img = spell.img || "icons/svg/mystery-man.svg";
    const school = spell.system?.school || "?";
    spellRows += `
      <tr class="elysium-spell-row" data-spell-id="${spell.id || spell._id}">
        <td class="center"><input type="radio" name="spell-select" value="${spell.id || spell._id}"></td>
        <td><img src="${img}" width="24" height="24" style="vertical-align: middle;"> ${spell.name}</td>
        <td class="center elysium-text-muted">${school}</td>
      </tr>
    `;
  });

  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">${prompt}</p>
      <table class="elysium-table">
        <thead>
          <tr>
            <th class="center" style="width: 40px;"></th>
            <th>Spell</th>
            <th class="center" style="width: 60px;">School</th>
          </tr>
        </thead>
        <tbody>
          ${spellRows}
        </tbody>
      </table>
    </div>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title,
      content,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "Select",
          callback: (html) => {
            const selected = html.find('input[name="spell-select"]:checked').val();
            if (!selected) {
              ui.notifications.warn("No spell selected.");
              resolve(null);
              return;
            }
            const spell = spells.find((s) => (s.id || s._id) === selected);
            resolve(spell);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      render: (html) => {
        // Make entire row clickable to select radio
        html.find(".elysium-spell-row").click((event) => {
          const radio = $(event.currentTarget).find('input[type="radio"]');
          radio.prop("checked", true);
        });
      },
      default: "select",
    }).render(true);
  });
}

/**
 * Show a dialog to select a prayer slot
 * @param {Item} metatron - The Metatron item
 * @param {boolean} emptyOnly - Only show empty slots
 * @param {string} title - Dialog title
 * @param {string} prompt - Prompt text
 * @returns {Promise<Object|null>} Selected slot {index, name, spell?} or null
 */
export async function selectSlotDialog(metatron, emptyOnly, title, prompt) {
  const slots = getAvailableSlots(metatron);
  const filteredSlots = emptyOnly ? slots.filter((s) => !s.occupied) : slots;

  if (filteredSlots.length === 0) {
    ui.notifications.warn(emptyOnly ? "No empty slots available." : "No slots available.");
    return null;
  }

  // Build slot options
  let slotRows = "";
  filteredSlots.forEach((slot) => {
    const spellName = slot.spell?.spellData?.name || "—";
    const statusClass = slot.occupied ? "elysium-text-orange" : "elysium-text-blue";
    const status = slot.occupied ? spellName : "Empty";

    slotRows += `
      <tr class="elysium-slot-row" data-slot-index="${slot.index}">
        <td class="center"><input type="radio" name="slot-select" value="${slot.index}"></td>
        <td><strong>${slot.name}</strong></td>
        <td class="center ${statusClass}">${status}</td>
      </tr>
    `;
  });

  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">${prompt}</p>
      <table class="elysium-table">
        <thead>
          <tr>
            <th class="center" style="width: 40px;"></th>
            <th>Slot</th>
            <th class="center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${slotRows}
        </tbody>
      </table>
    </div>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title,
      content,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "Select",
          callback: (html) => {
            const selected = html.find('input[name="slot-select"]:checked').val();
            if (selected === undefined) {
              ui.notifications.warn("No slot selected.");
              resolve(null);
              return;
            }
            const slot = filteredSlots.find((s) => s.index === parseInt(selected));
            resolve(slot);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      render: (html) => {
        html.find(".elysium-slot-row").click((event) => {
          const radio = $(event.currentTarget).find('input[type="radio"]');
          radio.prop("checked", true);
        });
      },
      default: "select",
    }).render(true);
  });
}

/**
 * Show a dialog to select a stored spell from The Metatron
 * @param {Item} metatron - The Metatron item
 * @param {string} title - Dialog title
 * @param {string} prompt - Prompt text
 * @returns {Promise<Object|null>} Selected stored spell or null
 */
export async function selectStoredSpellDialog(metatron, title, prompt) {
  const storedSpells = getStoredSpells(metatron);

  if (storedSpells.length === 0) {
    ui.notifications.warn("No spells stored in The Metatron.");
    return null;
  }

  // Build stored spell options
  let spellRows = "";
  storedSpells.forEach((stored) => {
    const spellName = stored.spellData?.name || "Unknown Spell";
    const slotName = stored.slotName || SLOT_NAMES[stored.slotIndex];
    const img = stored.spellData?.img || "icons/svg/mystery-man.svg";

    spellRows += `
      <tr class="elysium-stored-row" data-slot-index="${stored.slotIndex}">
        <td class="center"><input type="radio" name="stored-select" value="${stored.slotIndex}"></td>
        <td><strong>${slotName}</strong></td>
        <td><img src="${img}" width="24" height="24" style="vertical-align: middle;"> ${spellName}</td>
      </tr>
    `;
  });

  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">${prompt}</p>
      <table class="elysium-table">
        <thead>
          <tr>
            <th class="center" style="width: 40px;"></th>
            <th style="width: 120px;">Slot</th>
            <th>Spell</th>
          </tr>
        </thead>
        <tbody>
          ${spellRows}
        </tbody>
      </table>
    </div>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title,
      content,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "Select",
          callback: (html) => {
            const selected = html.find('input[name="stored-select"]:checked').val();
            if (selected === undefined) {
              ui.notifications.warn("No spell selected.");
              resolve(null);
              return;
            }
            const stored = storedSpells.find((s) => s.slotIndex === parseInt(selected));
            resolve(stored);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      render: (html) => {
        html.find(".elysium-stored-row").click((event) => {
          const radio = $(event.currentTarget).find('input[type="radio"]');
          radio.prop("checked", true);
        });
      },
      default: "select",
    }).render(true);
  });
}

/**
 * Show confirmation dialog for Healer's Gambit
 * @param {Actor} actor - The actor
 * @param {number} currentATL - Current ATL
 * @returns {Promise<boolean>} True if confirmed
 */
export async function confirmHealersGambit(actor, currentATL) {
  const newATL = currentATL + 1;
  const threshold = 2 + newATL * 2;

  const content = `
    <div class="elysium-dialog-content">
      <div class="elysium-info-box" style="border-color: var(--aether-orange);">
        <p><strong class="elysium-text-orange">⚠️ WARNING: Healer's Gambit is risky!</strong></p>
      </div>

      <p class="elysium-dialog-text">This will:</p>
      <ul style="margin-left: 20px; color: var(--aether-text-main);">
        <li>Increase your ATL to <strong class="elysium-text-orange">${newATL}</strong></li>
        <li>Roll d20 - failure on <strong class="elysium-text-orange">≤${threshold}</strong></li>
        <li>On failure: The Metatron goes <strong>dormant</strong></li>
        <li>Cast Mass Healing Word regardless</li>
      </ul>

      <p class="elysium-dialog-text" style="margin-top: 16px;">
        Current ATL: <strong>${currentATL}</strong> → New ATL: <strong class="elysium-text-orange">${newATL}</strong>
      </p>
    </div>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: "Healer's Gambit",
      content,
      buttons: {
        gambit: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "Take the Gambit",
          callback: () => resolve(true),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(false),
        },
      },
      default: "cancel",
    }).render(true);
  });
}
