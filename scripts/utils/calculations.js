/**
 * Pure Calculation Functions
 *
 * These functions have no side effects and are easy to test.
 * They don't touch the Foundry API - just pure math and logic.
 */

/**
 * Calculate the toxicity save DC based on daily doses
 * Formula: DC = 8 + (2 * (dailyDoses + 1))
 *
 * @param {number} dailyDoses - Current number of doses taken today (before this one)
 * @returns {number} The Constitution save DC
 */
export function calculateToxicityDC(dailyDoses) {
  return 8 + 2 * (dailyDoses + 1);
}

/**
 * Determine if this ATL level should add exhaustion
 * Exhaustion is added at ATL 2 and ATL 4
 *
 * @param {number} atl - Aether Toxicity Level
 * @returns {boolean} True if exhaustion should be added
 */
export function shouldAddExhaustion(atl) {
  return atl === 2 || atl === 4;
}
