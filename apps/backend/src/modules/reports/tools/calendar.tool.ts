import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { addDays } from 'src/modules/venues/util/week.js';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const RAIN_MM = 1;

/** The month's weather and calendar in the city, or one week's. */
export const calendarTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'calendar',
		description:
			"The month in the city: weekends with rain, rain days, the mean daily high, public holidays, school holidays and events; with a week (its Monday) " +
			'that week\'s rain days, holidays and events. Context only: the calendar never explains a move on its own.',
		inputSchema: z.object({
			week: z.string().nullable().default(null).describe("A week's Monday, YYYY-MM-DD, for that week alone"),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('calendar', input, () => {
				const context = ctx.data.context;
				if (!context && !ctx.days.length) return { error: 'No calendar stored for this city and month' };
				const week = input.week ? { from: input.week, to: addDays(input.week, 7) } : undefined;
				const days = week ? ctx.days.filter(d => d.date >= week.from && d.date < week.to) : ctx.days;
				const weather = days.some(d => d.rainMm != null);
				return {
					month: context && {
						weekends: context.weekends,
						rainyWeekends: context.rainyWeekends,
						rainDays: context.rainDays,
						meanDailyHighCelsius: context.avgTMax,
						publicHolidays: context.holidays,
						events: context.events.map(e => ({ name: e.name, kind: e.kind, from: e.startDate, to: e.endDate })),
					},
					week: week && {
						from: week.from,
						to: addDays(week.to, -1),
						daysStored: days.length,
						rainDays: weather ? days.filter(d => (d.rainMm ?? 0) >= RAIN_MM).map(d => d.date) : 'no weather stored',
						publicHolidays: days.filter(d => d.holiday).map(d => ({ date: d.date, name: d.holiday })),
						events: (context?.events ?? []).filter(e => e.startDate < week.to && e.endDate >= week.from).map(e => e.name),
					},
				};
			}),
	});
