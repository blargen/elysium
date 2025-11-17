---
name: foundry-dnd5e
description: Expert in FoundryVTT module development for D&D 5e. Understands Foundry hooks, D&D 5e system API, module architecture, midi-qol integration, and best practices. Use when working with FoundryVTT core features, D&D 5e mechanics, or general module development.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# FoundryVTT + D&D 5e Development Expert

You are an expert in developing FoundryVTT modules for the D&D 5e system.

**Target Version:** FoundryVTT v13+

## FoundryVTT Module Architecture

### Module Structure

```
module-name/
├── module.json          # Manifest (required)
├── scripts/            # JavaScript files
│   ├── module-name.js  # Main entry point
│   └── ...
├── styles/             # CSS/SCSS files
├── templates/          # Handlebars templates
├── lang/               # Localization (i18n)
├── packs/              # Compendium packs
└── assets/             # Images, icons, etc.
```

### module.json (Manifest)

```json
{
  "id": "module-id",
  "title": "Module Title",
  "description": "Module description",
  "version": "1.0.0",
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "authors": [
    {"name": "Author Name"}
  ],
  "scripts": [
    "scripts/module-name.js"
  ],
  "styles": [
    "styles/module-name.css"
  ],
  "packs": [
    {
      "name": "items",
      "label": "Module Items",
      "path": "packs/items",
      "type": "Item"
    }
  ]
}
```

---

## Hooks System

Hooks are the core of FoundryVTT's event system.

### Module Lifecycle Hooks

```javascript
// Run once when Foundry initializes (before data is loaded)
Hooks.once('init', function() {
  console.log('Module | Initializing...');

  // Register settings
  game.settings.register('module-id', 'settingName', {
    name: 'Setting Name',
    hint: 'Setting description',
    scope: 'world',  // or 'client'
    config: true,
    type: Boolean,
    default: true
  });
});

// Run once when Foundry is ready (data is loaded)
Hooks.once('ready', function() {
  console.log('Module | Ready!');

  // Access game data
  const actors = game.actors;
  const items = game.items;
});
```

### D&D 5e System Hooks

**IMPORTANT:** As of dnd5e v4.0+ (system version 5.x), the hook system changed from item-based to activity-based hooks.

#### Activity Hooks (v5.x - Current)

```javascript
// Before activity is used - fires before consumption is calculated
// Return false to prevent activity execution
Hooks.on('dnd5e.preUseActivity', async (activity, usageConfig, dialogConfig, messageConfig) => {
  const item = activity.item;
  const actor = item.actor;
  console.log(`${actor.name} is using ${item.name}`);

  // Modify configuration or prevent usage
  // return false; // Prevents activity
});

// Before consumption is calculated
// Return false to prevent usage
Hooks.on('dnd5e.preActivityConsumption', async (activity, usageConfig, messageConfig) => {
  const item = activity.item;
  // Inspect/modify before consumption calculation
});

// After consumption calculated, before updates applied
// Return false to prevent usage
Hooks.on('dnd5e.activityConsumption', async (activity, usageConfig, messageConfig, updates) => {
  const item = activity.item;
  // The 'updates' parameter contains what will be applied to actor/items
  console.log('Consumption updates:', updates);
});

// After consumption is fully applied
Hooks.on('dnd5e.postActivityConsumption', async (activity, usageConfig, messageConfig, updates) => {
  const item = activity.item;
  // Item has been consumed, apply custom effects here
});

// After activity completes
Hooks.on('dnd5e.postUseActivity', async (activity, usageConfig, results) => {
  const item = activity.item;
  console.log('Activity completed!', results);
});
```

#### Legacy Hooks (Deprecated in v4.0+)

```javascript
// ⚠️ DEPRECATED - Use activity hooks above instead
Hooks.on('dnd5e.useItem', async (item, config, options) => {
  // This hook no longer fires in v5.x!
});
```

#### Other D&D 5e Hooks

```javascript
// Rest hooks
Hooks.on('dnd5e.restCompleted', async (actor, restData) => {
  if (restData.longRest) {
    console.log(`${actor.name} completed a long rest`);
    // Reset resources, remove conditions, etc.
  }
});

// Level up
Hooks.on('dnd5e.advanceLevel', (actor, level) => {
  console.log(`${actor.name} reached level ${level}!`);
});

// Roll hooks (still available)
Hooks.on('dnd5e.preRollAttack', (item, rollConfig) => {
  // Modify attack roll before it happens
});

Hooks.on('dnd5e.preRollDamage', (item, rollConfig) => {
  // Modify damage roll before it happens
});
```

