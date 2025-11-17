---
description: Create an aether-powered item directly in the compendium
argument-hint: [optional: item name]
---

Create a complete aether-powered item by asking questions, then generate a simple macro that uses the Elysium item creator utility.

**Workflow:**
1. Ask user for item details:
   - Item name
   - Description (what it does)
   - Item type (equipment, consumable, etc.)
   - Rarity (common, uncommon, rare, etc.)
   - Body slot (if equipment: head, chest, hands, feet, etc.)
   - **Image/Icon:** Ask if image exists in assets/ folder
     - If yes: What's the filename? (e.g., "AethersLeap.png")
     - If no: Note that placeholder will be used, remind to add image later
   - Which spell/effect it mimics (if applicable)
   - Duration (if applicable)
   - Concentration required? (if applicable)
   - Any special mechanics

2. Generate a clean Foundry macro that:
   - Calls window.ElysiumItemCreator.createAetherItem() with config
   - Handles all the compendium management automatically
   - No escaping or quoting issues!

3. Provide the macro code to paste into a Foundry macro

4. Remind user to:
   - Test the item in-game
   - Run tests
   - Commit compendium changes

**Item properties to gather:**
- `name`: Item name (e.g., "Aether's Leap")
- `type`: Item type ("equipment", "consumable", "weapon", "feat")
- `system.description.value`: HTML description
- `system.rarity`: Rarity tier ("common", "uncommon", "rare", "very rare", "legendary")
- `system.armor.type.value`: Body slot if equipment ("head", "chest", "hands", "feet", "arms", "legs", "neck", "back", "waist", "wrist", "finger")
- `img`: Icon path
  - If image exists: "modules/elysium/assets/{filename}.png"
  - If not: "icons/svg/item-bag.svg" (placeholder, remind user to add later)
- `flags.elysium.isAethers{Name}`: Detection flag (camelCase, e.g., "isAethersLeap")
- `flags.elysium.requiresAether`: true
- `flags.elysium.category`: "aether-items"

**Example output:**
```javascript
// Paste this into a Foundry macro and run it!

await window.ElysiumItemCreator.createAetherItem({
  name: "Aether's Leap",
  description: `
    <p>Enchanted boots that allow you to cast the Jump spell on yourself using aether fuel.</p>
    <p><strong>Jump:</strong> For the next minute, you can jump up to 30 feet by spending 10 feet of movement.</p>
    <p><em>Duration: 1 minute (concentration)</em></p>
  `,
  img: "modules/elysium/assets/AethersLeap.png",
  rarity: "uncommon",
  flagName: "isAethersLeap",
  activityName: "Activate Aether's Leap",
  activationType: "action",
  activationValue: 1
});

// Remember to commit:
// git add packs/elysium-items/ && git commit -m "feat: add Aether's Leap to compendium"
```

**After generating macro:**
- Explain what the macro does
- Tell user to:
  1. Create a new macro in Foundry (Macro Directory → Create Macro)
  2. Paste the code
  3. Run it
  4. Item will appear in compendium automatically!
- If placeholder image was used, remind them to:
  - Add the actual image to `assets/` folder
  - Re-run the macro with updated image path
- Remind them to test it in-game
- Remind them to commit with: `git add packs/elysium-items/ assets/ scripts/ && git commit -m "feat: add [Item Name] to compendium"`
