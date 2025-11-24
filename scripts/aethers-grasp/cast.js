/**
 * Aether's Grasp - Cast From Finger
 *
 * Logic for casting stored spells using aether fuel
 */

import { getStoredSpells } from "../utils/flags.js";
import { handleAetherFuelUse } from "../aether-fuel/consumption.js";

/**
 * Get the spell stored on a specific finger
 * @param {Item} aethersGraspItem
 * @param {number} fingerIndex - 0-4 (Thumb to Pinky)
 * @returns {Object|null} The stored spell object or null
 */
export function getStoredSpellByFinger(aethersGraspItem, fingerIndex) {
  const storedSpells = getStoredSpells(aethersGraspItem);
  return storedSpells.find((s) => s.fingerIndex === fingerIndex) || null;
}

/**
 * Create a temporary spell item data object for casting
 * @param {Object} spellData - Original spell data
 * @returns {Object} Modified spell data for temporary casting
 */
export function createTemporarySpellItem(spellData) {
  // Deep copy the spell data
  const tempData =
    foundry?.utils?.duplicate?.(spellData) ||
    JSON.parse(JSON.stringify(spellData));

  // Modify for casting without spell slots
  if (tempData.system.preparation) {
    tempData.system.preparation.mode = "atwill";
  }

  // Mark as temporary
  if (!tempData.flags) tempData.flags = {};
  tempData.flags.aethersGrasp = {
    temporary: true,
    castTime: Date.now(),
  };

  return tempData;
}

/**
 * Apply aether modifiers to a spell
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

  // Apply damage bonus
  if (modifiers.damage !== 0 || modifiers.spellDamage !== 0) {
    const damageBonus = modifiers.spellDamage || modifiers.damage;

    // Ensure damage structure exists
    if (!modified.system.damage) {
      modified.system.damage = { parts: [] };
    }
    if (!modified.system.damage.parts) {
      modified.system.damage.parts = [];
    }

    // Add damage bonus as a new damage part
    if (damageBonus > 0) {
      modified.system.damage.parts.push([String(damageBonus), "force"]);
    }
  }

  return modified;
}

/**
 * Cast a spell from a finger using aether fuel
 * @param {Actor} actor
 * @param {Object} storedSpell - The stored spell object
 * @param {Object} modifiers - Aether modifiers to apply + enhanced flag
 * @param {boolean} modifiers.enhanced - Whether to upcast using spell slot
 * @param {Item} aetherFuel - The aether fuel item to consume AFTER cast
 * @returns {Promise<Object>} { tempSpell, castResult }
 */
export async function castSpellFromFinger(
  actor,
  storedSpell,
  modifiers,
  aetherFuel,
) {
  // Create temporary spell data
  let tempData = createTemporarySpellItem(storedSpell.spellData);

  // Get spell name (remove "Spell Scroll:" prefix)
  const spellName =
    storedSpell.spellData.flags?.ddbimporter?.originalName ||
    storedSpell.spellData.name.replace(/^Spell Scroll:\s*/i, "").trim();

  let castLevel = tempData.system.level || 1;
  let isUpcast = false;

  // Check if upcasting is requested and validate spell slots BEFORE casting
  if (modifiers.enhanced) {
    const spellSlots = actor.system?.spells?.spell1;

    if (!spellSlots || spellSlots.value <= 0) {
      throw new Error(
        `No 1st level spell slots available for upcasting ${spellName}!`,
      );
    }

    // Upcast to 2nd level (but don't consume slot yet - wait for confirmation)
    castLevel = 2;
    isUpcast = true;
    tempData.system.level = 2;
    tempData.name = `${spellName} (2nd Level)`;
  } else {
    // Normal cast at 1st level
    tempData.name = spellName;
  }

  // Apply aether modifiers
  tempData = applyAetherModifiersToSpell(tempData, modifiers);

  // Create temporary spell item on actor
  const createdItems = await actor.createEmbeddedDocuments("Item", [tempData]);
  const tempSpell = createdItems[0];

  // Cast the spell without consuming spell slots
  // User will see casting dialog and can confirm or cancel
  const castResult = await tempSpell.use({
    consumeSpellSlot: false,
    consumeUsage: false,
  });

  // AFTER user confirms cast, THEN consume resources
  if (castResult) {
    // Consume aether fuel and trigger toxicity workflow if unrefined
    if (aetherFuel) {
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
    const quality =
      aetherFuel?.getFlag("elysium", "aetherQuality") || "unknown";

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="elysium-message">
          <h3>⚡ AETHER'S GRASP ⚡</h3>
          <p><strong>${actor.name}</strong> casts <strong>${spellName}</strong> from ${storedSpell.fingerName}!</p>
          <p style="color: var(--aether-text-blue); margin-top: 8px;">
            <strong>Cast Level:</strong> ${modeText}
          </p>
          <p style="font-size: 0.8em; color: #9bb8d3; margin-top: 8px;">
            Powered by <em>${quality}</em> aether
          </p>
        </div>
      `,
    });
  }

  return {
    tempSpell,
    castResult,
  };
}
