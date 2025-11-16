---
name: elysium-item-builder
description: Expert in creating Elysium items using MODULE HOOKS (no item macros). Understands flag structures, mod items, integration patterns, and dramatic UX. Items are just data - the module does all the magic. Use when designing items or working with item creation workflows.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Elysium Item Builder

You are an expert at creating items for Elysium using **MODULE HOOKS** - the modern, maintainable way.

## 🔥 THE MODULE HOOKS PHILOSOPHY 🔥

**Items = Data Only (flags, no macros)**
**Module = All the Logic (one place to rule them all)**

```
❌ OLD WAY: Item Macros
- Copy/paste macros to every item
- Update 50 items when logic changes
- Nightmare maintenance

✅ NEW WAY: Module Hooks
- Items just have flags
- Module detects and handles automatically
- Update once, all items benefit
- ZERO copy/paste
```

---

## Item Types in Elysium

### 1. Aether Fuel Items

Consumable items that power mods.

**Flag Pattern:**
```javascript
flags: {
  elysium: {
    isAetherFuel: true,
    aetherQuality: "basic-refined"  // or unrefined, rarefied, prometheum, wild
  }
}
```

**Details:** See `elysium-aether-fuel` skill

### 2. Mod Items

Equipment/items that consume aether fuel.

**Flag Pattern:**
```javascript
flags: {
  elysium: {
    requiresAether: true,
    modType: "spell-storage"  // Optional categorization
  }
}
```

**Examples:**
- `modType: "spell-storage"` - Items like Aether's Grasp
- `modType: "weapon-enhancement"` - Weapon mods
- `modType: "armor-enhancement"` - Armor mods
- `modType: "utility"` - Miscellaneous mods

### 3. Regular Items

Standard D&D 5e items without aether mechanics.

No special flags needed - just normal D&D 5e item structure.

---

## General Item Structure

```javascript
{
  name: "Item Name",
  type: "equipment",  // or weapon, consumable, feat, etc.
  img: "modules/elysium/assets/icons/item-icon.png",
  system: {
    // D&D 5e specific properties
    description: {
      value: "<p>Item description with lore and mechanics</p>"
    },
    quantity: 1,
    weight: 1,
    price: { value: 50, denomination: "gp" },
    equipped: false,
    identified: true,
    rarity: "uncommon",
    attunement: 0,  // 0=none, 1=required, 2=attuned

    // If consumable
    uses: {
      value: 5,
      max: 5,
      per: "charges",  // or "sr", "lr", "day"
      autoDestroy: false
    },

    // If weapon
    weaponType: "martial",
    damage: {
      parts: [["1d8", "slashing"]],
      versatile: ""
    },
    properties: {
      // fin: true, ver: true, etc.
    }
  },
  flags: {
    elysium: {
      // Elysium-specific flags here
    }
  }
}
```

---

## Module Hook Detection Pattern

The module detects items by their flags and handles them automatically:

```javascript
// In scripts/elysium.js or similar

Hooks.on('dnd5e.useItem', async (item, config, options) => {
  const actor = item.actor;

  // Check if this item requires aether
  if (item.getFlag("elysium", "requiresAether")) {
    // Trigger aether selection and consumption
    const aether = await ElysiumFuel.promptAetherSelection(actor, item);
    if (!aether) return false;  // Cancelled

    const modifiers = await ElysiumFuel.consumeAether(actor, aether, item);
    if (!modifiers) return false;  // Failed

    // Apply modifiers to the item usage
    // ... specific logic based on item type
  }

  // Check for specific mod types
  const modType = item.getFlag("elysium", "modType");

  if (modType === "spell-storage") {
    // Handle Aether's Grasp type items
    await handleSpellStorageItem(actor, item);
    return false;  // Prevent default
  }

  if (modType === "weapon-enhancement") {
    // Handle weapon mods
    await handleWeaponMod(actor, item, modifiers);
  }

  // ... more mod types
});
```

---

## Flag Naming Conventions

**Namespace:** Always use `flags.elysium.*` to avoid conflicts

**Common Patterns:**

### Identification Flags
- `isAetherFuel: boolean` - This is a fuel item
- `requiresAether: boolean` - This item needs fuel to work
- `modType: string` - Category of mod

