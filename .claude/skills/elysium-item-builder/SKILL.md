---
name: elysium-item-builder
description: Expert in creating Elysium items using MODULE HOOKS (no item macros). Understands the aether fuel system, selection flow, quality tier effects, and dramatic UX. Items are just data - the module does all the magic. Use when designing items, implementing aether mechanics, or working with the fuel system.
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

## Core Concept: Aether as Fuel

**The Flow:**

```
Player uses MOD
    ↓
Module hook detects it (checks flags)
    ↓
"Which aether fuel?"
    ↓
Player selects quality tier
    ↓
Aether consumed
    ↓
Effects applied (bonuses/penalties/toxicity)
    ↓
Mod activates with modifiers
```

**Aether = Consumable fuel items** (in inventory, have uses)
**Mods = Equipment/items that consume fuel** (to cast spells, activate abilities, etc.)

---

## Aether Quality Tiers

### 1. Unrefined Aether - DANGEROUS ⚠️

**Effect:** Penalties + Escalating Toxicity

**Mechanics:**
- Each use: CON save (DC = 8 + 2 × dailyDoses)
- Failed save → ATL increases
- Progressive conditions

**Toxicity Levels:**
```
ATL 1: Poisoned
ATL 2: Poisoned + Blinded + Exhaustion
ATL 3: Above + Aether Madness check
ATL 4: Above + Stunned check
ATL 5: Poisoned + Blinded + Paralyzed
```

**Resets:** Long rest clears dailyDoses, ATL, and conditions

**UX:** DRAMATIC WARNING DIALOG before use

### 2. Basic Refined - NEUTRAL

**Effect:** No bonuses, no penalties, no toxicity

Safe, standard fuel.

### 3. Rarefied - ENHANCED

**Effect:** Bonuses to attack/damage/DC

Better fuel, better results. (Exact bonuses TBD)

### 4. Prometheum - PREMIUM

**Effect:** Significant bonuses

Rare, powerful, stable.

### 5. Wild - CHAOTIC

**Effect:** Roll on Wild Magic table

Unpredictable!

---

## Module Hook Architecture

### The Main Hook (Item Usage Detection)

```javascript
// scripts/elysium.js or aether-system.js

Hooks.on('dnd5e.useItem', async (item, config, options) => {
  // Does this item need aether fuel?
  if (!item.getFlag("elysium", "requiresAether")) {
    return; // Not our concern
  }

  const actor = item.actor;

  // Prompt player to select aether
  const selectedAether = await ElysiumSystem.promptAetherSelection(actor, item);
  if (!selectedAether) {
    return; // Cancelled
  }

  // Consume the aether and get bonuses/penalties
  const modifiers = await ElysiumSystem.consumeAether(actor, selectedAether, item);
  if (!modifiers) {
    return; // Consumption failed (no uses, cancelled warning, etc.)
  }

  // Apply modifiers to the item usage
  // This depends on what the item does - might modify config, options, or create Active Effects
  applyModifiersToUsage(config, options, modifiers);
});
```

**That's it!** Now EVERY item with `flags.elysium.requiresAether: true` automatically triggers the aether system.

### The Aether Selection Dialog