#### Choosing the Right Hook

- **`preUseActivity`**: Intercept before anything happens (good for showing dialogs, preventing use)
- **`preActivityConsumption`**: Before consumption calculation (modify what gets consumed)
- **`activityConsumption`**: After calculation, before applying (inspect/modify updates)
- **`postActivityConsumption`**: After consumption applied (add custom effects, toxicity, etc.)
- **`postUseActivity`**: After everything is done (logging, cleanup)

For **aether fuel consumption**, use `postActivityConsumption` to let the system handle item consumption, then apply toxicity effects.

### Common Foundry Hooks

```javascript
// Chat message hooks
Hooks.on('createChatMessage', (message, options, userId) => {
  // Triggered when a chat message is created
});

// Token hooks
Hooks.on('updateToken', (token, updateData, options, userId) => {
  // Triggered when a token is updated
});

// Combat hooks
Hooks.on('combatStart', (combat, updateData) => {
  console.log('Combat started!');
});

Hooks.on('combatTurn', (combat, updateData, updateOptions) => {
  const combatant = combat.combatant;
  console.log(`${combatant.name}'s turn!`);
});

// Render hooks (UI)
Hooks.on('renderActorSheet', (app, html, data) => {
  // Modify actor sheet HTML
  html.find('.custom-button').click(() => {
    console.log('Custom button clicked!');
  });
});
```

---

## Working with Actors

### Getting Actors

```javascript
// Get all actors
const actors = game.actors;

// Get specific actor
const actor = game.actors.getName("Character Name");
const actorById = game.actors.get("actor-id");

// Get selected tokens' actors
const controlled = canvas.tokens.controlled.map(t => t.actor);

// Get current user's character
const character = game.user.character;
```

### Actor Data Structure

```javascript
actor.name                              // Actor name
actor.type                              // "character", "npc", "vehicle"
actor.system                            // D&D 5e specific data
actor.system.abilities.str.value        // Strength score
actor.system.abilities.str.mod          // Strength modifier
actor.system.attributes.hp.value        // Current HP
actor.system.attributes.hp.max          // Max HP
actor.system.attributes.ac.value        // Armor Class
```

### Modifying Actors

```javascript
// Update actor data
await actor.update({
  "system.attributes.hp.value": 50,
  "system.attributes.exhaustion": 1
});

// Apply damage/healing
await actor.applyDamage(10);           // Take 10 damage
await actor.applyDamage(-5);           // Heal 5 HP

// Toggle status effects
await actor.toggleStatusEffect("poisoned", {active: true});
await actor.toggleStatusEffect("blinded", {active: false});

// Active effects
const effect = {
  label: "Blessed",
  icon: "icons/magic/holy/blessing.png",
  changes: [{
    key: "system.bonuses.abilities.save",
    mode: 2,  // ADD
    value: "1d4"
  }],
  duration: {rounds: 10}
};
await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
```

### Actor Flags

```javascript
// Set custom data on actor
await actor.setFlag("module-id", "customData", {value: 123});

// Get custom data
const data = actor.getFlag("module-id", "customData");  // {value: 123}

// Unset flag
await actor.unsetFlag("module-id", "customData");
```

---

## Working with Items

### Item Types

D&D 5e item types:
- `weapon`
- `equipment` (armor, shields)
- `consumable` (potions, scrolls)
- `tool`
- `loot`
- `class`
- `spell`
- `feat`
- `background`

### Item Structure

```javascript
{
  name: "Longsword",
  type: "weapon",
  img: "icons/weapons/swords/longsword.png",
  system: {
    description: {
      value: "<p>Description here</p>"
    },
    quantity: 1,
    weight: 3,
    price: {value: 15, denomination: "gp"},
    equipped: true,
    identified: true,

    // Weapon-specific
    weaponType: "martial",
    damage: {
      parts: [["1d8 + @mod", "slashing"]],
      versatile: "1d10"
    },
    properties: {
      ver: true  // Versatile
    },

    // Uses (charges)
    uses: {
      value: 3,
      max: 3,
      per: "lr"  // "sr", "lr", "day", "charges"
    }
  },
  flags: {
    "module-id": {
      customData: "value"
    }
  }
}
```

### Creating Items

```javascript
// Create item in world
const itemData = {
  name: "Magic Sword",
  type: "weapon",
  system: { /* ... */ }
};
const item = await Item.create(itemData);

