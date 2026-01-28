/**
 * The Metatron - Psalm of Casting
 *
 * Handles casting stored spells using aether fuel.
 *
 * Casting modes:
 * - Basic (aether only): Cast at level 1
 * - Enhanced (aether + spell slot):
 *   - Non-healing spells: Auto-upcast to level 2
 *   - Touch healing spells (Cure Wounds): Choose Extended Range | Upcast | Max Healing
 *   - Ranged healing spells (Healing Word): Choose Upcast | Max Healing
 */

import { getStoredSpells } from "../utils/flags.js";

/**
 * Get a stored spell by slot index
 * @param {Item} metatron - The Metatron item
 * @param {number} slotIndex - The slot index (0-4)
 * @returns {Object|null} The stored spell or null
 */
export function getStoredSpellBySlot(metatron, slotIndex) {
  const storedSpells = getStoredSpells(metatron);
  return storedSpells.find((s) => s.slotIndex === slotIndex) || null;
}

/**
 * Check if a spell is a healing spell
 * @param {Object} spellData - The spell data
 * @returns {boolean} True if healing spell
 */
export function isHealingSpell(spellData) {
  return spellData.system?.actionType === "heal";
}

/**
 * Check if a spell has touch range
 * @param {Object} spellData - The spell data
 * @returns {boolean} True if touch range
 */
export function isTouchSpell(spellData) {
  return spellData.system?.range?.units === "touch";
}

/**
 * Get available healing enhancement options based on spell type
 * Smart UI: Only shows extended range for touch spells
 * @param {Object} spellData - The spell data
 * @returns {Array} Array of enhancement options
 */
export function getHealingEnhancementOptions(spellData) {
  if (!isHealingSpell(spellData)) {
    return [];
  }

  const options = [];

  // Only show extended range for touch spells (Cure Wounds)
  if (isTouchSpell(spellData)) {
    options.push({
      id: "extendedRange",
      label: "Extended Range (40ft)",
      description: "Cast this touch spell from 40 feet away",
    });
  }

  // Always show upcast and max healing for healing spells
  options.push({
    id: "upcast",
    label: "Upcast to Level 2",
    description: "Cast the spell at 2nd level for increased healing",
  });

  options.push({
    id: "maxHealing",
    label: "Maximum Healing",
    description: "Roll maximum on all healing dice",
  });

  return options;
}

/**
 * Create a temporary spell item for casting
 * @param {Object} spellData - The spell data
 * @returns {Object} Modified spell data for temporary item
 */
export function createTemporarySpellItem(spellData) {
  // Deep clone the spell data
  const tempData =
    foundry?.utils?.duplicate?.(spellData) ||
    JSON.parse(JSON.stringify(spellData));

  // Set preparation mode to atwill (no spell slot consumption)
  if (!tempData.system) tempData.system = {};
  if (!tempData.system.preparation) tempData.system.preparation = {};
  tempData.system.preparation.mode = "atwill";

  // Mark as temporary with metatron flag
  if (!tempData.flags) tempData.flags = {};
  tempData.flags.metatron = {
    temporary: true,
  };

  return tempData;
}

/**
 * Apply a healing enhancement to spell data
 * @param {Object} spellData - The spell data
 * @param {string} enhancement - The enhancement type
 * @returns {Object} Modified spell data
 */
export function applyHealingEnhancement(spellData, enhancement) {
  // Deep clone to avoid mutation
  const modified =
    foundry?.utils?.duplicate?.(spellData) ||
    JSON.parse(JSON.stringify(spellData));

  if (!modified.flags) modified.flags = {};
  if (!modified.flags.metatron) modified.flags.metatron = {};

  switch (enhancement) {
    case "extendedRange":
      // Convert touch to 40ft
      if (modified.system?.range?.units === "touch") {
        modified.system.range.value = 40;
        modified.system.range.units = "ft";
      }
      break;

    case "upcast":
      // Increase spell level to 2
      if (modified.system) {
        modified.system.level = 2;
      }
      break;

    case "maxHealing":
      // Add flag for midi-qol to maximize healing
      modified.flags.metatron.maxHealing = true;
      break;
  }

  return modified;
}

/**
 * Apply aether quality modifiers to a spell
 * @param {Object} spellData - Spell data to modify
 * @param {Object} modifiers - { attack, damage, spellAttack, spellDamage }
 * @returns {Object} Modified spell data
 */
