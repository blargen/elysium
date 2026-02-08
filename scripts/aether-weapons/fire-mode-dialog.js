/**
 * Fire Mode Selection Dialog
 *
 * Shows a dialog for choosing between normal fire and overclock modes.
 * Uses card-based selection like other Elysium dialogs.
 */

/**
 * Show fire mode selection dialog
 * @param {Object} weapon - The weapon item
 * @param {Object} actor - The actor using the weapon
 * @returns {Promise<string|null>} Selected mode ("normal" or "overclock") or null if cancelled
 */
export async function showFireModeDialog(weapon, actor) {
  // Get weapon damage values (required flags!)
  const normalDamage = weapon.getFlag("elysium", "normalDamage");
  const overclockDamage = weapon.getFlag("elysium", "overclockDamage");

  if (!normalDamage) {
    console.error(`Elysium | ${weapon.name} missing normalDamage flag!`);
    ui.notifications.error(`${weapon.name} is misconfigured (missing normalDamage flag)`);
    return null;
  }

  if (!overclockDamage) {
    console.error(`Elysium | ${weapon.name} missing overclockDamage flag!`);
    ui.notifications.error(`${weapon.name} is misconfigured (missing overclockDamage flag)`);
    return null;
  }

  // Get actor DEX modifier for display
  const dexMod = actor.system.abilities?.dex?.mod || 0;
  const dexModStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

  // Get toxicity info for overclock warning
  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const nextDC = 10 + 2 * (dailyDoses + 1);

  // Get weapon name for dynamic description
  const weaponName = weapon.name || "The Elysium Defender";

  // Build fire mode cards
  const fireCard = `
    <div class="elysium-action-option" data-mode="normal">
      <img src="${weapon.img}" class="elysium-action-icon" alt="Fire">
      <div class="elysium-action-info">
        <div class="elysium-action-name">Fire</div>
        <div class="elysium-action-desc">Weapon Damage: ${normalDamage} ${dexModStr} DEX force damage</div>
        <div class="elysium-action-metadata">Fire ${weaponName} in standard configuration.</div>
      </div>
    </div>
  `;

  const overclockCard = `
    <div class="elysium-action-option elysium-overclock-card" data-mode="overclock">
      <img src="modules/elysium/assets/icons/ElysiumDefenderOverloadFinal.png" class="elysium-action-icon" alt="Overclock">
      <div class="elysium-action-info">
        <div class="elysium-action-name elysium-overclock-name">⚡ OVERCLOCK</div>
        <div class="elysium-action-desc">Overclock Damage: ${overclockDamage} ${dexModStr} DEX force damage</div>
        <div class="elysium-action-metadata elysium-overclock-warning">
          Overclock ${weaponName} to deal significantly more damage. ⚠️ Guaranteed +1 Aether Toxicity! Weapon may lock until rest!
        </div>
      </div>
    </div>
  `;

  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">Choose your fire mode:</p>
      ${fireCard}
      ${overclockCard}
    </div>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: `${weaponName} - Fire Mode`,
      content: content,
      buttons: {},
      close: () => resolve(null),
      render: (html) => {
        // Add click handlers to mode cards
        html.find(".elysium-action-option").click((event) => {
          const mode = event.currentTarget.dataset.mode;
          resolve(mode);

          // Close dialog
          html.closest(".dialog").find(".window-header .close").click();
        });
      },
    }).render(true);
  });
}
