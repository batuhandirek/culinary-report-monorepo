import type { CityService } from 'src/modules/cities/services/city.service.js';
import type { DurableQueue } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';
import type { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

/** A city the crons run for, as a step stores it */
export interface CronCity {
	id: string;
	slug: string;
}

/** The cities the crons run for (`CityService.forMonthlyCron`), as a step, so a replay sees the same list */
export const cronCities = (
	durable: Pick<DurableWorkflowsService, 'step'>,
	cityService: Pick<CityService, 'forMonthlyCron'>,
): Promise<CronCity[]> =>
	durable.step('cron cities', async () =>
		(await cityService.forMonthlyCron()).map(city => ({ id: city.id, slug: city.slug })),
	);

/**
 * A schedule's body: one run of `workflow` per cron city on `queue`, one waiting or running per
 * city (a second start hands back the one in flight), tagged with the city and `purpose` so
 * `/admin/workflows` finds them. Returns the cities.
 */
export const startPerCronCity = async <Args extends unknown[], R>(
	durable: Pick<DurableWorkflowsService, 'step' | 'start'>,
	cityService: Pick<CityService, 'forMonthlyCron'>,
	workflow: (...args: Args) => Promise<R>,
	argsOf: (city: CronCity) => [...Args],
	options: { queue: DurableQueue; purpose: string },
): Promise<CronCity[]> => {
	const cities = await cronCities(durable, cityService);
	for (const city of cities)
		await durable.start(workflow, argsOf(city), {
			queue: options.queue,
			dedupe: city.id,
			onDuplicate: 'return-existing',
			attributes: { cityId: city.id, purpose: options.purpose },
		});
	return cities;
};
