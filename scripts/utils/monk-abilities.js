/**
 * Monk Ability Utilities
 * Find and trigger monk abilities from Monk's Focus item
 */

/**
 * Check if an item is a Monk's Focus item
 * @param {Item} item - The item to check
 * @returns {boolean} True if this is a Monk's Focus item
 */
export function isMonkFocusItem(item) {
  if (!item) return false;

  // Primary check: item name
  if (item.name === "Monk's Focus") return true;

  // Fallback: check item type and identifier
  if (item.type === "feat" && item.system?.identifier === "monks-focus") {
    return true;
  }

  return false;
}

/**
 * Find monk ability activity by key
 * @param {Actor} actor - The monk actor
 * @param {string} abilityKey - 'flurry-of-blows', 'patient-defense', 'step-of-wind'
 * @returns {Activity|null} The activity or null if not found
 */
export function findMonkAbilityActivity(actor, abilityKey) {
  // Find Monk's Focus item
  const monkFocus = actor.items.find((i) => isMonkFocusItem(i));
  if (!monkFocus) {
    console.warn("Elysium | Monk's Focus item not found");
    return null;
  }

  // Check if activities exist (won't in test environment)
  if (!monkFocus.system?.activities) {
    console.log("Elysium | No activities on Monk's Focus (test environment?)");
    return null;
  }

  console.log(
    "Elysium | Monk's Focus activities:",
    monkFocus.system.activities,
  );

  // ActivityCollection is a Map-like object, use .values() iterator or forEach
  const activities = Array.from(monkFocus.system.activities.values());
  console.log("Elysium | Number of activities:", activities.length);

  activities.forEach((activity, index) => {
    console.log(`Elysium | Activity ${index}:`, {
      name: activity.name,
      type: activity.type,
      _id: activity._id,
      constructor: activity.constructor.name,
    });
  });

  // Map our keys to activity names (might be different)
  // For enhanced mode, we want the "(Focus Point)" versions that consume focus
  const activityNameMap = {
    "flurry-of-blows": [
      "Flurry of Blows (Focus Point)",
      "Flurry of Strikes (Focus Point)",
      "Flurry of Blows",
      "Flurry of Strikes",
    ],
    "patient-defense": ["Patient Defense (Focus Point)", "Patient Defense"],
    "step-of-wind": ["Step of the Wind (Focus Point)", "Step of the Wind"],
  };

  const possibleNames = activityNameMap[abilityKey];
  if (!possibleNames) {
    console.warn(`Elysium | Unknown ability key: ${abilityKey}`);
    return null;
  }

  // Search in priority order - try "(Focus Point)" versions first
  // This ensures we get the focus-consuming version in enhanced mode
  for (const targetName of possibleNames) {
    console.log(`Elysium | Searching for activity named: "${targetName}"`);
    for (const activity of monkFocus.system.activities.values()) {
      if (activity.name === targetName) {
        console.log(`Elysium | MATCH FOUND: ${activity.name}`);
        return activity;
      }
    }
  }

  console.warn(
    `Elysium | Activity not found for ${abilityKey}, searched names:`,
    possibleNames,
  );
  return null;
}

/**
 * Trigger a monk ability from Monk's Focus
 * @param {Actor} actor - The monk actor
 * @param {string} abilityKey - 'flurry-of-blows', 'patient-defense', 'step-of-wind'
 * @returns {Promise<boolean>} True if triggered successfully
 */
export async function triggerMonkAbility(actor, abilityKey) {
  const activity = findMonkAbilityActivity(actor, abilityKey);

  if (!activity) {
    console.error(
      `Elysium | Could not find monk ability activity: ${abilityKey}`,
    );
    return false;
  }

  console.log(`Elysium | Triggering monk ability: ${activity.name}`);

  try {
    // Trigger the activity
    // Note: activity.use() shows dialogs and handles everything
    await activity.use();
    return true;
  } catch (error) {
    console.error(`Elysium | Error triggering monk ability:`, error);
    return false;
  }
}
