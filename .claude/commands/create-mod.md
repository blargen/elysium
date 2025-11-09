---
description: Create a mod item that requires aether fuel
argument-hint: [mod name] [type]
---

Create a mod item (equipment, weapon, feat, etc.) that uses aether fuel via MODULE HOOKS.

If arguments provided, use them. Otherwise, ask the user:
- Mod name
- Item type (equipment, weapon, feat, consumable, etc.)
- What does it do?
- Any special properties?

Generate the item JSON with:
- Proper D&D 5e item structure
- `flags.elysium.requiresAether: true`
- Optional `flags.elysium.modType` for categorization
- NO OnUse macros

Explain how the module hook will detect this item and trigger the aether selection flow automatically.
