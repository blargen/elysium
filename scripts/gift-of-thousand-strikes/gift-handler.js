/**
 * Gift of a Thousand Strikes - Handler
 * Orchestrates the multi-step workflow for using the Gift
 */

import { showFuelEnhancementDialog } from "../ui/fuel-enhancement-dialog.js";
import { getClassResourceForItem } from "../utils/class-resources.js";
import { useGiftOfThousandStrikes } from "./gift-logic.js";

/**
 * Handle Gift of a Thousand Strikes usage
 * WORKFLOW: 1) Validate (class/level/equipped/attuned), 2) Select fuel + enhancement,
 *           3) Select ability, 4) Confirm, 5) Execute and consume resources
 */
export async function handleGiftOfThousandStrikes(actor, item) {
  // Step 1: Validate class and level requirements FIRST
  if (!actor.classes?.monk) {
    ui.notifications.error("This modification requires the monk class");
    return;
  }

  const monkLevel = actor.classes.monk.system.levels;
  const requiredLevel = item.getFlag("elysium", "requiredLevel") || 3;

  if (monkLevel < requiredLevel) {
    ui.notifications.error(
      `This modification requires monk level ${requiredLevel} or higher`,
    );
    return;
  }

  // Check if item is equipped
  if (!item.system.equipped) {
    ui.notifications.error("This modification must be equipped to use");
    return;
  }

  // Check if item is attuned
  if (item.system.attunement === "required" && !item.system.attuned) {
    ui.notifications.error("This modification requires attunement");
    return;
  }

  // Step 2: Select fuel + enhancement mode FIRST
  const resource = getClassResourceForItem(actor, "ki-enhancement");
  const fuelSelection = await showFuelEnhancementDialog({
    actor,
    resourceName: resource.name,
    resourceValue: resource.value,
    resourceMax: resource.max,
    enhancementLabel: resource.label,
    enhancementCost: resource.cost,
  });

  if (!fuelSelection) {
    ui.notifications.info("Gift of a Thousand Strikes activation cancelled.");
    return;
  }

  // Step 3: Select monk ability (Flurry/Defense/Wind)
  const abilities = item.getFlag("elysium", "monkAbilities");
  const selectedAbility = await showAbilitySelectionDialog(abilities);

  if (!selectedAbility) {
    ui.notifications.info("Gift of a Thousand Strikes activation cancelled.");
    return;
  }

  // Step 4: Show confirmation dialog
  const abilityData = abilities[selectedAbility];
  const mode = fuelSelection.enhanced ? "aether-and-ki" : "aether-only";
  const modeText = fuelSelection.enhanced
    ? "Aether + Focus (Enhanced)"
    : "Aether Only";
  const effectDescription = fuelSelection.enhanced
    ? abilityData.enhancedEffect
    : abilityData.normalEffect;

  const confirmed = await new Promise((resolve) => {
    new Dialog({
      title: "Confirm Gift of a Thousand Strikes",
      content: `
        <div class="elysium-dialog-content">
          <p><strong>Ability:</strong> ${abilityData.label}</p>
          <p><strong>Mode:</strong> ${modeText}</p>
          <p><strong>Effect:</strong> ${effectDescription}</p>
          <hr>
          <p><strong>Resources to consume:</strong></p>
          <ul>
            <li>1x ${fuelSelection.aetherFuel.name}</li>
            ${fuelSelection.enhanced ? "<li>1x Focus Point</li>" : ""}
          </ul>
          <p style="margin-top: 12px;">Proceed with activation?</p>
        </div>
      `,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: () => resolve(true),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(false),
        },
      },
      default: "confirm",
      close: () => resolve(false),
    }).render(true);
  });

  if (!confirmed) {
    ui.notifications.info("Gift of a Thousand Strikes activation cancelled.");
    return;
  }

  // Step 5: Execute with selected ability, fuel, and mode
  const result = await useGiftOfThousandStrikes(actor, item, {
    ability: selectedAbility,
    aetherFuel: fuelSelection.aetherFuel,
    mode: mode,
  });

  if (!result.success) {
    ui.notifications.error(result.reason);
    return;
  }

  // Create chat message showing the result
  const abilityName = abilityData.label;
  const finalEffectDescription = result.enhanced
    ? abilityData.enhancedEffect
    : abilityData.normalEffect;
  const finalModeText = result.enhanced
    ? "Aether + Focus (Enhanced)"
    : "Aether Only (No Focus Cost!)";
  const quality = result.quality || "unknown";

  // Build bonus text
  let bonusText = "";
  if (result.enhanced && result.bonus) {
    if (result.bonus === "ac-bonus-2") {
      bonusText =
        '<p class="elysium-bonus-text">✨ Enhanced Bonus: +2 AC until start of next turn</p>';
    } else if (result.bonus === "triple-jump") {
      bonusText =
        '<p class="elysium-bonus-text">✨ Enhanced Bonus: Jump distance tripled</p>';
    } else if (result.bonus === "extra-strike") {
      bonusText =
        '<p class="elysium-bonus-text">✨ Enhanced Bonus: Make 3 unarmed strikes instead of 2</p>';
    }
  }

  // Build automation status
  const autoText = result.abilityTriggered
    ? '<p class="elysium-auto-success">✓ Ability auto-triggered</p>'
    : '<p class="elysium-auto-manual">⚠ Manual activation required</p>';

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="aether-message aether-message-success">
        <h3>⚡ GIFT OF A THOUSAND STRIKES ⚡</h3>
        <p><strong>${actor.name}</strong> activates the Gift!</p>
        <p style="margin-top: 8px;">
          <strong class="elysium-text-orange">Ability:</strong> ${abilityName}
        </p>
        <p>
          <strong class="elysium-text-blue">Mode:</strong> ${finalModeText}
        </p>
        <p style="font-size: 0.9em; color: #9bb8d3; margin-top: 8px;">
          ${finalEffectDescription}
        </p>
        ${bonusText}
        ${autoText}
        <p style="font-size: 0.8em; color: #9bb8d3; margin-top: 8px;">
          Powered by <em>${quality}</em> aether
        </p>
      </div>
    `,
  });

  ui.notifications.info(
    `Activated ${abilityName} using Gift of a Thousand Strikes!`,
  );
}

/**
 * Show ability selection dialog (Flurry/Defense/Wind)
 * @param {Object} abilities - The monk abilities from item flags
 * @returns {Promise<string|null>} Selected ability key or null if cancelled
 */
async function showAbilitySelectionDialog(abilities) {
  // Build table HTML
  let tableRows = "";
  Object.entries(abilities).forEach(([key, data]) => {
    tableRows += `
      <tr>
        <td><strong>${data.label}</strong></td>
        <td>
          <div style="font-size: 0.85em; margin-bottom: 4px;">
            <span class="elysium-text-muted">Aether:</span> ${data.normalEffect}
          </div>
          <div style="font-size: 0.85em;">
            <span class="elysium-text-blue">Aether + Focus:</span> ${data.enhancedEffect}
          </div>
        </td>
        <td class="center">
          <button class="elysium-button-cast" data-ability="${key}">Select</button>
        </td>
      </tr>
    `;
  });

  return new Promise((resolve) => {
    new Dialog({
      title: "Gift of a Thousand Strikes",
      content: `
        <div class="elysium-dialog-content">
          <p class="elysium-dialog-text">Select which monk ability to use</p>
          <table class="elysium-table">
            <thead>
              <tr>
                <th>Ability</th>
                <th>Effects</th>
                <th class="center">Select</th>
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
        // Attach click handlers to select buttons
        html.find(".elysium-button-cast").click((event) => {
          const ability = event.currentTarget.dataset.ability;
          resolve(ability);
          // Close the dialog
          html.closest(".dialog").find(".dialog-button.cancel").click();
        });
      },
    }).render(true);
  });
}
