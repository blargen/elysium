/**
 * Chat Messages
 *
 * Centralized chat message creation for Elysium module.
 * Uses CSS classes from styles/elysium.css
 */

/**
 * Create the aether recovery chat message shown after long rest
 */
export async function createAetherRecoveryMessage(actor, effectsRemoved = 0) {
  const effectsRemovedHtml = effectsRemoved > 0
    ? `<p class="elysium-text-muted">Removed ${effectsRemoved} aether effect(s)</p>`
    : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="aether-message aether-message-success">
        <h3>AETHER RECOVERY</h3>
        <p><strong>${actor.name}</strong> completes a long rest</p>
        <p class="elysium-text-muted">Their body purges the accumulated aether toxins and effects.</p>
        ${effectsRemovedHtml}
      </div>
    `,
  });
}
