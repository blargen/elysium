---
description: Create an aether-powered item directly in the compendium
argument-hint: [optional: item name]
---

Create a complete aether-powered item by asking questions, then generate a console script that creates it directly in the Foundry compendium.

**Workflow:**
1. Ask user for item details:
   - Item name
   - Description (what it does)
   - Item type (equipment, consumable, etc.)
   - Rarity (common, uncommon, rare, etc.)
   - Body slot (if equipment: head, chest, hands, etc.)
   - Icon/image path
   - Which spell/effect it mimics (if applicable)
   - Duration (if applicable)
   - Concentration required? (if applicable)
   - Any special mechanics

2. Generate a complete Foundry console script that:
   - Creates the item with all D&D 5e properties
   - Sets all required Elysium flags
   - Adds it directly to the compendium
   - Prints confirmation

3. Provide the script to copy/paste into Foundry's console

4. Remind user to:
   - Test the item in-game
   - Run tests
   - Commit compendium changes

**Item properties to gather:**
- `name`: Item name (e.g., "Aether's Leap")
- `type`: Item type ("equipment", "consumable", "weapon", "feat")
- `system.description.value`: HTML description
- `system.rarity`: Rarity tier
- `system.armor.type.value`: Body slot (if equipment)
- `img`: Icon path (e.g., "modules/elysium/assets/ItemName.png")
- `flags.elysium.isAethers{Name}`: Detection flag (camelCase)
- `flags.elysium.requiresAether`: true

**Example output:**
```javascript
// Copy and paste this into Foundry console (F12)
const itemData = {
  name: "Aether's Leap",
  type: "equipment",
  img: "modules/elysium/assets/AethersLeap.png",
  system: {
    description: {
      value: "<p>Allows you to cast Jump on yourself using aether fuel...</p>"
    },
    rarity: "uncommon",
    armor: {
      type: { value: "feet" }
    },
    identified: true
  },
  flags: {
    elysium: {
      isAethersLeap: true,
      requiresAether: true
    }
  }
};

const pack = game.packs.get('elysium.elysium-items');
const item = await Item.create(itemData);
await pack.importDocument(item);
await item.delete();
ui.notifications.info("✅ Aether's Leap created in compendium!");
console.log("Item created successfully. Remember to commit!");
```

**After generating script:**
- Explain what the script does
- Tell user to paste it into Foundry console
- Remind them to test it in-game
- Remind them to commit with: `git add packs/elysium-items/ && git commit -m "feat: add [Item Name] to compendium"`
