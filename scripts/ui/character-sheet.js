/**
 * Character Sheet UI Injection
 *
 * Adds toxicity display to D&D 5e character sheets
 */

/**
 * Get toxicity data for display
 * @param {Actor} actor - The actor to extract data from
 * @returns {Object} { dailyDoses, atl, hasToxicity }
 */
export function getToxicityDisplayData(actor) {
  const dailyDoses = actor.flags?.elysium?.dailyDoses ?? 0;
  const atl = actor.flags?.elysium?.atl ?? 0;

  return {
    dailyDoses,
    atl,
    hasToxicity: true, // Always show the display
  };
}

/**
 * Generate HTML for toxicity display
 * @param {number} dailyDoses - Number of daily doses consumed
 * @param {number} atl - Aether Toxicity Level
 * @returns {string} HTML string
 */
export function generateToxicityHTML(dailyDoses, atl) {
  const warningClass = atl >= 3 ? "elysium-toxicity-warning" : "";

  return `
    <div class="elysium-toxicity-display ${warningClass}">
      <div class="elysium-toxicity-stat">
        <span class="elysium-toxicity-label">Daily Doses</span>
        <span class="elysium-toxicity-value">${dailyDoses}</span>
      </div>
      <div class="elysium-toxicity-stat">
        <span class="elysium-toxicity-label">ATL</span>
        <span class="elysium-toxicity-value">${atl}</span>
      </div>
    </div>
  `;
}

/**
 * Check if we should inject toxicity display for this sheet
 * @param {Application} sheet - The sheet being rendered
 * @returns {boolean}
 */
export function shouldInjectToxicityDisplay(sheet) {
  const sheetName = sheet.constructor.name;
  // Support both legacy and v2 character sheets
  return (
    sheetName === "ActorSheet5eCharacter" ||
    sheetName === "ActorSheetV2" ||
    sheet.actor?.type === "character"
  );
}

/**
 * Extract the header element to inject after
 * @param {HTMLElement} html - The sheet HTML (native DOM for v2 sheets)
 * @returns {HTMLElement|null} The header element or null
 */
export function extractSheetHeaderElement(html) {
  // For v2 sheets, inject after the rest buttons (where XP bar was)
  const restButtons = html.querySelector(
    "header.sheet-header .sheet-header-buttons",
  );

  if (restButtons) {
    console.log(
      "Elysium | Found rest buttons in sheet header for toxicity injection",
    );
    return restButtons;
  }

  console.warn("Elysium | Could not find rest buttons in sheet header");
  return null;
}

/**
 * Inject toxicity display into character sheet
 * @param {Application} sheet - The actor sheet
 * @param {HTMLElement} html - The sheet HTML (native DOM for v2 sheets)
 */
export function injectToxicityDisplay(sheet, html) {
  // Only inject for character sheets
  if (!shouldInjectToxicityDisplay(sheet)) {
    return;
  }

  const actor = sheet.actor;
  const data = getToxicityDisplayData(actor);

  // Only show if there's toxicity to display
  if (!data.hasToxicity) {
    return;
  }

  // Remove existing display (for re-renders)
  const existing = html.querySelector(".elysium-toxicity-display");
  if (existing) {
    existing.remove();
  }

  // Find injection point
  const header = extractSheetHeaderElement(html);
  if (!header) {
    console.warn(
      "Elysium | Could not find character sheet header for toxicity display",
    );
    return;
  }

  // Generate and inject HTML
  const toxicityHTML = generateToxicityHTML(data.dailyDoses, data.atl);
  header.insertAdjacentHTML("afterend", toxicityHTML);

  console.log(
    `Elysium | Injected toxicity display (Doses: ${data.dailyDoses}, ATL: ${data.atl})`,
  );
}
