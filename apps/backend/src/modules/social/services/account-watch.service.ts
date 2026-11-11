import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { accountSourceKind, sourcePlatform } from 'src/modules/cities/util/city-source.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';

import {
	CREATOR_INSTAGRAM_EVERY_DAYS,
	CREATOR_INSTAGRAM_PROFILE_USD,
	CREATOR_WATCH_MAX,
	CREATOR_WATCH_MIN_POSTS,
	CREATOR_WATCH_MIN_SHARE,
	CREATOR_WATCH_QUIET_DAYS,
	CREATOR_WATCH_WINDOW_DAYS,
} from '../constants/account-watch.constant.js';
import { Creator } from '../entities/creator.entity.js';
import { SocialAccount } from '../entities/social-account.entity.js';
import { AccountSnapshotSourceEnum } from '../entities/social-account-snapshot.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import type { WatchBrand } from '../interfaces/watch-brand.interface.js';
import type { ProfilePlatform } from '../util/accounts.js';

import type { AccountToScrape } from './account-scrape.service.js';

/** Why an account's profile is scraped. */
export enum WatchReasonKindEnum {
	// One of the city's sources: an admin added the creator to the city's discovery
	CITY_SOURCE = 'city_source',
	// The account is a paying customer's own (a won prospect's brand)
	CUSTOMER = 'customer',
	// The account is the own account of one of the city's most talked-about brands of the month
	TOP_BRAND = 'top_brand',
	// The account is the own account of a competitor of one of the month's report brands
	RIVAL = 'rival',
	// The account is the own account of any other brand with an open branch in the city
	BRAND = 'brand',
	// The account is a creator's on the self-kept list: enough of their recent posts name a place
	// in the city (`CREATOR_WATCH_*`); they join and leave by themselves
	CREATOR = 'creator',
}

/** What the weekly own-account scrape takes: every brand's own accounts, the report brands' first */
export const BRAND_WATCH_KINDS = [
	WatchReasonKindEnum.CUSTOMER,
	WatchReasonKindEnum.TOP_BRAND,
	WatchReasonKindEnum.RIVAL,
	WatchReasonKindEnum.BRAND,
];

/** What the daily creator scrape takes: the creators the city follows and the self-kept list */
export const CREATOR_WATCH_KINDS = [WatchReasonKindEnum.CITY_SOURCE, WatchReasonKindEnum.CREATOR];

/**
 * What the monthly scrape takes (the snapshot with averages over the latest ten that closes the
 * month): the creators the city follows and the report brands' and their rivals' own accounts
 */
export const MONTHLY_WATCH_KINDS = [
	WatchReasonKindEnum.CITY_SOURCE,
	WatchReasonKindEnum.CUSTOMER,
	WatchReasonKindEnum.TOP_BRAND,
	WatchReasonKindEnum.RIVAL,
];

interface Ref {
	id: string;
	name: string;
}

/** One reason an account is (or would be) watched in a city. */
export interface WatchReason {
	kind: WatchReasonKindEnum;
	city: Ref;
	/** Whether this reason gets the profile scraped now: a source switched off, or an Instagram source in a city with Instagram off, does not */
	active: boolean;
	/** A city source's id and whether it is on */
	sourceId?: string;
	enabled?: boolean;
	/** The city has Instagram turned off, so its Instagram sources wait */
	instagramOff?: boolean;
	/** The brand whose own account it is (customer, top brand, rival) */
	brand?: Ref;
	/** A top brand's place in the month's list, or a creator's in the creator list, and the list's length */
	rank?: number;
	top?: number;
	/** A creator's posts in the window naming a place in the city, of their read posts, and the last one's time */
	posts?: number;
	readPosts?: number;
	lastPostAt?: string;
	/** The window those are counted over, in days */
	windowDays?: number;
	/** The report brands it competes with (a rival) */
	rivalOf?: Ref[];
	/** The month the report brands are of */
	month?: string;
}

export interface WatchedAccount {
	platform: ProfilePlatform;
	handle: string;
	/** Absent for a city source whose handle never posted for us yet */
	accountId?: string;
	reasons: WatchReason[];
}

/** A day's creator scrape of a city, as plain data (a workflow stores it) */
export interface CreatorScrapePlan {
	/** How many watched accounts each reason brought in */
	watched: Partial<Record<WatchReasonKindEnum, number>>;
	/** The handles to scrape on each platform */
	tiktok: string[];
	instagram: string[];
	/** Instagram profiles due, of which `instagram` are what the budget covers */
	instagramDue: number;
	instagramBudgetUsd: number;
	tiktokBudgetUsd: number;
}

