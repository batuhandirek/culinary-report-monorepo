import { CityEventKindEnum } from '../entities/city-event.entity.js';

export interface AdminCityDayOutputDto {
	date: string;
	tMax?: number;
	rainMm?: number;
	holiday?: string;
}

export interface AdminListCityDaysOutputDto {
	items: AdminCityDayOutputDto[];
}

export interface AdminFillCityDaysOutputDto {
	/** Days written or updated */
	written: number;
}

export interface AdminCityEventOutputDto {
	id: string;
	createdAt: Date;
	kind: CityEventKindEnum;
	name: string;
	startDate: string;
	endDate: string;
}

export interface AdminListCityEventsOutputDto {
	items: AdminCityEventOutputDto[];
}

/** A month's weather and calendar in the city (`MonthContext`). */
export interface CityMonthContextOutputDto {
	month: string;
	weekends: number;
	rainyWeekends?: number;
	rainDays?: number;
	avgTMax?: number;
	holidays: { date: string; name: string }[];
	events: { name: string; kind: CityEventKindEnum; startDate: string; endDate: string }[];
}
