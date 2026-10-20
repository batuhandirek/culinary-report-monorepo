import type { AdminCityListItemOutputDto } from 'client';

import type { SelectFilter } from '#ui/components/paginated-data-table/types.js';

// City filters and selects of the admin lists, over `adminCitiesStore.list`.

/** The "City" filter of an admin list (query key `cityId`). */
export const cityFilter = (list: AdminCityListItemOutputDto[]): SelectFilter => ({
	key: 'cityId',
	name: 'City',
	type: 'select',
	options: list.map((city) => ({ name: city.name, value: city.id }))
});

/** The cities as `Select` items. */
export const cityItems = (list: AdminCityListItemOutputDto[]) =>
	list.map((city) => ({ value: city.id, label: city.name }));

/** Every district of these cities, by name, once each: the "District" filter's options. */
export const districtOptions = (list: AdminCityListItemOutputDto[]) =>
	[...new Set(list.flatMap((city) => city.districts.map((d) => d.name)))]
		.sort((a, b) => a.localeCompare(b))
		.map((district) => ({ name: district, value: district }));
