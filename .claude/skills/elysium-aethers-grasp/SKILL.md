---
name: elysium-aethers-grasp
description: Expert on Aether's Grasp, the flagship Elysium item. A hand modification that stores spells on fingers and casts them using aether fuel. Understands imprinting from scrolls, casting from fingers, and integration with the aether fuel system using MODULE HOOKS (no macros).
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Aether's Grasp

You are an expert on **Aether's Grasp**, the flagship item of the Elysium module.

## What is Aether's Grasp?

**Type:** Hand Modification (Equipment)

**Core Concept:** A cyberpunk-fantasy hand augmentation that allows you to imprint spells from scrolls onto your fingers, then cast them using aether fuel.

**The Fantasy:**
> Your hand shimmers with arcane circuits. Each finger can store a spell, ready to be unleashed with a gesture and a surge of aether.

---

## The Workflow

### 1. Imprint From Scroll

**Player Action:** Uses Aether's Grasp → Selects "Imprint From Scroll"

**What Happens:**
1. Module hook detects the action
2. Scans actor's inventory for **1st level spell scrolls**
3. Shows dialog with 5 finger slots (Thumb, Index, Middle, Ring, Pinky)
4. Empty fingers show dropdown to select a scroll
5. Occupied fingers show current spell (read-only)
6. Player selects scrolls for empty fingers
7. Clicks "Imprint Selected Spells"
8. Scrolls are consumed (uses or quantity reduced/deleted)
9. Spell data is extracted and stored in item flags
10. Success message in chat

### 2. Cast From Finger

**Player Action:** Uses Aether's Grasp → Selects "Cast From Finger"

**What Happens:**
1. Module hook detects the action
2. Shows dialog with finger slots and stored spells
3. Player selects which finger to cast from
4. **Aether selection dialog appears** (integrated with fuel system)
5. Player chooses aether quality (unrefined, basic, rarefied, etc.)
6. Aether is consumed, effects/toxicity applied
7. Spell is cast with modifiers from aether quality
8. Spell remains stored (can be cast again with more aether)

### 3. Delete From Finger (Future)

Remove a spell from a finger to free up the slot.

---

## Item Structure

```javascript
{
  name: "Aether's Grasp",
  type: "equipment",
  img: "modules/elysium/assets/icons/aethers-grasp.png",
  system: {
    equipped: true,
    attunement: 1,  // Requires attunement
    description: {
      value: `
        <p>A hand modification that allows you to store spells on your fingers.</p>
        <p><strong>Capacity:</strong> 5 spells (one per finger)</p>
        <p><strong>Spell Level:</strong> 1st level only</p>
        <p><strong>Fuel:</strong> Requires aether to cast stored spells</p>
      `
    }
  },
  flags: {
    elysium: {
      requiresAether: true,  // Triggers aether selection when casting
      modType: "spell-storage",
      maxStoredSpells: 5,
      allowedSpellLevel: 1,
      storedSpells: []  // Array of spell data objects
    }
  }
}
```

---

## Stored Spell Data Structure

Each stored spell is an object in the `flags.elysium.storedSpells` array:

```javascript
{
  id: "randomID",           // Unique identifier
  fingerIndex: 0,           // 0=Thumb, 1=Index, 2=Middle, 3=Ring, 4=Pinky
  fingerName: "Thumb",      // Human-readable
  spellData: {              // Full spell item data
    name: "Magic Missile",
    type: "spell",
    system: { /* spell properties */ }
  },
  imprintedAt: 1234567890,  // Timestamp
  originalScrollName: "Spell Scroll: Magic Missile"
}
```

**Important:** Store the FULL spell data, not just the name. This allows casting even if the scroll is removed from compendia.

---

## Module Hook Architecture

### Main Hook (Detect Usage)

