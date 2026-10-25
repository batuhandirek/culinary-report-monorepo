import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { accountSourceKind, sourcePlatform } from 'src/modules/cities/util/city-source.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { AccountToScrape } from 'src/modules/social/services/account-scrape.service.js';
import type { ProfilePlatform } from 'src/modules/social/util/accounts.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';

import type { TopBrand } from './pipeline.service.js';

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
}

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
	/** A top brand's place in the month's list, and the list's length */
	rank?: number;
	top?: number;
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

const PROFILE_PLATFORMS = [SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK];

/**
 * Which TikTok and Instagram profiles a city's runs scrape, and why (`SCRAPE_ACCOUNTS` monthly,
 * `SCRAPE_ACCOUNTS_RECENT` weekly, and the creator page's "Watched" panel): the creators the city
 * follows (account sources), and the own accounts (`SocialAccount.brand`) of the month's report
 * brands — paying customers and the most talked-about — and of those brands' competitors. One
 * list, so what the page says is what the run does.
 */
@Injectable()
export class AccountWatchService {
	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly competitorService: CompetitorService,
	) {}

	/**
	 * Every account the city's runs have a reason for, each reason with whether it is active
	 * (switched-off sources and Instagram sources of a city with Instagram off are listed, not
	 * scraped). `brands` are the month's report brands (`PipelineService.topBrands`); a branch's
	 * own account counts only in the branch's city.
	 */
	async watchList(city: City, brands: TopBrand[], opts: { month: string; top: number }): Promise<WatchedAccount[]> {
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
		const known = sources.length ?
				await this.em.find(SocialAccount, {
					$or: sources.map(s => ({ platform: sourcePlatform(s.kind), handle: s.value })),
				})
			:	[];
		for (const source of sources) {
			const platform = sourcePlatform(source.kind) as ProfilePlatform;
			const account = known.find(a => a.platform === platform && a.handle === source.value);
			const instagramOff = platform === SocialPlatformEnum.INSTAGRAM && !city.instagramEnabled;
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
			if (top.rank) add(brand.id, { kind: WatchReasonKindEnum.TOP_BRAND, brand, rank: top.rank, top: opts.top, month: opts.month });
		}
		const rivalOf = new Map<string, Ref[]>();
		for (const top of brands)
			for (const competitor of await this.competitorService.inCity(top.brand.id, city.id)) {
				const rivalId = competitor.link.rival?.id ?? competitor.link.venue?.brand.id;
				if (!rivalId || rivalId === top.brand.id) continue;
				const list = rivalOf.get(rivalId) ?? [];
				if (!list.some(r => r.id === top.brand.id)) list.push({ id: top.brand.id, name: top.brand.name });
				rivalOf.set(rivalId, list);
			}
		if (rivalOf.size) {
			const rivals = await this.em.find(Brand, { id: { $in: [...rivalOf.keys()] } }, { fields: ['id', 'name'] });
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
				{ brand: { $in: [...reasonsByBrand.keys()] }, platform: { $in: PROFILE_PLATFORMS } },
				{ populate: ['branch'] },
			);
			for (const account of accounts) {
				// A branch's own account belongs to the branch's city
				if (account.branch && account.branch.city.id !== city.id) continue;
				const watched = entry(account.platform as ProfilePlatform, account.handle, account.id);
				for (const reason of reasonsByBrand.get(account.brand!.id) ?? [])
					watched.reasons.push({ ...reason, city: cityRef, active: true });
			}
		}
		return [...out.values()];
	}

	/** The profiles a run scrapes: the watched accounts with an active reason. */
	targets(watched: WatchedAccount[]): AccountToScrape[] {
		return watched.filter(w => w.reasons.some(r => r.active)).map(w => ({ platform: w.platform, handle: w.handle }));
	}

	/** How many accounts each kind of reason brought in (a step's result). */
	summary(watched: WatchedAccount[]): Record<WatchReasonKindEnum, number> {
		const active = watched.filter(w => w.reasons.some(r => r.active));
		return Object.fromEntries(
			Object.values(WatchReasonKindEnum).map(kind => [kind, active.filter(w => w.reasons.some(r => r.active && r.kind === kind)).length]),
		) as Record<WatchReasonKindEnum, number>;
	}

	/**
	 * Why each of these accounts is watched, over every city the crons run for (`topBrandsOf`
	 * gives a city's report brands of `month`), plus the account sources naming them in other
	 * cities (listed inactive: those cities' crons are off). Keyed by account id.
	 */
	async forAccounts(
		accounts: { id: string; platform: SocialPlatformEnum; handle: string }[],
		month: string,
		topBrandsOf: (city: City) => Promise<TopBrand[]>,
	): Promise<Map<string, WatchReason[]>> {
		const profiles = accounts.filter(a => PROFILE_PLATFORMS.includes(a.platform));
		const out = new Map<string, WatchReason[]>(accounts.map(a => [a.id, []]));
		if (!profiles.length) return out;
		const byKey = new Map(profiles.map(a => [`${a.platform}:${a.handle}`, a.id]));
		const cron = await this.cityService.forMonthlyCron();
		for (const city of cron) {
			const watched = await this.watchList(city, await topBrandsOf(city), { month, top: city.topBrands });
			for (const w of watched) {
				const id = byKey.get(`${w.platform}:${w.handle}`);
				if (id) out.get(id)!.push(...w.reasons);
			}
		}
		const cronIds = new Set(cron.map(c => c.id));
		const elsewhere = await this.cityService.accountSources({
			handles: profiles.map(a => ({ kind: accountSourceKind(a.platform)!, handle: a.handle })),
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
		for (const [id, reasons] of out) out.set(id, _.sortBy(reasons, r => (r.active ? 0 : 1)));
		return out;
	}
}
