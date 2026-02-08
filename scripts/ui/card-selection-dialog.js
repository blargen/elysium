/**
 * Card Selection Dialog
 *
 * Reusable component for showing a selection dialog with clickable cards.
 * Used by ammo selection, fuel selection, and potentially other systems.
 */

/**
 * Build HTML for overclock card section
 * @param {Object} config - Overclock configuration
 * @param {boolean} config.enabled - Whether to show overclock card
 * @param {string} config.name - Overclock name (e.g., "Overclock", "Overcharge")
 * @param {string} config.image - Image/icon path
 * @param {string} config.description - What overclocking does
 * @param {string} config.warning - Warning text (optional)
 * @param {boolean} config.defaultChecked - Initial checked state
 * @returns {string} HTML string (empty if not enabled)
 */
export function buildOverclockSectionHtml(config) {
  if (!config || !config.enabled) return "";

  const checked = config.defaultChecked ? "checked" : "";
  const name = config.name || "Overclock";
  const image = config.image || "icons/svg/hazard.svg";
  const description = config.description || "";
  const warning = config.warning || "";

  return `
    <hr class="elysium-divider">
    <div class="elysium-overclock-card">
      <img src="${image}" class="elysium-overclock-icon" alt="${name}">
      <div class="elysium-overclock-info">
        <div class="elysium-overclock-name">⚡ ${name.toUpperCase()}</div>
        <div class="elysium-overclock-desc">${description}</div>
        ${warning ? `<div class="elysium-overclock-warning">⚠️ ${warning}</div>` : ""}
      </div>
      <label class="elysium-toggle-switch">
        <input type="checkbox" id="overclock-toggle" ${checked}>
        <span class="elysium-toggle-slider"></span>
      </label>
    </div>
  `;
}

/**
 * Create a card selection dialog with clickable cards
 *
 * @param {Object} config - Dialog configuration
 * @param {string} config.title - Dialog title
 * @param {string} config.description - Optional description text
 * @param {Array} config.items - Array of items to display
 * @param {Function} config.getImage - Function to get image URL from item
 * @param {Function} config.getTitle - Function to get title from item
 * @param {Function} config.getSubtitle - Function to get subtitle from item
 * @param {Function} config.getMetadata - Optional function to get metadata text
 * @param {Object} config.overclock - Optional overclock configuration:
 *   @param {boolean} config.overclock.enabled - Show overclock toggle
 *   @param {string} config.overclock.label - Toggle label
 *   @param {string} config.overclock.description - Warning text
 *   @param {boolean} config.overclock.defaultChecked - Initial state
 * @returns {Promise<Object|null>} { item: Object, isOverclock: boolean } or null if cancelled
 */
export async function showCardSelectionDialog(config) {
  const {
    title,
    description,
    items,
    getImage,
    getTitle,
    getSubtitle,
    getMetadata,
    overclock,
  } = config;

  // No items available
  if (!items || items.length === 0) {
    ui?.notifications?.warn(`No items available for selection!`);
    return null;
  }

  // Build cards HTML using CSS classes (NO inline styles!)
  let cardsHtml = "";

  items.forEach((item, index) => {
    const img = getImage(item);
    const itemTitle = getTitle(item);
    const subtitle = getSubtitle(item);
    const metadata = getMetadata ? getMetadata(item) : "";

    cardsHtml += `
      <div class="elysium-action-option" data-item-index="${index}">
        <img src="${img}" class="elysium-action-icon" alt="${itemTitle}">
        <div class="elysium-action-info">
          <div class="elysium-action-name">${itemTitle}</div>
          <div class="elysium-action-desc">${subtitle}</div>
          ${metadata ? `<div class="elysium-action-metadata">${metadata}</div>` : ""}
        </div>
      </div>
    `;
  });

  // Build overclock section HTML
  const overclockHtml = buildOverclockSectionHtml(overclock);

  const content = `
    <div class="elysium-dialog-content">
      <h2 class="elysium-header">${title}</h2>
      ${description ? `<p class="elysium-dialog-text">${description}</p>` : ""}
      <div id="elysium-card-container">
        ${cardsHtml}
      </div>
      ${overclockHtml}
    </div>
  `;

  // Create dialog with no buttons (use X to close)
  // Cards will handle selection via click events
  return new Promise((resolve) => {
    const dialog = new Dialog(
      {
        title: title,
        content: content,
        buttons: {},
        close: () => resolve(null),
        render: (html) => {
          console.log("Elysium | Card dialog render callback fired");
          console.log("Elysium | html type:", typeof html, html);

          // Try multiple ways to get the DOM element
          let container = html[0] || html;
          console.log("Elysium | container:", container);

          // Add click handlers to cards (using action-option class)
          const cards = container.querySelectorAll(".elysium-action-option:not(.elysium-overclock-card)");
          console.log("Elysium | Found cards:", cards.length);

          cards.forEach((card, idx) => {
            console.log(`Elysium | Adding click handler to card ${idx}`);
            card.addEventListener("click", () => {
              const itemIndex = parseInt(card.getAttribute("data-item-index"));
              const selectedItem = items[itemIndex];
              console.log("Elysium | Card clicked! Index:", itemIndex, "Item:", selectedItem);

              // Get overclock state (false if toggle doesn't exist)
              const overclockToggle = container.querySelector("#overclock-toggle");
              const isOverclock = overclockToggle ? overclockToggle.checked : false;

              // Return both item and overclock state
              resolve({ item: selectedItem, isOverclock });
              dialog.close();
            });
          });

          // Overclock toggle - no change handler needed (warning always visible)
        },
      },
      {
        width: 400,
        classes: ["elysium-dialog"],
      }
    );

    dialog.render(true);
  });
}
