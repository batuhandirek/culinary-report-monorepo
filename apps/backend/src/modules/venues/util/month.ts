/** `2026-09` → the first moment of September and of October, UTC. */
export const monthRange = (month: string): { start: Date; end: Date } => {
	const start = new Date(`${month}-01T00:00:00Z`);
	const end = new Date(start);
	end.setUTCMonth(end.getUTCMonth() + 1);
	return { start, end };
};

/** The calendar month before `date`, as `YYYY-MM`. */
export const previousMonth = (date = new Date()): string => {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
	return d.toISOString().slice(0, 7);
};
