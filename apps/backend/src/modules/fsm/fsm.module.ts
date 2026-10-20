import { Module } from '@nestjs/common';

import { EventEmitterFsmEventSink } from './services/event-emitter-fsm-event-sink.js';
import { FsmStateChangeSink } from './services/fsm-state-change.sink.js';
import { PgBossFsmEffectSink } from './services/pgboss-fsm-effect-sink.js';

/**
 * Provides the default machine side-effect seams. A feature module that builds a
 * machine imports this and injects the sinks into its `StateMachineConfig`
 * (`changeSink` / `effectSink` / `eventSink`). PgBossService and EventEmitter2 are
 * globally available.
 */
@Module({
	providers: [FsmStateChangeSink, PgBossFsmEffectSink, EventEmitterFsmEventSink],
	exports: [FsmStateChangeSink, PgBossFsmEffectSink, EventEmitterFsmEventSink],
})
export class FsmModule {}