// Create item on actor
await actor.createEmbeddedDocuments("Item", [itemData]);

// Get item from actor
const sword = actor.items.getName("Longsword");
const itemById = actor.items.get("item-id");
```

### Using Items

```javascript
// Use an item
await item.use();

// Use with options
await item.use({
  configureDialog: false,  // Skip configuration dialog
  versatile: true          // Use versatile damage
});

// Roll attack
await item.rollAttack();

// Roll damage
await item.rollDamage();
```

### Spell Scrolls in D&D 5e v5.x

**IMPORTANT:** In D&D 5e v5.x, spell scrolls work differently than you might expect.

#### Spell Data Storage

In earlier versions, scrolls had a `system.spell.uuid` reference to a separate spell document. **This is no longer the case in v5.x.**

```javascript
// ❌ This does NOT exist in v5.x scrolls
const spellUuid = scroll.system.spell?.uuid;  // undefined!

// ✅ The scroll itself IS the spell
const scrollData = scroll.toObject();
// Contains: activities, effects, duration, range, etc.
```

#### Working with Scrolls

```javascript
// Get all 1st level scrolls from actor
const scrolls = actor.items.filter(item =>
  item.type === 'consumable' &&
  item.system.type?.value === 'scroll' &&
  item.system.identifier === 'spell-scroll-1st-level' &&
  (item.system.uses?.value || 0) > 0
);

// The scroll contains all spell data in its activities
const scroll = scrolls[0];
console.log(scroll.system.activities);  // ActivityCollection with spell effects

// Extract spell name from scroll
// Method 1: DDB Importer flag (if using D&D Beyond import)
const spellName = scroll.flags?.ddbimporter?.originalName;  // "Detect Magic"

// Method 2: Parse from scroll name
const spellName = scroll.name.replace(/^Spell Scroll:\s*/i, '').trim();
// "Spell Scroll: Cure Wounds" → "Cure Wounds"

// Use the scroll data directly as spell data
const spellData = scroll.toObject();
// This contains everything needed to cast the spell:
// - Activities (casting mechanics)
// - Effects (what happens when cast)
// - Duration, range, targeting
// - All spell properties
```

#### Why This Matters

When storing spell data from scrolls (e.g., for imprinting on items):

```javascript
// ✅ Correct approach for v5.x
async function imprintScrollSpell(scroll) {
  // The scroll already has all spell data
  const spellData = scroll.toObject();

  // Get spell name for display
  const spellName = scroll.flags?.ddbimporter?.originalName ||
                    scroll.name.replace(/^Spell Scroll:\s*/i, '').trim();

  // Store the scroll's data - it IS the spell
  await storeSpell(spellData, spellName);
}

// ❌ Wrong approach - this won't work
async function imprintScrollSpell(scroll) {
  const spellUuid = scroll.system.spell?.uuid;  // undefined in v5.x!
  const spell = await fromUuid(spellUuid);      // Will fail
}
```

#### Scroll Item Identifiers

```javascript
// Scroll identifiers by spell level
'spell-scroll-cantrip'
'spell-scroll-1st-level'
'spell-scroll-2nd-level'
'spell-scroll-3rd-level'
// etc...

// Check if item is a scroll
const isScroll = item.type === 'consumable' &&
                 item.system.type?.value === 'scroll';

// Check scroll spell level
const is1stLevel = item.system.identifier === 'spell-scroll-1st-level';
```

---

## D&D 5e Rolls

### Basic Rolls

```javascript
// Simple roll
const roll = new Roll("1d20 + 5");
await roll.evaluate();
console.log(roll.total);  // 14 (for example)

// Roll with actor data
const roll = new Roll("1d20 + @abilities.str.mod", actor.getRollData());
await roll.evaluate();

// Display in chat
await roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  flavor: "Strength Check"
});
```

### Ability Checks and Saves

**IMPORTANT:** As of dnd5e v4.1+, the methods were renamed:
- `rollAbilityTest` → `rollAbilityCheck`
- `rollAbilitySave` → `rollSavingThrow`

```javascript
// Roll ability check (v4.1+)
await actor.rollAbilityCheck({ ability: "str" });  // Strength check
await actor.rollSkill({ key: "acr" });             // Acrobatics check

