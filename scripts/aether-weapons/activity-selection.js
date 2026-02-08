/**
 * Activity Selection Logic
 *
 * Pure functions for determining which activity to trigger based on fire mode.
 * No Foundry API calls here - just logic!
 */

/**
 * Get the activity name for the given fire mode choice
 * @param {string} choice - The fire mode choice ("normal" or "overclock")
 * @returns {string|null} The activity name (always "Fire") or null if invalid
 */
export function getActivityIdForFireMode(choice) {
  // Both normal and overclock use the "Fire" activity
  // Damage modification is handled by the damage-modification.js hook based on currentFireMode flag
  if (choice === "normal" || choice === "overclock") {
    return "Fire";
  }

  return null;
}