```javascript
Hooks.on('dnd5e.useItem', async (item, config, options) => {
  // Only handle Aether's Grasp
  if (item.getFlag("elysium", "modType") !== "spell-storage") return;

  const actor = item.actor;

  // Show action selection dialog
  const action = await promptAethersGraspAction(actor, item);

  if (action === "imprint") {
    await handleImprintFromScroll(actor, item);
  } else if (action === "cast") {
    await handleCastFromFinger(actor, item);
  } else if (action === "delete") {
    await handleDeleteFromFinger(actor, item);
  }

  return false; // Prevent default item usage
});
```

### Action Selection Dialog

```javascript
async function promptAethersGraspAction(actor, item) {
  return new Promise((resolve) => {
    new Dialog({
      title: "Aether's Grasp",
      content: `
        <div style="text-align: center; color: #f0f8ff;">
          <p>What would you like to do?</p>
        </div>
      `,
      buttons: {
        imprint: {
          icon: '<i class="fas fa-scroll"></i>',
          label: "Imprint From Scroll",
          callback: () => resolve("imprint")
        },
        cast: {
          icon: '<i class="fas fa-hand-sparkles"></i>',
          label: "Cast From Finger",
          callback: () => resolve("cast")
        },
        delete: {
          icon: '<i class="fas fa-eraser"></i>',
          label: "Delete From Finger",
          callback: () => resolve("delete")
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "cast"
    }).render(true);
  });
}
```

---

## Imprint From Scroll Implementation

```javascript
async function handleImprintFromScroll(actor, item) {
  const MAX_STORED_SPELLS = item.getFlag("elysium", "maxStoredSpells") || 5;
  const storedSpells = item.getFlag("elysium", "storedSpells") || [];

  // Find 1st level spell scrolls
  const scrolls = actor.items.filter(scroll =>
    scroll.type === "consumable" &&
    scroll.system.type?.value === "scroll" &&
    scroll.system.uses?.value > 0 &&
    scroll.system.identifier === "spell-scroll-1st-level"
  );

  if (scrolls.length === 0) {
    ui.notifications.warn("You have no 1st level spell scrolls to imprint!");
    return;
  }

  if (storedSpells.length >= MAX_STORED_SPELLS) {
    ui.notifications.error(`Aether's Grasp can only store ${MAX_STORED_SPELLS} spells at once!`);
    return;
  }

  // Show finger selection dialog (see full implementation in old code)
  const fingerNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

  // Build table with dropdowns for empty fingers
  // ... (full dialog code from imprint-from-scroll-final.js)

  // On imprint:
  // 1. Extract spell from scroll
  // 2. Find spell in compendiums
  // 3. Store spell data in flags
  // 4. Consume scroll
  // 5. Show success message
}
```

**Key Steps:**
1. Filter for 1st level scrolls with uses
2. Build UI showing occupied/empty fingers
3. Let player select scrolls for empty fingers
4. Extract spell data from compendiums (not just name)
5. Update `flags.elysium.storedSpells` array
6. Consume scrolls (reduce uses/quantity or delete)
7. Create chat message showing what was imprinted

---

## Cast From Finger Implementation

```javascript
async function handleCastFromFinger(actor, item) {
  const storedSpells = item.getFlag("elysium", "storedSpells") || [];

  if (storedSpells.length === 0) {
    ui.notifications.warn("No spells stored in your Aether's Grasp!");
    return;
  }

  // Show finger selection dialog
  const selectedSpell = await promptFingerSelection(actor, storedSpells);
  if (!selectedSpell) return;

  // INTEGRATION WITH AETHER FUEL SYSTEM
  // This triggers the aether selection flow from elysium-aether-fuel skill
  const aetherItem = await ElysiumFuel.promptAetherSelection(actor, item);
  if (!aetherItem) return;

  // Consume aether and get modifiers
  const modifiers = await ElysiumFuel.consumeAether(actor, aetherItem, item);
  if (!modifiers) return;

  // Cast the spell with modifiers
  await castStoredSpell(actor, selectedSpell, modifiers);
}