// Roll saving throw (v4.1+)
await actor.rollSavingThrow({ ability: "con" });   // Constitution save

// With custom DC and flavor
await actor.rollSavingThrow({
  ability: "con",
  targetValue: 15
});

// Legacy methods (deprecated in v4.1+)
// await actor.rollAbilityTest("str");     // OLD - use rollAbilityCheck instead
// await actor.rollAbilitySave("dex");     // OLD - use rollSavingThrow instead
```

---

## Chat Messages

### Creating Chat Messages

```javascript
ChatMessage.create({
  user: game.user.id,
  speaker: ChatMessage.getSpeaker({actor}),
  content: `
    <div class="custom-message">
      <h3>Title</h3>
      <p>Content here</p>
    </div>
  `,
  type: CONST.CHAT_MESSAGE_TYPES.OTHER
});

// With a roll
ChatMessage.create({
  speaker: ChatMessage.getSpeaker({actor}),
  roll: roll,
  type: CONST.CHAT_MESSAGE_TYPES.ROLL,
  flavor: "Attack Roll"
});
```

### Styled Messages

```javascript
const styledContent = `
  <div style="
    border: 2px solid #4b5320;
    border-radius: 5px;
    padding: 10px;
    background: rgba(75,83,32,0.1);
  ">
    <h3 style="color: #4b5320; margin-top: 0;">Success!</h3>
    <p>The action succeeded.</p>
  </div>
`;

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({actor}),
  content: styledContent
});
```

---

## Dialogs

### Basic Dialog

```javascript
new Dialog({
  title: "Choose an Option",
  content: `
    <p>What would you like to do?</p>
  `,
  buttons: {
    option1: {
      icon: '<i class="fas fa-check"></i>',
      label: "Option 1",
      callback: () => {
        console.log("Option 1 chosen");
      }
    },
    option2: {
      icon: '<i class="fas fa-times"></i>',
      label: "Option 2",
      callback: () => {
        console.log("Option 2 chosen");
      }
    }
  },
  default: "option1"
}).render(true);
```

### Dialog with Promise

```javascript
async function askQuestion() {
  return new Promise((resolve) => {
    new Dialog({
      title: "Question",
      content: `<p>Do you want to proceed?</p>`,
      buttons: {
        yes: {
          label: "Yes",
          callback: () => resolve(true)
        },
        no: {
          label: "No",
          callback: () => resolve(false)
        }
      },
      close: () => resolve(false)
    }).render(true);
  });
}

const answer = await askQuestion();
if (answer) {
  console.log("Proceeding!");
}
```

### Input Dialog

```javascript
new Dialog({
  title: "Enter Value",
  content: `
    <div>
      <label>Amount:</label>
      <input type="number" name="amount" value="1" />
    </div>
  `,
  buttons: {
    ok: {
      label: "OK",
      callback: (html) => {
        const amount = html.find('[name="amount"]').val();
        console.log(`Amount: ${amount}`);
      }
    }
  }
}).render(true);
```

---

## midi-qol Integration

midi-qol is a powerful automation module for D&D 5e.

### midi-qol Hooks

```javascript
// Before damage roll
Hooks.on('midi-qol.preDamageRoll', async (workflow) => {
  const item = workflow.item;
  const actor = workflow.actor;
  const targets = workflow.targets;  // Set of targeted tokens

  // Modify workflow
  workflow.damageRoll = new Roll("2d6 + 5");
});

// After damage roll
Hooks.on('midi-qol.DamageRollComplete', async (workflow) => {
  const damageTotal = workflow.damageTotal;
  console.log(`Damage dealt: ${damageTotal}`);
});

// On hit
Hooks.on('midi-qol.RollComplete', async (workflow) => {
  if (workflow.hitTargets.size > 0) {
    console.log('Attack hit!');
  }
});
```

### Item OnUse Macros (Avoid for Elysium!)

```javascript
// This is the OLD WAY - don't use for Elysium!
// But good to know it exists for reference

