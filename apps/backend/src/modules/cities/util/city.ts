// Pure helpers over a `City` row, shared by every module that reads one.

import { DEFAULT_STEP_BUDGET_USD, PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';

import type { City } from '../entities/city.entity.js';

/** Its district names, in the row's order. */
export const districtNames = (city: Pick<City, 'districts'>): string[] =>
	city.districts.map(d => d.name);

/** Whether two districts share a border, read both ways. */
export const areNeighbourDistricts = (city: Pick<City, 'districts'>, a: string, b: string): boolean =>
	city.districts.some(
		d => (d.name === a && d.neighbours.includes(b)) || (d.name === b && d.neighbours.includes(a)),
	);

/** The names a mention may give the city: its name, then its aliases. */
export const cityNames = (city: Pick<City, 'name' | 'aliases'>): string[] => [city.name, ...city.aliases];

/** What a step may spend on Apify in this city: its own budget, else the default. */
export const stepBudgetUsd = (city: Pick<City, 'stepBudgetsUsd'>, step: PipelineStepEnum): number =>
	city.stepBudgetsUsd[step] ?? DEFAULT_STEP_BUDGET_USD[step] ?? 0;