async function promptFingerSelection(actor, storedSpells) {
  const fingerNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

  // Build table showing fingers and spells
  let tableRows = "";
  for (let i = 0; i < 5; i++) {
    const fingerName = fingerNames[i];
    const storedSpell = storedSpells.find(s => s.fingerIndex === i);

    if (storedSpell) {
      const spellName = storedSpell.spellData.name;
      tableRows += `
        <tr>
          <td><strong>${fingerName}</strong></td>
          <td>${spellName}</td>
          <td><button class="cast-button" data-spell-id="${storedSpell.id}">Cast</button></td>
        </tr>
      `;
    } else {
      tableRows += `
        <tr style="opacity: 0.5;">
          <td><strong>${fingerName}</strong></td>
          <td>[Empty]</td>
          <td>—</td>
        </tr>
      `;
    }
  }

  return new Promise((resolve) => {
    const d = new Dialog({
      title: "Cast Spell from Aether's Grasp",
      content: `
        <table class="spell-table">
          <thead>
            <tr>
              <th>Finger</th>
              <th>Spell</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `,
      buttons: {
        close: { label: "Close", callback: () => resolve(null) }
      },
      render: (html) => {
        html.find('.cast-button').click((event) => {
          const spellId = event.currentTarget.dataset.spellId;
          const spell = storedSpells.find(s => s.id === spellId);
          d.close();
          resolve(spell);
        });
      }
    }).render(true);
  });
}

