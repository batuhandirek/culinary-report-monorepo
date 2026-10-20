import { localParts } from 'src/modules/venues/util/week.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';

// The demand samples run in each city's own evening: pg-boss fires the cron every hour (UTC) and
// a city is sampled in the hour its local clock reads 19:00 on a sampling day. Google's live
// percent is read then, near most venues' peak; twice a week is enough, since Google smooths
// its histogram over weeks.
export const DEMAND_SAMPLE_CRON = '0 * * * *';
export const DEMAND_SAMPLE_HOUR = 19;
// Thursday and Saturday (0 = Sunday)
export const BUSYNESS_SAMPLE_WEEKDAYS = [4, 6];
// Thursday only: the coming Friday and Saturday evenings are asked one and two days ahead
export const RESERVATION_SAMPLE_WEEKDAY = 4;

/** The steps due for a city at `now` in its time zone; empty outside its sampling hours. */
export const dueDemandSteps = (now: Date, timeZone: string): PipelineStepEnum[] => {
	const { weekday, hour } = localParts(now, timeZone);
	if (hour !== DEMAND_SAMPLE_HOUR) return [];
	const steps: PipelineStepEnum[] = [];
	if (BUSYNESS_SAMPLE_WEEKDAYS.includes(weekday)) steps.push(PipelineStepEnum.SAMPLE_BUSYNESS);
	if (weekday === RESERVATION_SAMPLE_WEEKDAY) steps.push(PipelineStepEnum.SAMPLE_RESERVATIONS);
	return steps;
};
