import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { TermService } from 'src/modules/topics/services/term.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { termKey } from 'src/modules/venues/util/dishes.js';
import { runPool } from 'src/shared/util/pool.js';

import { ClaimLabelsClassifier } from '../classifiers/claim-labels.classifier.js';
import { Statement } from '../entities/statement.entity.js';
import { StatementPart } from '../entities/statement-part.entity.js';
import { claimLabelAspects, claimLabelsOf } from '../util/claim-labels.js';
import { claimFoods } from '../util/claim-parts-answer.js';
import { type ClaimPartsInputSource, claimPartsQuestions } from '../util/claim-parts-input.js';

// Claims labelled side by side, one a call (a decision is one short call)
const CONCURRENCY = 20;
// Claims a daily-backlog batch labels
const BACKLOG_BATCH_CLAIMS = 600;

/** SQL: a statement (`s`) not labelled yet: a claim with text and no `parts_at` */
export const PARTS_PENDING_SQL = 's.text is not null and s.parts_at is null';

/**
 * The writer of a claim's parts (`StatementPart`), its sentiment, amount and kind: agent A's
 * foods as food parts (`Statement.foodsFromA`, held in memory by `StatementService`; a `Term` each,
 * `TermService.ensure`, once a batch), then the claim-labels classifier's sentiment, kind and aspect
 * part (Jev, `ClaimLabelsClassifier`: the user's call of 2026-11-05), read from the claim and its
 * neighbours alone, never a source read again. The number is agent A's, else the text parsed for
 * the aspect's unit. Runs right after agent A over the step's new claims, and as the daily LLM
 * backlog `statement-parts` over any claim without `partsAt` (clearing `partsAt` labels a claim
 * again, its foods untouched: aspect discovery re-files claims that way). A food part's topics are
 * its term's links, joined at read time.
 */
@Injectable()
export class StatementPartsService implements OnModuleInit {
	private readonly logger = new Logger(StatementPartsService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly claimLabelsClassifier: ClaimLabelsClassifier,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
		private readonly topicService: TopicService,
		private readonly termService: TermService,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'statement-parts',
			label: 'Labels of claims',
			priority: 10,
			remaining: () => this.countPending(),
			runBatch: async () => {
				const res = await this.read({ limit: BACKLOG_BATCH_CLAIMS });
				// Paid by the call (Jev), not OpenAI's allowance the day's token budget guards
				return { done: res.read, tokens: 0 };
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
	 * Labels up to `limit` pending claims (or the given `ids` among them; newest month first):
	 * first agent A's foods of the new ones become food parts (whatever the labeller does next, so a
	 * classifier failing loses none), then one decision a claim, its source's other claims beside
	 * it: the sentiment, the kind (final: `KIND_RULES`; a judging fact is an opinion), the aspect part
	 * (replacing any older one; "no aspect" settles the claim with none, what aspect discovery groups),
	 * the number (A's, else the text parsed). Flushes, also when the pool stops on a provider
	 * failure (no key, switched off, no credit: the claims wait), then rethrows. `usd` is what the
	 * decisions cost.
	 */
	async read(opts: {
		ids?: number[];
		limit?: number;
	}): Promise<{ read: number; tokens: number; usd: number }> {
		if (opts.ids && !opts.ids.length) return { read: 0, tokens: 0, usd: 0 };
		const statements = await this.em.find(
			Statement,
			{ text: { $ne: null }, partsAt: null, ...(opts.ids && { id: { $in: opts.ids } }) },
			{
				orderBy: { month: 'desc', id: 'asc' },
				limit: opts.limit,
				populate: ['parts', 'review.venue', 'mention'],
			},
		);
		if (!statements.length) return { read: 0, tokens: 0, usd: 0 };
		const index = await this.topicService.index();
		const aspects = claimLabelAspects(index);
		const byId = new Map(statements.map(s => [String(s.id), s]));
		const now = new Date();
		let read = 0;
		let tokens = 0;
		let usd = 0;
		try {
			await this.storeFoodsFromA(statements, index);
			// One claim a call, its source's other claims beside it
			await runPool(
				this.calls(statements).flatMap(claimPartsQuestions),
				CONCURRENCY,
				async question => {
					const statement = byId.get(question.id);
					if (!statement || statement.partsAt) return;
					const res = await this.claimLabelsClassifier.decide(question.state, {
						aspects,
					});
					tokens += res.usage.totalTokens ?? 0;
					usd += res.usd;
					const labels = claimLabelsOf(res.answers, statement.text!, index, {
						amount: statement.amount ?? null,
						unit: statement.unit ?? null,
					});
					statement.sentiment = labels.sentiment;
					statement.kind = labels.kind;
					statement.amount = labels.amount;
					statement.unit = labels.unit;
					for (const part of statement.parts.getItems().filter(p => p.role === 'aspect'))
						statement.parts.remove(part);
					if (labels.aspect?.id)
						statement.parts.add(
							this.em.create(StatementPart, {
								statement,
								role: 'aspect',
								topic: this.em.getReference(Topic, labels.aspect.id),
								rank: 0,
							}),
						);
					statement.partsAt = now;
					read++;
				},
				(question, e) =>
					this.logger.warn(`Labels of claim ${question.id} failed: ${e.message}`),
			);
		} finally {
			// Kept also when the pool stops on a provider failure: what finished is applied
			await this.em.flush();
		}
		if (read) this.logger.log(`Labelled ${read} claims on Jev, $${usd.toFixed(4)}`);
		return { read, tokens, usd };
	}

	/**
	 * Agent A's food wordings of claims it just wrote (`foodsFromA`) as food parts, after the
	 * aspect's rank: one `Term` lookup for the whole batch, the wordings once per `termKey`
	 */
	private async storeFoodsFromA(statements: Statement[], index: TopicIndex): Promise<void> {
		const withFoods = statements.filter(s => s.foodsFromA?.length);
		if (!withFoods.length) return;
		const terms = await this.termService.ensure(
			_.uniq(withFoods.flatMap(s => claimFoods(s.foodsFromA!))),
			index,
		);
		for (const statement of withFoods) {
			let rank = 1;
			for (const key of _.uniq(claimFoods(statement.foodsFromA!).map(termKey))) {
				const term = terms.get(key);
				if (term)
					statement.parts.add(
						this.em.create(StatementPart, {
							statement,
							role: 'food',
							term,
							rank: rank++,
						}),
					);
			}
			statement.foodsFromA = undefined;
		}
	}

	/** The statements grouped by source, so each claim is read next to its siblings */
	private calls(statements: Statement[]): ClaimPartsInputSource[] {
		const sources = Object.values(
			_.groupBy(statements, s =>
				s.review ? `r:${s.review.id}`
				: s.mention ? `m:${s.mention.id}`
				: `${s.sourceKind}:${s.post?.id ?? s.comment?.id ?? s.webMention?.id}:${s.subject}`,
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