// In item's OnUse Macro field:
const target = workflow.targets.first();
const damageRoll = await new Roll("2d6").evaluate();
await new MidiQOL.DamageOnlyWorkflow(actor, token, damageRoll.total, "fire", [target], damageRoll);
```

---

## Settings API

### Registering Settings

```javascript
Hooks.once('init', () => {
  game.settings.register('module-id', 'enableFeature', {
    name: 'Enable Feature',
    hint: 'Enable or disable this feature',
    scope: 'world',      // 'world' or 'client'
    config: true,        // Show in settings menu
    type: Boolean,
    default: true,
    onChange: value => {
      console.log(`Feature ${value ? 'enabled' : 'disabled'}`);
    }
  });

  game.settings.register('module-id', 'customValue', {
    name: 'Custom Value',
    scope: 'world',
    config: true,
    type: Number,
    default: 10,
    range: {
      min: 1,
      max: 100,
      step: 1
    }
  });
});
```

### Using Settings

```javascript
// Get setting
const value = game.settings.get('module-id', 'enableFeature');

// Set setting
await game.settings.set('module-id', 'enableFeature', false);
```

---

## Compendium Packs

### Creating Packs

In `module.json`:

```json
{
  "packs": [
    {
      "name": "items",
      "label": "Module Items",
      "path": "packs/items",
      "type": "Item",
      "system": "dnd5e"
    }
  ]
}
```

### Accessing Pack Data

```javascript
// Get pack
const pack = game.packs.get('module-id.items');

// Get all documents
const documents = await pack.getDocuments();

// Get specific document
const item = await pack.getDocument("item-id");

// Import to world
const importedItem = await game.items.importFromCompendium(pack, "item-id");
```

### Adding Items to Compendiums Programmatically

**IMPORTANT:** For distribution modules (modules you'll share/sell), you want items in compendiums, not just in the world. This section shows how to automate that.

#### Basic Pattern: Add Item to Compendium

```javascript
/**
 * Add an item from the world to a compendium
 * @param {Item} item - The world item to add
 * @param {string} packName - Full pack ID (e.g., 'elysium.elysium-items')
 */
async function addItemToCompendium(item, packName) {
  const pack = game.packs.get(packName);

  if (!pack) {
    ui.notifications.error(`Compendium ${packName} not found!`);
    return null;
  }

  // Import item into compendium
  const compendiumItem = await pack.importDocument(item);

  console.log(`Added ${item.name} to ${packName}`);
  ui.notifications.info(`${item.name} added to compendium`);

  return compendiumItem;
}

// Usage
const item = game.items.getName("Aether's Leap");
await addItemToCompendium(item, 'elysium.elysium-items');
```

#### Update Pattern: Delete Old + Add New

```javascript
/**
 * Update an item in a compendium (delete old, add new)
 * @param {Item} item - The world item to add/update
 * @param {string} packName - Full pack ID
 */
async function updateItemInCompendium(item, packName) {
  const pack = game.packs.get(packName);

  if (!pack) {
    ui.notifications.error(`Compendium ${packName} not found!`);
    return null;
  }

  // Check if item already exists in compendium
  const index = await pack.getIndex();
  const existingEntry = index.find(i => i.name === item.name);

  if (existingEntry) {
    console.log(`Deleting old version of ${item.name}...`);
    const existingItem = await pack.getDocument(existingEntry._id);
    await existingItem.delete();
    console.log(`Old version deleted`);
  }

  // Add new version
  const compendiumItem = await pack.importDocument(item);

  console.log(`Updated ${item.name} in ${packName}`);
  ui.notifications.info(`${item.name} updated in compendium`);

  return compendiumItem;
}

// Usage
const item = game.items.getName("Aether's Leap");
await updateItemInCompendium(item, 'elysium.elysium-items');
```

#### Batch Operations: Add/Update Multiple Items

```javascript
/**
 * Add/update multiple items in a compendium
 * @param {Item[]} items - Array of world items
 * @param {string} packName - Full pack ID
 */
async function batchUpdateCompendium(items, packName) {
  const pack = game.packs.get(packName);

  if (!pack) {
    ui.notifications.error(`Compendium ${packName} not found!`);
    return;
  }

  const index = await pack.getIndex();

  for (const item of items) {
    const existingEntry = index.find(i => i.name === item.name);

    if (existingEntry) {
      const existingItem = await pack.getDocument(existingEntry._id);
      await existingItem.delete();
      console.log(`Deleted old ${item.name}`);
    }

    await pack.importDocument(item);
    console.log(`Added ${item.name}`);
  }

  ui.notifications.info(`Updated ${items.length} items in compendium`);
}