```javascript
async function promptAetherSelection(actor, modItem) {
  // Find all aether fuel items in inventory
  const aetherItems = actor.items.filter(i =>
    i.getFlag("elysium", "isAetherFuel") &&
    (i.system.uses?.value || 0) > 0
  );

  if (aetherItems.length === 0) {
    ui.notifications.warn("No aether fuel available!");
    return null;
  }

  // Build selection UI
  const options = aetherItems.map(item => {
    const quality = item.getFlag("elysium", "aetherQuality");
    const uses = item.system.uses?.value || 0;
    const description = getQualityDescription(quality);

    return `
      <div class="aether-option" style="
        border: 1px solid #1175D0;
        padding: 8px;
        margin: 8px 0;
        border-radius: 4px;
        background: rgba(17,117,208,0.1);
      ">
        <input type="radio" name="aether" value="${item.id}" id="aether-${item.id}">
        <label for="aether-${item.id}">
          <strong>${item.name}</strong> (${uses} remaining)<br>
          <em style="font-size: 0.9em; color: #9bb8d3;">${description}</em>
        </label>
      </div>
    `;
  }).join('');

  return new Promise((resolve) => {
    new Dialog({
      title: `Fuel for ${modItem.name}`,
      content: `
        <div style="color: #f0f8ff;">
          <p>Select which aether to fuel this mod:</p>
          ${options}
        </div>
      `,
      buttons: {
        use: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "Use Aether",
          callback: (html) => {
            const selectedId = html.find('input[name="aether"]:checked').val();
            if (!selectedId) {
              ui.notifications.warn("No aether selected!");
              resolve(null);
              return;
            }
            const aether = aetherItems.find(i => i.id === selectedId);
            resolve(aether);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "use"
    }).render(true);
  });
}

function getQualityDescription(quality) {
  const descriptions = {
    "unrefined": "⚠️ TOXIC - Risk of toxicity buildup",
    "basic-refined": "⚪ Neutral - Safe, no bonuses",
    "rarefied": "🟢 Enhanced - Provides bonuses",
    "prometheum": "🟣 Premium - Significant bonuses",
    "wild": "🌀 Chaotic - Wild Magic effects"
  };
  return descriptions[quality] || "";
}
```

### The Consumption Handler

```javascript
async function consumeAether(actor, aetherItem, modItem) {
  const quality = aetherItem.getFlag("elysium", "aetherQuality");

  // Special handling for Unrefined
  if (quality === "unrefined") {
    const proceed = await showUnrefinedWarning(actor);
    if (!proceed) return null;
  }

  // Consume one use of aether
  const currentUses = aetherItem.system.uses?.value || 0;
  if (currentUses <= 0) {
    ui.notifications.warn(`No ${aetherItem.name} remaining!`);
    return null;
  }
  await aetherItem.update({"system.uses.value": currentUses - 1});

  // Handle effects based on quality
  let modifiers = { attack: 0, damage: "", dc: 0 };

  switch (quality) {
    case "unrefined":
      await handleUnrefinedToxicity(actor);
      modifiers = { attack: -2, damage: "-1d4", dc: -1 };
      break;

    case "basic-refined":
      // Neutral - no modifiers
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `
          <div class="aether-message aether-message-success">
            <h3 style="color: #1175D0; text-shadow: 0 0 6px rgba(17,117,208,0.8);">
              ⚡ AETHER CONSUMED ⚡
            </h3>
            <p><strong>${actor.name}</strong> uses Basic Refined Aether</p>
            <p style="color: #9bb8d3;">Clean energy flows through the mod.</p>
          </div>
        `
      });
      break;

    case "rarefied":
      modifiers = { attack: +1, damage: "+1d6", dc: +1 };
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `
          <div class="aether-message aether-message-success">
            <h3 style="color: #1175D0; text-shadow: 0 0 6px rgba(17,117,208,0.8);">
              ⚡ ENHANCED AETHER ⚡
            </h3>
            <p><strong>${actor.name}</strong> uses Rarefied Aether</p>
            <p style="color: #1175D0;">Enhanced power flows through the mod! (+1 attack, +1d6 damage, +1 DC)</p>
          </div>
        `
      });
      break;

    case "prometheum":
      modifiers = { attack: +2, damage: "+2d6", dc: +2 };
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `
          <div class="aether-message aether-message-success">
            <h3 style="color: #D4AF37; text-shadow: 0 0 10px rgba(212,175,55,0.8);">
              ✨ PROMETHEUM POWER ✨
            </h3>
            <p><strong>${actor.name}</strong> uses Prometheum</p>
            <p style="color: #D4AF37;">Maximum power surges through the mod! (+2 attack, +2d6 damage, +2 DC)</p>
          </div>
        `
      });
      break;

    case "wild":
      await rollWildMagic(actor);
      // Wild magic determines modifiers randomly
      break;
  }

  return modifiers;
}
```

