/**
 * The Metatron - Healer's Gambit
 *
 * A risky ability that casts Mass Healing Word (3rd level) using a 2nd level slot + aether.
 *
 * Mechanics:
 * 1. Costs 2nd level spell slot + 1 aether
 * 2. ALWAYS gain 1 ATL (Aether Toxicity Level) - overloading the mod poisons them
 * 3. Roll d20: failure threshold = 2 + (new ATL * 2)
 * 4. On failure: The Metatron is disabled until long rest
 * 5. Cast Mass Healing Word regardless of roll result
 */

/**
 * Mass Healing Word spell data (3rd level)
 */
const MASS_HEALING_WORD = {
  name: "Mass Healing Word",
  type: "spell",
  system: {
    level: 3,
    school: "evo",
    activation: { type: "bonus", cost: 1 },
    range: { value: 60, units: "ft" },
    target: { value: 6, type: "creature" },
    duration: { units: "inst" },
    actionType: "heal",
    damage: { parts: [["1d4 + @mod", "healing"]] },
    preparation: { mode: "atwill" },
    description: {
      value:
        "<p>As you call out words of restoration, up to six creatures of your choice that you can see within range regain hit points equal to 1d4 + your spellcasting ability modifier.</p>",
    },
  },
  flags: {
    metatron: {
      temporary: true,
      fromGambit: true,
    },
  },
};

/**
 * Calculate the failure threshold based on ATL
 * Formula: 2 + (ATL * 2), capped at 20
 * @param {number} atl - Current Aether Toxicity Level
 * @returns {number} The failure threshold (roll <= this = failure)
 */
export function calculateFailureThreshold(atl) {
  const threshold = 2 + atl * 2;
  return Math.min(threshold, 20); // Cap at 20
}

/**
 * Check if a roll is a gambit failure
 * @param {number} roll - The d20 roll result
 * @param {number} threshold - The failure threshold
 * @returns {boolean} True if the roll fails
 */
export function isGambitFailure(roll, threshold) {
  return roll <= threshold;
}

/**
 * Disable The Metatron (failed gambit)
 * @param {Item} metatron - The Metatron item
 */
export async function disableMetatron(metatron) {
  await metatron.setFlag("elysium", "disabled", true);
}

/**
 * Enable The Metatron (after long rest)
 * @param {Item} metatron - The Metatron item
 */
export async function enableMetatron(metatron) {
  await metatron.setFlag("elysium", "disabled", false);
}

/**
 * Execute Healer's Gambit
 * @param {Actor} actor - The actor using the ability
 * @param {Item} metatron - The Metatron item
 * @param {Object} options - Options including roll override for testing
 * @returns {Object} Result with roll, threshold, success, newATL
 */
export async function executeHealersGambit(actor, metatron, options = {}) {
  // Step 1: Get current ATL and increase by 1 (the sacrifice!)
  const currentATL = actor.getFlag("elysium", "atl") || 0;
  const newATL = currentATL + 1;
  await actor.setFlag("elysium", "atl", newATL);

  // Step 2: Calculate failure threshold based on NEW ATL
  const threshold = calculateFailureThreshold(newATL);

  // Step 3: Roll d20 (or use provided roll for testing)
  const roll = options.roll ?? Math.floor(Math.random() * 20) + 1;

  // Step 4: Check for failure
  const failed = isGambitFailure(roll, threshold);

  // Step 5: If failed, disable The Metatron
  if (failed) {
    await disableMetatron(metatron);
  }

  // Step 6: Cast Mass Healing Word regardless of success/failure
  const spellData =
    foundry?.utils?.duplicate?.(MASS_HEALING_WORD) ||
    JSON.parse(JSON.stringify(MASS_HEALING_WORD));

  const [tempSpell] = await actor.createEmbeddedDocuments("Item", [spellData]);

  await tempSpell.use({
    consumeSpellSlot: false,
    consumeUsage: false,
  });

  return {
    roll,
    threshold,
    success: !failed,
    newATL,
    tempSpell,
  };
}