// Usage - add all Elysium items
const elysiumItems = game.items.filter(i =>
  i.getFlag('elysium', 'isAethersLeap') ||
  i.getFlag('elysium', 'isAethersGrasp')
);
await batchUpdateCompendium(elysiumItems, 'elysium.elysium-items');
```

#### Finding Items by Flag

```javascript
/**
 * Find all items with a specific flag and add to compendium
 * @param {string} flagKey - Flag key to search for (e.g., 'requiresAether')
 * @param {string} packName - Full pack ID
 */
async function addItemsByFlag(flagKey, packName) {
  const items = game.items.filter(item =>
    item.getFlag('elysium', flagKey) === true
  );

  if (items.length === 0) {
    ui.notifications.warn(`No items found with flag elysium.${flagKey}`);
    return;
  }

  await batchUpdateCompendium(items, packName);

  console.log(`Added ${items.length} items with flag ${flagKey}`);
}

// Usage - add all aether-powered items
await addItemsByFlag('requiresAether', 'elysium.elysium-items');
```

#### Macro for Easy Compendium Updates

Create a macro in Foundry for quick item updates:

```javascript
// Macro: Update Item in Compendium

// Get selected item from sidebar
const selectedItem = ui.items?.object;

if (!selectedItem) {
  ui.notifications.error("Please select an item from the Items sidebar first!");
  return;
}

// Determine which compendium to use based on flags
let packName;
if (selectedItem.getFlag('elysium', 'isAetherFuel')) {
  packName = 'elysium.aether-fuel';
} else {
  packName = 'elysium.elysium-items';
}

// Update in compendium
const pack = game.packs.get(packName);
if (!pack) {
  ui.notifications.error(`Compendium ${packName} not found!`);
  return;
}

// Delete old version if exists
const index = await pack.getIndex();
const existingEntry = index.find(i => i.name === selectedItem.name);

if (existingEntry) {
  const existingItem = await pack.getDocument(existingEntry._id);
  await existingItem.delete();
  console.log(`Deleted old version of ${selectedItem.name}`);
}

// Add new version
await pack.importDocument(selectedItem);

ui.notifications.info(`✅ ${selectedItem.name} updated in ${packName}`);
console.log(`${selectedItem.name} updated in compendium`);
```

#### Subdirectories in Compendiums

**NOTE:** FoundryVTT compendiums don't natively support subdirectories in the file structure. However, you can organize items using:

1. **Folder Structure in UI**: Create folders in the compendium UI
2. **Naming Conventions**: Prefix item names (e.g., "Aether Items: Leap", "Aether Fuel: Unrefined")
3. **Flags for Categories**: Use flags to categorize items

```javascript
// Set category flag
await item.setFlag('elysium', 'category', 'aether-items');

// Filter by category in compendium browser
const pack = game.packs.get('elysium.elysium-items');
const items = await pack.getDocuments();
const aetherItems = items.filter(i =>
  i.getFlag('elysium', 'category') === 'aether-items'
);
```

### Elysium Workflow: Creating Items

**Standard workflow for creating Elysium items:**

1. **Create item in world** (via UI)
2. **Set required flags** (via console or macro)
   ```javascript
   const item = game.items.getName("Aether's Leap");
   await item.setFlag('elysium', 'isAethersLeap', true);
   await item.setFlag('elysium', 'requiresAether', true);
   ```
3. **Test in-game** (use the item, verify hooks work)
4. **Add to compendium** (via macro or console)
   ```javascript
   await updateItemInCompendium(item, 'elysium.elysium-items');
   ```
5. **Commit compendium changes** (git add + commit)
   ```bash
   git add packs/elysium-items/
   git commit -m "feat: add Aether's Leap to compendium"
   ```

**Create a macro for this workflow:**

```javascript
// Macro: Elysium Item to Compendium

const item = ui.items?.object;

if (!item) {
  ui.notifications.error("Select an item first!");
  return;
}

// Determine pack
const isAetherFuel = item.getFlag('elysium', 'isAetherFuel');
const packName = isAetherFuel ? 'elysium.aether-fuel' : 'elysium.elysium-items';

// Update compendium
const pack = game.packs.get(packName);
const index = await pack.getIndex();
const existing = index.find(i => i.name === item.name);

if (existing) {
  const oldItem = await pack.getDocument(existing._id);
  await oldItem.delete();
}

await pack.importDocument(item);

