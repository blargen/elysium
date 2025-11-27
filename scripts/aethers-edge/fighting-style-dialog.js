/**
 * Fighting Style Selection Dialog for Aether's Edge
 * Shows available fighting styles the actor doesn't already have
 */

import { getAvailableFightingStyles } from "../utils/fighting-styles.js";

/**
 * Show fighting style selection dialog
 * @param {Actor} actor - The fighter actor
 * @returns {Promise<string|null>} Selected style name or null if cancelled/none available
 */
export async function showFightingStyleDialog(actor) {
  const availableStyles = getAvailableFightingStyles(actor);

  // If no styles available, show info and return null
  if (availableStyles.length === 0) {
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info(
        `${actor.name} already knows all available fighting styles!`,
      );
    }
    return null;
  }

  // Build dialog HTML using Elysium CSS classes
  const content = `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">
        <strong>Aether's Edge</strong> grants you temporary mastery of a fighting style.
        Choose one style you don't already know. This benefit lasts until your next long rest.
      </p>

      <table class="elysium-table">
        <thead>
          <tr>
            <th style="width: 40px;">Select</th>
            <th>Fighting Style</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${availableStyles
            .map(
              (style, index) => `
            <tr>
              <td class="center">
                <input type="radio" name="style" value="${style.name}" ${index === 0 ? "checked" : ""} class="elysium-checkbox">
              </td>
              <td><strong class="elysium-text-blue">${style.name}</strong></td>
              <td>${style.description}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <div class="elysium-info-box" style="margin-top: 16px;">
        <p style="margin: 0; font-size: 0.9em; color: var(--aether-text-muted);">
          <strong>Temporary Grant:</strong> This fighting style will be removed on your next long rest.
        </p>
      </div>
    </div>
  `;

  // Show dialog and wait for user input
  return new Promise((resolve) => {
    new Dialog({
      title: "Aether's Edge - Temporary Fighting Style",
      content: content,
      buttons: {
        select: {
          icon: '<i class="fas fa-fist-raised"></i>',
          label: "Learn Style",
          callback: (html) => {
            const selectedStyle = html.find('input[name="style"]:checked').val();
            resolve(selectedStyle);
          },
        },
        skip: {
          icon: '<i class="fas fa-forward"></i>',
          label: "Skip",
          callback: () => resolve(null),
        },
      },
      default: "select",
      close: () => resolve(null),
    }).render(true);
  });
}
