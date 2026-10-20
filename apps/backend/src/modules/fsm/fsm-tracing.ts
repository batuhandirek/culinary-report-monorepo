import { Attributes, Span, SpanStatusCode, trace } from '@opentelemetry/api';

/* ════════════════════════════════════════════════════════════════════════════
 * FSM TRACING — OpenTelemetry layer, kept SEPARATE from milestone logging.
 *
 * The interpreter owns two independent observability concerns and never couples
 * them in one call:
 *   • milestone LOGGING  → plain, human-readable lines ("entered X", "persisting")
 *                          emitted straight through the NestJS Logger.
 *   • distributed TRACING → this module. One "turn" span follows an entity from
 *                          its first action of the turn until it parks at a durable
 *                          state (or completes); every hook invocation is a child
 *                          span; interpreter milestones are recorded as span events.
 *
 * The entity id is stamped as `fsm.entity_id` on every span, so a trace shows the
 * whole journey of one entity — boot → transient hops → durable resting point.
 *
 * When OTEL is disabled the global provider hands back a no-op tracer, so all of
 * this compiles down to cheap no-ops with no branching at the call sites.
 * ════════════════════════════════════════════════════════════════════════════ */

const tracer = trace.getTracer('fsm');

/** Identity of one interpreter turn, stamped on the turn span. */
export interface FsmTurnAttributes {
	readonly fsmName: string;
	readonly fsmVersion: number;
	readonly ownerType: string;
	readonly entityId: string;
	readonly bootState: string;
	readonly turnId: string;
}

export class FsmTracer {
	/**
	 * The turn span: the entity's whole journey this turn (boot → transient hops →
	 * park at a durable state / complete). `fn` receives the span so the interpreter
	 * can stamp the resting position and step counts once the turn settles.
	 */
	turn<T>(attrs: FsmTurnAttributes, fn: (span: Span) => Promise<T>): Promise<T> {
		return tracer.startActiveSpan(
			`fsm ${attrs.fsmName} turn`,
			{
				attributes: {
					'fsm.name': attrs.fsmName,
					'fsm.version': attrs.fsmVersion,
					'fsm.owner_type': attrs.ownerType,
					'fsm.entity_id': attrs.entityId,
					'fsm.boot_state': attrs.bootState,
					'fsm.turn_id': attrs.turnId,
				},
			},
			span => this.guard(span, () => fn(span)),
		);
	}

	/** A child span for one state hook invocation (afterTransitionIn / onResume). */
	hook<T>(stateName: string, hook: string, entityId: string, fn: () => Promise<T>): Promise<T> {
		return tracer.startActiveSpan(
			`fsm ${stateName} ${hook}`,
			{ attributes: { 'fsm.state': stateName, 'fsm.hook': hook, 'fsm.entity_id': entityId } },
			span => this.guard(span, fn),
		);
	}

	/** Record an interpreter milestone as an event on the current (turn or hook) span. */
	event(name: string, attributes?: Attributes): void {
		trace.getActiveSpan()?.addEvent(name, attributes);
	}

	/** Run `fn` under `span`, recording exceptions/status and always ending the span. */
	private async guard<T>(span: Span, fn: () => Promise<T>): Promise<T> {
		try {
			const result = await fn();
			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (err) {
			span.recordException(err as Error);
			span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
			throw err;
		} finally {
			span.end();
		}
	}
}
