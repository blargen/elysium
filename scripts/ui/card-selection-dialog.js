/**
 * Card Selection Dialog
 *
 * Reusable component for showing a selection dialog with clickable cards.
 * Used by ammo selection, fuel selection, and potentially other systems.
 */

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
 * @returns {Promise<Object|null>} Selected item or null if cancelled
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
  } = config;

  // No items available
  if (!items || items.length === 0) {
    ui?.notifications?.warn(`No items available for selection!`);
    return null;
  }

  // Build cards HTML
  let cardsHtml = "";

  items.forEach((item, index) => {
    const img = getImage(item);
    const itemTitle = getTitle(item);
    const subtitle = getSubtitle(item);
    const metadata = getMetadata ? getMetadata(item) : "";

    cardsHtml += `
      <div class="elysium-selection-card" data-item-index="${index}" style="
        margin-bottom: 12px;
        padding: 12px;
        background: linear-gradient(135deg, rgba(17, 117, 208, 0.1), rgba(0, 0, 0, 0.8));
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid var(--aether-blue);
        box-shadow: 0 0 8px rgba(17, 117, 208, 0.3);
      ">
        <img src="${img}" style="
          width: 48px;
          height: 48px;
          border-radius: 4px;
          border: 1px solid var(--aether-blue);
          box-shadow: 0 0 4px rgba(17, 117, 208, 0.5);
        " alt="${itemTitle}">
        <div style="flex: 1;">
          <div style="
            color: var(--aether-text-main);
            font-weight: 600;
            margin-bottom: 4px;
          ">${itemTitle}</div>
          <div style="
            color: var(--aether-text-muted);
            font-size: 0.85rem;
          ">${subtitle}</div>
          ${metadata ? `<div style="color: var(--aether-blue); font-size: 0.85rem; text-shadow: 0 0 4px rgba(17, 117, 208, 0.6);">${metadata}</div>` : ""}
        </div>
      </div>
    `;
  });

  const content = `
    <div class="elysium-dialog-content">
      <h2 class="elysium-header">${title}</h2>
      ${description ? `<p style="text-align: center; margin-bottom: 16px; color: var(--aether-text-muted, #999);">${description}</p>` : ""}
      <div id="elysium-card-container">
        ${cardsHtml}
      </div>
      <style>
        .elysium-selection-card:hover {
          background: linear-gradient(135deg, rgba(17, 117, 208, 0.2), rgba(0, 0, 0, 0.9)) !important;
          box-shadow: 0 0 16px rgba(17, 117, 208, 0.6) !important;
          transform: translateX(4px);
        }
        .elysium-selection-card:active {
          background: linear-gradient(135deg, rgba(17, 117, 208, 0.25), rgba(0, 0, 0, 0.95)) !important;
          box-shadow: 0 0 20px rgba(17, 117, 208, 0.8) !important;
        }
      </style>
    </div>
  `;

  // Create dialog with only Cancel button
  // Cards will handle selection via click events
  return new Promise((resolve) => {
    const dialog = new Dialog(
      {
        title: title,
        content: content,
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
          console.log("Elysium | Card dialog render callback fired");
          console.log("Elysium | html type:", typeof html, html);

          // Try multiple ways to get the DOM element
          let container = html[0] || html;
          console.log("Elysium | container:", container);

          // Add click handlers to cards
          const cards = container.querySelectorAll(".elysium-selection-card");
          console.log("Elysium | Found cards:", cards.length);

          cards.forEach((card, idx) => {
            console.log(`Elysium | Adding click handler to card ${idx}`);
            card.addEventListener("click", () => {
              const itemIndex = parseInt(card.getAttribute("data-item-index"));
              const selectedItem = items[itemIndex];
              console.log("Elysium | Card clicked! Index:", itemIndex, "Item:", selectedItem);
              resolve(selectedItem); // Resolve FIRST
              dialog.close(); // Then close
            });
          });
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
