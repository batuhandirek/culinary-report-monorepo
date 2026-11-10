/** One aspect as the counts read it: its id and its parent's */
export interface AspectNode {
	id: string;
	parentId: string | null;
}

/** Claims filed at one aspect itself in one month */
export interface AspectMonthRow {
	topicId: string;
	month: string;
	claims: number;
}

export interface AspectCounts {
	/** All time, its descendants' claims included */
	claims: number;
	/** Per month of the window, its descendants' included */
	byMonth: number[];
	/** All time, filed at it with nothing finer */
	atItself: number;
	/** Per month of the window, filed at it with nothing finer */
	atItselfByMonth: number[];
}

/**
 * Each aspect's claim counts from the claims filed at each one (`rows`, every month): a claim has
 * one aspect part at most, so a parent's count is its own plus every descendant's, and nothing is
 * counted twice. `months` is the window `byMonth` follows, oldest first.
 */
export const foldAspectCounts = (
	aspects: AspectNode[],
	rows: AspectMonthRow[],
	months: string[],
): Map<string, AspectCounts> => {
	const out = new Map<string, AspectCounts>(
		aspects.map(a => [
			a.id,
			{
				claims: 0,
				byMonth: months.map(() => 0),
				atItself: 0,
				atItselfByMonth: months.map(() => 0),
			},
		]),
	);
	const parentOf = new Map(aspects.map(a => [a.id, a.parentId]));
	const slot = new Map(months.map((m, i) => [m, i]));
	for (const row of rows) {
		const own = out.get(row.topicId);
		if (!own) continue;
		const i = slot.get(row.month);
		own.atItself += row.claims;
		if (i !== undefined) own.atItselfByMonth[i] += row.claims;
		// Walk up; a cycle can't be stored (`TopicService` refuses one), the guard is cheap anyway
		const seen = new Set<string>();
		for (let id: string | null | undefined = row.topicId; id && !seen.has(id); id = parentOf.get(id)) {
			seen.add(id);
			const counts = out.get(id);
			if (!counts) break;
			counts.claims += row.claims;
			if (i !== undefined) counts.byMonth[i] += row.claims;
		}
	}
	return out;
};
