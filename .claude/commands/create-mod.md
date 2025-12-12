---
description: Create an aether-powered mod item
argument-hint: [optional: item name]
---

Create an aether-powered mod item by gathering requirements, then generate a Foundry macro using the ElysiumItemCreator utility.

**Workflow:**

1. Ask user for item details:
   - Item name
   - What does it do? (description)
   - Item type (equipment, consumable, weapon, feat)
   - Rarity (common, uncommon, rare, very rare, legendary)
   - Body slot if equipment (head, chest, hands, feet, arms, legs, neck, back, waist, wrist, finger)
   - **Image:** Does an image exist in assets/ folder?
     - If yes: What's the filename?
     - If no: Use placeholder, remind to add later
   - Spell/effect it mimics (if applicable)
   - Duration and concentration (if applicable)
   - Any special mechanics or class requirements

2. Generate a Foundry macro that:
   - Calls `window.ElysiumItemCreator.createAetherItem()` with config
   - Handles compendium management automatically

3. Provide the macro code to paste into Foundry

4. Explain how module hooks will detect this item automatically (no item macros needed!)

5. Remind user to:
   - Test in-game
   - Run tests if logic was added
   - Commit changes

**Item flags to include:**
- `flags.elysium.requiresAether: true`
- `flags.elysium.isAethers{Name}: true` (detection flag, camelCase)
- `flags.elysium.modType`: Optional categorization
- `flags.elysium.category: "aether-items"`

**Example output:**
```javascript
// Paste into a Foundry macro and run!

await window.ElysiumItemCreator.createAetherItem({
  name: "Aether's Leap",
  description: `
    <p>Enchanted boots that let you cast Jump on yourself using aether fuel.</p>
    <p><strong>Jump:</strong> For 1 minute, jump up to 30 feet by spending 10 feet of movement.</p>
    <p><em>Duration: 1 minute (concentration)</em></p>
  `,
  img: "modules/elysium/assets/AethersLeap.png",
  rarity: "uncommon",
  flagName: "isAethersLeap",
  activityName: "Activate Aether's Leap",
  activationType: "action",
  activationValue: 1
});
```

**Key point:** Items are just data with flags. The module detects them via hooks and handles all the aether fuel logic automatically. No item macros needed!