const PROFILE_PLATFORMS = [SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK];

/**
 * Which TikTok and Instagram profiles a city's runs scrape, and why (`SCRAPE_ACCOUNTS` monthly,
 * `SCRAPE_ACCOUNTS_RECENT` weekly, `CreatorWatchWorkflow` daily, and the creator page's "Watched"
 * panel): the creators the city follows (account sources), the self-kept creator list, and the
 * own accounts (`SocialAccount.brand`) of every brand with an open branch in the city, the month's
 * report brands (paying customers and the most talked-about) and their competitors named as such.
 * One list, so what the page says is what the runs do; each run takes the kinds of reason it is
 * for (`BRAND_WATCH_KINDS`, `CREATOR_WATCH_KINDS`, `MONTHLY_WATCH_KINDS`).
 */
@Injectable()
export class AccountWatchService {
	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly competitorService: CompetitorService,
		private readonly brandService: BrandService,
	) {}

	/**
	 * Every account the city's runs have a reason for, each reason with whether it is active
	 * (switched-off sources and Instagram sources of a city with Instagram off are listed, not
	 * scraped). `brands` are the month's report brands (the pipeline's `ReportBrandsService`); a branch's
	 * own account counts only in the branch's city.
	 */
	async watchList(
		city: City,
		brands: WatchBrand[],
		opts: { month: string; top: number; now?: Date },
	): Promise<WatchedAccount[]> {
		const cityRef = { id: city.id, name: city.name };
		const out = new Map<string, WatchedAccount>();
		const entry = (platform: ProfilePlatform, handle: string, accountId?: string) => {
			const key = `${platform}:${handle}`;
			let watched = out.get(key);
			if (!watched) out.set(key, (watched = { platform, handle, reasons: [] }));
			if (accountId) watched.accountId = accountId;
			return watched;
		};

		// Creators the city follows
		const sources = await this.cityService.accountSources({ cityId: city.id });
		const known =
			sources.length ?
				await this.em.find(SocialAccount, {
					$or: sources.map(s => ({ platform: sourcePlatform(s.kind), handle: s.value })),
				})
			:	[];
		for (const source of sources) {
			const platform = sourcePlatform(source.kind) as ProfilePlatform;
			const account = known.find(a => a.platform === platform && a.handle === source.value);
			const instagramOff =
				platform === SocialPlatformEnum.INSTAGRAM && !city.instagramEnabled;
			entry(platform, source.value, account?.id).reasons.push({
				kind: WatchReasonKindEnum.CITY_SOURCE,
				city: cityRef,
				active: source.enabled && !instagramOff,
				sourceId: source.id,
				enabled: source.enabled,
				...(instagramOff && { instagramOff }),
			});
		}

		// The report brands, then the competitors of each (never a report brand's own branch)
		const reasonsByBrand = new Map<string, Omit<WatchReason, 'city' | 'active'>[]>();
		const add = (brandId: string, reason: Omit<WatchReason, 'city' | 'active'>) =>
			reasonsByBrand.set(brandId, [...(reasonsByBrand.get(brandId) ?? []), reason]);
		for (const top of brands) {
			const brand = { id: top.brand.id, name: top.brand.name };
			if (top.won) add(brand.id, { kind: WatchReasonKindEnum.CUSTOMER, brand });
			if (top.rank)
				add(brand.id, {
					kind: WatchReasonKindEnum.TOP_BRAND,
					brand,
					rank: top.rank,
					top: opts.top,
					month: opts.month,
				});
		}
		const rivalOf = new Map<string, Ref[]>();
		for (const top of brands)
			for (const competitor of await this.competitorService.inCity(top.brand.id, city.id)) {
				const rivalId = competitor.link.rival?.id ?? competitor.link.venue?.brand.id;
				if (!rivalId || rivalId === top.brand.id) continue;
				const list = rivalOf.get(rivalId) ?? [];
				if (!list.some(r => r.id === top.brand.id))
					list.push({ id: top.brand.id, name: top.brand.name });
				rivalOf.set(rivalId, list);
			}
		if (rivalOf.size) {
			const rivals = await this.brandService.names([...rivalOf.keys()]);
			for (const rival of rivals)
				add(rival.id, {
					kind: WatchReasonKindEnum.RIVAL,
					brand: { id: rival.id, name: rival.name },
					rivalOf: rivalOf.get(rival.id),
					month: opts.month,
				});
		}

		if (reasonsByBrand.size) {
			const accounts = await this.em.find(
				SocialAccount,
				// An account whose handle another user took has no profile to scrape until it is seen again
				{
					brand: { $in: [...reasonsByBrand.keys()] },
					platform: { $in: PROFILE_PLATFORMS },
					handleLostAt: null,
				},
				{ populate: ['branch'] },
			);
			for (const account of accounts) {
				// A branch's own account belongs to the branch's city
				if (account.branch && account.branch.city.id !== city.id) continue;
				const watched = entry(
					account.platform as ProfilePlatform,
					account.handle,
					account.id,
				);
				for (const reason of reasonsByBrand.get(account.brand!.id) ?? [])
					watched.reasons.push({ ...reason, city: cityRef, active: true });
			}
		}

		// The self-kept creator list
		for (const creator of await this.creators(city, opts.now ?? new Date())) {
			const instagramOff =
				creator.platform === SocialPlatformEnum.INSTAGRAM && !city.instagramEnabled;
			entry(creator.platform, creator.handle, creator.accountId).reasons.push({
				kind: WatchReasonKindEnum.CREATOR,
				city: cityRef,
				active: !instagramOff,
				...(instagramOff && { instagramOff }),
				rank: creator.rank,
				top: CREATOR_WATCH_MAX,
				posts: creator.posts,
				readPosts: creator.readPosts,
				lastPostAt: creator.lastPostAt,
				windowDays: CREATOR_WATCH_WINDOW_DAYS,
			});
		}

		// Every other brand with an open branch in the city: its own accounts, highest lead score first
		const brandAccounts = await this.em.getConnection().execute<
			{
				id: string;
				platform: ProfilePlatform;
				handle: string;
				brand_id: string;
				brand_name: string;
			}[]
		>(
			`select a.id, a.platform, a.handle, b.id brand_id, b.name brand_name from social_accounts a
			join brands b on b.id = a.brand_id
			left join venues branch on branch.id = a.branch_id
			where a.platform in (?, ?) and a.handle_lost_at is null
			and (a.branch_id is null or branch.city_id = ?)
			and exists (select 1 from venues v where v.brand_id = a.brand_id and v.city_id = ? and not v.closed)
			order by b.lead_score desc nulls last, a.handle`,
			[...PROFILE_PLATFORMS, city.id, city.id],
		);
		for (const row of brandAccounts) {
			if (reasonsByBrand.has(row.brand_id)) continue;
			entry(row.platform, row.handle, row.id).reasons.push({
				kind: WatchReasonKindEnum.BRAND,
				city: cityRef,
				active: true,
				brand: { id: row.brand_id, name: row.brand_name },
			});
		}
		return [...out.values()];
	}

	/**
	 * The self-kept creator list: creators (people; brand accounts out) whose posts found in the
	 * city in the last `CREATOR_WATCH_WINDOW_DAYS` include `CREATOR_WATCH_MIN_POSTS`+ naming a
	 * place matched to a brand, at least `CREATOR_WATCH_MIN_SHARE` of their read posts, the last
	 * one within `CREATOR_WATCH_QUIET_DAYS`; the most such posts first, then the most viewed,
	 * `CREATOR_WATCH_MAX` at most. Nothing is stored: each run works it out again, so a creator
	 * joins and leaves by themselves. Once watched, every post of theirs is found and read, so the
	 * share is their real one. A creator with a switched-off account source in the city is left
	 * out: an admin's "stop watching" is final. Each of their TikTok and Instagram accounts is listed.
	 */
	async creators(
		city: City,
		now: Date,
	): Promise<
		{
			accountId: string;
			platform: ProfilePlatform;
			handle: string;
			rank: number;
			posts: number;
			readPosts: number;
			lastPostAt: string;
		}[]
	> {
		const day = 86_400_000;
		const rows = await this.em
			.getConnection()
			.execute<{ creator_id: string; posts: number; read_posts: number; last_post: Date }[]>(
				`with posts as (
				select a.creator_id, p.posted_at, coalesce(p.views, 0) views,
				p.skip_reason is null and exists (
					select 1 from mentions m where m.post_id = p.id and m.brand_id is not null
				) named
				from social_posts p join social_accounts a on a.id = p.account_id
				where p.city_id = ? and a.brand_id is null and p.platform in (?, ?)
				and p.analysed_at is not null and p.posted_at >= ?
			), creators as (
				select creator_id, count(*) filter (where named)::int posts, count(*)::int read_posts,
				max(posted_at) filter (where named) last_post, sum(views) filter (where named) views
				from posts group by creator_id
			)
			select c.creator_id, c.posts, c.read_posts, c.last_post from creators c
			where c.posts >= ? and c.posts >= ? * c.read_posts and c.last_post >= ?
			and not exists (
				select 1 from social_accounts x
				join city_sources s on s.city_id = ? and not s.enabled and s.value = x.handle
				and s.kind::text = (case x.platform::text when 'tiktok' then 'tiktok_account' else 'instagram_account' end)
				where x.creator_id = c.creator_id
			)
			order by c.posts desc, c.views desc nulls last, c.creator_id
			limit ?`,
				[
					city.id,
					...PROFILE_PLATFORMS,
					new Date(now.getTime() - CREATOR_WATCH_WINDOW_DAYS * day),
					CREATOR_WATCH_MIN_POSTS,
					CREATOR_WATCH_MIN_SHARE,
					new Date(now.getTime() - CREATOR_WATCH_QUIET_DAYS * day),
					city.id,
					CREATOR_WATCH_MAX,
				],
			);
		if (!rows.length) return [];
		const rank = new Map(rows.map((r, i) => [r.creator_id, { ...r, rank: i + 1 }]));
		const accounts = await this.em.find(
			SocialAccount,
			{
				creator: { $in: [...rank.keys()] },
				platform: { $in: PROFILE_PLATFORMS },
				brand: null,
				handleLostAt: null,
			},
			{ fields: ['id', 'platform', 'handle', 'creator'] },
		);
		return _.sortBy(
			accounts.map(a => {
				const r = rank.get(a.creator.id)!;
				return {
					accountId: a.id,
					platform: a.platform as ProfilePlatform,
					handle: a.handle,
					rank: r.rank,
					posts: r.posts,
					readPosts: r.read_posts,
					lastPostAt: new Date(r.last_post).toISOString(),
				};
			}),
			c => c.rank,
		);
	}

	/**
	 * What a day's creator scrape takes in the city (`CreatorWatchWorkflow`): the creators it
	 * follows and the self-kept list (`CREATOR_WATCH_KINDS`); Instagram's profiles whose last profile
	 * read is `CREATOR_INSTAGRAM_EVERY_DAYS` old (a source's handle never seen posting is due), planned
	 * first on at most half the budget, and TikTok on the rest as its cap.
	 */
	async planCreatorScrape(
		city: City,
		brands: WatchBrand[],
		opts: { month: string; top: number; now: Date; budgetUsd: number },
	): Promise<CreatorScrapePlan> {
		const watched = await this.watchList(city, brands, opts);
		const targets = this.targets(watched, CREATOR_WATCH_KINDS);
		const tiktok = targets.filter(t => t.platform === SocialPlatformEnum.TIKTOK);
		const instagram = targets.filter(t => t.platform === SocialPlatformEnum.INSTAGRAM);
		const readLately = await this.profilesReadSince(
			SocialPlatformEnum.INSTAGRAM,
			new Date(opts.now.getTime() - CREATOR_INSTAGRAM_EVERY_DAYS * 86_400_000 + 3_600_000),
		);
		const instagramDue = instagram.filter(t => !readLately.has(t.handle));
		const instagramBudgetUsd = Math.min(
			opts.budgetUsd / 2,
			instagramDue.length * CREATOR_INSTAGRAM_PROFILE_USD,
		);
		return {
			watched: this.summary(watched, CREATOR_WATCH_KINDS),
			tiktok: tiktok.map(t => t.handle),
			instagram: instagramDue
				.slice(0, Math.floor(instagramBudgetUsd / CREATOR_INSTAGRAM_PROFILE_USD + 1e-9))
				.map(t => t.handle),
			instagramDue: instagramDue.length,
			instagramBudgetUsd,
			tiktokBudgetUsd: Math.max(opts.budgetUsd - instagramBudgetUsd, 0.5),
		};
	}

	/** The handles on a platform whose profile was read (a `profile` snapshot) since `since` */
	private async profilesReadSince(platform: ProfilePlatform, since: Date): Promise<Set<string>> {
		const rows = await this.em.getConnection().execute<{ handle: string }[]>(
			`select distinct a.handle from social_accounts a
			join social_account_snapshots s on s.account_id = a.id
			where a.platform = ? and s.source = ? and s.scraped_at >= ?`,
			[platform, AccountSnapshotSourceEnum.PROFILE, since],
		);
		return new Set(rows.map(r => r.handle));
	}

	/**
	 * Why each of a creator's profiles is watched (the creator page's "Watched" panel): their
	 * Instagram and TikTok accounts with `forAccounts`' reasons. 404 for an unknown creator.
	 */
	async forCreator(
		creatorId: string,
		month: string,
		topBrandsOf: (city: City) => Promise<WatchBrand[]>,
	): Promise<
		{
			accountId: string;
			platform: SocialPlatformEnum;
			handle: string;
			reasons: WatchReason[];
		}[]
	> {
		if (!(await this.em.count(Creator, { id: creatorId }))) throw new NotFoundException();
		const accounts = await this.em.find(
			SocialAccount,
			{ creator: creatorId, platform: { $in: PROFILE_PLATFORMS } },
			{ orderBy: { platform: 'asc', handle: 'asc' } },
		);
		const reasons = await this.forAccounts(accounts, month, topBrandsOf);
		return accounts.map(a => ({
			accountId: a.id,
			platform: a.platform,
			handle: a.handle,
			reasons: reasons.get(a.id) ?? [],
		}));
	}

	/**
	 * One creator's profiles for a scrape an admin asked for ("Scrape now" on the creator page):
	 * every TikTok and Instagram account of theirs that still has its handle, and the city a new
	 * post joins (the city whose scrape found their first account). None without a profile.
	 */
	async creatorTargets(
		creatorId: string,
	): Promise<{ cityId: string; targets: AccountToScrape[] } | null> {
		if (!(await this.em.count(Creator, { id: creatorId }))) throw new NotFoundException();
		const accounts = await this.em.find(
			SocialAccount,
			{ creator: creatorId, platform: { $in: PROFILE_PLATFORMS }, handleLostAt: null },
			{ orderBy: { createdAt: 'asc' } },
		);
		if (!accounts.length) return null;
		return {
			cityId: accounts[0].city.id,
			targets: accounts.map(a => ({ platform: a.platform as ProfilePlatform, handle: a.handle })),
		};
	}

	/** The profiles a run scrapes: the watched accounts with an active reason of these kinds (any without). */
	targets(watched: WatchedAccount[], kinds?: WatchReasonKindEnum[]): AccountToScrape[] {
		return watched
			.filter(w => w.reasons.some(r => r.active && (!kinds || kinds.includes(r.kind))))
			.map(w => ({ platform: w.platform, handle: w.handle }));
	}

	/** How many accounts each kind of reason brought in (a step's result), for these kinds (all without). */
	summary(
		watched: WatchedAccount[],
		kinds = Object.values(WatchReasonKindEnum),
	): Partial<Record<WatchReasonKindEnum, number>> {
		const active = watched.filter(w => w.reasons.some(r => r.active));
		return Object.fromEntries(
			kinds.map(kind => [
				kind,
				active.filter(w => w.reasons.some(r => r.active && r.kind === kind)).length,
			]),
		);
	}

	/**
	 * Why each of these accounts is watched, over every city the crons run for (`topBrandsOf`
	 * gives a city's report brands of `month`), plus the account sources naming them in other
	 * cities (listed inactive: those cities' crons are off). Keyed by account id.
	 */
	async forAccounts(
		accounts: { id: string; platform: SocialPlatformEnum; handle: string }[],
		month: string,
		topBrandsOf: (city: City) => Promise<WatchBrand[]>,
	): Promise<Map<string, WatchReason[]>> {
		const profiles = accounts.filter(a => PROFILE_PLATFORMS.includes(a.platform));
		const out = new Map<string, WatchReason[]>(accounts.map(a => [a.id, []]));
		if (!profiles.length) return out;
		const byKey = new Map(profiles.map(a => [`${a.platform}:${a.handle}`, a.id]));
		const cron = await this.cityService.forMonthlyCron();
		for (const city of cron) {
			const watched = await this.watchList(city, await topBrandsOf(city), {
				month,
				top: city.topBrands,
			});
			for (const w of watched) {
				const id = byKey.get(`${w.platform}:${w.handle}`);
				if (id) out.get(id)!.push(...w.reasons);
			}
		}
		const cronIds = new Set(cron.map(c => c.id));
		const elsewhere = await this.cityService.accountSources({
			handles: profiles.map(a => ({
				kind: accountSourceKind(a.platform)!,
				handle: a.handle,
			})),
		});
		for (const source of elsewhere) {
			if (cronIds.has(source.city.id)) continue;
			const id = byKey.get(`${sourcePlatform(source.kind)}:${source.value}`);
			if (id)
				out.get(id)!.push({
					kind: WatchReasonKindEnum.CITY_SOURCE,
					city: { id: source.city.id, name: source.city.name },
					active: false,
					sourceId: source.id,
					enabled: source.enabled,
				});
		}
		for (const [id, reasons] of out)
			out.set(
				id,
				_.sortBy(reasons, r => (r.active ? 0 : 1)),
			);
		return out;
	}
}
