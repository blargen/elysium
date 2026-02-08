/**
 * Action Selection Dialog Component
 *
 * Reusable dialog for selecting actions with optional overpower toggle.
 * Based on Aether's Grasp pattern.
 *
 * @example
 * const selection = await showActionSelectionDialog({
 *   title: "Choose Action",
 *   description: "What would you like to do?",
 *   actions: [
 *     { id: "fire", name: "Fire", img: "path/to/icon.png", description: "Fire the weapon" },
 *     { id: "reload", name: "Reload", img: "path/to/icon.png", description: "Reload ammunition" }
 *   ],
 *   overpower: {
 *     enabled: true,
 *     label: "Overpower Mode",
 *     description: "⚠️ Warning: Increases toxicity!",
 *     defaultChecked: false
 *   }
 * });
 *
 * if (selection) {
 *   console.log(selection.actionId);  // "fire" or "reload"
 *   console.log(selection.isOverpower);  // true or false
 * }
 */

/**
 * Build HTML for action option card
 * @param {Object} action - Action configuration
 * @param {string} action.id - Action identifier
 * @param {string} action.name - Display name
 * @param {string} action.img - Icon path
 * @param {string} action.description - Action description
 * @returns {string} HTML string
 */
function buildActionCardHtml(action) {
  return `
    <div class="elysium-action-option" data-action="${action.id}">
      <img src="${action.img}" class="elysium-action-icon" alt="${action.name}">
      <div class="elysium-action-info">
        <div class="elysium-action-name">${action.name}</div>
        <div class="elysium-action-desc">${action.description}</div>
      </div>
    </div>
  `;
}

/**
 * Build HTML for overpower toggle section
 * @param {Object} config - Overpower configuration
 * @param {boolean} config.enabled - Whether to show overpower toggle
 * @param {string} config.label - Toggle label text
 * @param {string} config.description - Warning/description text
 * @param {boolean} config.defaultChecked - Initial checked state
 * @returns {string} HTML string (empty if not enabled)
 */
function buildOverpowerSectionHtml(config) {
  if (!config || !config.enabled) return '';

  const checked = config.defaultChecked ? 'checked' : '';
  const warningDisplay = config.defaultChecked ? 'block' : 'none';

  return `
    <div class="elysium-overpower-section">
      <label class="elysium-checkbox-label">
        <input type="checkbox" id="overpower-toggle" ${checked}>
        <span>${config.label || 'Overpower'}</span>
      </label>
      <div class="elysium-overpower-warning" style="display: ${warningDisplay}">
        ${config.description || ''}
      </div>
    </div>
  `;
}

/**
 * Show action selection dialog with optional overpower toggle
 *
 * @param {Object} config - Configuration object
 * @param {string} config.title - Dialog title
 * @param {string} config.description - Optional description text (can include HTML)
 * @param {Array<Object>} config.actions - Array of action objects:
 *   @param {string} config.actions[].id - Action identifier
 *   @param {string} config.actions[].name - Display name
 *   @param {string} config.actions[].img - Icon path
 *   @param {string} config.actions[].description - Action description
 * @param {Object} config.overpower - Optional overpower configuration:
 *   @param {boolean} config.overpower.enabled - Show overpower toggle
 *   @param {string} config.overpower.label - Toggle label
 *   @param {string} config.overpower.description - Warning text
 *   @param {boolean} config.overpower.defaultChecked - Initial state
 * @returns {Promise<Object|null>} { actionId: string, isOverpower: boolean } or null if cancelled
 */
export async function showActionSelectionDialog(config) {
  const { title, description, actions, overpower } = config;

  // Build action cards HTML
  const actionsHtml = actions.map(buildActionCardHtml).join('');

  // Build overpower section HTML
  const overpowerHtml = buildOverpowerSectionHtml(overpower);

  const content = `
    <div class="elysium-dialog-content">
      ${description ? `<p class="elysium-dialog-text">${description}</p>` : ''}
      ${actionsHtml}
      ${overpowerHtml ? `<hr class="elysium-divider">${overpowerHtml}` : ''}
    </div>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: title,
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      render: (html) => {
        // Attach click handlers to action cards
        html.find(".elysium-action-option").click((event) => {
          const actionId = event.currentTarget.dataset.action;
          const isOverpower = html.find("#overpower-toggle").is(":checked");

          resolve({ actionId, isOverpower });

          // Close dialog
          html.closest(".dialog").find(".dialog-button.cancel").click();
        });

        // Toggle overpower warning visibility on checkbox change
        html.find("#overpower-toggle").change((event) => {
          const warning = html.find(".elysium-overpower-warning");
          if (event.target.checked) {
            warning.show();
          } else {
            warning.hide();
          }
        });
      },
      default: "cancel"
    }).render(true);
  });
}
