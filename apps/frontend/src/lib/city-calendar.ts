// The city's month in one line (`ReportData.context`, the portal series' `calendar`): why a
// month may be quiet or loud.

/** What the line reads: `CityMonthContextOutputDto` and `MonthContext` both fit. */
export interface CalendarMonth {
	month: string;
	weekends: number;
	rainyWeekends?: number;
	holidays: { date: string; name: string }[];
	events: { name: string; kind: string; startDate: string; endDate: string }[];
}

const shortDay = (date: string) =>
	new Date(`${date}T00:00:00Z`).toLocaleDateString('en', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});

/** "Rain on 3 of 4 weekends · Labour Day (1 May) · Berlin Marathon (26 Sep–27 Sep)"; empty when nothing. */
export const calendarLine = (c: CalendarMonth | undefined | null): string => {
	if (!c) return '';
	const parts: string[] = [];
	if (c.rainyWeekends !== undefined) parts.push(`Rain on ${c.rainyWeekends} of ${c.weekends} weekends`);
	for (const h of c.holidays) parts.push(`${h.name} (${shortDay(h.date)})`);
	for (const e of c.events)
		parts.push(
			`${e.name} (${shortDay(e.startDate)}${e.endDate !== e.startDate ? `–${shortDay(e.endDate)}` : ''})`
		);
	return parts.join(' · ');
};
