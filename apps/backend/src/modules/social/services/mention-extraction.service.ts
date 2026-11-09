import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { StatementService } from 'src/modules/statements/services/statement.service.js';
import { MentionTopicService } from 'src/modules/topics/services/mention-topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { normalizeVenueName, plain } from 'src/modules/venues/util/venue-names.js';

import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { PostSkipReasonEnum, SocialPost } from '../entities/social-post.entity.js';
import type {
	GateVerdict,
	PostForReading,
	PostReadingAnswer,
	ReadPlace,
} from '../interfaces/post-reading.interface.js';
import { postForReadingOf } from '../util/post-for-reading.js';

// Mentions an admin decided: a re-read or a skip never removes them
const ADMIN_METHODS = [MentionMatchMethodEnum.MANUAL, MentionMatchMethodEnum.IGNORED];
// Mentions a match stands on: kept when a re-read no longer names them, and listed as unconfirmed
const MATCHED_METHODS = [
	MentionMatchMethodEnum.EXACT,
	MentionMatchMethodEnum.FUZZY,
	MentionMatchMethodEnum.LLM,
	MentionMatchMethodEnum.ACCOUNT,
];
const isAdminDecided = (mention: Mention) =>
	!!mention.matchMethod && ADMIN_METHODS.includes(mention.matchMethod);
const nameKey = (name: string) => normalizeVenueName(name) || plain(name);

/** What a re-read did to one post's stored mentions (`saveReread`) */
export interface RereadSaved {
	/** Answered places paired with a stored mention, and answered places new to the post (added, to be matched) */
	paired: number;
	added: number;
	/** Stored mentions the answer didn't name: unmatched ones deleted, matched ones kept and marked unconfirmed */
	deleted: number;
	unconfirmed: number;
	claimIds: number[];
	addedMentionIds: number[];
	cityClaims: number;
}

/** What a re-flag did to one post's stored mentions (`saveReflag`) */
export interface ReflagSaved {
	flaggedMentions: number;
	flagged: boolean;
	cleared: number;
	unpaired: number;
}

/**
 * A post's places and claims as data: what the reading (the pipeline's `read-posts`,
 * `reread-posts`, `reflag-openings`) is given of a post and how it stores what the agents
 * answered. No agent runs here: the agents and their inputs belong to the operations that call
 * them.
 */
