/**
 * Macro: Elysium Item to Compendium
 *
 * Select an item in the Items sidebar, then run this macro
 * to automatically add it to the appropriate compendium
 * (deleting any old version first).
 *
 * USAGE:
 * 1. Create item in world via UI
 * 2. Set flags on item (e.g., isAethersLeap, requiresAether)
 * 3. Select item in Items sidebar
 * 4. Run this macro
 * 5. Test in-game
 * 6. Commit compendium changes to git
 */

const item = ui.items?.object;

if (!item) {
  ui.notifications.error("Select an item from the Items sidebar first!");
  return;
}

// Determine which compendium to use based on flags
let packName;
if (item.getFlag('elysium', 'isAetherFuel')) {
  packName = 'elysium.aether-fuel';
} else {
  packName = 'elysium.elysium-items';
}

// Get the pack
const pack = game.packs.get(packName);
if (!pack) {
  ui.notifications.error(`Compendium ${packName} not found!`);
  return;
}

// Delete old version if it exists
const index = await pack.getIndex();
const existing = index.find(i => i.name === item.name);

if (existing) {
  const oldItem = await pack.getDocument(existing._id);
  await oldItem.delete();
  console.log(`Deleted old version of ${item.name}`);
}

// Add new version
await pack.importDocument(item);

ui.notifications.info(`✅ ${item.name} added to ${packName.split('.')[1]}`);
console.log(`${item.name} updated in compendium`);

// Reminder to commit
const packPath = packName === 'elysium.aether-fuel' ? 'aether-fuel' : 'elysium-items';
console.log(`
═══════════════════════════════════════════════════════════════
Remember to commit the compendium changes:

git add packs/${packPath}/
git commit -m "feat: add ${item.name} to compendium"
═══════════════════════════════════════════════════════════════
`);