### Unrefined Toxicity Warning

```javascript
async function showUnrefinedWarning(actor) {
  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const atl = actor.getFlag("elysium", "atl") || 0;
  const nextDC = 8 + 2 * (dailyDoses + 1);

  return new Promise((resolve) => {
    new Dialog({
      title: "⚠️ TOXICITY WARNING ⚠️",
      content: `
        <div style="
          border: 2px solid #D06C11;
          border-radius: 8px;
          padding: 15px;
          background: linear-gradient(135deg, rgba(208,108,17,0.1), rgba(0,0,0,0.8));
          color: #f0f8ff;
          text-align: center;
        ">
          <h3 style="
            color: #D06C11;
            font-size: 1.2rem;
            font-weight: bold;
            text-shadow: 0 0 8px rgba(208,108,17,0.8);
            margin-bottom: 10px;
          ">
            ☠️ UNREFINED AETHER IS TOXIC ☠️
          </h3>
          <p>You remember the dangers of using raw aether!</p>

          <div style="
            background: rgba(17,117,208,0.1);
            border: 1px solid #1175D0;
            border-radius: 4px;
            padding: 10px;
            margin: 12px 0;
          ">
            <strong>Current Status:</strong><br>
            Daily Doses: ${dailyDoses}<br>
            Aether Toxicity Level (ATL): ${atl}<br>
            <span style="color: #D06C11; font-weight: bold;">
              Next Save DC: ${nextDC}
            </span>
          </div>

          <p style="color: #D06C11; font-weight: bold; margin-top: 12px;">
            Are you sure you want to proceed?
          </p>
        </div>
      `,
      buttons: {
        proceed: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "⚡ Use Anyway",
          callback: () => resolve(true)
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "❌ Cancel",
          callback: () => resolve(false)
        }
      },
      default: "cancel"
    }).render(true);
  });
}
```

### Unrefined Toxicity Handler

```javascript
async function handleUnrefinedToxicity(actor) {
  // Increment daily doses
  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const newDailyDoses = dailyDoses + 1;
  await actor.setFlag("elysium", "dailyDoses", newDailyDoses);

  // Calculate DC
  const saveDC = 8 + (2 * newDailyDoses);

  // Roll CON save
  const roll = new Roll("1d20 + @abilities.con.mod", actor.getRollData());
  const conSave = await roll.evaluate();

  const success = conSave.total >= saveDC;

  // Show save result
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
      <div class="dice-roll">
        <div class="dice-result">
          <div class="dice-total ${success ? 'success' : 'failure'}">
            ${conSave.total}
          </div>
        </div>
        <div class="dice-flavor">
          Aether Toxicity Save (DC ${saveDC}) - Dose #${newDailyDoses}<br>
          ${success ? '✅ Success!' : '❌ Failure!'}
        </div>
      </div>
    `,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: conSave
  });

  if (success) {
    // Success - no new toxicity
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor}),
      content: `
        <div class="aether-message aether-message-success">
          <h3 style="color: #1175D0;">⚡ TOXICITY RESISTED ⚡</h3>
          <p><strong>${actor.name}</strong> successfully processes the toxic aether.</p>
          <p style="font-size: 0.9em; color: #9bb8d3;">
            Daily Doses: ${newDailyDoses} | ATL: ${actor.getFlag("elysium", "atl") || 0}
          </p>
        </div>
      `
    });
  } else {
    // Failed - increase ATL
    const currentATL = actor.getFlag("elysium", "atl") || 0;
    const newATL = currentATL + 1;
    await actor.setFlag("elysium", "atl", newATL);

    await applyToxicityEffects(actor, newATL, saveDC);

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor}),
      content: `
        <div class="aether-message aether-message-toxicity">
          <h3 style="color: #D06C11; text-shadow: 0 0 8px rgba(208,108,17,0.8);">
            ☠️ TOXICITY OVERLOAD ☠️
          </h3>
          <p><strong>${actor.name}</strong> fails to process the toxic aether!</p>
          <p style="color: #D06C11; font-weight: bold;">
            ATL increased to: <strong>${newATL}</strong>
          </p>
          <p style="font-size: 0.9em;">Daily Doses: ${newDailyDoses}</p>
        </div>
      `
    });
  }
}