### Configuration Flags
- `maxStoredSpells: number` - Capacity limit
- `allowedSpellLevel: number` - Level restriction
- `customData: object` - Item-specific data

### State Flags (on items)
- `storedSpells: array` - Aether's Grasp spell storage
- `charges: number` - Custom charge tracking
- `activated: boolean` - Activation state

### State Flags (on actors)
- `dailyDoses: number` - Unrefined aether uses
- `atl: number` - Aether Toxicity Level
- `activeEffects: array` - Custom effect tracking

---

## Creating Items: Template Functions

### Basic Aether Fuel

```javascript
function createAetherFuel(name, quality, uses = 5) {
  return {
    name: name,
    type: "consumable",
    img: `modules/elysium/assets/icons/aether-${quality}.png`,
    system: {
      consumableType: "potion",
      uses: { value: uses, max: uses, per: "charges" },
      description: {
        value: getAetherDescription(quality)
      }
    },
    flags: {
      elysium: {
        isAetherFuel: true,
        aetherQuality: quality
      }
    }
  };
}
```

### Basic Mod Item

```javascript
function createModItem(name, type = "equipment", modType = null) {
  return {
    name: name,
    type: type,
    img: `modules/elysium/assets/icons/${name.toLowerCase().replace(/\s/g, '-')}.png`,
    system: {
      equipped: false,
      attunement: 1,  // Most mods require attunement
      description: {
        value: "<p>Description here</p>"
      }
    },
    flags: {
      elysium: {
        requiresAether: true,
        modType: modType
      }
    }
  };
}
```

---

## Theme Integration

Elysium uses a cyberpunk-fantasy aesthetic with specific color schemes:

### Color Palette

```css
/* Primary Colors */
--elysium-blue: #1175D0;       /* Aether energy, success */
--elysium-orange: #D06C11;     /* Toxicity, danger */
--elysium-gold: #D4AF37;       /* Premium, prometheum */
--elysium-teal: #9bb8d3;       /* Secondary text */
--elysium-bg-dark: #05070c;    /* Background */
--elysium-bg-mid: #0d1018;     /* Background gradient */

/* Semantic Colors */
--elysium-success: #1175D0;
--elysium-warning: #D4AF37;
--elysium-danger: #D06C11;
--elysium-neutral: #9bb8d3;
```

### Chat Message Styling

```css
.aether-message {
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  text-align: center;
  color: #f0f8ff;
}

.aether-message-success {
  border: 2px solid #1175D0;
  background: linear-gradient(135deg, rgba(17,117,208,0.1), rgba(0,0,0,0.8));
}

.aether-message-toxicity {
  border: 2px solid #D06C11;
  background: linear-gradient(135deg, rgba(208,108,17,0.1), rgba(0,0,0,0.8));
}
```

### Dialog Styling

```css
.elysium-dialog {
  background:
    radial-gradient(circle at top left, rgba(17, 117, 208, 0.18) 0, transparent 55%),
    radial-gradient(circle at bottom right, rgba(208, 108, 17, 0.15) 0, transparent 50%),
    linear-gradient(145deg, #05070c, #0d1018 50%, #05070c 100%);
  border: 1px solid rgba(208, 108, 17, 0.45);
  box-shadow:
    0 0 25px rgba(0,0,0,0.85),
    0 0 20px rgba(17, 117, 208, 0.35);
}
```

---

## Integration Patterns

### With Aether Fuel System

```javascript
// Item has requiresAether: true
// Module hook triggers fuel selection automatically
Hooks.on('dnd5e.useItem', async (item, config, options) => {
  if (!item.getFlag("elysium", "requiresAether")) return;

  const actor = item.actor;
  const aether = await ElysiumFuel.promptAetherSelection(actor, item);
  if (!aether) return false;

  const modifiers = await ElysiumFuel.consumeAether(actor, aether, item);
  if (!modifiers) return false;

  // Now use modifiers in your item logic
  applyModifiersToItem(item, modifiers);
});
```

### With midi-qol

