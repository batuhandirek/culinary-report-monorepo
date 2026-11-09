import type { EntityManager } from '@mikro-orm/postgresql';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { ASPECT_SEED } from 'src/modules/topics/constants/aspect-seed.constant.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ClaimLabelsClassifier } from '../classifiers/claim-labels.classifier.js';
import { Statement } from '../entities/statement.entity.js';
import { AspectShortlistService } from '../services/aspect-shortlist.service.js';
import { StatementEmbeddingService } from '../services/statement-embedding.service.js';
import { StatementPartsService } from '../services/statement-parts.service.js';
import { claimLabelAspects } from '../util/claim-labels.js';

import { labelsClassifier } from './factories/claim-labels.mock.js';
import { addStatements } from './factories/statement.factory.js';

/** Words that point a text along an axis of their own; any other text gets one far from all three */
const AXES = ['wait', 'price', 'staff'];

/** A unit vector of 1024 values: the first of `AXES` the text holds, else an axis picked by its letters */
const vectorOf = (text: string): number[] => {
	const lower = text.toLowerCase();
	const vector = Array<number>(1024).fill(0);
	const axis = AXES.findIndex(word => lower.includes(word));
	const spare = 10 + ([...lower].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 1000);
	vector[axis >= 0 ? axis : spare] = 1;
	return vector;
};

const WAITED = 'I waited 50 minutes for the food';
const ROOM = 'the room was nice';
const FORGOT = 'the staff forgot us';

/*
 * The labelling's aspect shortlist (the user's call, 2026-11-09): each claim is offered the
 * aspects closest to its vector with their roots instead of every aspect, its vector stored on the
 * way so the nightly backlog never pays for it again; a claim labelled again uses its stored
 * vector; a claim that can't be embedded is offered every aspect and labelled all the same. The
 * embedder and Jev are mocked.
 */
describe('claim labels with the aspect shortlist (pglite)', () => {
	let harness: PgliteTestingModule;
	let em: EntityManager;
	let index: TopicIndex;
	let review: Review;
	const classifier = labelsClassifier(text =>
		text === WAITED ? { sentiment: 'negative', aspect: 'wait_for_food' } : undefined,
	);
	const embedder = {
		embedMany: jest.fn(async (values: string[], _opts: { dimensions: number }) => ({
			embeddings: values.map(vectorOf),
			tokens: values.length * 5,
		})),
	};
	const parts = () => harness.moduleRef.get(StatementPartsService);
	/** What each call for this claim offered (undefined: every aspect) */
	const offeredTo = (text: string) =>
		classifier.decide.mock.calls
			.filter(([state]) => (state as { claim: { text: string } }).claim.text === text)
			.map(([, context]) => (context as { offered?: string[] }).offered);
	const row = async (text: string) =>
		(
			(await em
				.getConnection()
				.execute(
					`select embedding is not null as embedded, parts_at is not null as labelled from statements where text = ?`,
					[text],
				)) as { embedded: boolean; labelled: boolean }[]
		)[0];
	/** Claims of the review stored unlabelled, as agent A leaves them */
	const pending = async (texts: string[]) => {
		const fresh = await em.findOneOrFail(Review, review.id, { populate: ['venue.city'] });
		for (const statement of addStatements(
			em,
			fresh,
			texts.map(text => ({ text })),
			{ index },
		))
			statement.partsAt = null;
		await em.flush();
		em.clear();
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				StatementPartsService,
				StatementEmbeddingService,
				AspectShortlistService,
				TopicService,
				LlmBacklogRegistry,
				{ provide: ClaimLabelsClassifier, useValue: classifier },
				{ provide: EmbeddingsService, useValue: embedder },
				{ provide: PgBossService, useValue: { sendJob: jest.fn() } },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		em = harness.orm.em as EntityManager;
		seedTopics(
			em,
			ASPECT_SEED.map(a => a.key),
		);
		const city = testCity(em, { name: 'Berlin', aliases: [] });
		const venue = em.create(Venue, { city, placeId: 'sl-1', name: 'Imbiss' });
		review = em.create(Review, {
			venue,
			reviewId: 'sl-r1',
			publishedAt: new Date('2026-11-05T12:00:00Z'),
		});
		await em.flush();
		index = await harness.moduleRef.get(TopicService).index();
		await pending([WAITED, ROOM]);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('offers each claim the aspects closest to it with their roots, not all of them, and stores its vector', async () => {
		const res = await parts().read({ limit: 10 });
		expect(res.read).toBe(2);

		const [offered] = offeredTo(WAITED);
		expect(offered).toEqual(expect.arrayContaining(['wait_for_food', 'wait']));
		expect(offered!.length).toBeLessThan(claimLabelAspects(index).length);
		expect(offeredTo(ROOM)[0]!.length).toBeLessThan(claimLabelAspects(index).length);

		// Labelled with Jev's answer, and the claim's vector kept for the backlog and the search
		expect(await row(WAITED)).toEqual({ embedded: true, labelled: true });
		const statement = await em.findOneOrFail(
			Statement,
			{ text: WAITED },
			{ populate: ['parts.topic'] },
		);
		expect(statement.parts.getItems().map(p => p.topic?.key)).toEqual(['wait_for_food']);
		em.clear();
	});

	it('labels a claim again from its stored vector, the aspects not embedded again', async () => {
		await em.getConnection().execute('update statements set parts_at = null');
		embedder.embedMany.mockClear();
		classifier.decide.mockClear();

		expect((await parts().read({ limit: 10 })).read).toBe(2);
		expect(embedder.embedMany).not.toHaveBeenCalled();
		expect(offeredTo(WAITED)[0]).toEqual(expect.arrayContaining(['wait_for_food', 'wait']));
		em.clear();
	});

	it('offers every aspect when the claim cannot be embedded, and labels it all the same', async () => {
		await pending([FORGOT]);
		embedder.embedMany.mockRejectedValueOnce(
			new Error('You have no credits remaining. Add credits to continue using the API'),
		);
		classifier.decide.mockClear();

		expect((await parts().read({ limit: 10 })).read).toBe(1);
		expect(offeredTo(FORGOT)).toEqual([undefined]);
		expect(await row(FORGOT)).toEqual({ embedded: false, labelled: true });
	});
});
