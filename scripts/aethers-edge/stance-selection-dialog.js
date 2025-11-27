/**
 * Stance Selection Dialog for Aether's Edge
 * Shows the three stances and their passive/active abilities
 */

/**
 * Show stance selection dialog
 * @param {Actor} actor - The fighter actor
 * @param {Object} stances - The stance definitions from item flags
 * @returns {Promise<string|null>} Selected stance key or null if cancelled
 */
export async function showStanceSelectionDialog(actor, stances) {
  // Build dialog HTML using Elysium CSS classes
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">
        Choose your combat stance for the day. This stance will remain active until your next long rest.
      </p>

      <table class="elysium-table">
        <thead>
          <tr>
            <th style="width: 40px;">Select</th>
            <th>Stance</th>
            <th>Passive Bonus</th>
            <th>Aether Ability (costs 1 aether)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(stances)
            .map(
              ([key, data], index) => `
            <tr>
              <td class="center">
                <input type="radio" name="stance" value="${key}" ${index === 0 ? "checked" : ""} class="elysium-checkbox">
              </td>
              <td><strong class="elysium-text-blue">${data.name}</strong></td>
              <td>${data.passive}</td>
              <td>
                <div style="margin-bottom: 4px;">
                  <strong>${data.abilityName}:</strong> ${data.abilityDescription}
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div class="elysium-info-box" style="margin-top: 16px;">
        <p style="margin: 0; font-size: 0.9em; color: var(--aether-text-muted);">
          <strong>Note:</strong> Your stance choice persists until your next long rest. Choose wisely!
        </p>
      </div>
    </div>
  `;

  // Show dialog and wait for user input
  return new Promise((resolve) => {
    new Dialog({
      title: "Aether's Edge - Choose Your Stance",
      content: content,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "Select Stance",
          callback: (html) => {
            const selectedStance = html.find('input[name="stance"]:checked').val();
            resolve(selectedStance);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      default: "select",
    }).render(true);
  });
}
