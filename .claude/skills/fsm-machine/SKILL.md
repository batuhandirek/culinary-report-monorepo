---
name: fsm-machine
description: Work on the durable state machine engine (fsm module) — states, transitions, turns, effects, claims. Use before touching anything under modules/fsm or adding a `services/*-fsm/` machine. No machine uses the engine today.
---

# Working on FSM machines

**Read the header comment of `apps/backend/src/modules/fsm/fsm.ts` first — it is the contract.** This skill is the operating checklist, not a replacement. **No machine is built on the engine today**; it is kept for the next one. `fsm/tests/fsm-engine.pglite.spec.ts` is the working example of a machine.

## Layout (per machine)

`<module>/services/<domain>-fsm/`: `states/` (one file per state), `*.providers.ts` (registers the FSM service + EVERY state as Nest providers — a new state must be added here or DI silently omits it), `*.types.ts` (state/action/payload types), actions file, `*.pglite.spec.ts`. FSM entities extend `StateMachineEntityAbstractClass` (`modules/fsm/abstractions/`).

## Hard rules inside state hooks (`afterTransitionIn` / `onResume`)

- **Never** `flush()`, never call pg-boss directly, never open your own transaction. Mutate the in-memory entity graph and enqueue via `ctx.publish` / `ctx.sendJob`. The interpreter commits everything atomically at the durable boundary.
- A machine must pass `effectSink` in its `StateMachineConfig` for those to do anything — the interpreter **silently drops** queued effects when the sink is absent.
- Fire transitions only via `ctx.dispatch(action, payload)` — only actions declared in the current state's `transitions` are accepted.
- Hooks run OUTSIDE any DB transaction (agent calls take seconds) — don't rely on read-your-own-uncommitted-writes across turns.

## Semantics to respect

- `durable` states park (persist pointer, stop); `transient` states keep stepping in-turn. Terminal-state boots are no-ops.
- Concurrency is optimistic via `fsmTurnSeq` + row claim `fsmClaimedAt`. `FsmTurnConflictError` / `FsmTurnInProgressError` ⇒ the turn lost a race — re-run, don't "fix".
- Child machines: `childFsm.runNested(entity, ctx)` folds into the parent's single boundary commit. **`runNested` does NOT take the child's row claim**, so nothing serializes a nested run against a concurrent ROOT run of the same aggregate. When both paths exist, claim explicitly and re-read the entity under the claim; guard the release on the timestamp the claim wrote, or a turn that outlived the TTL clears the claim that stole it. The parent's graph was loaded before its agent work, so its child pointers may be stale.
- **Re-reading after a turn needs a fresh EM.** A `populate` is a no-op for entities already in the identity map — after a multi-second turn it hands back the sibling states (and `version`) read *before* it. Fork the EM to decide anything on post-turn state.
- Audit trail: `fsm_state_changes` rows; query via the lazy `fsmTransitions` formula (`populate: ['fsmTransitions']`).

## Changes checklist

1. New/changed state ⇒ update `states/`, the transitions table, `*.types.ts`, AND `*.providers.ts`.
2. Changed semantics of existing states/actions ⇒ consider bumping the machine version (entities persist `fsmVersion`; old parked aggregates will resume under the new graph).
3. Extend the machine's `*.pglite.spec.ts` — drive the real machine with `mockAgent` responses.
4. Turn advancement arrives via pg-boss jobs — keep the job payload's version check in sync if you change it.
