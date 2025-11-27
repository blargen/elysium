/**
 * Aether's Edge Stance Handler
 * Manage stance application, removal, and detection
 */

/**
 * Get the actor's currently active stance
 * @param {Actor} actor - The actor to check
 * @returns {string|null} The active stance name or null
 */
export function getActiveStance(actor) {
  if (!actor || typeof actor.getFlag !== "function") return null;

  return actor.getFlag("elysium", "activeStance") || null;
}

/**
 * Remove all existing stance effects from the actor
 * @param {Actor} actor - The actor to remove stances from
 * @returns {Promise<void>}
 */
export async function removeOldStance(actor) {
  if (!actor || !actor.effects) return;

  // Find all stance effects
  const stanceEffects = actor.effects.filter(
    (effect) => effect.flags?.elysium?.isStanceEffect === true,
  );

  // Delete each stance effect
  for (const effect of stanceEffects) {
    await effect.delete();
  }

  // Clear the activeStance flag
  await actor.setFlag("elysium", "activeStance", null);
}

/**
 * Apply a stance's passive bonuses to the actor
 * @param {Actor} actor - The actor to apply the stance to
 * @param {string} stance - The stance name ("aggressive", "defensive", "balanced")
 * @returns {Promise<ActiveEffect|null>} The created effect or null if failed
 */
export async function applyStanceEffect(actor, stance) {
  // Define stance configurations
  const stances = {
    aggressive: {
      name: "Stance: Aggressive",
      icon: "icons/weapons/swords/sword-broad-worn.webp",
      changes: [
        {
          key: "system.bonuses.mwak.attack",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
        },
        {
          key: "system.bonuses.mwak.damage",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
        },
        {
          key: "system.bonuses.rwak.attack",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
        },
        {
          key: "system.bonuses.rwak.damage",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
        },
      ],
    },
    defensive: {
      name: "Stance: Defensive",
      icon: "icons/equipment/shield/heater-steel-boss-orange.webp",
      changes: [
        {
          key: "system.attributes.ac.bonus",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "2",
        },
      ],
    },
    balanced: {
      name: "Stance: Balanced",
      icon: "icons/sundries/misc/yin-yang.webp",
      changes: [
        {
          key: "system.bonuses.mwak.attack",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "1",
        },
        {
          key: "system.bonuses.mwak.damage",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "1",
        },
        {
          key: "system.bonuses.rwak.attack",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "1",
        },
        {
          key: "system.bonuses.rwak.damage",
          mode: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          value: "1",
        },
      ],
    },
  };

  const stanceConfig = stances[stance];
  if (!stanceConfig) {
    console.error(`Elysium | Unknown stance: ${stance}`);
    return null;
  }

  // Create the active effect
  const effectData = {
    name: stanceConfig.name,
    icon: stanceConfig.icon,
    origin: actor.uuid,
    changes: stanceConfig.changes,
    flags: {
      elysium: {
        isStanceEffect: true,
        stance: stance,
        isAetherEffect: true, // Will be auto-cleaned on long rest
      },
    },
  };

  const createdEffects = await actor.createEmbeddedDocuments("ActiveEffect", [
    effectData,
  ]);

  // Set the activeStance flag
  await actor.setFlag("elysium", "activeStance", stance);

  console.log(`Elysium | Applied ${stanceConfig.name} to ${actor.name}`);

  return createdEffects[0];
}
