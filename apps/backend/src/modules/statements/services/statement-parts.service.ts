import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { TermService } from 'src/modules/topics/services/term.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import { runPool } from 'src/shared/util/pool.js';

import { ClaimPartsAgent, ClaimPartsInputSource } from '../agents/claim-parts.agent.js';
import { Statement } from '../entities/statement.entity.js';
import { StatementPart } from '../entities/statement-part.entity.js';
import { claimPartsOf, MAX_FOODS, OTHER_ROOT } from '../util/claim-parts-answer.js';
import { claimPartsQuestions } from '../util/claim-parts-input.js';

// Claims read side by side, one a call
const CONCURRENCY = 20;
// Claims a daily-backlog batch reads (~6 agent calls)
const BACKLOG_BATCH_CLAIMS = 600;

/** SQL: a statement (`s`) agent B has not read: a claim with text and no `parts_at` */
export const PARTS_PENDING_SQL = 's.text is not null and s.parts_at is null';

/**
 * Agent B's writer: the parts of a claim (`StatementPart`), its sentiment, amount and kind,
 * read from the stored text alone (`ClaimPartsAgent`), never by extracting a source again. Runs
 * right after agent A over the step's new claims, and as the daily LLM backlog `statement-parts`
 * over any claim without `partsAt` (a prompt change clears `partsAt` and every claim is read again,
 * no source touched). Each food wording becomes a `Term` (`TermService.ensure`); its topics are
 * the term's links, joined at read time.
 */
@Injectable()
export class StatementPartsService implements OnModuleInit {
	private readonly logger = new Logger(StatementPartsService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly claimPartsAgent: ClaimPartsAgent,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
		private readonly topicService: TopicService,
		private readonly termService: TermService,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'statement-parts',
			label: 'Parts of claims',
			priority: 10,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.read({ limit: BACKLOG_BATCH_CLAIMS });
				return { done: res.read, tokens: res.tokens };
			},
		});
	}

	async countPending(): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(`select count(*)::int as n from statements s where ${PARTS_PENDING_SQL}`);
		return row.n;
	}

	/**
	 * Reads up to `limit` pending claims (or the given `ids` among them; newest month first) with
	 * agent B and writes what it says: the sentiment, the aspect part (a key the table lacks settles
	 * the claim with no aspect part, the keys logged per batch: a claim is never re-asked by itself,
	 * and the claims without an aspect are what the discovery of new aspects reads), one food part per wording named (a `Term`, new ones
	 * name-matched at once), the stated amount (the agent's, else the text parsed for the aspect's
	 * unit), `kind` as the agent answers it (final: `KIND_RULES`). Flushes, also when the pool stops
	 * on a provider failure, then rethrows.
	 */
	async read(opts: {
		ids?: number[];
		limit?: number;
	}): Promise<{ read: number; tokens: number }> {
		if (opts.ids && !opts.ids.length) return { read: 0, tokens: 0 };
		const statements = await this.em.find(
			Statement,
			{ text: { $ne: null }, partsAt: null, ...(opts.ids && { id: { $in: opts.ids } }) },
			{
				orderBy: { month: 'desc', id: 'asc' },
				limit: opts.limit,
				populate: ['parts', 'review.venue', 'mention'],
			},
		);
		if (!statements.length) return { read: 0, tokens: 0 };
		const index = await this.topicService.index();
		const legend = index.aspectLegend();
		const byId = new Map(statements.map(s => [String(s.id), s]));
		const now = new Date();
		let read = 0;
		let tokens = 0;
		const unknown = new Map<string, number>();
		try {
			// One claim a call, its source's other claims beside it
			await runPool(
				this.calls(statements).flatMap(claimPartsQuestions),
				CONCURRENCY,
				async question => {
					const statement = byId.get(question.id);
					if (!statement || statement.partsAt) return;
					const res = await this.claimPartsAgent.generate(question.message, { legend });
					tokens += res.usage?.totalTokens ?? 0;
					const answer = res.object;
					const terms = await this.termService.ensure(answer.foods.slice(0, MAX_FOODS), index);
					const parts = claimPartsOf(answer, statement.text!, index);
					const aspect = parts.aspect;
					if (answer.aspect && !aspect && answer.aspect !== OTHER_ROOT)
						unknown.set(answer.aspect, (unknown.get(answer.aspect) ?? 0) + 1);
					statement.sentiment = parts.sentiment;
					// B's answer is final: it is told the kinds' rules (`KIND_RULES`), so re-reading a claim fixes its kind
					statement.kind = parts.kind;
					statement.amount = parts.amount;
					statement.unit = parts.unit;
					statement.parts.removeAll();
					let rank = 0;
					if (aspect?.id)
						statement.parts.add(
							this.em.create(StatementPart, {
								statement,
								role: 'aspect',
								topic: this.em.getReference(Topic, aspect.id),
								rank: rank++,
							}),
						);
					for (const key of _.uniq(answer.foods.map(termKey).filter(Boolean))) {
						const term = terms.get(key);
						if (term)
							statement.parts.add(
								this.em.create(StatementPart, { statement, role: 'food', term, rank: rank++ }),
							);
					}
					// A key the table lacks: the claim is kept and settled with no aspect part
					statement.partsAt = now;
					read++;
				},
				(question, e) => this.logger.warn(`Parts of claim ${question.id} failed: ${e.message}`),
			);
		} finally {
			// Kept also when the pool stops on a provider failure: what finished is applied
			await this.em.flush();
		}
		if (unknown.size)
			this.logger.warn(
				`Aspect keys the table lacks (${_.sum([...unknown.values()])} claims): ${[
					...unknown,
				]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 20)
					.map(([k, n]) => `${k} (${n})`)
					.join(', ')}`,
			);
		return { read, tokens };
	}

	/** The statements grouped by source, so each claim is read next to its siblings */
	private calls(statements: Statement[]): ClaimPartsInputSource[] {
		const sources = Object.values(
			_.groupBy(statements, s =>
				s.review ? `r:${s.review.id}`
				: s.mention ? `m:${s.mention.id}`
				: `${s.sourceKind}:${s.post?.id ?? s.comment?.id ?? s.webMention?.id ?? s.venue?.id}:${s.subject}`,
			),
		).map((group): ClaimPartsInputSource => ({
			kind: group[0].sourceKind,
			venue: group[0].review?.venue?.name ?? group[0].mention?.venueName ?? null,
			claims: group.map(s => ({
				id: String(s.id),
				text: s.text!,
				...(s.quote && { quote: s.quote }),
			})),
		}));
		return sources;
	}
}
