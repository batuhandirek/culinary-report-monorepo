import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { mentionTopicsSql } from 'src/modules/trends/util/topic-mentions.js';

import { LandingCopyAgent } from '../agents/landing-copy.agent.js';
import {
	LANDING_PROMPT_PHRASES,
	LANDING_PROMPT_SUMMARIES,
	LANDING_REFRESH_DAYS,
} from '../constants/landing.constant.js';
import { LandingEdition } from '../entities/landing-edition.entity.js';
import type { LandingCopy, LandingEditionData } from '../interfaces/landing-edition.interface.js';
import { LandingBuildJob } from '../jobs/landing-build.job.js';
import {
	computeLanding,
	type LandingFeedbackRow,
	type LandingMentionRow,
	type LandingOpeningSign,
	type LandingVenueRow,
	landingWindow,
	promptMaterial,
} from '../util/landing.js';
import { checkCopy, type LandingCopyAnswer } from '../util/landing-copy.js';
import { landingPrompt } from '../util/landing-prompt.js';

const DAY_MS = 24 * 3600 * 1000;
// The daily cron runs at one hour; an edition built a little later than it on day 0 is still due on day 5
const DUE_SLACK_MS = 3 * 3600 * 1000;

// SQL: a post that counts, a mention by someone other than the brand, of a brand open in the city
const COUNTS = `p.city_id = ? and p.posted_at >= ? and p.posted_at < ?
	and not coalesce(p.is_ad, false) and not coalesce(p.is_promotional, false)
	and exists (select 1 from venues o where o.brand_id = m.brand_id and o.city_id = p.city_id and not o.closed)
	and not ${ownPostSql('p', 'm.brand_id')}`;

/**
 * The one entry point for the front page's live edition of a city: `build` counts the last 30
 * days of posts by others, has `LandingCopyAgent` write the lines, checks each, stores the edition
 * and publishes it. The cron builds every city's edition once its newest is five days old;
 * `unpublish` is an admin's way to take one down.
 */
@Injectable()
export class LandingEditionService {
	private readonly logger = new Logger(LandingEditionService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly topicService: TopicService,
		private readonly landingCopyAgent: LandingCopyAgent,
		private readonly pgBossService: PgBossService,
	) {}

	/** The newest published edition of the city with this slug; 404 without one. */
	async published(citySlug: string): Promise<LandingEdition> {
		const edition = await this.em.findOne(
			LandingEdition,
			{ city: { slug: citySlug }, publishedAt: { $ne: null } },
			{
				populate: ['city'],
				orderBy: { windowEnd: QueryOrder.DESC, builtAt: QueryOrder.DESC },
			},
		);
		if (!edition) throw new NotFoundException('No published front page for this city');
		return edition;
	}

	/** A city's editions, newest first. */
	async list(cityId: string, limit = 20): Promise<LandingEdition[]> {
		return this.em.find(
			LandingEdition,
			{ city: cityId },
			{ populate: ['city'], orderBy: { windowEnd: QueryOrder.DESC }, limit },
		);
	}

	async get(id: string): Promise<LandingEdition> {
		const edition = await this.em.findOne(LandingEdition, { id }, { populate: ['city'] });
		if (!edition) throw new NotFoundException('No such edition');
		return edition;
	}

	/**
	 * Counts the 30 days before `now`'s day and writes them up, replacing an edition of the same
	 * window. Publishes it when it lists any place (`publish: false` keeps it a draft); an
	 * edition with no places stays unpublished, so the page keeps the one before. Flushes.
	 */
	async build(
		cityId: string,
		now = new Date(),
		opts: { publish?: boolean } = {},
	): Promise<LandingEdition> {
		const city = await this.cityService.getById(cityId);
		const { start, end, previousStart } = landingWindow(now);
		const current = {
			mentions: await this.mentionRows(city.id, start, end),
			feedback: await this.feedbackRows(city.id, start, end),
		};
		const previous = {
			mentions: await this.mentionRows(city.id, previousStart, start),
			feedback: await this.feedbackRows(city.id, previousStart, start),
		};
		const brandIds = [...new Set(current.mentions.map(r => r.brandId))];
		const data = computeLanding({
			cityName: city.name,
			end,
			current,
			previous,
			venues: await this.venueRows(city.id, brandIds),
			openingSigns: await this.openingSigns(city.id, end),
			index: await this.topicService.index(),
			doNotList: { venues: city.doNotListVenues, creators: city.doNotListCreators },
		});
		const { copy, copyError } = await this.writeCopy(city, data, current, start, end);

		const existing = await this.em.findOne(LandingEdition, { city: city.id, windowEnd: end });
		const edition =
			existing ??
			this.em.create(LandingEdition, {
				city,
				windowStart: start,
				windowEnd: end,
				data,
				copy,
				builtAt: now,
			});
		Object.assign(edition, { data, copy, copyError: copyError ?? null, builtAt: now });
		if (opts.publish !== false && data.places.length) edition.publishedAt ??= now;
		await this.em.flush();
		this.logger.log(
			`${city.name}: edition to ${end.toISOString().slice(0, 10)}, ${data.places.length} places, ` +
				`${copy.written} lines written, ${copy.fallbacks} fallbacks${copyError ? ` (${copyError})` : ''}`,
		);
		return edition;
	}

