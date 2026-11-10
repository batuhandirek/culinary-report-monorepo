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
import { MATCH_MENTIONS_QUEUE } from '../queues/match-mentions.queue.js';
import { closeCallStart } from '../util/close-calls.js';

/** What a city's matching did: the workflow's result */
export interface MatchCityResult {
	read: ReadCityResult;
	/** Mentions settled, by how (exact, fuzzy, llm, none, other_city, …): in code and by the agent */
	matched: Record<string, number>;
	/** The close calls, each its own run asking the agent (started here, or joined while in flight) */
	asked: number;
	/** Of those, the runs that failed: resumed by an admin on `/admin/workflows` */
	failed: number;
	/** The account matcher's result */
	accounts: AccountMatchResult;
	/** Mentions the accounts' tags placed afterwards */
	byTags: Record<string, number>;
}

/** What one close call's run did: how it was settled, null when the mention was gone or corrected */
export interface MatchMentionResult {
	method: MentionMatchMethodEnum | null;
}

/**
 * The matching of mentions to venues. A post's places are matched by its own reading
 * (`read-posts.post`: `MentionMatchingService.matchMentions` in code, its close calls queued);
 * `matchMention` is one close call as a run of its own (its plan, the `VenueMatchAgent` call as a
 * `DurableLlmService` child that waits until an account can serve it, its save, its food topics),
 * so one waiting for the allowance holds no other mention back. `matchCity` is the city's sweep
 * (daily by `MatchMentionsSchedule`, and by any operation that needs every mention settled, through
 * `matchCityNow`): the city's unread posts read first, the city's mentions matched in code (the
 * names left unmatched once the city has new venues, brand rematches, the re-read's new places),
 * every close call started or joined (one run in flight per mention) and awaited, then the tags'
 * brands, the authors linked to the brands they are the own accounts of, and the mentions their
 * tags place.
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
			// Every close call started first (or the run already in flight for it joined), then each
			// awaited in order (never Promise.all over workflows)
			const handles: WorkflowHandle<MatchMentionResult>[] = [];
			for (const mentionId of pass.asks)
				handles.push(
					await this.durable.start(
						this.matchMention,
						[mentionId],
						closeCallStart(mentionId, cityId),
					),
				);
			const matched: Record<string, number> = { ...pass.counts };
			let failed = 0;
			for (const outcome of await settleHandles(handles)) {
				if (!outcome.ok) failed++;
				else if (outcome.value.method)
					matched[outcome.value.method] = (matched[outcome.value.method] ?? 0) + 1;
			}
			// Once a sweep, whatever this one matched: the posts' own matches since skipped it
			await this.relinkTags();
			// Authors to the brands they are the own accounts of: the posts by others that rank brands leave those out
			const accounts = await this.matchAccounts(cityId);
			// An account linked just now (its own profile, a site) places mentions its tags name
			const byTags = await this.matchByTags(cityId);
			return { read, matched, asked: pass.asks.length, failed, accounts, byTags };
		});
	}

	/**
	 * One close call as a run of its own (queued by its post's reading, or by the city's sweep): its
	 * plan (the code decides it after all when the venues changed since), the agent's answer, its
	 * save, its food topics. A mention gone or corrected by an admin meanwhile is left alone.
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
		const method = await this.save(mentionId, decision);
		if (method) await this.relinkMatched([mentionId]);
		return { method };
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

	@DurableStep({ name: 'relink tags' })
	private async relinkTags(): Promise<void> {
		await this.mentionMatchingService.relinkTags();
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
 * A city's matching sweep (`MatchMentionsWorkflow.matchCity`) on its queue, one run in flight per city:
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
