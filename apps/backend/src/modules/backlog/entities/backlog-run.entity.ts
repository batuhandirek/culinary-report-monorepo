import { Entity, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

/**
 * Why a backlog's run ended: nothing left (`empty`), the day's token budget spent (`budget`),
 * every account out of the free allowance (`allowance`), a batch failed or did nothing (`error`),
 * the backend shutting down (`shutdown`).
 */
export type BacklogStopReason = 'empty' | 'budget' | 'allowance' | 'error' | 'shutdown';

/**
 * One LLM backlog's work on one UTC day (`LlmBacklogService.drain`). A second run the same day
 * ("Run now") adds to the row; the stop reason is the latest run's.
 */
@Entity({ tableName: 'backlog_runs' })
@Unique({ properties: ['key', 'day'] })
export class BacklogRun extends MikroOrmEntityAbstractClass<'batches' | 'done'> {
	/** `LlmBacklog.key` (the unique pair's index serves lookups by key) */
	@Property({ type: 'text' })
	key: string;

	/** YYYY-MM-DD, UTC: the allowance's day */
	@Property({ type: 'text' })
	day: string;

	@Property({ type: 'int', default: 0 })
	batches: number;

	/** Items settled */
	@Property({ type: 'int', default: 0 })
	done: number;

	/** Tokens the batches reported; null while none reported any */
	@Property({ type: 'int', nullable: true })
	tokens?: number | null;

	@Property({ type: 'text', nullable: true })
	stopReason?: BacklogStopReason | null;

	@Property({ type: 'text', nullable: true })
	error?: string | null;

	/** Items left when the run stopped */
	@Property({ type: 'int', nullable: true })
	remaining?: number | null;

	@Property({ type: 'datetime', nullable: true })
	finishedAt?: Date | null;
}
