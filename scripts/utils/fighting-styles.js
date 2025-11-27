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
 * Grant a temporary fighting style to the actor via Active Effect
 * The effect will be removed on the next long rest
 * @param {Actor} actor - The actor to grant the style to
 * @param {string} styleName - The fighting style name
 * @returns {Promise<ActiveEffect|null>} The created effect or null if failed
 */
export async function grantTemporaryFightingStyle(actor, styleName) {
  // Don't grant if they already have it
  if (hasFightingStyle(actor, styleName)) {
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn(`${actor.name} already has ${styleName}!`);
    }
    return null;
  }

  // Define fighting style configurations
  const fightingStyles = {
    Archery: {
      icon: "icons/skills/ranged/arrow-flying-broadhead-metal.webp",
      changes: [
        {
          key: "system.bonuses.rwak.attack",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
        },
      ],
    },
    Defense: {
      icon: "icons/equipment/shield/heater-steel-boss-red.webp",
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "1",
        },
      ],
    },
    "Great Weapon Fighting": {
      icon: "icons/weapons/swords/greatsword-crossguard-steel.webp",
      changes: [],
      // Great Weapon Fighting uses a flag since it's a reroll mechanic, not a static bonus
      // The actual reroll logic would need to be implemented elsewhere via a hook
      flags: {
        isGreatWeaponFighting: true,
      },
    },
    "Two-Weapon Fighting": {
      icon: "icons/weapons/daggers/dagger-双-black.webp",
      changes: [
        {
          key: "system.bonuses.mwak.damage",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "@mod", // Add ability modifier to off-hand attack
        },
      ],
    },
  };

  const styleConfig = fightingStyles[styleName];
  if (!styleConfig) {
    console.error(`Elysium | Unknown fighting style: ${styleName}`);
    return null;
  }

  // Create the active effect
  const effectData = {
    name: `Temporary: ${styleName}`,
    icon: styleConfig.icon,
    origin: actor.uuid,
    changes: styleConfig.changes,
    flags: {
      elysium: {
        isTemporaryGrant: true,
        isAetherEffect: true, // Will be auto-cleaned on long rest
        ...(styleConfig.flags || {}),
      },
    },
  };

  const createdEffects = await actor.createEmbeddedDocuments("ActiveEffect", [
    effectData,
  ]);

  console.log(`Elysium | Granted temporary ${styleName} to ${actor.name}`);

  return createdEffects[0];
}
