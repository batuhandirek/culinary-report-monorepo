import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import _ from 'lodash';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { POSTS_GATED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';
import type { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { MentionTopicService } from 'src/modules/topics/services/mention-topic.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { normalizeVenueName, plain } from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import { PostClaimsAgent } from '../agents/post-claims.agent.js';
import { PostGateAgent, type PostGateInput } from '../agents/post-gate.agent.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import {
	PostSkipReasonEnum,
	SocialPlatformEnum,
	SocialPost,
} from '../entities/social-post.entity.js';
import { postClaimsSource } from '../util/post-claims-input.js';
import { readPostClaims } from '../util/post-claims-read.js';

// Posts a daily-backlog batch of the re-read takes (~200 agent calls)
const REREAD_BATCH_POSTS = 200;
// Posts the gate reads side by side, one a call
const GATE_CONCURRENCY = 10;
// The gate reads the start of a post: enough to tell what it is about
const GATE_TEXT_CHARS = 600;
const GATE_TRANSCRIPT_CHARS = 400;
// Mentions an admin decided: a re-read or a skip never removes them
const ADMIN_METHODS = [MentionMatchMethodEnum.MANUAL, MentionMatchMethodEnum.IGNORED];
// Mentions a match stands on: kept when a re-read no longer names them, and listed as unconfirmed
const MATCHED_METHODS = [
	MentionMatchMethodEnum.EXACT,
	MentionMatchMethodEnum.FUZZY,
	MentionMatchMethodEnum.LLM,
];
const isAdminDecided = (mention: Mention) =>
	!!mention.matchMethod && ADMIN_METHODS.includes(mention.matchMethod);

/**
 * Whether a post has anything worth judging: an article, a transcript, a tagged place, or a caption
 * with a word beyond its hashtags and handles ("📍Giri, berlin #jazzbar" names a bar; "#dublin
 * #dublinfood" alone goes nowhere). The gate judges the rest: a short caption may still be a
 * venue's own post.
 */
export const hasContent = (
	post: Pick<SocialPost, 'platform' | 'text' | 'subtitles' | 'locationName'>,
): boolean =>
	post.platform === SocialPlatformEnum.BLOG ?
		!!post.text?.trim()
	:	!!post.subtitles?.trim() ||
		!!post.locationName?.trim() ||
		(post.text ?? '').replace(/[#@][\p{L}\p{N}_.]+/gu, '').replace(/[^\p{L}]/gu, '').length >=
			3;

/** What the gate is shown of a post: the start of its caption or article and of its transcript */
export const gateInput = (post: SocialPost): PostGateInput => ({
	platform:
		post.platform === SocialPlatformEnum.BLOG ?
			`blog article on ${post.author ?? 'a food blog'}`
		:	post.platform,
	...(post.account?.brand && { ownBrand: post.account.brand.name }),
	...(post.locationName && { location: post.locationName }),
	text: (post.text ?? '').slice(0, GATE_TEXT_CHARS),
	...(post.subtitles && { transcript: post.subtitles.slice(0, GATE_TRANSCRIPT_CHARS) }),
});

/** What the re-read of stored posts did (`MentionExtractionService.reread`) */
export interface RereadResult {
	/** Posts taken, read (digested or skipped), and failed (a failed post stays to be read again) */
	posts: number;
	read: number;
	failed: number;
	/** Posts the gate (or the code) said not to digest: their mentions and claims removed, an admin's mentions kept */
	skipped: number;
	/** Answered places paired with a stored mention, and answered places new to the post (added, to be matched) */
	paired: number;
	added: number;
	/** Stored mentions the answer didn't name: unmatched ones deleted, matched ones kept and marked unconfirmed */
	deleted: number;
	unconfirmed: number;
	/** Statements written, the city claims among them */
	claims: number;
	cityClaims: number;
	tokens: number;
}

@Injectable()
export class MentionExtractionService implements OnModuleInit {
	private readonly logger = new Logger(MentionExtractionService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly postGateAgent: PostGateAgent,
		private readonly topicService: TopicService,
		private readonly statementService: StatementService,
		private readonly statementPartsService: StatementPartsService,
		private readonly mentionTopicService: MentionTopicService,
		private readonly venueTopicService: VenueTopicService,
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
	) {}

	/** Posts read before the gate and the food-places rule (`POSTS_GATED_AT`) are read again, a little each night */
	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'reread-posts',
			label: 'Re-read posts as claims',
			priority: 45,
			remaining: () => this.countToReread(POSTS_GATED_AT),
			runBatch: async () => {
				const res = await this.reread({
					before: POSTS_GATED_AT,
					limit: REREAD_BATCH_POSTS,
				});
				return { done: res.read, tokens: res.tokens };
			},
		});
	}

	/** Posts analysed before `before`: what the `reread-posts` backlog still has to read */
	countToReread(before: Date): Promise<number> {
		return this.em.count(SocialPost, { analysedAt: { $lt: before } });
	}

	/**
	 * Judges whether each post is worth digesting: in code, one with nothing to read is `no_content`;
	 * the others go to the gate (`PostGateAgent`, ~20 a call, one city a call), which says digest or
	 * skip with a reason. Sets `skipReason` (null when digested) and `gatedAt`. A post the gate
	 * didn't answer (a failed call, an id left out) is in neither list and is judged next time.
	 * Posts need `city` and `account.brand` loaded.
	 */
	async gate(
		posts: SocialPost[],
	): Promise<{ digest: SocialPost[]; skipped: SocialPost[]; tokens: number }> {
		const now = new Date();
		const digest: SocialPost[] = [];
		const skipped: SocialPost[] = [];
		let tokens = 0;
		const toAsk: SocialPost[] = [];
		for (const post of posts) {
			if (hasContent(post)) toAsk.push(post);
			else {
				post.skipReason = PostSkipReasonEnum.NO_CONTENT;
				post.gatedAt = now;
				skipped.push(post);
			}
		}
		// One post a call: a call packing posts drops some and mixes them up
		await runPool(
			toAsk,
			GATE_CONCURRENCY,
			async post => {
				const res = await this.postGateAgent.generate(JSON.stringify(gateInput(post)), {
					cityName: post.city.name,
				});
				tokens += res.usage?.totalTokens ?? 0;
				post.gatedAt = now;
				post.skipReason =
					res.object.digest ? null : (res.object.reason ?? PostSkipReasonEnum.NOT_FOOD);
				(res.object.digest ? digest : skipped).push(post);
			},
			(post, e) => this.logger.warn(`The gate failed on post ${post.externalId}: ${e.message}`),
		);
		return { digest, skipped, tokens };
	}

	/**
	 * Reads up to `limit` posts analysed before `before` again (most viewed first): the gate first,
	 * then agent A on the posts it digests. A skipped post loses its claims and its mentions but an
	 * admin's (`manual`, `ignored`). On a digested post A's places are paired with the stored
	 * mentions by name (one left on each side pairs too, as `reflagOpenings` pairs): a paired mention
	 * takes the answer's reading (`visited`, `isNewOpening`) and the place's claims, and is confirmed
	 * again; an answered place with no stored mention is added (the next
	 * matching run matches it); a stored mention the answer didn't name is deleted with its claims
	 * when nothing matched it (`none`, `other_city`, never matched), kept with its claims and marked
	 * `unconfirmedAt` when a match stands on it (an admin confirms or ignores it), and left alone when
	 * an admin decided it. A paired mention's match is never touched. The post's city and other
	 * claims are written, agent B reads the new claims, `analysedAt` is restamped. The `reread-posts`
	 * backlog.
	 */
	async reread(opts: { before: Date; limit: number; cityId?: string }): Promise<RereadResult> {
		const posts = await this.em.find(
			SocialPost,
			{ analysedAt: { $lt: opts.before }, ...(opts.cityId && { city: opts.cityId }) },
			{
				orderBy: { views: 'desc', id: 'asc' },
				limit: opts.limit,
				populate: [
					'city',
					'mentions',
					'hashtagLinks.hashtag',
					'statements',
					'account.brand',
				],
			},
		);
		const result: RereadResult = {
			posts: posts.length,
			read: 0,
			failed: 0,
			skipped: 0,
			paired: 0,
			added: 0,
			deleted: 0,
			unconfirmed: 0,
			claims: 0,
			cityClaims: 0,
			tokens: 0,
		};
		if (!posts.length) return result;
		const now = new Date();
		const gated = await this.gate(posts);
		result.tokens += gated.tokens;
		result.failed += posts.length - gated.digest.length - gated.skipped.length;
		for (const post of gated.skipped) {
			const kept = post.mentions.getItems().filter(m => isAdminDecided(m));
			for (const mention of post.mentions.getItems().filter(m => !isAdminDecided(m))) {
				post.mentions.remove(mention);
				this.em.remove(mention);
				result.deleted++;
			}
			this.statementService.replaceForPost(post, [], [], kept);
			post.analysedAt = now;
			result.read++;
			result.skipped++;
		}

		const index = await this.topicService.index();
		const topics = index.food.map(t => t.label);
		const key = (name: string) => normalizeVenueName(name) || plain(name);
		const created: Statement[] = [];
		const added: Mention[] = [];
		try {
			await runPool(
				gated.digest,
				10,
				async post => {
					const res = await readPostClaims(this.postClaimsAgent, postClaimsSource(post), {
						cityName: post.city.name,
						topics,
					});
					// Paired over every stored mention, the ignored ones included, so a place naming an
					// ignored mention is its match (and left alone below), never the one other mention left
					const left = [...post.mentions.getItems()];
					const paired: (Mention | null)[] = res.object.places.map(() => null);
					const unanswered: number[] = [];
					res.object.places.forEach((answer, i) => {
						const j = left.findIndex(m => key(m.venueName) === key(answer.venueName));
						if (j < 0) unanswered.push(i);
						else paired[i] = left.splice(j, 1)[0];
					});
					// One stored and one answered left: the same venue, spelled another way
					if (left.length === 1 && unanswered.length === 1) {
						paired[unanswered[0]] = left.pop()!;
						unanswered.pop();
					}
					// An admin said an ignored mention is no venue: it keeps everything, and the place's claims go
					const dropped = new Set<number>();
					paired.forEach((mention, i) => {
						if (mention?.matchMethod === MentionMatchMethodEnum.IGNORED) {
							left.push(mention);
							paired[i] = null;
							dropped.add(i);
						}
					});
					paired.forEach((mention, i) => {
						if (!mention) return;
						const answer = res.object.places[i];
						mention.visited = answer.visited;
						mention.isNewOpening = answer.isNewOpening;
						mention.unconfirmedAt = null;
						result.paired++;
					});
					// A place new to the post is added, unmatched: the next matching run matches it
					for (const i of unanswered) {
						const mention = this.em.create(Mention, { post, ...res.object.places[i] });
						paired[i] = mention;
						added.push(mention);
						result.added++;
					}
					// The stored mentions it didn't name: an admin's stay, a matched one stays unconfirmed, the rest go
					const keep: Mention[] = [];
					for (const mention of left) {
						if (isAdminDecided(mention)) keep.push(mention);
						else if (
							mention.matchMethod &&
							MATCHED_METHODS.includes(mention.matchMethod)
						) {
							mention.unconfirmedAt ??= now;
							keep.push(mention);
							result.unconfirmed++;
						} else {
							post.mentions.remove(mention);
							this.em.remove(mention);
							result.deleted++;
						}
					}
					const claims = res.object.claims.filter(
						c =>
							c.subject !== 'place' ||
							(c.place != null && !dropped.has(c.place) && !!paired[c.place]),
					);
					created.push(
						...this.statementService.replaceForPost(post, claims, paired, keep),
					);
					post.isPromotional = res.object.isPromotional;
					post.analysisTokens = res.usage?.totalTokens ?? null;
					post.analysedAt = now;
					result.read++;
					result.claims += claims.length;
					result.cityClaims += claims.filter(c => c.subject === 'city').length;
					result.tokens += res.usage?.totalTokens ?? 0;
				},
				(post, e) => {
					result.failed++;
					this.logger.warn(`Re-reading post ${post.externalId} failed: ${e.message}`);
				},
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the posts run side by side on this entity manager
		await this.em.flush();
		// Agent B over the new claims in the same batch; what it misses, the `statement-parts` backlog reads
		const parts = await this.statementPartsService.read({ ids: created.map(s => s.id) });
		result.tokens += parts.tokens;
		if (added.length) {
			await this.mentionTopicService.relink({ mentionIds: added.map(m => m.id) });
			await this.venueTopicService.queueCityRefresh(posts.map(p => p.city.id));
		}
		return result;
	}

	/** The city's posts not read yet: what the next `extract` takes */
	countUnread(cityId: string): Promise<number> {
		return this.em.count(SocialPost, { analysedAt: null, city: cityId });
	}

	/**
	 * Extracts the places and the claims of posts not analysed yet (of one city, or all), most
	 * viewed first: the gate first (a post not worth digesting keeps its `skipReason` and gets
	 * nothing), then agent A (`PostClaimsAgent`) on the rest: the places (mentions, a venue's own
	 * post listing itself) and the claims, each about a place, the city or nothing (statements);
	 * agent B reads the claims' parts right after. The prompt names the post's city, its own brand
	 * when the author is one, and the food topics, so cuisines use their words.
	 */
	async extract(opts: {
		month?: string;
		limit: number;
		cityId?: string;
	}): Promise<{ analysed: number; mentions: number; skipped: number }> {
		const range = opts.month ? monthRange(opts.month) : null;
		const candidates = await this.em.find(
			SocialPost,
			{
				analysedAt: null,
				...(opts.cityId && { city: opts.cityId }),
				...(range ? { postedAt: { $gte: range.start, $lt: range.end } } : {}),
			},
			{
				orderBy: { views: 'desc' },
				limit: opts.limit,
				populate: ['city', 'hashtagLinks.hashtag', 'statements', 'account.brand'],
			},
		);
		const now = new Date();
		const { digest: posts, skipped } = await this.gate(candidates);
		// Not worth digesting: done, so they are not picked up again
		for (const post of skipped) post.analysedAt = now;

		// The food topics' labels for the cuisine field
		const index = posts.length ? await this.topicService.index() : undefined;
		const topicLabels = index?.food.map(t => t.label) ?? [];
		let mentions = 0;
		let analysed = 0;
		const created: Mention[] = [];
		const claims: Statement[] = [];
		// A provider failure (no credits) stops the pool: keep what was finished before it
		try {
			await runPool(
				posts,
				10,
				async post => {
					const res = await readPostClaims(this.postClaimsAgent, postClaimsSource(post), {
						cityName: post.city.name,
						topics: topicLabels,
					});
					const places = res.object.places.map(m =>
						this.em.create(Mention, { post, ...m }),
					);
					created.push(...places);
					mentions += places.length;
					// What it says, one claim per row, flushed with the post and its mentions
					claims.push(
						...this.statementService.replaceForPost(post, res.object.claims, places),
					);
					post.isPromotional = res.object.isPromotional;
					post.analysisTokens = res.usage?.totalTokens ?? null;
					post.analysedAt = now;
					analysed++;
				},
				(post, e) => this.logger.warn(`Post ${post.externalId} failed: ${e.message}`),
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the posts run side by side on this entity manager
		await this.em.flush();
		// Agent B over the new claims in the same step; what it misses, the `statement-parts` backlog reads
		await this.statementPartsService.read({ ids: claims.map(s => s.id) });
		// What the new mentions are about, and their cities' venue tags by job
		if (created.length) {
			await this.mentionTopicService.relink({ mentionIds: created.map(m => m.id) });
			await this.venueTopicService.queueCityRefresh(posts.map(p => p.city.id));
		}
		return { analysed, mentions, skipped: skipped.length };
	}

	/**
	 * Reads a month's stored posts with mentions again for `isNewOpening` only, most viewed first
	 * (`offset` / `limit` page through them): each answered venue is paired with the post's stored
	 * mention of the same normalized name (or, one each, with the only one) and that mention takes
	 * the answer's flag. Nothing else is written: no mention is added, a post's analysis stays, and
	 * an admin's correction keeps its venue, brand and note (an `ignored` mention is not a venue and
	 * is never flagged). `extract` can't do this: it adds mentions to posts not analysed yet.
	 * `onlyFlagged` reads only posts with a flagged mention: after a stricter wording, enough.
	 */
	async reflagOpenings(opts: {
		month: string;
		cityId?: string;
		analysedBefore?: Date;
		onlyFlagged?: boolean;
		limit: number;
		offset: number;
	}): Promise<{
		total: number;
		posts: number;
		read: number;
		failed: number;
		flaggedMentions: number;
		flaggedPosts: number;
		cleared: number;
		unpaired: number;
		tokens: number;
	}> {
		const range = monthRange(opts.month);
		const where = `p.posted_at >= ? and p.posted_at < ?
			${opts.cityId ? 'and p.city_id = ?' : ''}
			${opts.analysedBefore ? 'and p.analysed_at < ?' : ''}
			${opts.onlyFlagged ? 'and exists (select 1 from mentions f where f.post_id = p.id and f.is_new_opening)' : ''}
			and exists (select 1 from mentions m where m.post_id = p.id
				and m.match_method is distinct from '${MentionMatchMethodEnum.IGNORED}')`;
		const params = [
			range.start,
			range.end,
			...(opts.cityId ? [opts.cityId] : []),
			...(opts.analysedBefore ? [opts.analysedBefore] : []),
		];
		const conn = this.em.getConnection();
		const [{ n: total }]: { n: number }[] = await conn.execute(
			`select count(*)::int as n from social_posts p where ${where}`,
			params,
		);
		const ids = (
			(await conn.execute(
				`select p.id from social_posts p where ${where} order by p.views desc, p.id limit ? offset ?`,
				[...params, opts.limit, opts.offset],
			)) as { id: string }[]
		).map(r => r.id);
		const result = {
			total,
			posts: ids.length,
			read: 0,
			failed: 0,
			flaggedMentions: 0,
			flaggedPosts: 0,
			cleared: 0,
			unpaired: 0,
			tokens: 0,
		};
		if (!ids.length) return result;
		const posts = await this.em.find(
			SocialPost,
			{ id: { $in: ids } },
			{ populate: ['city', 'mentions', 'hashtagLinks.hashtag'] },
		);
		const index = await this.topicService.index();
		const topics = index.food.map(t => t.label);
		const key = (name: string) => normalizeVenueName(name) || plain(name);
		try {
			await runPool(
				posts,
				10,
				async post => {
					const res = await readPostClaims(this.postClaimsAgent, postClaimsSource(post), {
						cityName: post.city.name,
						topics,
					});
					const left = [...post.mentions.getItems()];
					const pairs: [Mention, boolean][] = [];
					const unanswered: boolean[] = [];
					for (const answer of res.object.places) {
						const i = left.findIndex(m => key(m.venueName) === key(answer.venueName));
						if (i < 0) unanswered.push(answer.isNewOpening);
						else pairs.push([left.splice(i, 1)[0], answer.isNewOpening]);
					}
					// One stored and one answered left: the same venue, spelled another way
					if (left.length === 1 && unanswered.length === 1)
						pairs.push([left.pop()!, unanswered[0]]);
					let flagged = false;
					for (const [mention, isNewOpening] of pairs) {
						if (mention.matchMethod === MentionMatchMethodEnum.IGNORED) continue;
						if (mention.isNewOpening && !isNewOpening) result.cleared++;
						mention.isNewOpening = isNewOpening;
						if (isNewOpening) {
							result.flaggedMentions++;
							flagged = true;
						}
					}
					if (flagged) result.flaggedPosts++;
					result.unpaired += left.filter(
						m => m.matchMethod !== MentionMatchMethodEnum.IGNORED,
					).length;
					result.tokens += res.usage?.totalTokens ?? 0;
					result.read++;
				},
				(post, e) => {
					result.failed++;
					this.logger.warn(`Re-flagging post ${post.externalId} failed: ${e.message}`);
				},
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the posts run side by side on this entity manager
		await this.em.flush();
		return result;
	}
}