@Injectable()
export class MentionExtractionService {
	constructor(
		private readonly em: EntityManager,
		private readonly statementService: StatementService,
		private readonly mentionTopicService: MentionTopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	/** The city's unread posts, most viewed first: what the reading takes, one post a workflow */
	async unreadPostIds(cityId: string, limit: number): Promise<string[]> {
		const posts = await this.em.find(
			SocialPost,
			{ analysedAt: null, city: cityId },
			{ orderBy: { views: 'desc', id: 'asc' }, limit, fields: ['id'] },
		);
		return posts.map(p => p.id);
	}

	/** The city's posts not read yet */
	countUnread(cityId: string): Promise<number> {
		return this.em.count(SocialPost, { analysedAt: null, city: cityId });
	}

	/** Posts analysed before `before`, most viewed first: what the re-read takes next */
	async rereadPostIds(before: Date, limit: number): Promise<string[]> {
		const posts = await this.em.find(
			SocialPost,
			{ analysedAt: { $lt: before } },
			{ orderBy: { views: 'desc', id: 'asc' }, limit, fields: ['id'] },
		);
		return posts.map(p => p.id);
	}

	/** Posts analysed before `before`: what the re-read still has to read */
	countToReread(before: Date): Promise<number> {
		return this.em.count(SocialPost, { analysedAt: { $lt: before } });
	}

	/**
	 * The post as the reading sees it (`PostForReading`); null when it is gone, or when `unread`
	 * and it was read meanwhile (a second workflow for it, an admin's correction), or when
	 * `analysedBefore` and it was read since (re-read already)
	 */
	async postForReading(
		postId: string,
		opts: { unread?: boolean; analysedBefore?: Date } = {},
	): Promise<PostForReading | null> {
		const post = await this.em.findOne(
			SocialPost,
			{
				id: postId,
				...(opts.unread && { analysedAt: null }),
				...(opts.analysedBefore && { analysedAt: { $lt: opts.analysedBefore } }),
			},
			{ populate: ['city', 'hashtagLinks.hashtag', 'account.brand'] },
		);
		return post ? postForReadingOf(post) : null;
	}

	/**
	 * The gate's verdict stored (`skipReason`, `gatedAt`); `null` is a post with nothing to read
	 * (`no_content`). A skipped post is done (`analysedAt`): no places, no claims. Whether it is
	 * to be digested. Flushes.
	 */
	async saveGate(postId: string, verdict: GateVerdict | null): Promise<boolean> {
		const post = await this.em.findOneOrFail(SocialPost, postId);
		const now = new Date();
		post.gatedAt = now;
		post.skipReason =
			!verdict ? PostSkipReasonEnum.NO_CONTENT
			: verdict.digest ? null
			: (verdict.reason ?? PostSkipReasonEnum.NOT_FOOD);
		if (post.skipReason) post.analysedAt = now;
		await this.em.flush();
		return !post.skipReason;
	}

	/**
	 * Agent A's reading of an unread post stored: its places as mentions (unmatched: the matching
	 * takes them), its claims as statements, each on its place, the city or nothing, whether it is
	 * promotional; `analysedAt` stamped. Flushes; the new claims' and mentions' ids, for the labels
	 * and the topic links.
	 */
	async saveReading(
		postId: string,
		answer: PostReadingAnswer,
	): Promise<{ claimIds: number[]; mentionIds: number[] }> {
		const post = await this.em.findOneOrFail(SocialPost, postId, { populate: ['statements'] });
		const places = answer.places.map(m => this.em.create(Mention, { post, ...m }));
		const claims = this.statementService.replaceForPost(post, answer.claims, places);
		post.isPromotional = answer.isPromotional;
		post.analysisTokens = answer.tokens || null;
		post.analysedAt = new Date();
		await this.em.flush();
		return { claimIds: claims.map(c => c.id), mentionIds: places.map(m => m.id) };
	}

	/**
	 * A re-read post the gate skipped: its claims and its mentions go, but an admin's (`manual`,
	 * `ignored`), which keep theirs; `analysedAt` restamped. Flushes; how many mentions went.
	 */
	async clearReading(postId: string): Promise<{ deleted: number }> {
		const post = await this.em.findOneOrFail(SocialPost, postId, {
			populate: ['mentions', 'statements'],
		});
		const kept = post.mentions.getItems().filter(m => isAdminDecided(m));
		let deleted = 0;
		for (const mention of post.mentions.getItems().filter(m => !isAdminDecided(m))) {
			post.mentions.remove(mention);
			this.em.remove(mention);
			deleted++;
		}
		this.statementService.replaceForPost(post, [], [], kept);
		post.analysedAt = new Date();
		await this.em.flush();
		return { deleted };
	}

	/**
	 * A re-read's answer stored on a post read before: A's places paired with the stored mentions
	 * by name (one left on each side pairs too), a paired mention takes the answer's own reading
	 * (`visited`, `isNewOpening`) and the place's claims, and is confirmed again; an answered place
	 * new to the post is added unmatched (the next matching run matches it); a stored mention the
	 * answer didn't name is deleted with its claims when nothing matched it (`none`, `other_city`,
	 * never matched), kept with its claims and stamped `unconfirmedAt` when a match stands on it,
	 * and left alone when an admin decided it (an ignored one keeps everything, and the place's
	 * claims go). A paired mention's match is never touched. The post's city and other claims are
	 * written, `analysedAt` restamped. Flushes.
	 */
	async saveReread(postId: string, answer: PostReadingAnswer): Promise<RereadSaved> {
		const post = await this.em.findOneOrFail(SocialPost, postId, {
			populate: ['mentions', 'statements'],
		});
		const now = new Date();
		const saved: RereadSaved = {
			paired: 0,
			added: 0,
			deleted: 0,
			unconfirmed: 0,
			claimIds: [],
			addedMentionIds: [],
			cityClaims: 0,
		};
		// Paired over every stored mention, the ignored ones included, so a place naming an
		// ignored mention is its match (and left alone below), never the one other mention left
		const left = [...post.mentions.getItems()];
		const paired: (Mention | null)[] = answer.places.map(() => null);
		const unanswered: number[] = [];
		answer.places.forEach((place, i) => {
			const j = left.findIndex(m => nameKey(m.venueName) === nameKey(place.venueName));
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
			const place = answer.places[i];
			mention.visited = place.visited;
			mention.isNewOpening = place.isNewOpening;
			mention.unconfirmedAt = null;
			saved.paired++;
		});
		const added: Mention[] = [];
		for (const i of unanswered) {
			const mention = this.em.create(Mention, { post, ...answer.places[i] });
			paired[i] = mention;
			added.push(mention);
			saved.added++;
		}
		const keep: Mention[] = [];
		for (const mention of left) {
			if (isAdminDecided(mention)) keep.push(mention);
			else if (mention.matchMethod && MATCHED_METHODS.includes(mention.matchMethod)) {
				mention.unconfirmedAt ??= now;
				keep.push(mention);
				saved.unconfirmed++;
			} else {
				post.mentions.remove(mention);
				this.em.remove(mention);
				saved.deleted++;
			}
		}
		const claims = answer.claims.filter(
			c =>
				c.subject !== 'place' ||
				(c.place != null && !dropped.has(c.place) && !!paired[c.place]),
		);
		const created: Statement[] = this.statementService.replaceForPost(
			post,
			claims,
			paired,
			keep,
		);
		post.isPromotional = answer.isPromotional;
		post.analysisTokens = answer.tokens || null;
		post.analysedAt = now;
		await this.em.flush();
		saved.claimIds = created.map(c => c.id);
		saved.addedMentionIds = added.map(m => m.id);
		saved.cityClaims = claims.filter(c => c.subject === 'city').length;
		return saved;
	}

	/**
	 * A month's stored posts with a mention that isn't ignored, most viewed first, a page of them
	 * (`offset`, `limit`): what the re-flag of openings reads. `analysedBefore` skips posts read
	 * with the flag already; `onlyFlagged` takes only posts with a flagged mention.
	 */
	async reflagCandidates(opts: {
		month: string;
		cityId?: string;
		analysedBefore?: Date;
		onlyFlagged?: boolean;
		limit: number;
		offset: number;
	}): Promise<{ total: number; postIds: string[] }> {
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
		const rows: { id: string }[] = await conn.execute(
			`select p.id from social_posts p where ${where} order by p.views desc, p.id limit ? offset ?`,
			[...params, opts.limit, opts.offset],
		);
		return { total, postIds: rows.map(r => r.id) };
	}

	/**
	 * A re-flag's answer stored on a post: each answered place paired with the stored mention of
	 * the same normalized name (or, one each, with the only one), that mention taking the answer's
	 * `isNewOpening`, true or false. Nothing else is written: no mention is added, the post's
	 * analysis stays, an admin's correction keeps its venue, brand and note, and an `ignored`
	 * mention is never flagged. Flushes.
	 */
	async saveReflag(
		postId: string,
		places: Pick<ReadPlace, 'venueName' | 'isNewOpening'>[],
	): Promise<ReflagSaved> {
		const post = await this.em.findOneOrFail(SocialPost, postId, { populate: ['mentions'] });
		const left = [...post.mentions.getItems()];
		const pairs: [Mention, boolean][] = [];
		const unanswered: boolean[] = [];
		for (const place of places) {
			const i = left.findIndex(m => nameKey(m.venueName) === nameKey(place.venueName));
			if (i < 0) unanswered.push(place.isNewOpening);
			else pairs.push([left.splice(i, 1)[0], place.isNewOpening]);
		}
		// One stored and one answered left: the same venue, spelled another way
		if (left.length === 1 && unanswered.length === 1) pairs.push([left.pop()!, unanswered[0]]);
		const saved: ReflagSaved = { flaggedMentions: 0, flagged: false, cleared: 0, unpaired: 0 };
		for (const [mention, isNewOpening] of pairs) {
			if (mention.matchMethod === MentionMatchMethodEnum.IGNORED) continue;
			if (mention.isNewOpening && !isNewOpening) saved.cleared++;
			mention.isNewOpening = isNewOpening;
			if (isNewOpening) {
				saved.flaggedMentions++;
				saved.flagged = true;
			}
		}
		saved.unpaired = left.filter(m => m.matchMethod !== MentionMatchMethodEnum.IGNORED).length;
		await this.em.flush();
		return saved;
	}

	/** What the new mentions are about (their stored food topics), and their city's venue tags by job */
	async linkTopics(cityId: string, mentionIds: number[]): Promise<void> {
		if (!mentionIds.length) return;
		await this.mentionTopicService.relink({ mentionIds });
		await this.venueTopicService.queueCityRefresh([cityId]);
	}
}
