import { Logger } from '@nestjs/common';

import type { AnalystPartData, AnalystPlanStep } from 'sdk';

import { ANALYST_MAX_LOOKUPS, ANALYST_MAX_QUERIES } from '../constants/analyst.constant.js';
import type { AnalystMessage } from '../entities/analyst-message.entity.js';
import type { AnalystMessagePart } from '../entities/analyst-message-part.entity.js';

/** What a run writes its parts through: `AnalystThreadService`'s part methods */
export interface AnalystPartWriter {
	addPart(
		message: AnalystMessage,
		data: AnalystPartData,
		streaming?: boolean,
	): Promise<AnalystMessagePart>;
	updatePart(
		message: AnalystMessage,
		part: AnalystMessagePart,
		patch: { data?: AnalystPartData; streaming?: boolean },
	): Promise<void>;
	emitDelta(message: AnalystMessage, part: AnalystMessagePart, delta: string): void;
}

export const QUERY_BUDGET_SPENT = `The query budget (${ANALYST_MAX_QUERIES}) is spent: write your answer from what you have.`;
export const LOOKUP_BUDGET_SPENT = `The lookup budget (${ANALYST_MAX_LOOKUPS}) is spent: write your answer from what you have.`;

/**
 * One answer being written: its parts in the order things happened, and its budgets. The model's
 * text streams into a text part (`onChunk`), closed when a tool is called or a step ends, so the
 * answer reads narration, step, narration, …, answer; each tool adds its own part. Every write goes
 * through one queue, so a part is never created before the text that came before it. The base
 * agent rebuilds the tools each `generate` (and each failover attempt): the counters here are the
 * run's, whatever the attempt.
 */
export class AnalystRun {
	private readonly logger = new Logger(AnalystRun.name);
	private queue: Promise<unknown> = Promise.resolve();
	private text: { part: AnalystMessagePart | null; buffer: string; pending: string } | null =
		null;
	private planPart: AnalystMessagePart | null = null;
	queries = 0;
	lookups = 0;
	/** Text parts written, to fall back on `res.text` when nothing streamed */
	textParts = 0;

	constructor(
		readonly message: AnalystMessage,
		private readonly writer: AnalystPartWriter,
	) {}

	/** Runs `fn` after every write queued before it */
	private serial<T>(fn: () => Promise<T>): Promise<T> {
		const next = this.queue.then(fn, fn);
		this.queue = next.catch(e =>
			this.logger.warn(`A part write failed: ${(e as Error).message}`),
		);
		return next;
	}

	/** Mastra's stream chunks (`onChunk`): text deltas go into the open text part */
	onChunk = (chunk: { type: string; payload?: unknown }): void => {
		if (chunk.type === 'text-delta') {
			const delta = (chunk.payload as { text?: string })?.text ?? '';
			if (delta) this.addText(delta);
		} else if (chunk.type === 'tool-call' || chunk.type === 'text-end') {
			void this.closeText();
		}
	};

	onStepFinish = (): Promise<void> => this.closeText();

	private addText(delta: string) {
		if (!this.text) {
			const text = { part: null as AnalystMessagePart | null, buffer: delta, pending: '' };
			this.text = text;
			void this.serial(async () => {
				text.part = await this.writer.addPart(
					this.message,
					{ type: 'text', text: text.buffer },
					true,
				);
				this.textParts++;
			});
			return;
		}
		const text = this.text;
		text.buffer += delta;
		if (text.part) this.writer.emitDelta(this.message, text.part, delta);
		else text.pending += delta;
		// Deltas that came while the part was being created go out once it exists
		void this.serial(async () => {
			if (text.part && text.pending) {
				this.writer.emitDelta(this.message, text.part, text.pending);
				text.pending = '';
			}
		});
	}

	/** Stores the open text part whole and ends it */
	closeText(): Promise<void> {
		const text = this.text;
		if (!text) return this.serial(async () => undefined);
		this.text = null;
		return this.serial(async () => {
			if (!text.part) return;
			const trimmed = text.buffer.trim();
			await this.writer.updatePart(this.message, text.part, {
				data: { type: 'text', text: trimmed },
				streaming: false,
			});
		});
	}

	/** A part a tool adds, after the text before it */
	async addPart(data: AnalystPartData, streaming = false): Promise<AnalystMessagePart> {
		await this.closeText();
		return this.serial(() => this.writer.addPart(this.message, data, streaming));
	}

	updatePart(part: AnalystMessagePart, patch: { data?: AnalystPartData; streaming?: boolean }) {
		return this.serial(() => this.writer.updatePart(this.message, part, patch));
	}

	/** The plan is one part, rewritten whenever the model updates it */
	async setPlan(steps: AnalystPlanStep[]) {
		if (this.planPart) return this.updatePart(this.planPart, { data: { type: 'plan', steps } });
		this.planPart = await this.addPart({ type: 'plan', steps });
	}

	takeQuery(): boolean {
		if (this.queries >= ANALYST_MAX_QUERIES) return false;
		this.queries++;
		return true;
	}

	takeLookup(): boolean {
		if (this.lookups >= ANALYST_MAX_LOOKUPS) return false;
		this.lookups++;
		return true;
	}

	/** Everything written; the open text part closed */
	async settle() {
		await this.closeText();
		await this.queue;
	}
}