async function castStoredSpell(actor, storedSpell, modifiers) {
  // Create temporary spell item on actor
  const tempSpellData = foundry.utils.duplicate(storedSpell.spellData);

  // Modify spell to not consume spell slots
  if (tempSpellData.system.preparation) {
    tempSpellData.system.preparation.mode = "atwill";
  }

  // Apply aether modifiers
  if (modifiers.attack) {
    tempSpellData.system.attackBonus = (tempSpellData.system.attackBonus || 0) + modifiers.attack;
  }
  if (modifiers.damage) {
    // Add damage bonus to damage parts
    if (tempSpellData.system.damage?.parts) {
      tempSpellData.system.damage.parts.push([modifiers.damage, "force"]);
    }
  }
  if (modifiers.dc) {
    tempSpellData.system.save = tempSpellData.system.save || {};
    tempSpellData.system.save.dc = (tempSpellData.system.save.dc || 0) + modifiers.dc;
  }

  // Mark as temporary
  tempSpellData.flags = tempSpellData.flags || {};
  tempSpellData.flags.aethersGrasp = {
    temporary: true,
    castTime: Date.now()
  };

  // Add to actor
  const createdItems = await actor.createEmbeddedDocuments("Item", [tempSpellData]);
  const tempSpell = createdItems[0];

  // Cast it
  await tempSpell.use({
    consumeSpellSlot: false,
    consumeUsage: false
  });

  // Clean up after casting
  setTimeout(async () => {
    try {
      await tempSpell.delete();
    } catch (e) {
      // Already cleaned up
    }
  }, 2000);

  // Show success message
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
      <div class="aether-message aether-message-success">
        <h3 style="color: #1175D0;">⚡ AETHER-POWERED SPELL ⚡</h3>
        <p><strong>${actor.name}</strong> casts <em>${storedSpell.spellData.name}</em></p>
        <p style="font-size: 0.9em; color: #9bb8d3;">
          Cast from ${storedSpell.fingerName} with aether modifiers
        </p>
      </div>
    `
  });
}
```

---

## Delete From Finger Implementation

```javascript
async function handleDeleteFromFinger(actor, item) {
  const storedSpells = item.getFlag("elysium", "storedSpells") || [];

  if (storedSpells.length === 0) {
    ui.notifications.warn("No spells stored to delete!");
    return;
  }

  const selectedSpell = await promptFingerSelectionForDelete(actor, storedSpells);
  if (!selectedSpell) return;

  // Confirm deletion
  const confirmed = await Dialog.confirm({
    title: "Delete Spell",
    content: `<p>Are you sure you want to delete <strong>${selectedSpell.spellData.name}</strong> from your ${selectedSpell.fingerName}?</p>`
  });

  if (!confirmed) return;

  // Remove from array
  const updated = storedSpells.filter(s => s.id !== selectedSpell.id);
  await item.setFlag("elysium", "storedSpells", updated);

  ui.notifications.info(`Removed ${selectedSpell.spellData.name} from ${selectedSpell.fingerName}!`);
}
```

---

## Integration with Aether Fuel System

**Key Point:** Aether's Grasp uses the fuel system from `elysium-aether-fuel` skill.

**How:**
1. Item has `flags.elysium.requiresAether: true`
2. When casting, calls `ElysiumFuel.promptAetherSelection()`
3. Gets back selected aether item
4. Calls `ElysiumFuel.consumeAether()` to consume and get modifiers
5. Applies modifiers to spell before casting

**Modifiers Applied:**
- Attack rolls: Add `modifiers.attack` to spell attack bonus
- Damage: Add `modifiers.damage` as extra damage part
- Save DC: Add `modifiers.dc` to spell save DC

**Example:**
- Basic Refined: No modifiers, safe
- Rarefied: +1 attack, +1d6 damage, +1 DC
- Unrefined: -2 attack, -1d4 damage, -1 DC, plus toxicity

---

## Aetherpunk Theme Styling

The dialogs should use the cyberpunk-fantasy aesthetic:

```css
/* Aether's Grasp dialogs */
.aethers-grasp-dialog {
  background:
    radial-gradient(circle at top left, rgba(17, 117, 208, 0.18) 0, transparent 55%),
    radial-gradient(circle at bottom right, rgba(208, 108, 17, 0.15) 0, transparent 50%),
    linear-gradient(145deg, #05070c, #0d1018 50%, #05070c 100%);
  border: 1px solid rgba(208, 108, 17, 0.45);
  box-shadow:
    0 0 25px rgba(0,0,0,0.85),
    0 0 20px rgba(17, 117, 208, 0.35);
}

.spell-table {
  width: 100%;
  border-collapse: collapse;
  background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(0,0,0,0.6));
  border-radius: 6px;
}

.spell-table th {
  background: linear-gradient(90deg,
    rgba(17, 117, 208, 0.4),
    rgba(208, 108, 17, 0.4),
    rgba(17, 117, 208, 0.4));
  color: #e3f4ff;
  text-shadow: 0 0 6px rgba(17,117,208,0.8);
}
```

---

## Best Practices

### ✅ DO:
- Store FULL spell data, not just names
- Use module hooks, never item macros
- Integrate with aether fuel system
- Show dramatic, themed dialogs
- Consume scrolls properly (uses/quantity)
- Apply aether modifiers to spells
- Clean up temporary spell items

### ❌ DON'T:
- Store only spell names (compendiums might change)
- Put logic in item macros
- Skip aether selection when casting
- Use default Foundry dialogs (theme it!)
- Forget to consume scrolls
- Leave temporary spells on actor sheet

---

## Quick Reference

### Item Flags
- `flags.elysium.requiresAether: true` - Triggers fuel system
- `flags.elysium.modType: "spell-storage"` - Identifies as Aether's Grasp
- `flags.elysium.storedSpells: []` - Array of stored spell objects
- `flags.elysium.maxStoredSpells: 5` - Capacity
- `flags.elysium.allowedSpellLevel: 1` - Only 1st level

### Stored Spell Object
- `id` - Unique identifier
- `fingerIndex` - 0-4 (thumb to pinky)
- `fingerName` - "Thumb", "Index", etc.
- `spellData` - Full spell item data
- `imprintedAt` - Timestamp
- `originalScrollName` - Original scroll name

### Actions
- **Imprint:** Consume scroll → Store spell data
- **Cast:** Select finger → Select aether → Cast with modifiers
- **Delete:** Select finger → Confirm → Remove from array

---

## When to Use This Skill

Activate when:
- Working on Aether's Grasp item
- Implementing spell storage mechanics
- Creating imprint/cast/delete features
- Integrating with aether fuel system
- Designing finger slot UI
- Debugging spell casting
- Theming Aether's Grasp dialogs

---

**Remember:** Aether's Grasp is the FLAGSHIP item. Make it feel powerful, dramatic, and cyberpunk-cool. Fingers glow. Aether surges. Spells erupt!