async function applyToxicityEffects(actor, atl, dc) {
  // Progressive effects
  const effects = {
    1: { conditions: ["poisoned"], exhaustion: false },
    2: { conditions: ["poisoned", "blinded"], exhaustion: true },
    3: { conditions: ["poisoned", "blinded"], exhaustion: false, checks: ["madness"] },
    4: { conditions: ["poisoned", "blinded"], exhaustion: true, checks: ["madness", "stunned"] },
    5: { conditions: ["poisoned", "blinded", "paralyzed"], exhaustion: false }
  };

  const effect = effects[Math.min(atl, 5)];

  // Apply conditions
  for (const condition of effect.conditions) {
    const existing = actor.effects.find(e => e.statuses?.has(condition));
    if (!existing) {
      await actor.toggleStatusEffect(condition, {active: true});
    }
  }

  // Add exhaustion
  if (effect.exhaustion) {
    const current = actor.system.attributes?.exhaustion || 0;
    await actor.update({"system.attributes.exhaustion": current + 1});
  }

  // Special checks
  if (effect.checks?.includes("madness")) {
    await checkAetherMadness(actor, dc);
  }
  if (effect.checks?.includes("stunned")) {
    await checkStunned(actor, dc);
  }
}
```

### Long Rest Hook

```javascript
Hooks.on('dnd5e.restCompleted', async (actor, restData) => {
  if (!restData.longRest) return;

  const dailyDoses = actor.getFlag("elysium", "dailyDoses") || 0;
  const atl = actor.getFlag("elysium", "atl") || 0;

  if (dailyDoses === 0 && atl === 0) return; // Nothing to reset

  // Reset toxicity
  await actor.setFlag("elysium", "dailyDoses", 0);
  await actor.setFlag("elysium", "atl", 0);

  // Remove conditions
  const conditions = ["poisoned", "blinded", "paralyzed"];
  for (const condition of conditions) {
    const effect = actor.effects.find(e => e.statuses?.has(condition));
    if (effect) await effect.delete();
  }

  // Reset exhaustion
  await actor.update({"system.attributes.exhaustion": 0});

  // Recovery message
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
      <div class="aether-message aether-message-success">
        <h3 style="color: #1175D0; text-shadow: 0 0 6px rgba(17,117,208,0.8);">
          🌅 AETHER RECOVERY 🌅
        </h3>
        <p><strong>${actor.name}</strong> completes a long rest</p>
        <p style="color: #9bb8d3;">
          Their body purges the accumulated aether toxins.
        </p>
        <p style="font-size: 0.85em; color: #D06C11;">
          Daily Doses: ${dailyDoses} → 0 | ATL: ${atl} → 0
        </p>
      </div>
    `
  });

  ui.notifications.info(`${actor.name} recovers from aether toxicity!`);
});
```

---

## Item Structure

### Aether Fuel Items (Consumables)

```javascript
{
  name: "Unrefined Aether Vial",
  type: "consumable",
  img: "path/to/icon.png",
  system: {
    consumableType: "potion",
    uses: {
      value: 5,
      max: 5,
      per: "charges",
      autoDestroy: false
    },
    description: {
      value: "<p>Raw, unprocessed aether. Extremely dangerous.</p>"
    }
  },
  flags: {
    elysium: {
      isAetherFuel: true,
      aetherQuality: "unrefined"
    }
  }
}
```

**Other fuel items:** Just change `aetherQuality` to `"basic-refined"`, `"rarefied"`, `"prometheum"`, or `"wild"`.

### Mod Items (Use Fuel)

```javascript
{
  name: "Aether's Grasp",
  type: "equipment",
  img: "path/to/icon.png",
  system: {
    // Normal item properties
    equipped: true,
    attunement: 1  // Requires attunement
  },
  flags: {
    elysium: {
      requiresAether: true,
      modType: "spell-storage"  // Optional categorization
    }
  }
}
```

**That's it!** No macros. Just flags. The module handles everything.

---

## Creating Items the Easy Way

### Template Functions

```javascript
// In your module or a helper script
function createAetherFuel(name, quality, uses = 5) {
  return {
    name: name,
    type: "consumable",
    system: {
      uses: { value: uses, max: uses, per: "charges" }
    },
    flags: {
      elysium: {
        isAetherFuel: true,
        aetherQuality: quality
      }
    }
  };
}

function createAetherMod(name, type = "equipment") {
  return {
    name: name,
    type: type,
    flags: {
      elysium: {
        requiresAether: true
      }
    }
  };
}

// Usage:
const unrefinedVial = createAetherFuel("Unrefined Aether Vial", "unrefined", 5);
const aethersGrasp = createAetherMod("Aether's Grasp");
```

---

## Theme Integration

You mentioned loving the theme from aether-world! Here's how to integrate it:

### CSS Classes for Chat Messages

```css
/* styles/elysium.css */

.aether-message {
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  text-align: center;
  color: #f0f8ff;
}

.aether-message h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
}

.aether-message-success {
  border: 2px solid #1175D0;
  background: linear-gradient(135deg, rgba(17,117,208,0.1), rgba(0,0,0,0.8));
}

.aether-message-toxicity {
  border: 2px solid #D06C11;
  background: linear-gradient(135deg, rgba(208,108,17,0.1), rgba(0,0,0,0.8));
}

.aether-message-warning {
  border: 2px solid #D4AF37;
  background: linear-gradient(135deg, rgba(212,175,55,0.1), rgba(0,0,0,0.8));
}
```

### Module Settings for Theme

```javascript
// In scripts/elysium.js
Hooks.once('init', () => {
  game.settings.register('elysium', 'themeEnabled', {
    name: 'Enable Elysium Theme',
    hint: 'Toggle the cyberpunk-fantasy UI theme',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      if (value) {
        document.body.classList.add('elysium-theme');
      } else {
        document.body.classList.remove('elysium-theme');
      }
    }
  });
});

Hooks.once('ready', () => {
  if (game.settings.get('elysium', 'themeEnabled')) {
    document.body.classList.add('elysium-theme');
  }
});
```

---

## Best Practices

### ✅ DO:
- Use module hooks for ALL logic
- Store data in flags only
- Provide dramatic warnings for dangerous choices
- Show clear visual feedback
- Track toxicity on actor flags
- Reset on long rest
- Make it feel COOL

### ❌ DON'T:
- Put ANY logic in item macros
- Forget to consume aether uses
- Skip warnings for Unrefined
- Make choices boring
- Hardcode values

---

## Quick Reference

### Item Flags:

**Fuel Items:**
- `flags.elysium.isAetherFuel: true`
- `flags.elysium.aetherQuality: "unrefined"` (or other tier)

**Mod Items:**
- `flags.elysium.requiresAether: true`
- `flags.elysium.modType: "spell-storage"` (optional)

### Actor Flags:

- `flags.elysium.dailyDoses: 0` (number of Unrefined uses today)
- `flags.elysium.atl: 0` (Aether Toxicity Level)

### Module Exports:

```javascript
window.ElysiumSystem = {
  promptAetherSelection,
  consumeAether,
  handleUnrefinedToxicity,
  // etc.
};
```

---

## When to Use This Skill

Activate when:
- Creating aether fuel items
- Creating mods that use aether
- Setting up module hooks
- Implementing toxicity system
- Adding dramatic UX
- Debugging aether flow
- Theming chat messages

---

**Remember:** Items are dumb. The module is smart. Flags are the bridge. Make it dramatic. Make it cool. MODULE HOOKS FOR LIFE! 🚀
