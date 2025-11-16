/**
 * Toxicity Application System
 *
 * Handles unrefined aether toxicity tracking and effects
 */

import { getDailyDoses, setDailyDoses, getATL, setATL, getAetherQuality } from '../utils/flags.js';
import { calculateToxicityDC, shouldAddExhaustion } from '../utils/calculations.js';

/**
 * Apply unrefined aether use with CON save and toxicity tracking
 * @param {Actor} actor
 * @param {Roll} roll - The CON save roll
 * @returns {Promise<Object>} { success: boolean, newDailyDoses: number, newATL: number }
 */
export async function applyUnrefinedAetherUse(actor, roll) {
  // Get current toxicity state
  const dailyDoses = getDailyDoses(actor);
  const currentATL = getATL(actor);

  // Increment daily doses
  const newDailyDoses = dailyDoses + 1;
  await setDailyDoses(actor, newDailyDoses);

  // Calculate DC for this dose
  const dc = calculateToxicityDC(dailyDoses);

  // rollSavingThrow returns an array with the roll at index 0
  const actualRoll = Array.isArray(roll) ? roll[0] : roll;

  // The total is stored in _total (private property)
  const rollTotal = actualRoll?._total ?? actualRoll?.total ?? 0;
  const success = rollTotal >= dc;

  console.log(`Elysium | Toxicity Save: ${success ? '✅ SUCCEEDED' : '❌ FAILED'} (rolled ${rollTotal} vs DC ${dc})`);

  if (!success) {
    // Failed save - increase ATL and apply effects
    const newATL = currentATL + 1;
    await setATL(actor, newATL);
    await applyToxicityEffects(actor, newATL);

    return { success: false, newDailyDoses, newATL };
  }

  return { success: true, newDailyDoses, newATL: currentATL };
}

/**
 * Check if we should show the toxicity warning for this item
 * @param {Item} item
 * @returns {boolean}
 */
export function shouldShowToxicityWarning(item) {
  const quality = getAetherQuality(item);
  return quality === 'unrefined';
}

/**
 * Get data for the toxicity warning dialog
 * @param {Actor} actor
 * @returns {Object} { dailyDoses, atl, nextDC }
 */
export function getToxicityWarningData(actor) {
  const dailyDoses = getDailyDoses(actor);
  const atl = getATL(actor);
  const nextDC = calculateToxicityDC(dailyDoses);

  return { dailyDoses, atl, nextDC };
}

/**
 * Roll Aether Madness check (Wisdom save)
 * @param {Actor} actor
 * @param {number} dc
 * @returns {Promise<void>}
 */
async function checkAetherMadness(actor, dc) {
  const roll = await actor.rollSavingThrow({
    ability: 'wis',
    targetValue: dc
  });

  // Extract actual roll from array
  const actualRoll = Array.isArray(roll) ? roll[0] : roll;
  const rollTotal = actualRoll?._total ?? actualRoll?.total ?? 0;
  const success = rollTotal >= dc;

  if (!success) {
    // Failed Aether Madness save - apply charmed condition
    await actor.toggleStatusEffect('charmed', { active: true });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="aether-message aether-message-toxicity">
          <h3>
            🌀 AETHER MADNESS 🌀
          </h3>
          <p><strong>${actor.name}</strong> succumbs to aether-induced madness!</p>
          <p class="elysium-text-orange" style="font-size: 0.9em;">Applied: Charmed condition</p>
        </div>
      `
    });
  } else {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> resists the aether madness! (rolled ${rollTotal} vs DC ${dc})</p>`
    });
  }
}

/**
 * Roll Stunned check (Constitution save)
 * @param {Actor} actor
 * @param {number} dc
 * @returns {Promise<void>}
 */
async function checkStunned(actor, dc) {
  const roll = await actor.rollSavingThrow({
    ability: 'con',
    targetValue: dc
  });

  // Extract actual roll from array
  const actualRoll = Array.isArray(roll) ? roll[0] : roll;
  const rollTotal = actualRoll?._total ?? actualRoll?.total ?? 0;
  const success = rollTotal >= dc;

  if (!success) {
    // Failed Stunned save - apply stunned condition
    await actor.toggleStatusEffect('stunned', { active: true });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="aether-message aether-message-toxicity">
          <h3>
            ⚡ AETHER OVERLOAD ⚡
          </h3>
          <p><strong>${actor.name}</strong> is overwhelmed by toxic aether!</p>
          <p class="elysium-text-orange" style="font-size: 0.9em;">Applied: Stunned condition</p>
        </div>
      `
    });
  } else {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<p><strong>${actor.name}</strong> resists being stunned! (rolled ${rollTotal} vs DC ${dc})</p>`
    });
  }
}

/**
 * Apply toxicity effects based on ATL level
 * @param {Actor} actor
 * @param {number} atl - Aether Toxicity Level
 */
export async function applyToxicityEffects(actor, atl) {
  // Progressive effects based on ATL
  const effectsByLevel = {
    1: { conditions: ['poisoned'] },
    2: { conditions: ['poisoned', 'blinded'] },
    3: { conditions: ['poisoned', 'blinded'], checks: ['madness'] },
    4: { conditions: ['poisoned', 'blinded'], checks: ['madness', 'stunned'] },
    5: { conditions: ['poisoned', 'blinded', 'paralyzed'] }
  };

  const effects = effectsByLevel[Math.min(atl, 5)];

  // Apply conditions
  for (const condition of effects.conditions) {
    await actor.toggleStatusEffect(condition, { active: true });
  }

  // Add exhaustion at ATL 2 and 4
  if (shouldAddExhaustion(atl)) {
    const currentExhaustion = actor.system.attributes?.exhaustion || 0;
    await actor.update({
      'system.attributes.exhaustion': currentExhaustion + 1
    });
  }

  // Calculate DC for special checks (same as toxicity DC)
  const dailyDoses = getDailyDoses(actor);
  const dc = calculateToxicityDC(dailyDoses);

  // Special checks at ATL 3 and 4
  if (effects.checks) {
    if (effects.checks.includes('madness')) {
      await checkAetherMadness(actor, dc);
    }
    if (effects.checks.includes('stunned')) {
      await checkStunned(actor, dc);
    }
  }
}

/**
 * Reset toxicity on long rest
 * @param {Actor} actor
 * @returns {Promise<boolean>} True if reset occurred, false if nothing to reset
 */
export async function resetToxicityOnLongRest(actor) {
  const dailyDoses = getDailyDoses(actor);
  const atl = getATL(actor);

  // Nothing to reset
  if (dailyDoses === 0 && atl === 0) {
    return false;
  }

  // Reset toxicity flags
  await setDailyDoses(actor, 0);
  await setATL(actor, 0);

  // Reset exhaustion
  await actor.update({
    'system.attributes.exhaustion': 0
  });

  // Remove all toxicity-related conditions
  const toxicityConditions = ['poisoned', 'blinded', 'paralyzed', 'charmed', 'stunned'];
  for (const condition of toxicityConditions) {
    const effect = actor.effects.find(e => e.statuses?.has(condition));
    if (effect) {
      await effect.delete();
    }
  }

  return true;
}
