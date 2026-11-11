import { EntityManager } from '@mikro-orm/postgresql';

import type { TestingModule } from '@nestjs/testing';

import { SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import type {
	GateVerdict,
	PostForReading,
} from 'src/modules/social/interfaces/post-reading.interface.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';

import { PostClaimsAgent } from '../../agents/post-claims.agent.js';
import { PostGateAgent } from '../../agents/post-gate.agent.js';
import { postClaimsSource } from '../../util/post-claims-input.js';
import { type PostClaimsRead, readPostClaims } from '../../util/post-claims-read.js';
import { gateInput, hasContent } from '../../util/post-gate-input.js';

/**
 * The reading's steps run plainly, for PGlite suites (DBOS can't run on PGlite): what
 * `ReadPostsWorkflow.readPost`, `RereadPostsWorkflow.rereadPost` and
 * `ReflagOpeningsWorkflow.reflagPost` do, step by step, with the agents the suite provides
 * (`PostGateAgent`, `PostClaimsAgent`, usually `mockAgent`s) called directly. A post whose agent
 * call throws is counted `failed` and left as it was.
 */
const parts = (moduleRef: TestingModule) => ({
	extraction: moduleRef.get(MentionExtractionService),
	// Getters: a suite provides only the agents it uses (the re-flag reads no gate)
	get gate() {
		return moduleRef.get(PostGateAgent);
	},
	get claims() {
		return moduleRef.get(PostClaimsAgent);
	},
	get statementParts() {
		return moduleRef.get(StatementPartsService);
	},
});

const gateOf = async (
	gate: PostGateAgent,
	post: PostForReading,
): Promise<{ verdict: GateVerdict | null; tokens: number }> => {
	if (!hasContent(post)) return { verdict: null, tokens: 0 };
	const res = await gate.generate(JSON.stringify(gateInput(post)), { cityName: post.cityName });
	return {
		verdict: { digest: res.object.digest, reason: res.object.reason },
		tokens: res.usage?.totalTokens ?? 0,
	};
};

const claimsOf = async (
	moduleRef: TestingModule,
	post: PostForReading,
): Promise<PostClaimsRead> => {
	const p = parts(moduleRef);
	return readPostClaims(p.claims, postClaimsSource(post), { cityName: post.cityName });
};

/** The unread posts (of a city, or all), most viewed first, read: what `extract` did */
export const readPostsPlainly = async (
	moduleRef: TestingModule,
	opts: { limit: number; cityId?: string },
): Promise<{ analysed: number; mentions: number; skipped: number }> => {
	const p = parts(moduleRef);
	const { extraction } = p;
	const em = moduleRef.get(EntityManager).fork();
	const ids = (
		await em.find(
			SocialPost,
			{ analysedAt: null, ...(opts.cityId && { city: opts.cityId }) },
			{ orderBy: { views: 'desc', id: 'asc' }, limit: opts.limit, fields: ['id'] },
		)
	).map(p => p.id);
	const result = { analysed: 0, mentions: 0, skipped: 0 };
	for (const id of ids) {
		const post = await extraction.postForReading(id, { unread: true });
		if (!post) continue;
		try {
			const { verdict } = await gateOf(p.gate, post);
			if (!(await extraction.saveGate(id, verdict))) {
				result.skipped++;
				continue;
			}
			const reading = await claimsOf(moduleRef, post);
			const saved = await extraction.saveReading(id, {
				...reading.object,
				tokens: reading.usage.totalTokens,
			});
			await p.statementParts.read({ ids: saved.claimIds });
			if (saved.mentionIds.length) await extraction.queueVenueTags(post.cityId);
			result.analysed++;
			result.mentions += saved.mentionIds.length;
		} catch {
			// Left unread, as a failed call leaves a post
		}
	}
	return result;
};

/** The posts read before `before`, most viewed first, read again: what the `reread-posts` backlog did */
export const rereadPostsPlainly = async (
	moduleRef: TestingModule,
	opts: { before: Date; limit: number },
) => {
	const p = parts(moduleRef);
	const { extraction } = p;
	const ids = await extraction.rereadPostIds(opts.before, opts.limit);
	const result = {
		posts: ids.length,
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
	for (const id of ids) {
		const post = await extraction.postForReading(id, { analysedBefore: opts.before });
		if (!post) continue;
		try {
			const gated = await gateOf(p.gate, post);
			result.tokens += gated.tokens;
			if (!(await extraction.saveGate(id, gated.verdict))) {
				result.deleted += (await extraction.clearReading(id)).deleted;
				result.read++;
				result.skipped++;
				continue;
			}
			const reading = await claimsOf(moduleRef, post);
			const { claimIds, addedMentionIds, ...saved } = await extraction.saveReread(id, {
				...reading.object,
				tokens: reading.usage.totalTokens,
			});
			result.tokens += reading.usage.totalTokens;
			result.tokens += (await p.statementParts.read({ ids: claimIds })).tokens ?? 0;
			await extraction.queueVenueTags(post.cityId);
			result.read++;
			result.paired += saved.paired;
			result.added += saved.added;
			result.deleted += saved.deleted;
			result.unconfirmed += saved.unconfirmed;
			result.claims += claimIds.length;
			result.cityClaims += saved.cityClaims;
		} catch {
			result.failed++;
		}
	}
	return result;
};

/** A page of a month's stored posts re-flagged: what `reflagOpenings` did */
export const reflagOpeningsPlainly = async (
	moduleRef: TestingModule,
	opts: Parameters<MentionExtractionService['reflagCandidates']>[0],
) => {
	const { extraction } = parts(moduleRef);
	const { total, postIds } = await extraction.reflagCandidates(opts);
	const result = {
		total,
		posts: postIds.length,
		read: 0,
		failed: 0,
		flaggedMentions: 0,
		flaggedPosts: 0,
		cleared: 0,
		unpaired: 0,
		tokens: 0,
	};
	for (const id of postIds) {
		const post = await extraction.postForReading(id);
		if (!post) continue;
		try {
			const reading = await claimsOf(moduleRef, post);
			const saved = await extraction.saveReflag(id, reading.object.places);
			result.read++;
			result.flaggedMentions += saved.flaggedMentions;
			if (saved.flagged) result.flaggedPosts++;
			result.cleared += saved.cleared;
			result.unpaired += saved.unpaired;
			result.tokens += reading.usage.totalTokens;
		} catch {
			result.failed++;
		}
	}
	return result;
};
