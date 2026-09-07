// Host command bus.
//
// Host actions ride on the Yjs awareness channel (same mechanism as the
// existing kick feature). The host writes a fresh { id, ... } object to their
// own `hostAction` awareness field; every other client sweeps awareness states
// and trusts commands coming only from the awareness state whose authUserId
// matches the room's hostId.

const lastAppliedByClient = {};

/**
 * Reset local action tracker.
 * Time Complexity: O(C) where C is the number of recorded clients.
 * Space Complexity: O(1)
 */
export function resetHostActionTracker() {
  for (const k of Object.keys(lastAppliedByClient)) delete lastAppliedByClient[k];
}

/**
 * Dispatch an action to all clients via the awareness protocol.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function sendHostAction(provider, payload) {
  if (!provider || !provider.awareness) return false;
  const id = `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  provider.awareness.setLocalStateField('hostAction', { id, ...payload });
  return true;
}

/**
 * Sweep all awareness states and invoke onAction() for any host command we
 * haven't applied yet. localClientId is the receiver's own awareness client id.
 * Time Complexity: O(C) where C is the number of active clients in the room.
 * Space Complexity: O(1) per execution, O(C) total for the lastApplied tracking.
 */
export function sweepHostActions(provider, hostId, localClientId, onAction) {
  if (!provider || !provider.awareness || !hostId) return;
  const states = provider.awareness.getStates();
  states.forEach((state, clientId) => {
    if (!state) return;
    // Only the host's awareness state can carry enforceable commands.
    if (state.authUserId !== hostId) return;
    const action = state.hostAction;
    if (!action || !action.id) return;
    if (lastAppliedByClient[clientId] === action.id) return;
    lastAppliedByClient[clientId] = action.id;
    onAction({ clientId, ...action });
  });
}