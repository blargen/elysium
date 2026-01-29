/**
 * Hook Registry
 *
 * Central dispatcher for Elysium hooks. Item-specific handlers register
 * themselves, and this module routes events to the appropriate handler.
 */

// Registered handlers for each hook type
const preUseActivityHandlers = [];
const postActivityConsumptionHandlers = [];
const restCompletedHandlers = [];

/**
 * Register a handler for preUseActivity hook
 * @param {Function} canHandle - (item, activity) => boolean - returns true if this handler should intercept
 * @param {Function} handle - (actor, item, activity, config) => Promise<void> - async handler, activity is already cancelled
 */
export function registerPreUseActivityHandler(canHandle, handle) {
  preUseActivityHandlers.push({ canHandle, handle });
}

/**
 * Register a handler for postActivityConsumption hook
 * @param {Function} canHandle - (item, activity) => boolean
 * @param {Function} handle - (actor, item, activity) => Promise<void>
 */
export function registerPostActivityConsumptionHandler(canHandle, handle) {
  postActivityConsumptionHandlers.push({ canHandle, handle });
}

/**
 * Register a handler for restCompleted hook
 * @param {Function} canHandle - (actor) => boolean - returns true if handler has work to do
 * @param {Function} handle - (actor, restData) => Promise<void>
 */
export function registerRestCompletedHandler(canHandle, handle) {
  restCompletedHandlers.push({ canHandle, handle });
}

/**
 * Initialize all hook listeners
 * Call this once during module ready
 */
export function initializeHooks() {
  // Pre-use activity - intercepts item use
  //
  // IMPORTANT: This callback is NOT async. Foundry does not await async hook
  // callbacks, so an async function returning false would return a Promise
  // (which is truthy), and the activity would proceed immediately.
  //
  // Instead, we check canHandle synchronously, return false to cancel the
  // activity, and kick off the async handler work separately. The handler
  // is responsible for re-triggering activity.use() if the attack should
  // still proceed after async work (fuel selection, etc.) completes.
  Hooks.on("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, messageConfig) => {
    const item = activity.item;
    const actor = item?.actor;

    if (!actor) return;

    for (const handler of preUseActivityHandlers) {
      if (handler.canHandle(item, activity)) {
        // Fire the async handler but do NOT await it.
        // The handler is responsible for re-triggering activity.use() if needed.
        handler.handle(actor, item, activity, { usageConfig, dialogConfig, messageConfig });
        return false; // Synchronously cancel the activity
      }
    }
  });

  // Post-activity consumption - after item is used
  Hooks.on("dnd5e.postActivityConsumption", async (activity, usageConfig, messageConfig, updates) => {
    const item = activity.item;
    const actor = item?.actor;

    if (!actor) return;

    for (const handler of postActivityConsumptionHandlers) {
      if (handler.canHandle(item, activity)) {
        await handler.handle(actor, item, activity);
      }
    }
  });

  // Rest completed - long rest recovery
  Hooks.on("dnd5e.restCompleted", async (actor, restData) => {
    if (!restData.longRest) return;

    console.log(`Elysium | ${actor.name} completed a long rest`);

    for (const handler of restCompletedHandlers) {
      if (handler.canHandle(actor)) {
        await handler.handle(actor, restData);
      }
    }
  });

  console.log("Elysium | Hook registry initialized");
}