	/** Puts an edition back on the page (the newest published one is shown). Flushes. */
	async publish(id: string, now = new Date()): Promise<LandingEdition> {
		const edition = await this.get(id);
		edition.publishedAt ??= now;
		await this.em.flush();
		return edition;
	}

	/** Takes an edition off the page; the newest other published one shows instead. Flushes. */
	async unpublish(id: string): Promise<LandingEdition> {
		const edition = await this.get(id);
		edition.publishedAt = null;
		await this.em.flush();
		return edition;
	}

	/** Queues a build of the city's edition (`LandingBuildJob`, one waiting per city). */
	async queueBuild(cityId: string): Promise<void> {
		await this.pgBossService.sendJob(LandingBuildJob.jobName, new LandingBuildJob({ cityId }), {
			singletonKey: cityId,
		});
	}

	/**
	 * The cities whose newest edition is `LANDING_REFRESH_DAYS` old or that have none: every
	 * city with the monthly cron on, since only those keep being scraped.
	 */
	async dueCities(now = new Date()): Promise<City[]> {
		const cities = await this.cityService.forMonthlyCron();
		const due: City[] = [];
		for (const city of cities) {
			const newest = await this.em.findOne(
				LandingEdition,
				{ city: city.id },
				{ orderBy: { builtAt: QueryOrder.DESC }, fields: ['builtAt'] },
			);
			if (
				!newest ||
				now.getTime() - newest.builtAt.getTime() >=
					LANDING_REFRESH_DAYS * DAY_MS - DUE_SLACK_MS
			)
				due.push(city);
		}
		return due;
	}

	/** The cron's work: a build queued for every due city. */
	async queueDue(now = new Date()): Promise<string[]> {
		const due = await this.dueCities(now);
		for (const city of due) await this.queueBuild(city.id);
		return due.map(c => c.id);
	}

	/**
	 * The model's lines, checked (`checkCopy`). A failed call (no allowance left, a timeout)
	 * leaves every line its plain fallback and says why, so the edition still goes out.
	 */
	private async writeCopy(
		city: City,
		data: LandingEditionData,
		current: { mentions: LandingMentionRow[]; feedback: LandingFeedbackRow[] },
		windowStart: Date,
		windowEnd: Date,
	): Promise<{ copy: LandingCopy; copyError?: string }> {
		const material = promptMaterial(current, {
			phrases: LANDING_PROMPT_PHRASES,
			summaries: LANDING_PROMPT_SUMMARIES,
		});
		const { input, inputs } = landingPrompt(data, material, {
			cityName: city.name,
			windowStart,
			windowEnd,
		});
		const onProblem = (where: string, problem: string) =>
			this.logger.warn(`${city.name}: fallback for ${where}: ${problem}`);
		if (!data.places.length) return { copy: checkCopy(data, null, inputs) };
		try {
			const res = await this.landingCopyAgent.generate(
				[{ role: 'user', content: JSON.stringify(input) }],
				{ cityName: city.name },
			);
			return { copy: checkCopy(data, res.object as LandingCopyAnswer, inputs, onProblem) };
		} catch (error) {
			const message = (error as Error).message ?? String(error);
			this.logger.error(`${city.name}: the front page's lines fell back: ${message}`);
			return { copy: checkCopy(data, null, inputs), copyError: message.slice(0, 500) };
		}
	}

