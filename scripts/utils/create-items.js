/**
 * Utility functions for creating Elysium items in compendiums
 *
 * Call these from Foundry macros to create items easily
 */

/**
 * Create an aether-powered equipment item in the compendium
 *
 * @param {Object} config - Item configuration
 * @param {string} config.name - Item name
 * @param {string} config.description - Item description (HTML allowed)
 * @param {string} config.img - Image path
 * @param {string} config.rarity - Rarity (common, uncommon, rare, very rare, legendary)
 * @param {string} config.flagName - Camel case flag name (e.g., "isAethersLeap")
 * @param {string} config.activityName - Name for the activity
 * @param {string} config.activationType - Activation type (action, bonus, reaction, etc.)
 * @param {number} config.activationValue - Activation cost (usually 1)
 * @returns {Promise<Item>} The created compendium item
 */
export async function createAetherItem(config) {
  const {
    name,
    description,
    img = "icons/svg/item-bag.svg",
    rarity = "uncommon",
    flagName,
    activityName = `Activate ${name}`,
    activationType = "action",
    activationValue = 1,
  } = config;

  const itemData = {
    name: name,
    type: "equipment",
    img: img,
    system: {
      description: {
        value: description,
      },
      rarity: rarity,
      identified: true,
      equipped: false,
      activities: {
        use: {
          type: "utility",
          name: activityName,
          activation: {
            type: activationType,
            value: activationValue,
          },
          consumption: {
            targets: [], // No built-in consumption - handled by module hooks
          },
        },
      },
    },
    flags: {
      elysium: {
        [flagName]: true,
        requiresAether: true,
        category: "aether-items",
      },
    },
  };

  // Get the compendium
  const pack = game.packs.get("elysium.elysium-items");
  if (!pack) {
    ui.notifications.error("Elysium Items compendium not found!");
    throw new Error("Compendium not found");
  }

  // Delete old version if it exists
  const index = await pack.getIndex();
  const existing = index.find((i) => i.name === name);

  if (existing) {
    const oldItem = await pack.getDocument(existing._id);
    await oldItem.delete();
    console.log(`Elysium | Deleted old version of ${name}`);
  }

  // Create item in world, add to compendium, then delete from world
  const item = await Item.create(itemData);
  const compendiumItem = await pack.importDocument(item);
  await item.delete();

  console.log(`Elysium | Created ${name} in compendium`);
  ui.notifications.info(`✅ ${name} added to compendium!`);

  return compendiumItem;
}

/**
 * Create Aether's Leap item
 */
export async function createAethersLeap() {
  return await createAetherItem({
    name: "Aether's Leap",
    description: `
      <div class="elysium-item-description">
        <p>Enchanted boots that allow you to cast the <strong>Jump</strong> spell on yourself using aether fuel.</p>
        <p><strong>Jump:</strong> For the next minute, you can jump up to 30 feet by spending 10 feet of movement.</p>
        <p><em>Duration: 1 minute (concentration)</em></p>
        <p><em>Requires aether fuel to activate.</em></p>
      </div>
    `,
    img: "modules/elysium/assets/AethersLeap.png",
    rarity: "uncommon",
    flagName: "isAethersLeap",
    activityName: "Activate Aether's Leap",
    activationType: "action",
    activationValue: 1,
  });
}

// Make functions available globally for macros
window.ElysiumItemCreator = {
  createAetherItem,
  createAethersLeap,
};

console.log(
  "Elysium | Item creator loaded. Use window.ElysiumItemCreator from macros.",
);
