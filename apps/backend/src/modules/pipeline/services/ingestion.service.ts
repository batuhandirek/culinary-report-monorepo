import { Injectable, Logger } from '@nestjs/common';

import { mainConfig } from 'src/config/main.config.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { AccountMatchingService } from 'src/modules/social/services/account-matching.service.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { PostCommentService } from 'src/modules/social/services/post-comment.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { WebMentionService } from 'src/modules/venues/services/web-mention.service.js';
import { isFatalProviderError } from 'src/shared/util/pool.js';

import {
	INGEST_EXTRACT_BATCH,
	INGEST_EXTRACT_MAX_BATCHES,
	INGEST_REVIEWS_PER_PASS,
} from '../constants/pipeline.constant.js';
import { IngestCityJob } from '../jobs/ingest-city.job.js';

/**
 * What a gated step needs read first: `posts` (every post read and every mention matched: the
 * month's top brands, the names to look up) or `all` (also the month's reviews, the comments and
 * the press: what a report and the lead score read).
 */
export type ReadLevel = 'posts' | 'all';

/** What is still unread for a city, counted after a pass */
export interface ReadPending {
	posts: number;
	mentions: number;
	reviews: number;
	comments: number;
	press: number;
}

/** One reading pass over a city */
export interface ReadPass {
	extracted: number;
	skipped: number;
	matched: number;
	accounts?: unknown;
	reviews: number;
	comments: number;
	press: number;
	/** The provider's message when a model refused: the rest of the pass was left for later */
	blocked?: string;
	pending: ReadPending;
}

/**
 * The reading of what the scrapes stored, apart from the scrapes (the user's call, 2026-11-04: an
 * LLM out must never stop or fail an Apify run). Every part reads only what is unread, so a pass
 * can run any time and goes on where the last one stopped: posts (the gate and agent A), their
 * mentions matched (and the accounts, when anything changed), the city's unread reviews (newest
 * first, `INGEST_REVIEWS_PER_PASS` a pass), comments and press pages. A provider refusing ends
 * the pass quietly (`blocked`); the next one (the hourly `IngestionCron`, or the job a scrape
 * queues) tries again.
 *
 * One pass at a time per city (`locked`, in memory: one backend process runs the jobs), shared
 * with the admin's reading steps, so two passes never read the same post twice.
 */
@Injectable()
export class IngestionService {
	private readonly logger = new Logger(IngestionService.name);
	private readonly locks = new Map<string, Promise<void>>();

	constructor(
		private readonly pgBossService: PgBossService,
		private readonly cityService: CityService,
		private readonly mentionExtractionService: MentionExtractionService,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly accountMatchingService: AccountMatchingService,
		private readonly reviewService: ReviewService,
		private readonly postCommentService: PostCommentService,
		private readonly webMentionService: WebMentionService,
	) {}

	/** Queues a pass for the city: one waiting per city (the queue is `stately`). None while `INGESTION_IS_DISABLED` */
	async queue(cityId: string): Promise<void> {
		if (mainConfig.INGESTION_IS_DISABLED) return;
		await this.pgBossService.sendJob(IngestCityJob.jobName, new IngestCityJob({ cityId }), {
			singletonKey: cityId,
		});
	}

	/** Runs `fn` once no other reading of the city is running */
	async locked<T>(cityId: string, fn: () => Promise<T>): Promise<T> {
		const before = this.locks.get(cityId) ?? Promise.resolve();
		let release!: () => void;
		const mine = new Promise<void>(resolve => (release = resolve));
		const chain = before.then(() => mine);
		this.locks.set(cityId, chain);
		await before;
		try {
			return await fn();
		} finally {
			release();
			if (this.locks.get(cityId) === chain) this.locks.delete(cityId);
		}
	}

	async pending(cityId: string): Promise<ReadPending> {
		const [posts, mentions, reviews, comments, press] = await Promise.all([
			this.mentionExtractionService.countUnread(cityId),
			this.mentionMatchingService.pendingCount(cityId),
			this.reviewService.countPending(cityId),
			this.postCommentService.countUnread(cityId),
			this.webMentionService.countPending(cityId),
		]);
		return { posts, mentions, reviews, comments, press };
	}

