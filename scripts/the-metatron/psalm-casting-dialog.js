/**
 * Psalm of Casting Dialog
 * Custom dialog for casting stored spells from The Metatron
 *
 * Casting modes:
 * - Basic (aether only): Cast at level 1
 * - Enhanced (aether + 1st level spell slot):
 *   - Non-healing spells: Auto-upcast to level 2
 *   - Touch healing spells (Cure Wounds): Choose Extended Range | Upcast | Max Healing
 *   - Ranged healing spells (Healing Word): Choose Upcast | Max Healing
 */

import { showToxicityWarning } from "../aether-fuel/consumption.js";
import { getAetherQuality } from "../utils/flags.js";
import {
  isHealingSpell,
  isTouchSpell,
  getHealingEnhancementOptions,
} from "./metatron-cast.js";

/**
 * Show the Psalm of Casting dialog for a specific spell
 * @param {Object} options
 * @param {Actor} options.actor - The casting actor
 * @param {Object} options.storedSpell - The stored spell to cast
 * @param {number} options.spellSlots - Available 1st level spell slots
 * @param {number} options.maxSpellSlots - Maximum 1st level spell slots
 * @returns {Promise<{aetherFuel: Item, enhanced: boolean, healingEnhancement: string|null}|null>}
 */
export async function showPsalmCastingDialog(options) {
  const { actor, storedSpell, spellSlots, maxSpellSlots } = options;
  const spellData = storedSpell.spellData;
  const spellName = spellData.name;

  // Get available aether fuel
  const aetherFuel = actor.items.filter(
    (i) =>
      i.getFlag("elysium", "isAetherFuel") === true &&
      (i.system.quantity || 0) > 0,
  );

  if (aetherFuel.length === 0) {
    ui.notifications.warn("No aether fuel available!");
    return null;
  }

  // Determine what enhancement options are available for this spell
  const isHealing = isHealingSpell(spellData);
  const healingOptions = isHealing ? getHealingEnhancementOptions(spellData) : [];
  const hasSpellSlots = spellSlots > 0;

  // Build aether fuel selection HTML
  const fuelHtml = aetherFuel
    .map((fuel, index) => {
      const quantity = fuel.system?.quantity || 1;
      const img = fuel.img || "icons/svg/item-bag.svg";
      return `
        <label class="elysium-fuel-option">
          <input type="radio" name="aether-fuel" value="${fuel.id}" ${index === 0 ? "checked" : ""} class="elysium-checkbox">
          <img src="${img}" class="elysium-fuel-icon" alt="${fuel.name}">
          <div class="elysium-fuel-info">
            <div class="elysium-fuel-name">${fuel.name}</div>
            <div class="elysium-fuel-uses">${quantity} available</div>
          </div>
        </label>
      `;
    })
    .join("");

  // Build casting mode HTML
  let castingModeHtml = `
    <div class="elysium-info-box" style="margin-top: 16px; padding: 12px;">
      <h4 style="margin: 0 0 12px 0; color: var(--aether-text-main);">Casting Mode</h4>

      <label class="elysium-mode-option" style="display: flex; align-items: flex-start; margin-bottom: 12px; cursor: pointer;">
        <input type="radio" name="casting-mode" value="basic" checked style="margin-right: 12px; margin-top: 4px;">
        <div>
          <strong class="elysium-text-blue">Basic Cast</strong>
          <div class="elysium-text-muted" style="font-size: 0.85em;">
            Aether fuel only — Cast ${spellName} at 1st level
          </div>
        </div>
      </label>

      <label class="elysium-mode-option" style="display: flex; align-items: flex-start; cursor: ${hasSpellSlots ? "pointer" : "not-allowed"}; opacity: ${hasSpellSlots ? "1" : "0.5"};">
        <input type="radio" name="casting-mode" value="enhanced" ${hasSpellSlots ? "" : "disabled"} style="margin-right: 12px; margin-top: 4px;">
        <div>
          <strong style="color: ${hasSpellSlots ? "var(--aether-gold)" : "var(--aether-text-muted)"};">Enhanced Cast</strong>
          <div class="elysium-text-muted" style="font-size: 0.85em;">
            Aether + 1st level spell slot — ${isHealing ? "Choose enhancement below" : "Cast at 2nd level"}
          </div>
        </div>
      </label>

      <div style="margin-top: 8px; font-size: 0.85em;">
        <strong class="elysium-text-blue">Spell Slots (1st Level):</strong>
        <span class="${spellSlots > 0 ? "elysium-text-blue" : "elysium-text-orange"}" style="font-weight: bold; margin-left: 8px;">
          ${spellSlots} / ${maxSpellSlots}
        </span>
      </div>
    </div>
  `;

  // Build healing enhancement options HTML (only shown for healing spells when enhanced)
  let healingEnhancementHtml = "";
  if (isHealing && healingOptions.length > 0) {
    const optionsHtml = healingOptions
      .map((opt, index) => `
        <label class="elysium-enhancement-option" style="display: flex; align-items: flex-start; margin-bottom: 8px; cursor: pointer;">
          <input type="radio" name="healing-enhancement" value="${opt.id}" ${index === 0 ? "checked" : ""} style="margin-right: 12px; margin-top: 4px;">
          <div>
            <strong>${opt.label}</strong>
            <div class="elysium-text-muted" style="font-size: 0.85em;">${opt.description}</div>
          </div>
        </label>
      `)
      .join("");

    healingEnhancementHtml = `
      <div id="healing-enhancement-section" class="elysium-info-box" style="margin-top: 16px; padding: 12px; display: none;">
        <h4 style="margin: 0 0 12px 0; color: var(--aether-gold);">Choose Enhancement</h4>
        ${optionsHtml}
      </div>
    `;
  }

  // Full dialog content
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">
        Cast <strong class="elysium-text-blue">${spellName}</strong> from the <strong>${storedSpell.slotName}</strong> prayer slot
      </p>

      <!-- Aether Fuel Selection -->
      <h3 class="elysium-header" style="font-size: 0.9rem; margin: 12px 0 8px 0;">Select Aether Fuel</h3>
      ${fuelHtml}

      <!-- Casting Mode -->
      ${castingModeHtml}

      <!-- Healing Enhancement Options (hidden until enhanced mode selected) -->
      ${healingEnhancementHtml}
    </div>
  `;

  // Show dialog and wait for user input
  return new Promise((resolve) => {
    new Dialog({
      title: `Psalm of Casting: ${spellName}`,
      content: content,
      buttons: {
        cast: {
          icon: '<i class="fas fa-magic"></i>',
          label: "Cast Spell",
          callback: async (html) => {
            const selectedFuelId = html
              .find('input[name="aether-fuel"]:checked')
              .val();
            const castingMode = html
              .find('input[name="casting-mode"]:checked')
              .val();
            const enhanced = castingMode === "enhanced";

            let healingEnhancement = null;
            if (enhanced && isHealing) {
              healingEnhancement = html
                .find('input[name="healing-enhancement"]:checked')
                .val();
            }

            const selectedFuel = actor.items.get(selectedFuelId);

            // Check if unrefined aether - show toxicity warning
            const aetherQuality = getAetherQuality(selectedFuel);
            if (aetherQuality === "unrefined") {
              const proceed = await showToxicityWarning(actor);
              if (!proceed) {
                resolve(null);
                return;
              }
            }

            resolve({
              aetherFuel: selectedFuel,
              enhanced: enhanced,
              healingEnhancement: healingEnhancement,
            });
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: "cast",
      render: (html) => {
        // Toggle healing enhancement section visibility based on casting mode
        html.find('input[name="casting-mode"]').change((event) => {
          const isEnhanced = event.target.value === "enhanced";
          const healingSection = html.find("#healing-enhancement-section");
          if (healingSection.length) {
            healingSection.css("display", isEnhanced ? "block" : "none");
          }
        });
      },
    }).render(true);
  });
}
