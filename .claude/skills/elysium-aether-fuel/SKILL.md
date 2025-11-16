---
name: elysium-aether-fuel
description: Expert in the Elysium aether fuel system. Understands all 5 quality tiers, toxicity mechanics, consumption logic, selection dialogs, and long rest resets. Use when working with aether fuel items or implementing fuel-related mechanics.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Elysium Aether Fuel System

You are an expert in the Elysium aether fuel system - the resource that powers all modifications.

## Core Concept

**Aether = Consumable fuel** (in inventory, has uses)
**Mods = Items that consume fuel** (to activate abilities, cast spells, etc.)

**The Flow:**
```
Player uses MOD
    ↓
Module hook detects it
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

---

## The 5 Aether Quality Tiers

### 1. Unrefined Aether - DANGEROUS ⚠️

**Effect:** Penalties + Escalating Toxicity

**Mechanics:**
- Each use: CON save (DC = 8 + 2 × dailyDoses)
- Failed save → ATL (Aether Toxicity Level) increases
- Progressive conditions stack

**Toxicity Levels:**
```
ATL 1: Poisoned
ATL 2: Poisoned + Blinded + Exhaustion +1
ATL 3: Above + Aether Madness check
ATL 4: Above + Exhaustion +1 (total +2) + Stunned check
ATL 5: Poisoned + Blinded + Paralyzed
```

**Actor Flags:**
- `flags.elysium.dailyDoses` - Number of unrefined uses today
- `flags.elysium.atl` - Current Aether Toxicity Level

**Resets:** Long rest clears dailyDoses, ATL, and conditions

**UX:** DRAMATIC WARNING DIALOG before use


### 2. Basic Refined - NEUTRAL

**Effect:** No bonuses, no penalties, no toxicity

Safe, standard fuel. The baseline.

**Modifiers:** None

### 3. Rarefied - ENHANCED

**Effect:** Bonuses to attack/damage/DC

**Modifiers:**
- Attack: +1
- Damage: +1
- Spell Attack: +1
- Spell Damage: +1

### 4. Prometheum - PREMIUM

**Effect:** Significant bonuses

Rare, powerful, stable.

**Modifiers:**
- Attack: +5
- Damage: +5
- Spell Attack: +5
- Spell Damage: +5

### 5. Wild - CHAOTIC

**Effect:** Roll on Wild Magic table

Unpredictable! Can be amazing or catastrophic.

**Modifiers:** Determined by Wild Magic roll

---

## Aether Fuel Item Structure

All aether fuel items follow this pattern:

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
      aetherQuality: "unrefined"  // or "basic-refined", "rarefied", "prometheum", "wild"
    }
  }
}
```

**Key Flags:**
- `flags.elysium.isAetherFuel: true` - Identifies this as fuel
- `flags.elysium.aetherQuality` - Which tier (see above)

**NO MACROS!** The module handles everything via hooks.

---

## Aether Selection Dialog

When a mod needs fuel, show this dialog:

```javascript
async function promptAetherSelection(actor, modItem) {
  // Find all aether fuel items in inventory with uses remaining
  const aetherItems = actor.items.filter(i =>
    i.getFlag("elysium", "isAetherFuel") &&
    (i.system.uses?.value || 0) > 0
  );

  if (aetherItems.length === 0) {
    ui.notifications.warn("No aether fuel available!");
    return null;
  }

  // Build selection UI with quality descriptions
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

---

## Aether Consumption Logic

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
            <p style="color: #1175D0;">Enhanced power! (+1 attack, +1d6 damage, +1 DC)</p>
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
            <p style="color: #D4AF37;">Maximum power! (+2 attack, +2d6 damage, +2 DC)</p>
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

---

## Unrefined Toxicity System

### Warning Dialog

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

### Toxicity Handler

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
  await conSave.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `Aether Toxicity Save (DC ${saveDC}) - Dose #${newDailyDoses}<br>${success ? '✅ Success!' : '❌ Failure!'}`
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
  // ATL 2 and 4 both add exhaustion levels
  const effects = {
    1: { conditions: ["poisoned"], addExhaustion: false },
    2: { conditions: ["poisoned", "blinded"], addExhaustion: true },
    3: { conditions: ["poisoned", "blinded"], addExhaustion: false, checks: ["madness"] },
    4: { conditions: ["poisoned", "blinded"], addExhaustion: true, checks: ["madness", "stunned"] },
    5: { conditions: ["poisoned", "blinded", "paralyzed"], addExhaustion: false }
  };

  const effect = effects[Math.min(atl, 5)];

  // Apply conditions
  for (const condition of effect.conditions) {
    const existing = actor.effects.find(e => e.statuses?.has(condition));
    if (!existing) {
      await actor.toggleStatusEffect(condition, {active: true});
    }
  }

  // Add exhaustion (happens at ATL 2 and ATL 4)
  if (effect.addExhaustion) {
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

---

## Long Rest Reset

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

## Quick Reference

### Item Flags
- `flags.elysium.isAetherFuel: true` - This is a fuel item
- `flags.elysium.aetherQuality: "quality"` - Which tier

### Actor Flags
- `flags.elysium.dailyDoses: 0` - Unrefined uses today
- `flags.elysium.atl: 0` - Aether Toxicity Level

### Quality Values
- `"unrefined"` - Toxic, penalties, toxicity system
- `"basic-refined"` - Neutral, safe
- `"rarefied"` - Enhanced bonuses
- `"prometheum"` - Premium bonuses
- `"wild"` - Wild Magic

---

## When to Use This Skill

Activate when:
- Creating aether fuel items
- Implementing fuel selection dialogs
- Handling toxicity mechanics
- Working on long rest resets
- Debugging fuel consumption
- Designing new quality tiers
- Balancing aether effects

---

**Remember:** Aether is the FUEL, not the item. Mods consume it. Toxicity is DRAMATIC. Make it feel dangerous!
