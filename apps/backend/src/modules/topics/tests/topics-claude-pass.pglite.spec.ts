import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { llmConfig } from 'src/modules/llm/config/llm.config.js';
import { isLlmPaid } from 'src/modules/llm/util/llm-scope.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { addStatements } from 'src/modules/statements/tests/factories/statement.factory.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { TermTopicAgent } from '../agents/term-topic.agent.js';
import { type DiscoveryInputWording, TopicDiscoveryAgent } from '../agents/topic-discovery.agent.js';
import { TopicsClaudePassJob } from '../jobs/topics-claude-pass.job.js';
import { Term } from '../entities/term.entity.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import { TopicDiscoveryService } from '../services/topic-discovery.service.js';
import { TopicRelinkService } from '../services/topic-relink.service.js';
import { TopicsClaudePassService } from '../services/topics-claude-pass.service.js';

import { seedTopics } from './factories/topic.factory.js';

// Each answer costs a fixed number of output tokens on the model the call put first: on Opus 1,000
// tokens out are $0.02, on Sonnet $0.01, on Haiku $0.0005
const usage = { inputTokens: 0, outputTokens: 1_000, cachedInputTokens: 0 };

/*
 * The one-off topics pass on Claude: wordings used twice or more decided on Opus, then discovery on
 * Opus, then those used once on Sonnet, then those in no claim on Haiku; inside `llmPaid`; stops at
 * its budget; queued at boot only with a budget and a Claude key.
 */
describe('TopicsClaudePassService (pglite)', () => {
	let harness: PgliteTestingModule;
	let venue: Venue;
	const calls: string[] = [];
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => 'job-id') };
	const termAgent = {
		generate: jest.fn(async (message: unknown, _context: unknown, options?: { model?: string }) => {
			const name = JSON.parse((message as string).replace(/^Wording: /, '')) as string;
			calls.push(`decide ${name} on ${options?.model} paid=${isLlmPaid()}`);
			return {
				object: { suggestion: null, topics: name === 'Pommes' ? [{ key: 'burgers', relation: 'kind_of' }] : [] },
				usage,
				model: options?.model ?? 'openai/gpt-5.4',
			};
		}),
	};
	const discoveryAgent = {
		generate: jest.fn(async (input: unknown, _context: unknown, options?: { model?: string }) => {
			const { wordings } = JSON.parse(input as string) as { wordings: DiscoveryInputWording[] };
			calls.push(`discover ${wordings.map(w => w.name).join(',')} on ${options?.model}`);
			return { object: { groups: [] }, usage, model: options?.model ?? 'openai/gpt-5.4' };
		}),
	};
	const em = () => harness.orm.em;
	const service = () => harness.moduleRef.get(TopicsClaudePassService);

	let n = 0;
	/** A pending wording named in `count` claims of reviews (none: a Google tag's title) */
	const pending = async (name: string, count: number) => {
		const index = await harness.moduleRef.get(TopicService).index();
		for (let i = 0; i < count; i++) {
			const review = em().create(Review, {
				venue,
				reviewId: `cp-${n++}`,
				publishedAt: new Date('2026-09-10T12:00:00Z'),
			});
			addStatements(em(), review, [{ text: `the ${name} was great`, sentiment: 'positive', foods: [name] }], {
				index,
			});
		}
		await em().flush();
		const term =
			(await em().findOne(Term, { name }, { populate: ['topics'] })) ??
			em().create(Term, { key: name.toLowerCase(), name });
		term.topics.removeAll();
		term.decidedBy = null;
		term.decidedAt = null;
		await em().flush();
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				TopicsClaudePassService,
				TermService,
				TopicDiscoveryService,
				TopicService,
				TopicRelinkService,
				LlmBacklogRegistry,
				{ provide: PgBossService, useValue: pgBoss },
				{ provide: TermTopicAgent, useValue: termAgent },
				{ provide: TopicDiscoveryAgent, useValue: discoveryAgent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		seedTopics(em(), ['burgers']);
		venue = em().create(Venue, { city: testCity(em()), placeId: 'cp-venue', name: 'Pommes Bude' });
		await em().flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		calls.length = 0;
		termAgent.generate.mockClear();
		discoveryAgent.generate.mockClear();
		pgBoss.sendJob.mockClear();
		// Each case counts its own uses
		em().clear();
		await em().nativeDelete(Statement, {});
		await em().nativeDelete(Review, {});
		await pending('Pommes', 3);
		await pending('Ketchup', 1);
		await pending('Currywurst-Sauce', 0);
	});

	it('decides the most used wordings on Opus, discovers on Opus, then the rest on Sonnet and Haiku, all paid', async () => {
		const spent = await service().run(10);
		expect(calls).toEqual([
			'decide Pommes on anthropic/claude-opus-5-5 paid=true',
			// Discovery groups the decided wordings used twice or more
			'discover Pommes on anthropic/claude-opus-5-5',
			'decide Ketchup on anthropic/claude-sonnet-5-5 paid=true',
			'decide Currywurst-Sauce on anthropic/claude-haiku-5-5 paid=true',
		]);
		expect(spent).toBeCloseTo(0.02 + 0.02 + 0.01 + 0.0005, 6);
		em().clear();
		expect(await em().count(Term, { decidedBy: null })).toBe(0);
	});

	it('stops at its budget and leaves the rest pending for the nightly backlogs', async () => {
		const spent = await service().run(0.01);
		expect(calls).toEqual(['decide Pommes on anthropic/claude-opus-5-5 paid=true']);
		expect(spent).toBeCloseTo(0.02, 6);
		em().clear();
		const left = await em().find(Term, { decidedBy: null }, { orderBy: { name: 'asc' } });
		expect(left.map(t => t.name)).toEqual(['Currywurst-Sauce', 'Ketchup']);
	});

	describe('at boot', () => {
		const saved = { ...llmConfig };
		afterEach(() => {
			Object.assign(llmConfig, saved);
		});

		it('queues the pass once with its budget, only while the setting and a Claude key are there', async () => {
			Object.assign(llmConfig, { TOPICS_CLAUDE_PASS_USD: 0, ANTHROPIC_API_KEY: 'sk-ant-test' });
			await service().onApplicationBootstrap();
			Object.assign(llmConfig, { TOPICS_CLAUDE_PASS_USD: 38, ANTHROPIC_API_KEY: undefined });
			await service().onApplicationBootstrap();
			Object.assign(llmConfig, { ANTHROPIC_API_KEY: 'sk-ant-test', LLM_DISABLE_ANTHROPIC: true });
			await service().onApplicationBootstrap();
			expect(pgBoss.sendJob).not.toHaveBeenCalled();

			Object.assign(llmConfig, { LLM_DISABLE_ANTHROPIC: false });
			await service().onApplicationBootstrap();
			expect(pgBoss.sendJob).toHaveBeenCalledWith(
				TopicsClaudePassJob.jobName,
				{ payload: { budgetUsd: 38 } },
				{ singletonKey: TopicsClaudePassJob.singletonKey },
			);
		});
	});
});