ui.notifications.info(`✅ ${item.name} → ${packName}`);

// Reminder to commit
console.log(`
Remember to commit:
git add packs/${isAetherFuel ? 'aether-fuel' : 'elysium-items'}/
git commit -m "feat: add ${item.name} to compendium"
`);
```

---

## Localization (i18n)

### Language Files

`lang/en.json`:

```json
{
  "MODULE.SettingName": "Setting Name",
  "MODULE.SettingHint": "Setting description",
  "MODULE.DialogTitle": "Dialog Title",
  "MODULE.ButtonLabel": "Click Me"
}
```

### Using Translations

```javascript
// In code
const text = game.i18n.localize("MODULE.DialogTitle");

// With formatting
const formatted = game.i18n.format("MODULE.Message", {
  name: actor.name,
  value: 10
});
// en.json: "MODULE.Message": "{name} gained {value} HP"

// In HTML
<h3>{$  MODULE.DialogTitle  $}</h3>
```

---

## Best Practices

### Module Structure

✅ **DO:**
- Organize code into focused files
- Use hooks instead of overwriting core functions
- Store module data in flags
- Provide settings for user preferences
- Localize all user-facing text
- Version your module (semver)
- Test with different Foundry versions

❌ **DON'T:**
- Modify core Foundry or system code directly
- Put all code in one massive file
- Hardcode strings in the UI
- Break compatibility with patches

### Hook Best Practices

```javascript
// ✅ Good - Specific hook
Hooks.on('dnd5e.useItem', (item) => {
  if (item.getFlag('my-module', 'special')) {
    // Handle special item
  }
});

// ❌ Bad - Too broad
Hooks.on('updateItem', (item) => {
  // This fires for EVERY item update!
});

// ✅ Good - Use Hooks.once for initialization
Hooks.once('ready', () => {
  // Only runs once
});

// ❌ Bad - Using Hooks.on for one-time setup
Hooks.on('ready', () => {
  // Runs every time, but should only run once
});
```

### Async/Await

```javascript
// ✅ Good
async function myFunction() {
  const roll = await new Roll("1d20").evaluate();
  await roll.toMessage();
  return roll.total;
}

// ❌ Bad - not awaiting promises
function myFunction() {
  const roll = new Roll("1d20").evaluate();  // Missing await!
  roll.toMessage();  // Missing await!
  return roll.total;  // Will be undefined!
}
```

---

## Common Patterns

### Detecting Module Presence

```javascript
// Check if midi-qol is active
const hasMidiQOL = game.modules.get('midi-qol')?.active;

if (hasMidiQOL) {
  // Use midi-qol features
}
```

### Wrapping Functions (libWrapper)

```javascript
// Using libWrapper for safe function wrapping
if (game.modules.get('lib-wrapper')?.active) {
  libWrapper.register('my-module', 'CONFIG.Item.documentClass.prototype.use', async function(wrapped, ...args) {
    console.log('Item used!');
    return wrapped(...args);  // Call original function
  }, 'WRAPPER');
}
```

### Custom Token HUD Button

```javascript
Hooks.on('renderTokenHUD', (app, html, data) => {
  const button = $(`
    <div class="control-icon" title="Custom Action">
      <i class="fas fa-bolt"></i>
    </div>
  `);

  button.click(async () => {
    const token = canvas.tokens.get(data._id);
    console.log(`Clicked button for ${token.name}`);
  });

  html.find('.col.right').append(button);
});
```

---

## Debugging

### Console Logging

```javascript
console.log('Module | Message');
console.warn('Module | Warning');
console.error('Module | Error');

// Inspect objects
console.log('Actor data:', actor);
console.table(actor.system.abilities);
```

### DevMode Integration

```javascript
// If DevMode module is active
function devLog(message, data) {
  if (game.modules.get('_dev-mode')?.api?.getPackageDebugValue('my-module')) {
    console.log(`DEBUG | ${message}`, data);
  }
}

devLog('Item used', item);
```

---

## When to Use This Skill

Activate when:
- Working with FoundryVTT core features
- Implementing D&D 5e mechanics
- Setting up hooks
- Creating module structure
- Working with actors, items, or rolls
- Integrating with midi-qol
- Debugging FoundryVTT issues
- Following FoundryVTT best practices

---

**Remember:** Use hooks, not hacks. Store data in flags. Make it modular. Test thoroughly.
