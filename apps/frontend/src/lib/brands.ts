import type { AdminBrandBranchOutputDto } from 'client';

// Chains on the admin pages: why a group was suggested, branches by city.

export const SUGGESTION_REASONS: Record<string, string> = {
	'same name': 'Same name',
	'name prefix': 'Name plus a branch',
	'same website': 'Same website',
	'same Instagram': 'Same Instagram',
	'same TikTok': 'Same TikTok'
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

/**
 * What a brand is, from its open branches' food topics: the topics most branches have as their
 * primary first, then those most branches carry (`limit` of them), primary marked on the first.
 * The brand list's rows get the same from the API (`AdminBrandRowOutputDto.topics`).
 */
export const brandTopicsOf = (
	branches: Pick<AdminBrandBranchOutputDto, 'topics'>[],
	limit = 4
): { key: string; label: string; kind: string; primary: boolean }[] => {
	const tally = new Map<string, { key: string; label: string; kind: string; primary: number; branches: number }>();
	for (const branch of branches)
		for (const t of branch.topics ?? []) {
			const row = tally.get(t.key) ?? { key: t.key, label: t.label, kind: t.kind, primary: 0, branches: 0 };
			row.branches++;
			if (t.primary) row.primary++;
			tally.set(t.key, row);
		}
	return [...tally.values()]
		.sort((a, b) => b.primary - a.primary || b.branches - a.branches || a.label.localeCompare(b.label))
		.slice(0, limit)
		.map((t, i) => ({ key: t.key, label: t.label, kind: t.kind, primary: i === 0 && t.primary > 0 }));
};