	/** One pass over the city, by its id: the job's */
	async ingestCity(cityId: string): Promise<ReadPass> {
		return this.ingest(await this.cityService.getById(cityId));
	}

	/** One pass over the city: see the class comment */
	ingest(city: City): Promise<ReadPass> {
		return this.locked(city.id, () => this.pass(city));
	}

	/**
	 * A gated step's check: a pass first, then whether the step may go on. Posts are read and
	 * matched to the end in every pass, so `posts` is caught up when no model refused; `all` also
	 * needs the month's reviews read (all of them, as `ANALYSE_REVIEWS` did), not only a pass's share.
	 */
	async catchUp(city: City, level: ReadLevel, month: string): Promise<{ ready: boolean; pass: ReadPass }> {
		const pass = await this.ingest(city);
		if (pass.blocked) return { ready: false, pass };
		if (level === 'all') {
			try {
				pass.reviews += await this.locked(city.id, () => this.reviewService.analyseMonth(month));
			} catch (e) {
				if (!isFatalProviderError(e)) throw e;
				pass.blocked = (e as Error).message;
				return { ready: false, pass };
			}
		}
		return { ready: true, pass };
	}

	private async pass(city: City): Promise<ReadPass> {
		const pass: Omit<ReadPass, 'pending'> = {
			extracted: 0,
			skipped: 0,
			matched: 0,
			reviews: 0,
			comments: 0,
			press: 0,
		};
		const part = async (fn: () => Promise<void>): Promise<boolean> => {
			if (pass.blocked) return false;
			try {
				await fn();
			} catch (e) {
				if (!isFatalProviderError(e)) throw e;
				pass.blocked = (e as Error).message;
				this.logger.warn(`Reading ${city.name} stopped: ${pass.blocked}`);
			}
			return !pass.blocked;
		};

		await part(async () => {
			// Batch by batch until nothing is left; a batch that reads nothing (every post failed
			// on its own) ends it, so a post that always fails is never asked forever
			for (let i = 0; i < INGEST_EXTRACT_MAX_BATCHES; i++) {
				if ((await this.mentionExtractionService.countUnread(city.id)) === 0) break;
				const res = await this.mentionExtractionService.extract({ limit: INGEST_EXTRACT_BATCH, cityId: city.id });
				pass.extracted += res.analysed;
				pass.skipped += res.skipped;
				if (res.analysed === 0) break;
			}
		});
		await part(async () => {
			if (pass.extracted === 0 && (await this.mentionMatchingService.pendingCount(city.id)) === 0) return;
			const counts = await this.mentionMatchingService.match({ cityId: city.id });
			pass.matched = Object.values(counts).reduce((a, b) => a + b, 0);
			// Authors to the brands they are the own accounts of: the posts by others that rank
			// brands leave those out. Free, but over every account of the city: only after a change
			if (pass.matched > 0) {
				pass.accounts = await this.accountMatchingService.match(city);
				// An account linked just now (its own profile, a site) places mentions its tags name
				const byTags = await this.mentionMatchingService.matchByTags(city.id);
				pass.matched += Object.values(byTags).reduce((a, b) => a + b, 0);
			}
		});
		await part(async () => {
			pass.reviews = (await this.reviewService.analysePending(city.id, INGEST_REVIEWS_PER_PASS)).analysed;
		});
		await part(async () => {
			pass.comments = (await this.postCommentService.analyse(city)).analysed;
		});
		await part(async () => {
			pass.press = (await this.webMentionService.classifyPending(city)).classified;
		});

		const pending = await this.pending(city.id);
		const read = pass.extracted + pass.matched + pass.reviews + pass.comments + pass.press;
		if (read > 0 || pass.blocked)
			this.logger.log(
				`Read ${city.name}: ${pass.extracted} posts, ${pass.matched} mentions, ${pass.reviews} reviews, ` +
					`${pass.comments} comments, ${pass.press} press pages${pass.blocked ? ' (stopped: no model)' : ''}`,
			);
		return { ...pass, pending };
	}
}
