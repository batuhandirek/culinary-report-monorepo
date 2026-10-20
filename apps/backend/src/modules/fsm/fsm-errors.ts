/**
 * Concurrency signals of the FSM interpreter. Both mean "this turn did nothing
 * durable — re-run later and the machine will re-derive what is still owed from the
 * committed state". Callers (job workers) should catch them and re-enqueue the
 * wake-up with a short delay, NEVER treat them as a domain failure.
 */

/** Another root turn holds the aggregate's claim — rejected BEFORE any agent work ran. */
export class FsmTurnInProgressError extends Error {
	constructor(fsmName: string, entityId: string) {
		super(`[${fsmName}] a turn is already running for ${entityId}`);
		this.name = 'FsmTurnInProgressError';
	}
}

/**
 * The boundary commit lost against a concurrent turn (stale fsmTurnSeq) and the whole
 * turn was rolled back. Only reachable through the claim-expiry window — with healthy
 * claims, overlap is rejected up front as {@link FsmTurnInProgressError}.
 */
export class FsmTurnConflictError extends Error {
	constructor(fsmName: string, entityId: string) {
		super(`[${fsmName}] boundary commit conflicted for ${entityId} — turn rolled back`);
		this.name = 'FsmTurnConflictError';
	}
}
