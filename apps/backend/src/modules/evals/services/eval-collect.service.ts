import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { PostGateAgent } from 'src/modules/pipeline/read-posts/agents/post-gate.agent.js';
import { postClaimsSource } from 'src/modules/pipeline/read-posts/util/post-claims-input.js';
import { gateInput, hasContent } from 'src/modules/pipeline/read-posts/util/post-gate-input.js';
import type { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { postForReadingOf } from 'src/modules/social/util/post-for-reading.js';
import type { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { runPool } from 'src/shared/util/pool.js';

import { DEFAULT_SAMPLE } from '../constants/eval.constant.js';
import type {
	EvalClaim,
	EvalPlace,
	EvalPostClaim,
	PostCase,
	ReviewCase,
	TermCase,
} from '../interfaces/eval-case.interface.js';
import { readCases, writeCase } from '../util/eval-files.js';
import { languageGroup, lengthGroup, pickStratified } from '../util/eval-sample.js';

// Shuffled candidates read per kind: enough to fill every cap
const POOL = 4000;

/** Known hard sources (the read of 2026-10-31), taken first when they are in the data */
const HARD_POST_TEXTS = ['%mezame%', '%sandos%', '%gercek%', '%burger king%'];
const HARD_REVIEW_TEXTS = ['% hair%', '% haar%'];

/** A stored claim as the eval compares it: its text, quote and the parts agent B gave it */
export const storedClaim = (s: Statement): EvalClaim => {
	const parts = s.parts.getItems();
	return {
		text: s.text!,
		quote: s.quote ?? null,
		sentiment: s.sentiment ?? null,
		aspect: parts.find(p => p.role === 'aspect')?.topic?.key ?? null,
		foods: parts.filter(p => p.role === 'food' && p.term).map(p => p.term!.name),
		amount: s.amount ?? null,
		unit: s.unit ?? null,
		kind: s.kind ?? null,
	};
};

/** A stored mention as a place, with what it was matched to */
export const storedPlace = (m: Mention): EvalPlace => ({
	venueName: m.venueName,
	locationHint: m.locationHint ?? null,
	city: m.city ?? null,
	visited: m.visited,
	isNewOpening: m.isNewOpening,
	match: {
		method: m.matchMethod ?? null,
		brandId: m.brand?.id ?? null,
		brandName: m.brand?.name ?? null,
		venueId: m.venue?.id ?? null,
		venueName: m.venue?.name ?? null,
	},
});

/**
 * Builds the eval's cases from the dev DB (`npm run eval -- collect`): a stratified, seeded sample
 * of analysed reviews and digested posts and of food wordings, each copied as its agent sees it
 * with what is stored for it now. Cases already on disk are kept and count towards the sample, so
 * collecting again only tops it up.
 */
@Injectable()
export class EvalCollectService {
	private readonly logger = new Logger(EvalCollectService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly postGateAgent: PostGateAgent,
	) {}

	async collect(opts: { reviews?: number; posts?: number; terms?: number; seed?: string } = {}) {
		const seed = opts.seed ?? 'eval-1';
		const em = this.em.fork();
		const existing = readCases();
		const result = {
			reviews: await this.collectReviews(
				em,
				opts.reviews ?? DEFAULT_SAMPLE.reviews,
				seed,
				existing.filter(c => c.kind === 'review') as ReviewCase[],
			),
			posts: await this.collectPosts(
				em,
				opts.posts ?? DEFAULT_SAMPLE.posts,
				seed,
				existing.filter(c => c.kind === 'post') as PostCase[],
			),
			terms: await this.collectTerms(
				em,
				opts.terms ?? DEFAULT_SAMPLE.terms,
				seed,
				existing.filter(c => c.kind === 'term') as TermCase[],
			),
		};
		return result;
	}

	private async collectReviews(
		em: EntityManager,
		n: number,
		seed: string,
		existing: ReviewCase[],
	) {
		type Row = {
			id: string;
			language: string | null;
			stars: number | null;
			platform: string;
			len: number;
			chain: boolean;
			hard: boolean;
		};
		const rows: Row[] = await em.getConnection().execute(
			`select r.id, r.language, r.stars, r.platform::text as platform,
				length(coalesce(r.text, r.text_translated)) as len,
				(select count(*) from venues b where b.brand_id = v.brand_id) > 1 as chain,
				(${HARD_REVIEW_TEXTS.map(() => 'coalesce(r.text_translated, r.text) ilike ?').join(' or ')}) as hard
			from reviews r join venues v on v.id = r.venue_id
			where coalesce(r.text, r.text_translated) is not null and length(coalesce(r.text, r.text_translated)) >= 15
				and exists (select 1 from statements s where s.review_id = r.id and s.text is not null)
			order by md5(r.id::text || ?) limit ?`,
			[...HARD_REVIEW_TEXTS, seed, POOL],
		);
		const have = new Set(existing.map(c => c.source.id));
		const pool = rows.filter(r => !have.has(r.id));
		const tagsOf = (r: Pick<Row, 'language' | 'stars' | 'platform' | 'len' | 'chain'>) => [
			`lang:${languageGroup(r.language)}`,
			`stars:${r.stars ?? 'none'}`,
			`platform:${r.platform}`,
			`length:${lengthGroup(r.len)}`,
			...(r.chain ? ['chain'] : []),
		];
		const caps = {
			'lang:de': Math.round(n * 0.34),
			'lang:en': Math.round(n * 0.27),
			'lang:tr': Math.round(n * 0.08),
			'lang:other': Math.round(n * 0.31),
			'stars:1': Math.round(n * 0.2),
			'stars:2': Math.round(n * 0.13),
			'stars:3': Math.round(n * 0.17),
			'stars:4': Math.round(n * 0.2),
			'stars:5': Math.round(n * 0.3),
			'platform:tripadvisor': Math.round(n * 0.1),
			'length:short': Math.round(n * 0.17),
			'length:long': Math.round(n * 0.33),
		};
		const takenRows = existing.map(c => ({
			language: c.source.language,
			stars: c.source.stars,
			platform: c.source.platform,
			len: (c.source.text ?? c.source.textTranslated ?? '').length,
			chain: c.tags.includes('chain'),
		}));
		const want = Math.max(0, n - existing.length);
		const hard = pool.filter(r => r.hard).slice(0, 2);
		const tripadvisor = pickStratified(
			pool.filter(r => r.platform === 'tripadvisor' && !hard.includes(r)),
			Math.round(n * 0.07),
			tagsOf,
			caps,
			[...takenRows, ...hard],
		);
		const rest = pickStratified(
			pool.filter(r => !hard.includes(r) && !tripadvisor.includes(r)),
			want - hard.length - tripadvisor.length,
			tagsOf,
			caps,
			[...takenRows, ...hard, ...tripadvisor],
		);
		const picked = [...hard, ...tripadvisor, ...rest].slice(0, want);
		const tags = new Map(picked.map(r => [r.id, [...tagsOf(r), ...(r.hard ? ['hard'] : [])]]));
		const reviews = await em.find(
			Review,
			{ id: { $in: picked.map(r => r.id) } },
			{
				populate: [
					'venue.brand',
					'venue.city',
					'statements.parts.topic',
					'statements.parts.term',
				],
			},
		);
		const now = new Date().toISOString();
		for (const r of reviews) {
			const c: ReviewCase = {
				id: `review-${r.id.slice(0, 8)}`,
				kind: 'review',
				tags: tags.get(r.id) ?? [],
				collectedAt: now,
				source: {
					id: r.id,
					reviewId: r.reviewId,
					platform: r.platform,
					language: r.language ?? null,
					venue: r.venue.name,
					venueId: r.venue.id,
					brand: r.venue.brand.name,
					cityId: r.venue.city.id,
					publishedAt: r.publishedAt.toISOString(),
					stars: r.stars ?? null,
					text: r.text ?? null,
					textTranslated: r.textTranslated ?? null,
				},
				stored: {
					analysedAt: r.analysedAt?.toISOString() ?? null,
					claims: r.statements
						.getItems()
						.filter(s => s.text)
						.map(storedClaim),
				},
			};
			writeCase(c);
		}
		this.logger.log(`Reviews: ${reviews.length} new cases (${existing.length} kept)`);
		return reviews.length;
	}

	private async collectPosts(em: EntityManager, n: number, seed: string, existing: PostCase[]) {
		type Row = {
			id: string;
			platform: string;
			mentions: number;
			own: boolean;
			transcript: boolean;
			hard: boolean;
		};
		const rows: Row[] = await em.getConnection().execute(
			`select p.id, p.platform::text as platform,
				(select count(*)::int from mentions m where m.post_id = p.id) as mentions,
				exists (select 1 from social_accounts a where a.id = p.account_id and a.brand_id is not null) as own,
				p.subtitles is not null as transcript,
				(${HARD_POST_TEXTS.map(() => "coalesce(p.text, '') || coalesce(p.subtitles, '') ilike ?").join(' or ')}) as hard
			from social_posts p
			where p.analysed_at is not null and p.skip_reason is null
				and exists (select 1 from statements s where s.post_id = p.id and s.text is not null)
			order by md5(p.id::text || ?) limit ?`,
			[...HARD_POST_TEXTS, seed, POOL],
		);
		const have = new Set(existing.map(c => c.source.id));
		const tagsOf = (r: Pick<Row, 'platform' | 'mentions' | 'own' | 'transcript'>) => [
			`platform:${r.platform}`,
			`places:${
				r.mentions === 0 ? 'none'
				: r.mentions >= 3 ? 'many'
				: 'few'
			}`,
			...(r.own ? ['own'] : []),
			...(r.platform !== 'blog' ? [r.transcript ? 'transcript' : 'no-transcript'] : []),
		];
		const caps = {
			'platform:tiktok': Math.round(n * 0.47),
			'platform:instagram': Math.round(n * 0.33),
			'platform:blog': Math.round(n * 0.2),
			'places:none': Math.round(n * 0.08),
			'places:many': Math.round(n * 0.15),
			own: Math.round(n * 0.1),
		};
		const taken = existing.map(c => ({
			platform: c.source.platform,
			mentions: c.stored.places.length,
			own: !!c.source.ownBrand,
			transcript: !!c.source.subtitles,
		}));
		const rejected = new Set<string>();
		const accepted: Row[] = [];
		const want = Math.max(0, n - existing.length);
		// Picked, then gated (the gate is free, and the eval reads only what it digests), until full
		for (let round = 0; round < 5 && accepted.length < want; round++) {
			const pool = rows.filter(
				r => !have.has(r.id) && !rejected.has(r.id) && !accepted.includes(r),
			);
			const takenNow = [...taken, ...accepted];
			const hard =
				round === 0 ? pool.filter(r => r.hard).slice(0, HARD_POST_TEXTS.length) : [];
			const special = [
				...pickStratified(
					pool.filter(r => r.own && !hard.includes(r)),
					Math.round(n * 0.08),
					tagsOf,
					caps,
					[...takenNow, ...hard],
				),
				...pickStratified(
					pool.filter(r => r.mentions >= 3 && !r.own && !hard.includes(r)),
					Math.round(n * 0.1),
					tagsOf,
					caps,
					[...takenNow, ...hard],
				),
			];
			const fill = pickStratified(
				pool.filter(r => !hard.includes(r) && !special.includes(r)),
				want - accepted.length - hard.length - special.length,
				tagsOf,
				caps,
				[...takenNow, ...hard, ...special],
			);
			const batch = [...hard, ...special, ...fill].slice(0, want - accepted.length);
			if (!batch.length) break;
			const digest = await this.gate(
				em,
				batch.map(r => r.id),
			);
			for (const r of batch) {
				if (digest.has(r.id)) accepted.push(r);
				else rejected.add(r.id);
			}
			this.logger.log(
				`Posts round ${round + 1}: ${batch.length} picked, ${batch.filter(r => digest.has(r.id)).length} digested`,
			);
		}
		const tags = new Map(
			accepted.map(r => [r.id, [...tagsOf(r), ...(r.hard ? ['hard'] : [])]]),
		);
		const posts = await em.find(
			SocialPost,
			{ id: { $in: accepted.map(r => r.id) } },
			{
				populate: [
					'city',
					'hashtagLinks.hashtag',
					'account.brand',
					'mentions.brand',
					'mentions.venue',
					'statements.parts.topic',
					'statements.parts.term',
					'statements.mention',
				],
			},
		);
		const now = new Date().toISOString();
		for (const p of posts) {
			const mentions = _.sortBy(p.mentions.getItems(), m => m.id);
			const index = new Map(mentions.map((m, i) => [m.id, i]));
			const claims: EvalPostClaim[] = p.statements
				.getItems()
				.filter(s => s.text)
				.map(s => ({
					...storedClaim(s),
					subject: s.subject as EvalPostClaim['subject'],
					place: s.mention ? (index.get(s.mention.id) ?? null) : null,
				}));
			const c: PostCase = {
				id: `post-${p.id.slice(0, 8)}`,
				kind: 'post',
				tags: tags.get(p.id) ?? [],
				collectedAt: now,
				source: {
					...postClaimsSource(postForReadingOf(p)),
					id: p.id,
					externalId: p.externalId,
					url: p.url ?? null,
					cityId: p.city.id,
					cityName: p.city.name,
					ownBrand: p.account?.brand?.name ?? null,
					postedAt: p.postedAt?.toISOString() ?? null,
				},
				stored: {
					analysedAt: p.analysedAt?.toISOString() ?? null,
					isPromotional: p.isPromotional ?? null,
					places: mentions.map(storedPlace),
					claims,
				},
			};
			writeCase(c);
		}
		this.logger.log(
			`Posts: ${posts.length} new cases (${existing.length} kept, ${rejected.size} skipped by the gate)`,
		);
		return posts.length;
	}

	/** The posts the gate digests (a post with nothing to read never is) */
	private async gate(em: EntityManager, ids: string[]): Promise<Set<string>> {
		const posts = await em.find(
			SocialPost,
			{ id: { $in: ids } },
			{ populate: ['city', 'account.brand', 'hashtagLinks.hashtag'] },
		);
		const readable = posts.map(postForReadingOf).filter(p => hasContent(p));
		const digest = new Set<string>();
		// One post a call, as the pipeline's gate reads them; a post it fails on is not digested
		await runPool(
			readable,
			10,
			async post => {
				const res = await this.postGateAgent.generate(JSON.stringify(gateInput(post)), {
					cityName: post.cityName,
				});
				if (res.object.digest) digest.add(post.postId);
			},
			(post, e) => this.logger.warn(`Gate on ${post.postId} failed: ${e.message}`),
		);
		return digest;
	}

	private async collectTerms(em: EntityManager, n: number, seed: string, existing: TermCase[]) {
		type Row = {
			id: number;
			key: string;
			name: string;
			uses: number;
			decided_by: string | null;
			suggestion: string | null;
			topics: { key: string; relation: string }[] | null;
		};
		const rows: Row[] = await em.getConnection().execute(
			// TODO(topic-graph): new term cases store no decision (`topics` null: nothing to score). The
			// stored shape is one main topic, `exact` and modifiers now; remade with the eval's term part
			`select t.id, t.key, t.name, coalesce(p.n, 0)::int as uses, t.decided_by, null::text as suggestion,
				null::json as topics
			from terms t
			left join (select term_id, count(*) as n from statement_parts where role = 'food' group by term_id) p on p.term_id = t.id`,
		);
		const have = new Set(existing.map(c => c.source.termId));
		const pool = rows.filter(r => !have.has(r.id));
		const shuffled = _.sortBy(pool, r => hash(`${r.id}${seed}`));
		const want = Math.max(0, n - existing.length);
		// The most used (what the counts lean on), a random spread of the rest, and Google's tags (no uses)
		const top = _.orderBy(pool, [r => r.uses, r => r.id], ['desc', 'asc']).slice(
			0,
			Math.round(want * 0.4),
		);
		const used = shuffled
			.filter(r => r.uses > 0 && !top.includes(r))
			.slice(0, Math.round(want * 0.4));
		const tags = shuffled.filter(r => r.uses === 0).slice(0, want - top.length - used.length);
		const now = new Date().toISOString();
		const picked = [
			...top.map(r => [r, 'most-used'] as const),
			...used.map(r => [r, 'used'] as const),
			...tags.map(r => [r, 'google-tag'] as const),
		];
		for (const [r, group] of picked) {
			const c: TermCase = {
				id: `term-${r.id}`,
				kind: 'term',
				tags: [group, `decided:${r.decided_by ?? 'pending'}`],
				collectedAt: now,
				source: { termId: r.id, key: r.key, name: r.name, uses: r.uses },
				stored: {
					decidedBy: r.decided_by,
					topics: (r.topics as TermCase['stored']['topics']) ?? null,
					suggestion: r.suggestion,
				},
			};
			writeCase(c);
		}
		this.logger.log(`Terms: ${picked.length} new cases (${existing.length} kept)`);
		return picked.length;
	}
}

/** A stable order for a seeded shuffle */
const hash = (s: string): number => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
};
