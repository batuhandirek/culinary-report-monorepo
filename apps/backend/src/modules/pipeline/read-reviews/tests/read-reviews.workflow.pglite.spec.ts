import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { VenueService } from 'src/modules/venues/services/venue.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReviewClaimsAgent } from '../agents/review-claims.agent.js';
import { ReadReviewsWorkflow } from '../workflows/read-reviews.workflow.js';

/**
 * The reading of reviews as workflows, the facade faked to run a started workflow inline (DBOS
 * can't run on PGlite) and the durable agent call faked to the plain one: a city's run reads every
 * unread written review, each with agent A's message as the venues module hands it over, its
 * claims saved and labelled; a read review is never read again; a failing review is counted and
 * leaves the others read.
 */
describe('ReadReviewsWorkflow (pglite)', () => {
	let harness: PgliteTestingModule;
	let city: City;
	let venue: Venue;
	let failText: string | undefined;

	const agent = {
		generate: jest.fn(async (input: unknown) => {
			const { text } = JSON.parse(input as string) as { text: string };
			if (text === failText) throw new Error('answer does not fit the schema');
			return {
				object: { claims: [{ text, quote: null, foods: [], amount: null, unit: null }] },
				usage: { totalTokens: 10 },
				model: 'openai/mock-model',
			};
		}),
	};
	const read = jest.fn(async () => ({ read: 0, tokens: 0, usd: 0 }));
	let workflow: ReadReviewsWorkflow;
	const durable = {
		step: (_name: string, fn: () => Promise<unknown>) => fn(),
		inWorkflow: () => false,
		isLaunched: () => false,
		isInStep: () => false,
		// A started workflow runs inline, its handle hands back its outcome
		start: async (fn: (...args: unknown[]) => Promise<unknown>, args: unknown[]) => {
			const result = fn.apply(workflow, args);
			result.catch(() => undefined);
			return { workflowID: '', getResult: () => result };
		},
	};
	const durableLlm = {
		generate: (a: typeof agent, input: string) => a.generate(input),
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReadReviewsWorkflow,
				ReviewService,
				VenueService,
				StatementService,
				{ provide: ApifyService, useValue: {} },
				{ provide: StatementPartsService, useValue: { read } },
				{ provide: ReviewClaimsAgent, useValue: agent },
				{ provide: DurableWorkflowsService, useValue: durable },
				{ provide: DurableLlmService, useValue: durableLlm },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		workflow = harness.moduleRef.get(ReadReviewsWorkflow);
		const em = harness.orm.em;
		city = testCity(em);
		venue = em.create(Venue, { city, placeId: 'p-batu', name: 'Batu Burger' });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		agent.generate.mockClear();
		read.mockClear();
		failText = undefined;
	});

	let n = 0;
	const review = (fields: Partial<Review>) =>
		harness.orm.em.create(Review, {
			venue,
			reviewId: `r-${n++}`,
			publishedAt: new Date(`2026-10-${10 + n}T10:00:00Z`),
			stars: 4,
			...fields,
		});

	it("reads the city's unread written reviews, one workflow each, with agent A's message as before", async () => {
		const em = harness.orm.em;
		const translated = review({ text: 'Lecker!', textTranslated: 'Delicious!', stars: 5 });
		review({ text: 'Slow service' });
		review({});
		await em.flush();

		expect(await workflow.readCity(city.id)).toEqual({ reviews: 2, read: 2, failed: 0 });
		// The original for the quotes, the translation beside it
		const sent = agent.generate.mock.calls.map(([input]) => JSON.parse(input as string));
		expect(sent).toContainEqual({
			venue: 'Batu Burger',
			stars: 5,
			text: 'Lecker!',
			translation: 'Delicious!',
		});
		// The claims saved, then labelled
		em.clear();
		const statements = await em.find(Statement, { review: translated.id });
		expect(statements.map(s => s.text)).toEqual(['Lecker!']);
		expect(read).toHaveBeenCalledTimes(2);
		expect((await em.findOneOrFail(Review, translated.id)).analysedAt).toBeTruthy();

		// Read: never asked again
		agent.generate.mockClear();
		expect(await workflow.readCity(city.id)).toEqual({ reviews: 0, read: 0, failed: 0 });
		expect(await workflow.readReview(translated.id)).toEqual({ read: false });
		expect(agent.generate).not.toHaveBeenCalled();
	});

	it('counts a review whose call failed and reads the others', async () => {
		const em = harness.orm.em;
		const bad = review({ text: 'Broken answer' });
		review({ text: 'Fine' });
		await em.flush();
		failText = 'Broken answer';

		expect(await workflow.readCity(city.id)).toEqual({ reviews: 2, read: 1, failed: 1 });
		em.clear();
		expect((await em.findOneOrFail(Review, bad.id)).analysedAt ?? null).toBeNull();
	});
});
