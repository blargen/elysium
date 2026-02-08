/**
 * Activity Selection Logic
 *
 * Pure functions for determining which activity to trigger based on fire mode.
 * No Foundry API calls here - just logic!
 */

/**
 * Get the activity name for the given fire mode choice
 * @param {string} choice - The fire mode choice ("normal" or "overpower")
 * @returns {string|null} The activity name ("Fire" or "Overload") or null if invalid
 */
export function getActivityIdForFireMode(choice) {
  if (choice === "normal") {
    return "Fire";
  }

  if (choice === "overpower") {
    return "Overload";
  }

  return null;
}
