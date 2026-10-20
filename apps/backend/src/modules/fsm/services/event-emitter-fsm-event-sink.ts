import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { FsmEventSink } from '../types/fsm.types.js';

/**
 * Default {@link FsmEventSink}: emits the machine's queued in-memory events through
 * EventEmitter2. Called by the interpreter AFTER the boundary transaction commits,
 * so consumers never observe rolled-back state.
 */
@Injectable()
export class EventEmitterFsmEventSink implements FsmEventSink {
	constructor(private readonly eventEmitter: EventEmitter2) {}

	emit(name: string, event: object): void {
		this.eventEmitter.emit(name, event);
	}
}
