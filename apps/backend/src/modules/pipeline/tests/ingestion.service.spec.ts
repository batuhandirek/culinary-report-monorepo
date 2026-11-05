import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import type { CityService } from 'src/modules/cities/services/city.service.js';
import type { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import type { AccountMatchingService } from 'src/modules/social/services/account-matching.service.js';
import type { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import type { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import type { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import type { ReviewService } from 'src/modules/venues/services/review.service.js';
import type { WebMentionService } from 'src/modules/venues/services/web-mention.service.js';

import { INGEST_EXTRACT_BATCH, INGEST_REVIEWS_PER_PASS } from '../constants/pipeline.constant.js';
import { IngestCityJob } from '../jobs/ingest-city.job.js';
import { IngestionService } from '../services/ingestion.service.js';

const city = { id: 'city-1', name: 'Berlin' } as City;
const noModel = () => new Error('No OpenAI account can serve openai/gpt-5.4-mini. #1 (…aaaa): You have no credits remaining.');

describe('IngestionService', () => {
	let unread: number;
	const sendJob = jest.fn(async (..._args: unknown[]) => 'job');
	const extraction = {
		countUnread: jest.fn(async (..._args: unknown[]) => unread),
		extract: jest.fn(async (opts: { limit: number; cityId?: string }) => {
			const analysed = Math.min(unread, opts.limit);
			unread -= analysed;
			return { analysed, mentions: analysed, skipped: 0 };
		}),
	};
	const matching = {
		pendingCount: jest.fn(async (..._args: unknown[]) => 0),
		match: jest.fn(async (..._args: unknown[]) => ({ exact: 3, fuzzy: 1, llm: 1, none: 0 })),
		matchByTags: jest.fn(async (..._args: unknown[]) => ({ account: 0 })),
	};
	const accounts = { match: jest.fn(async (..._args: unknown[]) => ({ linked: 2 })) };
	const reviews = {
		analysePending: jest.fn(async (..._args: unknown[]) => ({ analysed: 40, tokens: 0 })),
		analyseMonth: jest.fn(async (..._args: unknown[]) => 12),
		countPending: jest.fn(async (..._args: unknown[]) => 0),
	};
	const comments = { analyse: jest.fn(async (..._args: unknown[]) => ({ analysed: 5, calls: 1 })), countUnread: jest.fn(async (..._args: unknown[]) => 0) };
	const press = { classifyPending: jest.fn(async (..._args: unknown[]) => ({ classified: 2 })), countPending: jest.fn(async (..._args: unknown[]) => 0) };

	const service = new IngestionService(
		{ sendJob } as unknown as PgBossService,
		{ getById: async () => city } as unknown as CityService,
		extraction as unknown as MentionExtractionService,
		matching as unknown as MentionMatchingService,
		accounts as unknown as AccountMatchingService,
		reviews as unknown as ReviewService,
		comments as unknown as PostCommentService,
		press as unknown as WebMentionService,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		unread = 0;
	});

	it('reads every unread post in batches, then matches, links accounts, and reads reviews, comments and press', async () => {
		unread = INGEST_EXTRACT_BATCH * 2 + 10;

		const pass = await service.ingest(city);

		expect(extraction.extract).toHaveBeenCalledTimes(3);
		expect(extraction.extract).toHaveBeenCalledWith({ limit: INGEST_EXTRACT_BATCH, cityId: city.id });
		expect(matching.match).toHaveBeenCalledWith({ cityId: city.id });
		expect(accounts.match).toHaveBeenCalledWith(city);
		// Newest first, a share a pass: a backfill's thousands never hold the posts up
		expect(reviews.analysePending).toHaveBeenCalledWith(city.id, INGEST_REVIEWS_PER_PASS);
		expect(comments.analyse).toHaveBeenCalledWith(city);
		expect(press.classifyPending).toHaveBeenCalledWith(city);
		expect(pass).toMatchObject({
			extracted: INGEST_EXTRACT_BATCH * 2 + 10,
			matched: 5,
			accounts: { linked: 2 },
			reviews: 40,
			comments: 5,
			press: 2,
			pending: { posts: 0, mentions: 0, reviews: 0, comments: 0, press: 0 },
		});
		expect(pass.blocked).toBeUndefined();
	});

	it('matches nothing and links no accounts when nothing was read and no mention waits', async () => {
		const pass = await service.ingest(city);
		expect(extraction.extract).not.toHaveBeenCalled();
		expect(matching.match).not.toHaveBeenCalled();
		expect(accounts.match).not.toHaveBeenCalled();
		expect(pass.matched).toBe(0);
	});

	it('stops quietly when no model answers, leaving the rest for the next pass', async () => {
		unread = 30;
		extraction.extract.mockRejectedValueOnce(noModel());

		const pass = await service.ingest(city);

		expect(pass.blocked).toMatch(/no credits remaining/);
		expect(matching.match).not.toHaveBeenCalled();
		expect(reviews.analysePending).not.toHaveBeenCalled();
		expect(comments.analyse).not.toHaveBeenCalled();
		expect(press.classifyPending).not.toHaveBeenCalled();
		expect(pass.pending.posts).toBe(30);
	});

	it('ends the posts when a batch reads nothing, so a post that always fails is not asked forever', async () => {
		unread = 3;
		extraction.extract.mockResolvedValue({ analysed: 0, mentions: 0, skipped: 0 });
		const pass = await service.ingest(city);
		expect(extraction.extract).toHaveBeenCalledTimes(1);
		expect(pass.blocked).toBeUndefined();
		extraction.extract.mockReset();
		extraction.extract.mockImplementation(async (opts: { limit: number; cityId?: string }) => {
			const analysed = Math.min(unread, opts.limit);
			unread -= analysed;
			return { analysed, mentions: analysed, skipped: 0 };
		});
	});

	it('throws an error that is no provider refusal: a bug is not a wait', async () => {
		comments.analyse.mockRejectedValueOnce(new Error('relation "post_comments" does not exist'));
		await expect(service.ingest(city)).rejects.toThrow('post_comments');
	});

	it('runs one pass at a time per city, an admin step under the same lock', async () => {
		const order: string[] = [];
		let release!: () => void;
		const held = new Promise<void>(resolve => (release = resolve));
		const first = service.locked(city.id, async () => {
			order.push('admin step starts');
			await held;
			order.push('admin step ends');
		});
		const second = service.ingest(city).then(() => order.push('pass done'));
		// Another city never waits
		await service.locked('city-2', async () => order.push('other city'));
		release();
		await Promise.all([first, second]);
		expect(order).toEqual(['admin step starts', 'other city', 'admin step ends', 'pass done']);
	});

	it('is caught up for the posts after a pass a model answered; for everything once the month’s reviews are read too', async () => {
		expect(await service.catchUp(city, 'posts', '2026-10')).toMatchObject({ ready: true });
		expect(reviews.analyseMonth).not.toHaveBeenCalled();

		const all = await service.catchUp(city, 'all', '2026-10');
		expect(all.ready).toBe(true);
		expect(reviews.analyseMonth).toHaveBeenCalledWith('2026-10');
		expect(all.pass.reviews).toBe(40 + 12);

		reviews.analyseMonth.mockRejectedValueOnce(noModel());
		expect(await service.catchUp(city, 'all', '2026-10')).toMatchObject({ ready: false });
	});

	it('is not caught up when no model answered', async () => {
		unread = 5;
		extraction.extract.mockRejectedValueOnce(noModel());
		expect(await service.catchUp(city, 'posts', '2026-10')).toMatchObject({ ready: false });
	});

	it('queues one pass per city', async () => {
		await service.queue(city.id);
		expect(sendJob).toHaveBeenCalledWith(IngestCityJob.jobName, new IngestCityJob({ cityId: city.id }), {
			singletonKey: city.id,
		});
	});
});
