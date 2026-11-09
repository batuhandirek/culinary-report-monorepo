import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import {
	AccountMatchingService,
	type AccountMatchResult,
} from 'src/modules/social/services/account-matching.service.js';
import {
	type MatchDecision,
	type MatchPass,
	MentionMatchingService,
	type MentionMatchPlan,
	settleMatch,
} from 'src/modules/social/services/mention-matching.service.js';

import {
	type ReadCityResult,
	ReadPostsWorkflow,
} from '../../read-posts/workflows/read-posts.workflow.js';
import { VenueMatchAgent } from '../agents/venue-match.agent.js';
import { MATCH_MENTION_QUEUE, MATCH_MENTIONS_QUEUE } from '../queues/match-mentions.queue.js';

/** What a city's matching did: the workflow's result */
export interface MatchCityResult {
	read: ReadCityResult;
	/** Mentions settled, by how (exact, fuzzy, llm, none, other_city, …): in code and by the agent */
	matched: Record<string, number>;
	/** The close calls, each its own run asking the agent */
	asked: number;
	/** Of those, the runs that failed: resumed by an admin on `/admin/workflows` */
	failed: number;
	/** The account matcher's result, when anything matched */
	accounts?: AccountMatchResult;
	/** Mentions the accounts' tags placed afterwards */
	byTags?: Record<string, number>;
}

/** What one close call's run did: how it was settled, null when the mention was gone or corrected */
export interface MatchMentionResult {
	method: MentionMatchMethodEnum | null;
}

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/**
 * A city's mentions matched to venues, as a workflow (hourly by `MatchMentionsSchedule`, and by any
 * operation that needs the month's brands, through `matchCityNow`): the city's unread posts read
 * first (`ReadPostsWorkflow.readCity`, a child), then the mentions matched in code in one step
 * (what is sure saved at once), then every close call its own run (`matchMention`: its plan, the
 * `VenueMatchAgent` call as a `DurableLlmService` child that waits until an account can serve it,
 * its save), all started and then awaited in order, so one waiting for the allowance holds no
 * other back and a resume never asks a settled one again; then, when anything matched, the
 * authors linked to the brands they are the own accounts of and the mentions their tags place.
 */
@Injectable()
export class MatchMentionsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly venueMatchAgent: VenueMatchAgent,
		private readonly cityService: CityService,
		private readonly readPosts: ReadPostsWorkflow,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly accountMatchingService: AccountMatchingService,
	) {}

	@DurableWorkflow({ name: 'match-mentions.city' })
	@EnsureRequestContext()
	async matchCity(cityId: string): Promise<MatchCityResult> {
		const read = await this.readPosts.readCity(cityId);
		return withLlmCallContext({ cityId, purpose: 'match-mentions' }, async () => {
			const pass = await this.matchInCode(cityId);
			// Every close call started first, then each awaited in order (never Promise.all over workflows)
			const handles: WorkflowHandle<MatchMentionResult>[] = [];
			for (const mentionId of pass.asks)
				handles.push(
					await this.durable.start(this.matchMention, [mentionId], {
						queue: MATCH_MENTION_QUEUE,
						attributes: { cityId, purpose: 'match-mentions' },
					}),
				);
			const matched: Record<string, number> = { ...pass.counts };
			const saved: number[] = [];
			let failed = 0;
			for (const [i, outcome] of (await settleHandles(handles)).entries()) {
				if (!outcome.ok) failed++;
				else if (outcome.value.method) {
					matched[outcome.value.method] = (matched[outcome.value.method] ?? 0) + 1;
					saved.push(pass.asks[i]);
				}
			}
			if (saved.length) await this.relinkMatched(saved);
			const result: MatchCityResult = { read, matched, asked: pass.asks.length, failed };
			if (total(matched) === 0) return result;
			// Authors to the brands they are the own accounts of: the posts by others that rank
			// brands leave those out. Free, but over every account of the city: only after a change
			const accounts = await this.matchAccounts(cityId);
			// An account linked just now (its own profile, a site) places mentions its tags name
			const byTags = await this.matchByTags(cityId);
			return { ...result, accounts, byTags };
		});
	}

	/**
	 * One close call as a run of its own (started by its city's run): its plan (the code decides
	 * it after all when the venues changed since), the agent's answer, its save. A mention gone or
	 * corrected by an admin meanwhile is left alone.
	 */
	@DurableWorkflow({ name: 'match-mentions.mention' })
	@EnsureRequestContext()
	async matchMention(mentionId: number): Promise<MatchMentionResult> {
		const plan = await this.plan(mentionId);
		if (!plan) return { method: null };
		const decision =
			'decision' in plan ?
				plan.decision
			:	await withLlmCallContext(
					{ cityId: plan.cityId, purpose: 'match-mentions' },
					async () => {
						const answer = await this.durableLlm.generate(
							this.venueMatchAgent,
							plan.question.message,
						);
						return settleMatch(plan.question, answer.object);
					},
				);
		return { method: await this.save(mentionId, decision) };
	}

	// ─── Steps: each one domain call, its result stored ───

	@DurableStep({ name: 'match in code' })
	private async matchInCode(cityId: string): Promise<MatchPass> {
		return this.mentionMatchingService.match({ cityId });
	}

	@DurableStep({ name: 'plan' })
	private async plan(mentionId: number): Promise<MentionMatchPlan | null> {
		return this.mentionMatchingService.planMention(mentionId);
	}

	@DurableStep({ name: 'save match' })
	private async save(
		mentionId: number,
		decision: MatchDecision,
	): Promise<MentionMatchMethodEnum | null> {
		return this.mentionMatchingService.saveMatch(mentionId, decision);
	}

	@DurableStep({ name: 'relink matched' })
	private async relinkMatched(mentionIds: number[]): Promise<void> {
		await this.mentionMatchingService.relinkMatched(mentionIds);
	}

	@DurableStep({ name: 'match accounts' })
	private async matchAccounts(cityId: string): Promise<AccountMatchResult> {
		return this.accountMatchingService.match(await this.cityService.getById(cityId));
	}

	@DurableStep({ name: 'match by tags' })
	private async matchByTags(cityId: string): Promise<Record<string, number>> {
		return this.mentionMatchingService.matchByTags(cityId);
	}
}

/**
 * A city's matching (`MatchMentionsWorkflow.matchCity`) on its queue, one run in flight per city:
 * a second caller gets the run already going. Awaited by default: what a dependent operation calls
 * from its workflow's body (never inside a step); the schedule only starts it.
 */
export const matchCityNow = async (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: Pick<MatchMentionsWorkflow, 'matchCity'>,
	cityId: string,
	opts: { await?: boolean } = {},
): Promise<MatchCityResult | undefined> => {
	const handle = await durable.start(workflow.matchCity, [cityId], {
		queue: MATCH_MENTIONS_QUEUE,
		dedupe: cityId,
		onDuplicate: 'return-existing',
		attributes: { cityId, purpose: 'match-mentions' },
	});
	return opts.await === false ? undefined : handle.getResult();
};