```javascript
// Modify workflow with aether bonuses
Hooks.on('midi-qol.preAttackRoll', async (workflow) => {
  const item = workflow.item;

  if (item.getFlag("elysium", "aetherModifiers")) {
    const mods = item.getFlag("elysium", "aetherModifiers");

    // Apply attack bonus
    workflow.attackBonus = (workflow.attackBonus || 0) + mods.attack;
  }
});

Hooks.on('midi-qol.preDamageRoll', async (workflow) => {
  const item = workflow.item;

  if (item.getFlag("elysium", "aetherModifiers")) {
    const mods = item.getFlag("elysium", "aetherModifiers");

    // Add damage bonus
    if (mods.damage) {
      workflow.damageRoll = new Roll(
        `${workflow.damageRoll.formula} + ${mods.damage}`
      );
    }
  }
});
```

---

## Item Creation Workflow

### 1. Design Phase

**Questions to ask:**
- What does this item do?
- Does it need aether fuel?
- What type of mod is it?
- What data needs to be stored?
- How does it integrate with existing systems?

### 2. Flag Structure Design

**Plan your flags:**
```javascript
flags: {
  elysium: {
    // Identification
    requiresAether: true,
    modType: "weapon-enhancement",

    // Configuration
    maxCharges: 3,
    rechargeRate: "dawn",

    // State (if stored on item)
    currentCharges: 3,
    lastUsed: null
  }
}
```

### 3. Create Item Data

Use template functions or write custom data structure.

### 4. Implement Module Hook

Write the hook that detects and handles your item.

### 5. Test

- Create item in FoundryVTT
- Use item
- Verify hook triggers
- Check that aether integration works
- Test edge cases

---

## Best Practices

### ✅ DO:

- **Use module hooks** for ALL logic
- **Store data in flags** only
- **Namespace flags** with `elysium`
- **Provide dramatic warnings** for dangerous choices
- **Show clear visual feedback**
- **Use the theme** (colors, styling, dramatic chat messages)
- **Integrate with aether system** for mods
- **Make it feel COOL**

### ❌ DON'T:

- **Put ANY logic in item macros**
- **Forget to consume resources** (uses, aether, etc.)
- **Skip warnings** for dangerous items
- **Make boring, generic dialogs**
- **Hardcode values** (use flags and settings)
- **Duplicate code** (use shared functions)
- **Break the theme** (style matters!)

---

## Debugging Tips

### Check if hook is firing

```javascript
Hooks.on('dnd5e.useItem', async (item, config, options) => {
  console.log('Item used:', item.name);
  console.log('Flags:', item.flags.elysium);
});
```

### Inspect item data

```javascript
// In console
const item = game.actors.getName("Character Name").items.getName("Item Name");
console.log(item);
console.log(item.flags.elysium);
```

### Test aether integration

```javascript
// Check if fuel detection works
const actor = game.actors.getName("Character Name");
const fuel = actor.items.filter(i => i.getFlag("elysium", "isAetherFuel"));
console.log('Available fuel:', fuel);
```

---

## Quick Reference

### Required Skills for Item Types

| Item Type | Primary Skill | Secondary Skills |
|-----------|---------------|------------------|
| Aether fuel | `elysium-aether-fuel` | - |
| Aether's Grasp | `elysium-aethers-grasp` | `elysium-aether-fuel` |
| Generic mod | `elysium-item-builder` | `elysium-aether-fuel` |
| Weapon mod | `elysium-item-builder` | `foundry-dnd5e`, `elysium-aether-fuel` |
| Regular item | `foundry-dnd5e` | - |

### Common Flags

**Fuel:**
- `isAetherFuel: true`
- `aetherQuality: "quality"`

**Mods:**
- `requiresAether: true`
- `modType: "category"`

**State (Actor):**
- `dailyDoses: number`
- `atl: number`

---

## When to Use This Skill

Activate when:
- Creating new Elysium items
- Designing mod mechanics
- Setting up flag structures
- Implementing item hooks
- Integrating items with aether system
- Theming item UI/chat messages
- Planning item workflows

---

**Remember:** Items are dumb. The module is smart. Flags are the bridge. Make it dramatic. Make it cool. MODULE HOOKS FOR LIFE! 🚀
