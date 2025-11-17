/**
 * Macro: Create Aether's Leap
 *
 * Creates the Aether's Leap item in the Elysium Items compendium.
 * No more copy/pasting complex console scripts!
 *
 * USAGE:
 * 1. Create a new macro in Foundry
 * 2. Paste this code
 * 3. Run it
 * 4. Item appears in compendium
 * 5. Commit: git add packs/elysium-items/ && git commit -m "feat: add Aether's Leap to compendium"
 */

if (!window.ElysiumItemCreator) {
  ui.notifications.error("Elysium module not loaded! Make sure the module is active.");
} else {
  await window.ElysiumItemCreator.createAethersLeap();
}