	private async mentionRows(
		cityId: string,
		start: Date,
		end: Date,
	): Promise<LandingMentionRow[]> {
		const rows: {
			mention_id: number;
			post_id: string;
			external_id: string;
			platform: SocialPlatformEnum;
			url: string;
			views: string | number | null;
			posted_at: Date;
			handle: string | null;
			creator_key: string;
			brand_id: string;
			brand_name: string;
			venue_id: string | null;
			district: string | null;
			street: string | null;
			sentiment: string | null;
			summary: string | null;
			topics: string[];
		}[] = await this.em.getConnection().execute(
			`select m.id as mention_id, p.id as post_id, p.external_id, p.platform, p.url, p.views, p.posted_at,
				coalesce(a.handle, p.author) as handle,
				coalesce(a.creator_id::text, 'author:' || lower(p.author), 'post:' || p.id::text) as creator_key,
				m.brand_id, b.name as brand_name, m.venue_id, v.district, v.street,
				m.sentiment, m.summary, ${mentionTopicsSql('m')} as topics
			from mentions m
			join social_posts p on p.id = m.post_id
			join brands b on b.id = m.brand_id
			left join venues v on v.id = m.venue_id
			left join social_accounts a on a.id = p.account_id
			where ${COUNTS}`,
			[cityId, start, end],
		);
		return rows.map(r => ({
			mentionId: r.mention_id,
			postId: r.post_id,
			externalId: r.external_id,
			platform: r.platform,
			url: r.url,
			views: Number(r.views ?? 0),
			postedAt: new Date(r.posted_at),
			handle: r.handle,
			creatorKey: r.creator_key,
			brandId: r.brand_id,
			brandName: r.brand_name,
			venueId: r.venue_id,
			district: r.district,
			street: r.street,
			sentiment: r.sentiment,
			summary: r.summary,
			topics: r.topics ?? [],
		}));
	}

	/** The feedback rows of the window's mentions that count; changes noticed are no praise. */
	private async feedbackRows(
		cityId: string,
		start: Date,
		end: Date,
	): Promise<LandingFeedbackRow[]> {
		const rows: {
			mention_id: number;
			post_id: string;
			brand_id: string;
			views: string | number | null;
			sentiment: string;
			theme: string | null;
			detail: string | null;
			dish: string | null;
			dish_key: string | null;
			topic_key: string | null;
			topic_label: string | null;
			topic_kind: TopicKindEnum | null;
		}[] = await this.em.getConnection().execute(
			`select f.mention_id, p.id as post_id, m.brand_id, p.views, f.sentiment, f.theme, f.detail, f.dish, f.dish_key,
				t.key as topic_key, t.label as topic_label, t.kind as topic_kind
			from feedback_points f
			join mentions m on m.id = f.mention_id
			join social_posts p on p.id = m.post_id
			left join topics t on t.id = f.food_topic_id
			where f.source_kind = 'mention' and not f.change and m.brand_id is not null and ${COUNTS}`,
			[cityId, start, end],
		);
		return rows.map(r => ({
			mentionId: r.mention_id,
			postId: r.post_id,
			brandId: r.brand_id,
			views: Number(r.views ?? 0),
			sentiment: r.sentiment,
			theme: r.theme,
			detail: r.detail,
			dish: r.dish,
			dishKey: r.dish_key,
			topicKey: r.topic_key,
			topicLabel: r.topic_label,
			topicKind: r.topic_kind,
		}));
	}

	private async venueRows(cityId: string, brandIds: string[]): Promise<LandingVenueRow[]> {
		if (!brandIds.length) return [];
		const rows: {
			id: string;
			brand_id: string;
			district: string | null;
			street: string | null;
			reviews_count: number | null;
		}[] = await this.em.getConnection().execute(
			`select v.id, v.brand_id, v.district, v.street, v.reviews_count
			from venues v
			where v.city_id = ? and not v.closed and v.brand_id in (${brandIds.map(() => '?').join(', ')})`,
			[cityId, ...brandIds],
		);
		return rows.map(r => ({
			venueId: r.id,
			brandId: r.brand_id,
			district: r.district,
			street: r.street,
			reviewsCount: r.reviews_count,
		}));
	}

	/**
	 * Each place's first sign of being new before `end`: per branch (or brand, for a brand-only
	 * mention) the first post by others calling it new, and per venue the first time a city-wide
	 * scrape saw it open. All time, so a place called new last month is not new again.
	 */
	private async openingSigns(cityId: string, end: Date): Promise<LandingOpeningSign[]> {
		const rows: { brand_id: string; venue_id: string | null; at: Date }[] = await this.em
			.getConnection()
			.execute(
				`select m.brand_id, m.venue_id, min(p.posted_at) as at
			from mentions m join social_posts p on p.id = m.post_id
			where m.is_new_opening and m.brand_id is not null and p.city_id = ? and p.posted_at < ?
				and not ${ownPostSql('p', 'm.brand_id')}
			group by m.brand_id, m.venue_id
			union all
			select v.brand_id, v.id as venue_id, min(c.at) as at
			from venue_status_changes c join venues v on v.id = c.venue_id
			where v.city_id = ? and c.kind = 'opened' and c.at < ?
			group by v.brand_id, v.id`,
				[cityId, end, cityId, end],
			);
		return rows.map(r => ({ brandId: r.brand_id, venueId: r.venue_id, at: new Date(r.at) }));
	}
}
