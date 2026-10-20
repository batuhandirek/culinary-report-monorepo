import type { AdminBrandBranchOutputDto } from 'client';

// Chains on the admin pages: why a group was suggested, branches by city.

export const SUGGESTION_REASONS: Record<string, string> = {
	'same name': 'Same name',
	'name prefix': 'Name plus a branch',
	'same website': 'Same website'
};

/** Branches grouped by city, cities with the most branches first. */
export const branchesByCity = (
	branches: AdminBrandBranchOutputDto[]
): { cityId: string; cityName: string; branches: AdminBrandBranchOutputDto[] }[] => {
	const groups = new Map<
		string,
		{ cityId: string; cityName: string; branches: AdminBrandBranchOutputDto[] }
	>();
	for (const branch of branches) {
		const group = groups.get(branch.city.id) ?? {
			cityId: branch.city.id,
			cityName: branch.city.name,
			branches: []
		};
		group.branches.push(branch);
		groups.set(branch.city.id, group);
	}
	return [...groups.values()]
		.map((g) => ({
			...g,
			branches: [...g.branches].sort(
				(a, b) => (b.reviewsCount ?? -1) - (a.reviewsCount ?? -1)
			)
		}))
		.sort(
			(a, b) => b.branches.length - a.branches.length || a.cityName.localeCompare(b.cityName)
		);
};

/** "Burgermeister Kottbusser Tor · Friedrichshain-Kreuzberg · Oberbaumstraße 8" */
export const branchLine = (branch: AdminBrandBranchOutputDto): string =>
	[branch.district, branch.street].filter(Boolean).join(' · ');
