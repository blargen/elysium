# midi-qol Skill

Expert in midi-qol (Midi Quality of Life) module for FoundryVTT D&D 5e. Provides automated workflows, advantage/disadvantage handling, and item automation.

## Overview

midi-qol is a comprehensive automation module for D&D 5e in FoundryVTT that handles:
- Item usage workflows
- Advantage/disadvantage mechanics
- Saving throws and ability checks
- Damage application
- Attack rolls and hits/misses

## Core Concepts

### Hooks System

midi-qol provides hooks at various points in the workflow:

**Activity Hooks (D&D 5e v3+):**
- `dnd5e.preUseActivity` - Before activity is used
- `dnd5e.postActivityConsumption` - After activity consumes resources
- `dnd5e.useActivity` - When activity is used

**Item Workflow Hooks:**
- `midi-qol.preItemRoll` - Before item is rolled
- `midi-qol.postItemRoll` - After item roll completes
- `midi-qol.preAttackRoll` - Before attack roll
- `midi-qol.postAttackRoll` - After attack roll

### Advantage/Disadvantage System

midi-qol tracks advantage/disadvantage through actor flags:

```javascript
// Grant advantage on a specific skill (Investigation)
{
  key: 'flags.midi-qol.advantage.skill.inv',
  mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
  value: 1,
  priority: 20
}

// Grant advantage on all ability checks
{
  key: 'flags.midi-qol.advantage.ability.check.all',
  mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
  value: 1
}

// Grant advantage on saving throws
{
  key: 'flags.midi-qol.advantage.ability.save.dex',
  mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
  value: 1
}
```

**Advantage Modes:**
- `1` = Advantage
- `-1` = Disadvantage
- `0` = Normal

### Rolling Skills and Abilities

**Skill Rolls (Auto-Roll, No Dialogs):**
```javascript
// Roll a skill check - dnd5e v5.x + midi-qol
const roll = await actor.rollSkill({
  skill: "inv",            // Investigation
  advantage: true,         // Force advantage
  configure: false,        // dnd5e v5.x: skip configuration dialog
  chatMessage: true,       // Post to chat
  flavor: "Custom flavor text",
  midiOptions: {
    skipRollDialog: true   // midi-qol: skip midi's dialog
  }
});

// IMPORTANT: Both configure: false AND midiOptions.skipRollDialog are needed!
// - configure: false skips dnd5e's configuration dialog
// - skipRollDialog: true skips midi-qol's roll dialog

// Common skill codes:
// acr = Acrobatics, ani = Animal Handling, arc = Arcana
// ath = Athletics, dec = Deception, his = History
// ins = Insight, itm = Intimidation, inv = Investigation
// med = Medicine, nat = Nature, prc = Perception
// prf = Performance, per = Persuasion, rel = Religion
// slt = Sleight of Hand, ste = Stealth, sur = Survival
```

**Ability Checks:**
```javascript
// Roll an ability check
const roll = await actor.rollAbilityTest("str", {
  advantage: true,
  fastForward: true
});

// Ability codes: str, dex, con, int, wis, cha
```

**Saving Throws:**
```javascript
// Roll a saving throw
const roll = await actor.rollAbilitySave("dex", {
  advantage: true,
  targetValue: 15  // DC for the save
});
```

### Fast Forward Options

The `fastForward` option attempts to skip roll configuration dialogs:

```javascript
{
  fastForward: true  // Skip dialog if settings allow
}
```

**Note:** This may be controlled by midi-qol module settings:
- "Auto Fast Forward Ability Rolls"
- "Auto Fast Forward Skill Checks"
- User may need to hold Alt/Shift key regardless of setting

### Active Effects Integration

midi-qol works seamlessly with Active Effects:

**Effect Duration:**
```javascript
duration: {
  rounds: 10,    // Combat rounds (works in combat)
  seconds: 60    // Real time (works outside combat)
}
```

**Effect Changes:**
```javascript
changes: [
  {
    key: 'flags.midi-qol.advantage.skill.inv',
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    value: 1,
    priority: 20
  }
]
```

## Common Patterns

### Aether-Powered Items (Elysium Pattern)

1. **Item has flag**: `flags.elysium.requiresAether = true`
2. **Hook detects usage**: `dnd5e.postActivityConsumption`
3. **Show fuel dialog**: Custom dialog to select aether quality
4. **Apply effect**: Create Active Effect with duration
5. **Subsequent actions check effect**: Verify effect exists before allowing action

### Checking for Effects

```javascript
// Check if actor has a specific effect
const hasEffect = actor.effects?.contents?.some(
  e => e.name === "Effect Name" && !e.disabled
);
```

### Refreshing Effects

```javascript
// Find existing effect
const existingEffect = actor.effects?.contents?.find(
  e => e.name === "Effect Name" && !e.disabled
);

if (existingEffect) {
  // Refresh duration instead of creating duplicate
  await existingEffect.update({
    duration: {
      rounds: 100
    }
  });
}
```

## Module Settings

Key midi-qol settings that affect behavior:

- **Auto Fast Forward Rolls**: Skip configuration dialogs
- **Ability Check Advantage gives Skill Advantage**: If enabled, ability advantage applies to skills
- **Auto Check Saves**: Automatically roll saving throws
- **Display Saving throw DC**: Show DC to players

## Troubleshooting

### Roll Dialog Always Shows
- Check midi-qol settings for "Fast Forward" options
- Verify `fastForward: true` is being passed
- Try holding Alt/Shift when triggering roll
- Some versions may not support programmatic fast-forward

### Advantage Not Working
- Verify Active Effect `changes` array uses correct key format
- Check `flags.midi-qol.advantage.skill.{skillId}` path
- Ensure mode is `CONST.ACTIVE_EFFECT_MODES.OVERRIDE`
- Verify value is `1` (not string "1")

### Effect Not Applying
- Check effect is not disabled: `!effect.disabled`
- Verify effect has correct `origin` set to actor UUID
- Check `transfer: false` for actor effects (not items)

## Best Practices

1. **Use Activity Hooks**: Hook into `dnd5e.postActivityConsumption` for item usage
2. **Check Effect Existence**: Always verify effects exist before relying on them
3. **Refresh, Don't Duplicate**: Update existing effects instead of creating duplicates
4. **Use Both Timers**: Set both `rounds` and `seconds` for effects to work in/out of combat
5. **Respect Settings**: `fastForward` may not work if user has disabled it in settings

## Resources

- Repository: https://gitlab.com/tposney/midi-qol
- Wiki: https://gitlab.com/tposney/midi-qol/-/wikis/home

## Version Compatibility

This skill is based on midi-qol usage with:
- FoundryVTT v13+
- D&D 5e System v3.0+ (dnd5e v5.x activity system)
- midi-qol v13+

API may vary between versions - always test with your specific version.
