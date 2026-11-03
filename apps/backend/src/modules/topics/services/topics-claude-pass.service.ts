import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { llmConfig } from 'src/modules/llm/config/llm.config.js';
import type { LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';
import { llmPaid } from 'src/modules/llm/util/llm-scope.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { TopicsClaudePassJob } from '../jobs/topics-claude-pass.job.js';

import { TermService } from './term.service.js';
import { TopicDiscoveryService } from './topic-discovery.service.js';
import { TopicRelinkService } from './topic-relink.service.js';

/** Wordings a `decide` call reads: the budget is checked between batches, so a batch is what it can overshoot */
const DECIDE_BATCH = 200;
/** Wordings a `discover` call groups (150 a model call) */
const DISCOVER_BATCH = 600;

/**
 * One step of the pass: decide pending wordings used `uses` times on a model, or discover topics.
 * In order of value, so a budget that runs out leaves the cheapest tail to the free backlogs: the
 * wordings that carry most counts on the model that wrote the eval's answer key, then discovery
 * over them (it groups only wordings used twice or more) and one re-link after it, then those
 * wordings again (the re-link reopens a "none" decided before a topic was created: it may fit one
 * now), then the long tail, so it sees the new topics.
 */
export const CLAUDE_PASS_STEPS: (
	| { kind: 'decide'; label: string; model: LlmModelId; uses: { min?: number; max?: number } }
	| { kind: 'discover'; label: string; model: LlmModelId }
)[] = [
	{
		kind: 'decide',
		label: 'wordings used twice or more',
		model: 'anthropic/claude-opus-5-5',
		uses: { min: 2 },
	},
	{ kind: 'discover', label: 'topic discovery', model: 'anthropic/claude-opus-5-5' },
	{
		kind: 'decide',
		label: 'wordings used twice or more, reopened by the new topics',
		model: 'anthropic/claude-opus-5-5',
		uses: { min: 2 },
	},
	{
		kind: 'decide',
		label: 'wordings used once',
		model: 'anthropic/claude-sonnet-5-5',
		uses: { min: 1, max: 1 },
	},
	{
		kind: 'decide',
		label: "wordings in no claim (Google's tags)",
		model: 'anthropic/claude-haiku-5-5',
		uses: { max: 0 },
	},
];

/**
 * A one-off, paid pass over the topics with Claude, asked for by the user (2026-11-03: "the
 * highest quality that fits in $40" of the Anthropic credit): agent C (`TermService.decide`)
 * and topic discovery (`TopicDiscoveryService.discover`) on the models of `CLAUDE_PASS_STEPS`,
 * inside `llmPaid`. The one place deployed code runs paid: only while `TOPICS_CLAUDE_PASS_USD` is
 * set (one deploy), never without an Anthropic key (the calls would fall to OpenAI and use
 * production's allowance), and stopping at the budget. A later boot with the setting still on
 * reads only what is still pending (a decided wording is not pending, a grouped one is not
 * grouped again for 30 days), within the budget again. Nothing here runs on its own otherwise:
 * the nightly backlogs do the same work free.
 */
@Injectable()
export class TopicsClaudePassService implements OnApplicationBootstrap {
	private readonly logger = new Logger(TopicsClaudePassService.name);

	constructor(
		private readonly termService: TermService,
		private readonly topicDiscoveryService: TopicDiscoveryService,
		private readonly topicRelinkService: TopicRelinkService,
		private readonly pgBossService: PgBossService,
	) {}

	async onApplicationBootstrap(): Promise<void> {
		const budgetUsd = llmConfig.TOPICS_CLAUDE_PASS_USD;
		if (!budgetUsd) return;
		if (!llmConfig.ANTHROPIC_API_KEY || llmConfig.LLM_DISABLE_ANTHROPIC) {
			this.logger.error(
				`TOPICS_CLAUDE_PASS_USD is ${budgetUsd} but Claude is off (no ANTHROPIC_API_KEY, or LLM_DISABLE_ANTHROPIC): not queued`,
			);
			return;
		}
		await this.pgBossService.sendJob(
			TopicsClaudePassJob.jobName,
			new TopicsClaudePassJob({ budgetUsd }),
			{ singletonKey: TopicsClaudePassJob.singletonKey },
		);
		this.logger.warn(
			`Queued the topics' Claude pass with up to $${budgetUsd}: remove TOPICS_CLAUDE_PASS_USD once it has run`,
		);
	}

	/** The steps in order until each is done or the budget is spent; returns the dollars spent */
	async run(budgetUsd: number): Promise<number> {
		return llmPaid(async () => {
			let spent = 0;
			for (const step of CLAUDE_PASS_STEPS) {
				const before = spent;
				let looked = 0;
				let linked = 0;
				const created: string[] = [];
				while (spent < budgetUsd) {
					if (step.kind === 'decide') {
						const res = await this.termService.decide({
							limit: DECIDE_BATCH,
							model: step.model,
							uses: step.uses,
						});
						spent += res.usd;
						looked += res.looked;
						linked += res.linked;
						// Nothing pending, or a batch that settled nothing (every call failed): next step
						if (!res.looked) break;
					} else {
						// The pass re-links once after the step, never beside its writes
						const res = await this.topicDiscoveryService.discover({
							limit: DISCOVER_BATCH,
							model: step.model,
							relink: 'caller',
						});
						spent += res.usd;
						looked += res.looked;
						linked += res.linked;
						created.push(...res.created);
						if (!res.looked) break;
					}
					this.logger.log(
						`${step.label} on ${step.model}: ${looked} read, ${linked} linked, $${spent.toFixed(2)} of $${budgetUsd} spent`,
					);
				}
				// The new topics reach every link (terms first: an agent "none" a new topic may fit is reopened)
				if (step.kind === 'discover' && created.length)
					this.logger.log(`Re-linked after discovery: ${JSON.stringify(await this.topicRelinkService.relinkAll())}`);
				this.logger.warn(
					`Done: ${step.label} on ${step.model}: ${looked} read, ${linked} linked` +
						(step.kind === 'discover' ? `, ${created.length} topics created (${created.join(', ')})` : '') +
						`, $${(spent - before).toFixed(2)} (total $${spent.toFixed(2)} of $${budgetUsd})`,
				);
				if (spent >= budgetUsd) {
					this.logger.warn(`Budget reached: the rest stays with the nightly backlogs`);
					break;
				}
			}
			this.logger.warn(`Topics' Claude pass finished: $${spent.toFixed(2)} spent`);
			return spent;
		});
	}
}
