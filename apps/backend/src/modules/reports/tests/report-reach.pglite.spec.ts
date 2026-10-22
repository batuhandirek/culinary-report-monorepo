import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import {
	PostComment,
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from 'src/modules/social/entities/post-comment.entity.js';
import { AccountBrandSourceEnum, SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialAccountSnapshot } from 'src/modules/social/entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import { SocialAccountService } from 'src/modules/social/services/social-account.service.js';
import { Review, ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import {
	WebMention,
	WebMentionKindEnum,
	WebMentionSourceEnum,
} from 'src/modules/venues/entities/web-mention.entity.js';
import { WebMentionService } from 'src/modules/venues/services/web-mention.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import type { ReportData } from '../interfaces/report-data.interface.js';
import { ReportReachService } from '../services/report-reach.service.js';
import { reachPromptInput, reviewPlatforms, summarizeComments } from '../util/reach.js';

describe('Report reach sections (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: ReportReachService;
	let venue: Venue;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [ReportReachService, OwnAccountService, SocialAccountService, PostCommentService, WebMentionService],
		});
		service = harness.moduleRef.get(ReportReachService);
		entityManagerManager.setEntityManager(harness.orm.em);
		const em = harness.orm.em;
		const city = testCity(em);
		venue = em.create(Venue, {
			city,
			placeId: 'p-frieda',
			name: 'Café Frieda',
			category: 'Cafe',
			rating: 4.6,
			reviewsCount: 800,
			tripadvisorUrl: 'https://www.tripadvisor.com/Restaurant_Review-g187323-d1-Reviews-Cafe_Frieda-Berlin.html',
			tripadvisorRating: 4,
			tripadvisorReviewsCount: 120,
		});

		// The venue's own brand comes with the flush
		await em.flush();
		// The Instagram account, scraped two months in a row
		const account = em.create(SocialAccount, {
			city,
			brand: venue.brand,
			platform: SocialPlatformEnum.INSTAGRAM,
			handle: 'cafefrieda',
			brandSource: AccountBrandSourceEnum.ADMIN,
		});
		for (const [month, followers] of [
			['2026-08', 4200],
			['2026-09', 4440],
		] as const)
			em.create(SocialAccountSnapshot, {
				account,
				month,
				followers,
				posts: month === '2026-08' ? 110 : 122,
				avgViews: 500,
				avgLikes: 40,
				postsLast30Days: 12,
				scrapedAt: new Date(),
			});

		// A creator's post with its comments
		const post = em.create(SocialPost, {
			city,
			externalId: '7550000000000000001',
			platform: SocialPlatformEnum.TIKTOK,
			url: 'https://www.tiktok.com/@foodie/video/7550000000000000001',
			postedAt: new Date('2026-09-10T12:00:00Z'),
			author: 'foodie.berlin',
			views: 9000,
			comments: 7,
			commentsScrapedAt: new Date(),
			commentsDisagreement: 'One says the portions got smaller.',
		});
		em.create(Mention, {
			post,
			venueName: venue.name,
			venue,
			matchMethod: MentionMatchMethodEnum.EXACT,
			visited: true,
			sentiment: 'positive',
			summary: 'Nice.',
			dishes: [],
			praise: [],
			complaints: [],
		});
		const comment = (n: number, intent: PostCommentIntentEnum, question?: string, likes = 0) =>
			em.create(PostComment, {
				post,
				externalId: `c${n}`,
				text: `comment ${n}`,
				likes,
				intent,
				...(question && { questionTopic: PostCommentQuestionTopicEnum.LOCATION, question }),
				analysedAt: new Date(),
			});
		for (let i = 0; i < 5; i++)
			comment(i, PostCommentIntentEnum.QUESTION, i === 2 ? 'Where is it?' : 'Which street?', i === 2 ? 30 : 1);
		comment(10, PostCommentIntentEnum.INTENT);
		comment(11, PostCommentIntentEnum.DISAGREEMENT);
		// Not analysed yet: left out
		em.create(PostComment, { post, externalId: 'c99', text: 'later' });

		// Press: one feature, one namesake
		em.create(WebMention, {
			venue,
			url: 'https://mitvergnuegen.com/frieda',
			title: 'Café Frieda: neuer Brunch',
			outlet: 'Mit Vergnügen',
			publishedAt: new Date('2026-09-18T08:00:00Z'),
			month: '2026-09',
			source: WebMentionSourceEnum.NEWS,
			kind: WebMentionKindEnum.FEATURE,
			summary: 'Reviews its new brunch.',
			analysedAt: new Date(),
		});
		em.create(WebMention, {
			venue,
			url: 'https://example.com/frieda-kahlo',
			title: 'Frida Kahlo exhibition',
			month: '2026-09',
			source: WebMentionSourceEnum.WEB,
			kind: WebMentionKindEnum.UNRELATED,
			analysedAt: new Date(),
		});

		// Reviews on both platforms
		em.create(Review, { reviewId: 'g1', venue, publishedAt: new Date('2026-09-05T10:00:00Z'), stars: 5, text: 'Toll' });
		em.create(Review, {
			reviewId: 'ta_1',
			platform: ReviewPlatformEnum.TRIPADVISOR,
			venue,
			publishedAt: new Date('2026-09-06T10:00:00Z'),
			stars: 3,
			text: 'Too pricey',
			ownerResponse: 'Sorry',
		});
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('fills the own accounts with growth, the comments per post, the press and the platforms', async () => {
		const data = {
			posts: [{ platform: 'instagram', views: 9000 } as ReportData['posts'][number]],
			reviews: {
				count: 2,
				list: [
					{ reviewId: 'g1', publishedAt: '2026-09-05', replied: false, praise: [], complaints: [] },
					{ reviewId: 'ta_1', publishedAt: '2026-09-06', replied: true, praise: [], complaints: [] },
				],
			} as unknown as ReportData['reviews'],
		};
		const sections = await service.sections([venue], '2026-09', data, venue.city);

		expect(sections.ownAccounts).toEqual([
			{
				platform: 'instagram',
				handle: 'cafefrieda',
				url: 'https://www.instagram.com/cafefrieda/',
				followers: 4440,
				followersChange: 240,
				posts: 122,
				postsAdded: 12,
				avgViews: 500,
				avgLikes: 40,
				postsLast30Days: 12,
				creatorViewsMultiple: 18,
			},
		]);

		expect(sections.comments).toEqual({
			comments: 7,
			intents: { question: 5, intent: 1, disagreement: 1 },
			posts: [
				{
					postId: expect.any(String),
					url: 'https://www.tiktok.com/@foodie/video/7550000000000000001',
					author: 'foodie.berlin',
					views: 9000,
					comments: 7,
					intents: { question: 5, intent: 1, disagreement: 1 },
					disagreement: 'One says the portions got smaller.',
				},
			],
			questions: [
				{
					topic: 'location',
					count: 5,
					example: 'Where is it?',
					action: 'People ask where you are: tag the location in your own posts and ask creators to tag it too.',
				},
			],
		});

		expect(sections.press).toMatchObject({ features: 1, listicles: 0, passing: 0 });
		expect(sections.press?.items).toEqual([
			{
				url: 'https://mitvergnuegen.com/frieda',
				title: 'Café Frieda: neuer Brunch',
				outlet: 'Mit Vergnügen',
				publishedAt: '2026-09-18',
				kind: 'feature',
				summary: 'Reviews its new brunch.',
			},
		]);

		expect(data.reviews.byPlatform?.map(p => [p.platform, p.count, p.avgStars, p.rating])).toEqual([
			['google', 1, 5, 4.6],
			['tripadvisor', 1, 3, 4],
		]);
		expect(data.reviews.list.map(r => r.platform)).toEqual([undefined, 'tripadvisor']);
		// Too few written reviews to compare topics
		expect(data.reviews.platformGaps).toEqual([]);

		const prompt = reachPromptInput({ ...sections, reviews: data.reviews });
		expect(prompt?.ownAccounts).toContain('4440 followers, +240 since last month');
		expect(prompt?.comments).toContain('5 asked something');
		expect(prompt?.press).toContain('Mit Vergnügen: "Café Frieda: neuer Brunch"');
		expect(prompt?.reviewPlatforms).toContain('TripAdvisor (mostly visitors): 1 reviews, 3 stars on average, 4 all-time there');
	});

	it('names where locals and visitors disagree, from five written reviews on each side', () => {
		const review = (platform: 'google' | 'tripadvisor', praise: string[], complaints: string[]) => ({
			platform,
			stars: 4,
			text: 'text',
			praise: praise.map(topic => ({ topic })),
			complaints: complaints.map(topic => ({ topic })),
		});
		const reviews = [
			...Array.from({ length: 5 }, (_, i) => review('google', ['food'], i < 3 ? ['price'] : [])),
			...Array.from({ length: 5 }, () => review('tripadvisor', ['food', 'vibe'], [])),
		];
		expect(reviewPlatforms(reviews, { tripadvisorRating: 4.5 })?.platformGaps).toEqual([
			{ topic: 'vibe', side: 'praise', google: 0, tripadvisor: 1 },
			{ topic: 'price', side: 'complaints', google: 0.6, tripadvisor: 0 },
		]);
		// No TripAdvisor side at all: no block
		expect(reviewPlatforms(reviews.slice(0, 5), {})).toBeUndefined();
	});

	it('leaves the comments out when none is classified, and acts only on a question asked five times', () => {
		expect(summarizeComments([{ postId: 'p', url: 'u', views: 1, comments: [] }])).toBeUndefined();
		const four = summarizeComments([
			{
				postId: 'p',
				url: 'u',
				views: 1,
				comments: Array.from({ length: 4 }, () => ({
					intent: 'question',
					questionTopic: 'price',
					question: 'How much?',
					likes: 0,
				})),
			},
		]);
		expect(four?.questions).toEqual([{ topic: 'price', count: 4, example: 'How much?' }]);
	});
});