export function applyAetherModifiersToSpell(spellData, modifiers) {
  // Deep copy
  const modified =
    foundry?.utils?.duplicate?.(spellData) ||
    JSON.parse(JSON.stringify(spellData));

  // Apply attack bonus
  if (modifiers.attack !== 0 || modifiers.spellAttack !== 0) {
    const attackBonus = modifiers.spellAttack || modifiers.attack;
    modified.system.attackBonus =
      (modified.system.attackBonus || 0) + attackBonus;
  }

  // Apply damage bonus (radiant for Metatron's divine theme)
  if (modifiers.damage !== 0 || modifiers.spellDamage !== 0) {
    const damageBonus = modifiers.spellDamage || modifiers.damage;

    if (!modified.system.damage) {
      modified.system.damage = { parts: [] };
    }
    if (!modified.system.damage.parts) {
      modified.system.damage.parts = [];
    }

    if (damageBonus > 0) {
      modified.system.damage.parts.push([String(damageBonus), "radiant"]);
    }
  }

  return modified;
}

/**
 * Cast a spell from a Metatron slot
 * @param {Actor} actor - The actor casting
 * @param {Object} storedSpell - The stored spell object
 * @param {Object} modifiers - Aether modifiers to apply + enhanced flag
 * @param {boolean} modifiers.enhanced - Whether to upcast using spell slot
 * @param {Item} aetherFuel - The aether fuel item to consume AFTER cast
 * @returns {Object} Result with tempSpell and castResult
 */
export async function castSpellFromSlot(actor, storedSpell, modifiers, aetherFuel) {
  const { enhanced = false, healingEnhancement = null } = modifiers;

  // Start with the stored spell data
  const spellName = storedSpell.spellData.name;
  let tempData = createTemporarySpellItem(storedSpell.spellData);

  let castLevel = tempData.system.level || 1;
  let isUpcast = false;

  // Apply enhancements based on mode
  if (enhanced) {
    // Validate spell slots BEFORE casting
    const spellSlots = actor.system?.spells?.spell1;
    if (!spellSlots || spellSlots.value <= 0) {
      throw new Error(`No 1st level spell slots available for upcasting ${spellName}!`);
    }

    if (isHealingSpell(storedSpell.spellData) && healingEnhancement) {
      // Healing spell with chosen enhancement
      tempData = applyHealingEnhancement(tempData, healingEnhancement);
      if (healingEnhancement === "upcast") {
        isUpcast = true;
        castLevel = 2;
      }
    } else if (!isHealingSpell(storedSpell.spellData)) {
      // Non-healing spell: auto-upcast to level 2
      tempData.system.level = 2;
      tempData.name = `${spellName} (2nd Level)`;
      isUpcast = true;
      castLevel = 2;
    }
  }

  // Apply aether quality modifiers
  tempData = applyAetherModifiersToSpell(tempData, modifiers);

  // Create the temporary spell on the actor
  const [tempSpell] = await actor.createEmbeddedDocuments("Item", [tempData]);

  // Cast the spell - skip configuration dialog since we've already configured everything
  // User will still see targeting template/dialog if the spell requires it
  const castResult = await tempSpell.use({
    configureDialog: false, // Skip the spell configuration dialog
    consumeSpellSlot: false,
    consumeUsage: false,
    createMeasuredTemplate: undefined, // Let the spell determine if it needs a template
  });

  // AFTER user confirms cast, THEN consume resources
  if (castResult) {
    // Consume aether fuel (handles toxicity if unrefined)
    if (aetherFuel) {
      const { handleAetherFuelUse } = await import("../aether-fuel/consumption.js");
      await handleAetherFuelUse(actor, aetherFuel);
    }

    // Consume spell slot if upcasting
    if (isUpcast) {
      const spellSlots = actor.system.spells.spell1;
      await actor.update({
        "system.spells.spell1.value": spellSlots.value - 1,
      });
    }

    // Create chat message showing cast was successful
    const modeText = isUpcast
      ? "2nd level (Upcast with Spell Slot)"
      : "1st level";
    const quality = aetherFuel?.getFlag("elysium", "aetherQuality") || "unknown";

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="aether-message aether-message-success">
          <h3>Psalm of Casting</h3>
          <p><strong>${actor.name}</strong> channels <strong>${spellName}</strong> from the <strong>${storedSpell.slotName}</strong> prayer slot!</p>
          <p class="elysium-text-blue" style="margin-top: 8px;">
            <strong>Cast Level:</strong> ${modeText}
          </p>
          <p class="elysium-text-muted" style="font-size: 0.9em; margin-top: 8px;">
            Powered by <em>${quality}</em> aether
          </p>
        </div>
      `,
    });
  }

  return { tempSpell, castResult };
}
