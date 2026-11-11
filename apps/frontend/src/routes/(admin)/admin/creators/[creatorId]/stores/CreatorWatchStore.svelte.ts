import {
	AdminAddCitySourceInputDtoKindEnum as SourceKind,
	type AdminCreatorWatchOutputDto,
	type AdminWatchReasonOutputDto,
	AdminWatchReasonOutputDtoKindEnum as Reason
} from 'client';

import { api } from '#lib/api.js';
import { createAction } from '#ui/lib/action.svelte.js';

type City = { id: string; name: string };

// Why a creator's profiles are scraped, or aren't, for the header's pill and its Watch / Stop
// watching keys. A city follows them (an account source on its Sources tab) or they are on a
// city's creator list (enough of their recent posts name a place there: they join and leave by
// themselves), both scraped daily; or the profile is a brand's own account, scraped weekly. The
// backend's watch list is the one the runs use, so this says what they do. Watching adds each
// profile to the city's sources (or turns its switched-off one on); stopping leaves each one a
// switched-off source, which also keeps them off the city's creator list.
export class CreatorWatchStore {
	watch = $state<AdminCreatorWatchOutputDto | null>(null);
	private creatorId = '';
	private creatorName = '';

	load = async (creatorId: string, creatorName: string) => {
		this.creatorId = creatorId;
		this.creatorName = creatorName;
		const watch = await api.admin.getCreatorWatch(creatorId, {});
		if (creatorId === this.creatorId) this.watch = watch;
	};

	private reload = () => this.load(this.creatorId, this.creatorName);

	reasons = $derived((this.watch?.accounts ?? []).flatMap((a) => a.reasons));
	active = $derived(this.reasons.filter((r) => r.active));

	/** The reason the pill names: the creator list first, then a city's source, then a brand's own account */
	lead = $derived(
		this.active.find((r) => r.kind === Reason.Creator) ??
			this.active.find((r) => r.kind === Reason.CitySource) ??
			this.active[0]
	);

	/** How often their profiles are read: daily for a city's, weekly for a brand's own account */
	cadence = $derived(
		this.active.some((r) => r.kind === Reason.Creator || r.kind === Reason.CitySource)
			? 'scraped daily'
			: this.active.length
				? 'scraped weekly'
				: 'not scraped'
	);

	/** The cities where they are watched daily, which "Stop watching" leaves */
	watchedIn = $derived(
		uniqueCities(
			this.active.filter((r) => r.kind === Reason.Creator || (r.kind === Reason.CitySource && r.enabled))
		)
	);

	/** A city kept them off its creator list (their profile a switched-off source there) */
	keptOff = $derived(
		uniqueCities(this.reasons.filter((r) => r.kind === Reason.CitySource && r.enabled === false))
	);

	watchAction = createAction(
		async (city: City) => {
			for (const account of this.watch?.accounts ?? []) {
				const existing = account.reasons.find((r) => r.kind === Reason.CitySource && r.city.id === city.id);
				if (existing?.sourceId) {
					if (!existing.enabled) await api.admin.updateCitySource(city.id, existing.sourceId, { enabled: true });
					continue;
				}
				await api.admin.addCitySource(city.id, {
					kind: account.platform === 'tiktok' ? SourceKind.TiktokAccount : SourceKind.InstagramAccount,
					value: account.handle,
					note: `Added from ${this.creatorName}'s page`
				});
			}
		},
		{
			onSuccess: () => this.reload(),
			successNotification: (_, [city]) => ({
				title: `${this.creatorName} is watched in ${city.name}`,
				text: 'Their profiles are scraped daily'
			})
		}
	);

	stopAction = createAction(
		async (cities: City[]) => {
			for (const city of cities) {
				for (const account of this.watch?.accounts ?? []) {
					const existing = account.reasons.find((r) => r.kind === Reason.CitySource && r.city.id === city.id);
					if (existing?.sourceId) {
						if (existing.enabled) await api.admin.updateCitySource(city.id, existing.sourceId, { enabled: false });
						continue;
					}
					await api.admin.addCitySource(city.id, {
						kind: account.platform === 'tiktok' ? SourceKind.TiktokAccount : SourceKind.InstagramAccount,
						value: account.handle,
						enabled: false,
						note: `Kept off the creator list from ${this.creatorName}'s page`
					});
				}
			}
		},
		{
			onSuccess: () => this.reload(),
			successNotification: (_, [cities]) => ({
				title: `${this.creatorName} is no longer watched in ${cities.map((c) => c.name).join(', ')}`,
				text: "Their profiles are switched-off sources there, which keep them off the creator list"
			})
		}
	);
}

const uniqueCities = (reasons: AdminWatchReasonOutputDto[]): City[] => [
	...new Map(reasons.map((r) => [r.city.id, r.city])).values()
];
