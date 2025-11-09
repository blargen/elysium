---
description: Create an aether fuel item with proper flags (no macros needed)
argument-hint: [item name] [quality tier]
---

Create an aether fuel consumable item using MODULE HOOKS (no macros).

If arguments provided, use them. Otherwise, ask the user:
- Item name
- Aether quality (unrefined, basic-refined, rarefied, prometheum, wild)
- Number of uses (default: 5)
- Description/lore

Generate the item JSON with:
- Proper D&D 5e consumable structure
- `flags.elysium.isAetherFuel: true`
- `flags.elysium.aetherQuality` set correctly
- Uses tracking configured
- NO OnUse macros

Provide the JSON and explain how the module will automatically handle this item via hooks.
