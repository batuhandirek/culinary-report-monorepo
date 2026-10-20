import type { AdminCityListItemOutputDto } from 'client';

import { api } from '#lib/api.js';

/**
 * The cities the pipeline covers, fetched once per admin session for the city filters and
 * selects. `/admin/cities` refreshes it after a change.
 */
class AdminCitiesStore {
	list = $state<AdminCityListItemOutputDto[]>([]);
	private pending: Promise<void> | null = null;

	/** Loads them unless already loaded (or loading). */
	load = (): Promise<void> => {
		this.pending ??= api.admin
			.listCities()
			.then((res) => {
				this.list = res.items;
			})
			.catch((e) => {
				this.pending = null;
				throw e;
			});
		return this.pending;
	};

	/** Fetches them again, e.g. after a city was added or renamed. */
	refresh = (): Promise<void> => {
		this.pending = null;
		return this.load();
	};
}

export const adminCitiesStore = new AdminCitiesStore();
