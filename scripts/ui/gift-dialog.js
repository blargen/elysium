/**
 * Gift of a Thousand Strikes Dialog
 * Shows ki points, aether fuel, and ability selection
 */

/**
 * Show the Gift of a Thousand Strikes activation dialog
 * @param {Actor} actor - The monk actor
 * @param {Item} item - The Gift of a Thousand Strikes item
 * @returns {Promise<Object|null>} Selected options or null if cancelled
 */
export async function showGiftDialog(actor, item) {
  // Get Monk's Focus item (D&D 5e 2024 rules)
  const monkFocus = actor.items.find((i) => i.name === "Monk's Focus");
  const focusPoints = monkFocus?.system?.uses?.value || 0;
  const maxFocus = monkFocus?.system?.uses?.max || 0;

  // Get available aether fuel
  const aetherFuel = actor.items.filter(
    (i) =>
      i.getFlag("elysium", "isAetherFuel") === true &&
      (i.system.uses?.value || 0) > 0,
  );

  if (aetherFuel.length === 0) {
    ui.notifications.warn("No aether fuel available!");
    return null;
  }

  // Get monk abilities from item flags
  const abilities = item.getFlag("elysium", "monkAbilities");

  // Build dialog HTML using Elysium CSS classes
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">
        Choose an ability and power mode for the <strong>Gift of a Thousand Strikes</strong>
      </p>

      <!-- Focus Points Display -->
      <div class="elysium-info-box" style="margin-bottom: 16px;">
        <p style="margin: 0;">
          <strong class="elysium-text-blue">Focus Points:</strong>
          <span class="${focusPoints > 0 ? "elysium-text-blue" : "elysium-text-orange"}" style="font-size: 1.2rem; font-weight: bold;">
            ${focusPoints} / ${maxFocus}
          </span>
        </p>
      </div>

      <!-- Aether Fuel Selection -->
      <h3 class="elysium-header" style="font-size: 0.9rem; margin: 12px 0 8px 0;">Select Aether Fuel</h3>
      ${aetherFuel
        .map(
          (fuel) => `
        <label class="elysium-fuel-option">
          <input type="radio" name="aether-fuel" value="${fuel.id}" ${fuel === aetherFuel[0] ? "checked" : ""} class="elysium-checkbox">
          <div class="elysium-fuel-info">
            <div class="elysium-fuel-name">${fuel.name}</div>
            <div class="elysium-fuel-uses">${fuel.system.uses.value} uses remaining</div>
          </div>
        </label>
      `,
        )
        .join("")}

      <!-- Ability Selection -->
      <h3 class="elysium-header" style="font-size: 0.9rem; margin: 16px 0 8px 0;">Select Monk Ability</h3>
      <table class="elysium-table">
        <thead>
          <tr>
            <th style="width: 40px;">Select</th>
            <th>Ability</th>
            <th>Effects</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(abilities)
            .map(
              ([key, data], index) => `
            <tr>
              <td class="center">
                <input type="radio" name="ability" value="${key}" ${index === 0 ? "checked" : ""} class="elysium-checkbox">
              </td>
              <td><strong>${data.label}</strong></td>
              <td>
                <div style="margin-bottom: 4px;">
                  <span class="elysium-text-muted" style="font-size: 0.85em;">Aether:</span> ${data.normalEffect}
                </div>
                <div>
                  <span class="elysium-text-blue" style="font-size: 0.85em;">Aether + Focus:</span> ${data.enhancedEffect}
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <!-- Mode Selection -->
      <h3 class="elysium-header" style="font-size: 0.9rem; margin: 16px 0 8px 0;">Select Power Mode</h3>
      <div class="elysium-info-box" style="padding: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; margin: 6px 0; cursor: pointer;">
          <input type="radio" name="mode" value="aether-only" checked class="elysium-checkbox">
          <div>
            <div style="font-weight: bold; color: var(--aether-text-main);">Aether Only</div>
            <div class="elysium-text-muted" style="font-size: 0.85em;">Costs: 1 aether (no focus)</div>
          </div>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; margin: 6px 0; cursor: ${focusPoints > 0 ? "pointer" : "not-allowed"};">
          <input type="radio" name="mode" value="aether-and-ki" ${focusPoints > 0 ? "" : "disabled"} class="elysium-checkbox">
          <div>
            <div style="font-weight: bold; color: ${focusPoints > 0 ? "var(--aether-blue)" : "var(--aether-text-muted)"};">
              Aether + Focus (Enhanced)
            </div>
            <div class="elysium-text-muted" style="font-size: 0.85em;">
              Costs: 1 aether + 1 focus ${focusPoints > 0 ? "" : "(NO FOCUS AVAILABLE)"}
            </div>
          </div>
        </label>
      </div>
    </div>
  `;

  // Show dialog and wait for user input
  return new Promise((resolve) => {
    new Dialog({
      title: "Gift of a Thousand Strikes",
      content: content,
      buttons: {
        activate: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "Activate",
          callback: (html) => {
            const selectedFuelId = html
              .find('input[name="aether-fuel"]:checked')
              .val();
            const selectedAbility = html
              .find('input[name="ability"]:checked')
              .val();
            const selectedMode = html.find('input[name="mode"]:checked').val();

            const selectedFuel = actor.items.get(selectedFuelId);

            resolve({
              mode: selectedMode,
              ability: selectedAbility,
              aetherFuel: selectedFuel,
            });
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: "activate",
    }).render(true);
  });
}
