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
 * @param {Function} canHandle - (item) => boolean - returns true if this handler owns the item
 * @param {Function} handle - (actor, item, activity, config) => Promise<boolean|void> - return false to cancel
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
  Hooks.on("dnd5e.preUseActivity", async (activity, usageConfig, dialogConfig, messageConfig) => {
    const item = activity.item;
    const actor = item?.actor;

    if (!actor) return;

    for (const handler of preUseActivityHandlers) {
      if (handler.canHandle(item)) {
        const result = await handler.handle(actor, item, activity, { usageConfig, dialogConfig, messageConfig });
        if (result === false) {
          return false; // Cancel the activity
        }
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
