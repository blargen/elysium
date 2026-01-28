/**
 * Fighting Style Utilities
 * Detect and grant fighting styles for Aether's Edge
 */

/**
 * Check if actor has a specific fighting style
 * @param {Actor} actor - The actor to check
 * @param {string} styleName - The fighting style name or identifier
 * @returns {boolean} True if actor has the fighting style
 */
export function hasFightingStyle(actor, styleName) {
  if (!actor || !actor.items) return false;

  const styleNameLower = styleName.toLowerCase();
  const identifier = styleNameLower.replace(/\s+/g, "-");

  const found = actor.items.find((item) => {
    if (item.type !== "feat") return false;

    // Check by name (case-insensitive)
    if (item.name && item.name.toLowerCase() === styleNameLower) return true;

    // Check by identifier
    if (item.system?.identifier === identifier) return true;

    return false;
  });

  return !!found;
}

/**
 * Get fighting styles available to the actor (ones they don't already have)
 * Only returns the 4 styles used by Aether's Edge
 * @param {Actor} actor - The actor to check
 * @returns {Array<Object>} Array of available fighting style definitions
 */
export function getAvailableFightingStyles(actor) {
  const allStyles = [
    {
      name: "Archery",
      identifier: "archery",
      description: "You gain a +2 bonus to attack rolls with ranged weapons.",
    },
    {
      name: "Defense",
      identifier: "defense",
      description: "While wearing armor, you gain a +1 bonus to AC.",
    },
    {
      name: "Great Weapon Fighting",
      identifier: "great-weapon-fighting",
      description:
        "When you roll damage for an attack with a two-handed melee weapon, you can treat any 1 or 2 on a damage die as a 3.",
    },
    {
      name: "Two-Weapon Fighting",
      identifier: "two-weapon-fighting",
      description:
        "When you make an extra attack with a light weapon in your off hand, you can add your ability modifier to the damage.",
    },
  ];

  // Filter out styles the actor already has
  return allStyles.filter((style) => !hasFightingStyle(actor, style.name));
}

/**
 * Grant a temporary fighting style to the actor as an actual feat item
 * The feat will be removed on the next long rest
 * @param {Actor} actor - The actor to grant the style to
 * @param {string} styleName - The fighting style name
 * @returns {Promise<Item|null>} The created feat item or null if failed
 */
export async function grantTemporaryFightingStyle(actor, styleName) {
  // Don't grant if they already have it (permanent or temporary)
  if (hasFightingStyle(actor, styleName)) {
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn(`${actor.name} already has ${styleName}!`);
    }
    return null;
  }

  // Define fighting style feat data
  const fightingStyles = {
    Archery: {
      description: "<p>You gain a +2 bonus to attack rolls you make with ranged weapons.</p>",
      // Uses system.bonuses for the +2 ranged attack bonus
      bonuses: {
        rwak: { attack: "2" },
      },
    },
    Defense: {
      description: "<p>While you are wearing armor, you gain a +1 bonus to AC.</p>",
      bonuses: {
        ac: { bonus: "1" },
      },
    },
    "Great Weapon Fighting": {
      description: "<p>When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have the two-handed or versatile property for you to gain this benefit.</p>",
      bonuses: {},
    },
    "Two-Weapon Fighting": {
      description: "<p>When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.</p>",
      bonuses: {},
    },
  };

  const styleConfig = fightingStyles[styleName];
  if (!styleConfig) {
    console.error(`Elysium | Unknown fighting style: ${styleName}`);
    return null;
  }

  // Create the feat item
  const featData = {
    name: styleName,
    type: "feat",
    img: "icons/svg/sword.svg", // Generic icon - Foundry will use system default
    system: {
      description: { value: styleConfig.description },
      type: {
        value: "class",
        subtype: "fightingStyle",
      },
      requirements: "Granted by Aether's Edge",
      ...styleConfig.bonuses,
    },
    flags: {
      elysium: {
        isTemporaryFightingStyle: true,
        grantedBy: "aethers-edge",
      },
    },
  };

  const createdItems = await actor.createEmbeddedDocuments("Item", [featData]);

  console.log(`Elysium | Granted temporary ${styleName} to ${actor.name}`);

  return createdItems[0];
}

/**
 * Remove any temporary fighting styles from the actor
 * Called before showing the fighting style selection on long rest
 * @param {Actor} actor - The actor to clean up
 * @returns {Promise<number>} Number of items removed
 */
export async function removeTemporaryFightingStyles(actor) {
  const temporaryStyles = actor.items.filter(
    (item) => item.getFlag("elysium", "isTemporaryFightingStyle") === true
  );

  if (temporaryStyles.length === 0) return 0;

  const itemIds = temporaryStyles.map((item) => item.id);
  await actor.deleteEmbeddedDocuments("Item", itemIds);

  console.log(
    `Elysium | Removed ${temporaryStyles.length} temporary fighting style(s) from ${actor.name}`
  );

  return temporaryStyles.length;
}
