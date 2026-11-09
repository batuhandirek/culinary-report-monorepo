import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { startActorCall } from 'src/modules/apify/actors/actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { FakeApify } from 'src/modules/apify/tests/factories/fake-apify.js';
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import {
	commentDisagreementMessage,
	commentIntentMessage,
} from 'src/modules/pipeline/read-comments/util/comment-messages.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AdminPostCommentsController } from '../controllers/admin.post-comments.controller.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import {
	PostComment,
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from '../entities/post-comment.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { type CommentIntentFields, PostCommentService } from '../services/post-comment.service.js';
import { SocialPostService } from '../services/social-post.service.js';
import { SocialScrapeService } from '../services/social-scrape.service.js';
import { plainIntent } from '../util/post-comments.js';

import { ownAccount } from './factories/social-account.factory.js';

// Items in the shape `clockworks/tiktok-comments-scraper` returns (run rhsFO9MZCe9FYTBlr)
const comment = (
	cid: string,
	text: string,
	videoId: string,
	diggCount = 0,
	repliesToId: string | null = null,
) => {
	const url = `https://www.tiktok.com/@foodie.berlin/video/${videoId}`;
	return {
		videoWebUrl: url,
		submittedVideoUrl: url,
		input: url,
		cid,
		createTime: 1789493322,
		createTimeISO: '2026-09-15T17:28:42.000Z',
		text,
		diggCount,
		likedByAuthor: false,
		pinnedByAuthor: false,
		repliesToId,
		replyCommentTotal: 0,
		uid: '7175984693090419717',
		uniqueId: 'someone',
		mentions: [],
		detailedMentions: [],
		images: [],
		sticker: null,
	};
};

const TOP = '7550000000000000001';
const SECOND = '7550000000000000002';

const ITEMS: Record<string, any[]> = {
	[TOP]: [
		comment('c1', 'wo ist das??', TOP, 40),
		comment('c2', 'Saving this for Saturday 😍', TOP, 12),
		comment('c3', '@anna @tom', TOP),
		comment('c4', 'overrated, the portions got tiny', TOP, 3),
		comment('c5', 'Where is this place?', TOP, 8),
		comment('c6', '😍😍😍', TOP),
		// The same comment twice in a dataset, another video's one and a reply
		comment('c2', 'Saving this for Saturday 😍', TOP, 12),
		comment('x1', 'not ours', '7000000000000000000'),
		comment('r1', 'same here', TOP, 0, 'c1'),
	],
	[SECOND]: [
		comment('c7', 'been there, so good', SECOND, 2),
		comment('c8', 'Was kostet das?', SECOND),
	],
};

describe('Post comments (pglite)', () => {
	let harness: PgliteTestingModule;
	let scrape: SocialScrapeService;
	let comments: PostCommentService;
	let city: City;
	let venue: Venue;
	const apify = new FakeApify<any>();
	apify.answer = (input: any) => {
		const url: string = input.postURLs[0];
		return ITEMS[url.split('/').at(-1)!] ?? [];
	};
	/** As the `scrape-comments` run does: one run per post started as a child, every run awaited, one save */
	const scrapeComments = async (posts: SocialPost[], perPost: number, budgetUsd: number) => {
		const plan = scrape.planComments(posts, perPost, budgetUsd);
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const call of plan.calls)
			handles.push(await startActorCall(apify, call, { memoryMbytes: plan.memoryMbytes }));
		const settled = await settleHandles(handles);
		return scrape.saveComments(
			plan,
			settled.map(o => (o.ok ? o.value.recordId : null)),
		);
	};
	/** The intent agent's reading of each comment the model is sent, by its text */
	const READ: Record<
		string,
		[PostCommentIntentEnum, PostCommentQuestionTopicEnum | null, string | null]
	> = {
		'wo ist das??': [
			PostCommentIntentEnum.QUESTION,
			PostCommentQuestionTopicEnum.LOCATION,
			'Where is it?',
		],
		'Saving this for Saturday 😍': [PostCommentIntentEnum.INTENT, null, null],
		'overrated, the portions got tiny': [PostCommentIntentEnum.DISAGREEMENT, null, null],
		'Where is this place?': [
			PostCommentIntentEnum.QUESTION,
			PostCommentQuestionTopicEnum.LOCATION,
			'Where is it?',
		],
		'been there, so good': [PostCommentIntentEnum.CONFIRMATION, null, null],
		'Was kostet das?': [
			PostCommentIntentEnum.QUESTION,
			PostCommentQuestionTopicEnum.PRICE,
			'How much is it?',
		],
	};
	// One comment a call
	const agent = mockAgent((input: unknown) => {
		const { comment: c } = JSON.parse(input as string) as {
			comment: { text: string; likes: number };
		};
		const [intent, questionTopic, question] = READ[c.text];
		return { intent, questionTopic, question };
	});
	// One post a call, on its disagreeing comments
	const disagreementAgent = mockAgent({ summary: ' One says the portions got smaller. ' });

	/**
	 * The pipeline's `read-comments` over every post of the city with unread comments, its pieces
	 * run plainly (the workflow makes each agent call a child): what was read and how many calls
	 */
	const readComments = async () => {
		let analysed = 0;
		let calls = 0;
		for (const postId of await comments.postsWithUnreadComments(city.id, 100)) {
			const post = (await comments.commentsForReading(postId))!;
			const context = { cityName: post.cityName };
			const answers: { commentId: string; answer: CommentIntentFields }[] = [];
			for (const c of post.ask) {
				calls++;
				const res = await agent.generate(commentIntentMessage(post, c), context);
				answers.push({ commentId: c.commentId, answer: res.object as CommentIntentFields });
			}
			const disagreeing = await comments.saveCommentIntents(postId, post.plain, answers);
			analysed += post.plain.length + answers.length;
			if (disagreeing) {
				calls++;
				const res = await disagreementAgent.generate(
					commentDisagreementMessage(disagreeing),
					context,
				);
				await comments.saveDisagreement(postId, res.object.summary);
			}
		}
		return { analysed, calls };
	};

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				SocialScrapeService,
				SocialPostService,
				PostCommentService,
				AdminPostCommentsController,
				CityService,
				{ provide: ApifyService, useValue: apify },
			],
		});
		scrape = harness.moduleRef.get(SocialScrapeService);
		comments = harness.moduleRef.get(PostCommentService);
		entityManagerManager.setEntityManager(harness.orm.em);

		const em = harness.orm.em;
		city = testCity(em);
		venue = em.create(Venue, {
			city,
			placeId: 'p-chenche',
			name: 'Chén Chè',
			category: 'Vietnamese restaurant',
		});
		// Its own brand comes with the flush
		await em.flush();
		await em.populate(venue, ['brand.branches']);
		const post = (
			externalId: string,
			author: string,
			views: number,
			extra: Partial<SocialPost> = {},
		) => {
			const p = em.create(SocialPost, {
				city,
				externalId,
				platform: SocialPlatformEnum.TIKTOK,
				url: `https://www.tiktok.com/@${author}/video/${externalId}`,
				postedAt: new Date('2026-09-10T12:00:00Z'),
				author,
				views,
				comments: 10,
				text: 'Best pho in Mitte',
				...extra,
			});
			em.create(Mention, {
				post: p,
				venueName: venue.name,
				brand: venue.brand,
				venue,
				matchMethod: MentionMatchMethodEnum.EXACT,
				visited: true,
			});
		};
		post(TOP, 'foodie.berlin', 300_000);
		post(SECOND, 'eats.berlin', 20_000);
		// Left out: its own account, no comments, another month
		post('7550000000000000003', 'chenche.berlin', 900_000, {
			account: ownAccount(em, venue.brand, city, 'chenche.berlin'),
		});
		post('7550000000000000004', 'tom', 50_000, { comments: 0 });
		post('7550000000000000005', 'anna', 80_000, { postedAt: new Date('2026-08-10T12:00:00Z') });
		await em.flush();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('picks each brand’s most viewed posts by others with comments', async () => {
		const top = await comments.topPosts([venue.brand], city.id, '2026-09', 5);
		expect(top.map(p => p.externalId).sort()).toEqual([TOP, SECOND]);
		expect(
			(await comments.topPosts([venue.brand], city.id, '2026-09', 1)).map(p => p.externalId),
		).toEqual([TOP]);
	});

	it('stores comments once per externalId, one run per post, without authors', async () => {
		const em = harness.orm.em;
		const posts = await comments.topPosts([venue.brand], city.id, '2026-09', 5);
		expect(await scrapeComments(posts, 100, 10)).toEqual({
			posts: 2,
			found: 11,
			saved: 8,
			failed: 0,
		});
		expect(apify.calls).toHaveLength(2);
		const { actor, input, options } = apify.calls[0];
		expect(actor).toBe('clockworks/tiktok-comments-scraper');
		expect(input).toEqual({
			postURLs: [expect.stringMatching(/\/video\/755000000000000000[12]$/)],
			topLevelCommentsPerPost: 100,
			commentsPerPost: 100,
			maxRepliesPerComment: 0,
		});
		// Each run in 1 GB, four at a time on the plan's memory
		expect(options).toMatchObject({ maxCostUsd: 5, memoryMbytes: 1024 });

		// A rescrape stores nothing new
		const top = await em.findOneOrFail(SocialPost, { externalId: TOP });
		apify.calls.length = 0;
		await scrapeComments([top], 100, 0.05);
		expect(await em.count(PostComment, {})).toBe(8);
		// $0.05 buys forty comments at $0.00125: the run ends before Apify's cap stops it
		expect(apify.calls[0].input).toMatchObject({
			topLevelCommentsPerPost: 40,
			commentsPerPost: 40,
		});
		// Scraped posts are never picked again
		expect(await comments.topPosts([venue.brand], city.id, '2026-09', 5)).toEqual([]);
		const stored = await em.findOneOrFail(PostComment, { externalId: 'c1' });
		expect(stored).toMatchObject({
			text: 'wo ist das??',
			likes: 40,
			language: null,
			commentedAt: new Date('2026-09-15T17:28:42.000Z'),
		});
		expect(JSON.stringify(stored)).not.toContain('someone');
	});

	it('reads the comments: tags and emoji without the model, the rest one a call, then each post’s disagreement', async () => {
		const em = harness.orm.em;
		// Six comments one a call, one post with a disagreeing comment
		expect(await readComments()).toEqual({ analysed: 8, calls: 7 });
		// Told the venue the post is about, the caption and the comment; the city in the context
		const asked = agent.generate.mock.calls.map(
			([input]) =>
				JSON.parse(input as string) as {
					venue: string;
					caption: string | null;
					comment: { text: string; likes: number };
				},
		);
		expect(asked.find(a => a.comment.text === 'wo ist das??')).toEqual({
			venue: 'Chén Chè',
			caption: 'Best pho in Mitte',
			comment: { text: 'wo ist das??', likes: 40 },
		});
		expect(agent.generate.mock.calls[0][1]).toEqual({ cityName: 'Berlin' });
		expect(asked.map(a => a.comment.text).sort()).toEqual(Object.keys(READ).sort());
		// The disagreement agent reads the post's disagreeing comments together
		expect(disagreementAgent.generate).toHaveBeenCalledTimes(1);
		expect(JSON.parse(disagreementAgent.generate.mock.calls[0][0] as string)).toEqual({
			venue: 'Chén Chè',
			caption: 'Best pho in Mitte',
			comments: ['overrated, the portions got tiny'],
		});
		expect(disagreementAgent.generate.mock.calls[0][1]).toEqual({ cityName: 'Berlin' });

		em.clear();
		const byId = new Map((await em.find(PostComment, {})).map(c => [c.externalId, c]));
		expect(byId.get('c3')?.intent).toBe(PostCommentIntentEnum.TAG);
		expect(byId.get('c6')?.intent).toBe(PostCommentIntentEnum.OTHER);
		expect(byId.get('c1')).toMatchObject({
			intent: 'question',
			questionTopic: 'location',
			question: 'Where is it?',
		});
		expect(byId.get('c2')).toMatchObject({
			intent: 'intent',
			questionTopic: null,
			question: null,
		});
		const top = await em.findOneOrFail(SocialPost, { externalId: TOP });
		expect(top.commentsDisagreement).toBe('One says the portions got smaller.');
		// Nothing left to classify
		expect(await readComments()).toEqual({ analysed: 0, calls: 0 });
	});

	it('hands the report each post’s classified comments', async () => {
		const posts = await comments.forReport(venue.brand.id, city.id, '2026-09');
		expect(posts.map(p => [p.author, p.comments.length])).toEqual([
			['foodie.berlin', 6],
			['eats.berlin', 2],
		]);
		expect(posts[0].disagreement).toBe('One says the portions got smaller.');
	});

	it('lists a post’s comments for the admin, most liked first', async () => {
		const top = await harness.orm.em.findOneOrFail(SocialPost, { externalId: TOP });
		const res = await harness.moduleRef
			.get(AdminPostCommentsController)
			.listPostComments(top.id);
		expect(res.disagreement).toBe('One says the portions got smaller.');
		expect(res.scrapedAt).toBeTruthy();
		expect(res.comments.map(c => c.likes)).toEqual([40, 12, 8, 3, 0, 0]);
		expect(res.comments[0]).toMatchObject({
			text: 'wo ist das??',
			intent: 'question',
			questionTopic: 'location',
		});
	});

	it('knows tag-only and emoji-only comments', () => {
		expect(plainIntent('@anna @tom')).toBe(PostCommentIntentEnum.TAG);
		expect(plainIntent('@anna, @tom.b')).toBe(PostCommentIntentEnum.TAG);
		expect(plainIntent('🔥🔥!')).toBe(PostCommentIntentEnum.OTHER);
		expect(plainIntent('@anna we need to go')).toBeNull();
	});
});
