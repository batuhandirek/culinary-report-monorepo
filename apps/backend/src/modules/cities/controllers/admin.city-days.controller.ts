import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminAddCityEventInputDto,
	AdminCityContextQueryDto,
	AdminCityDaysQueryDto,
	AdminFillCityDaysInputDto,
	AdminUpdateCityEventInputDto,
} from '../dto/admin-city-day.input.dto.js';
import {
	AdminCityDayOutputDto,
	AdminCityEventOutputDto,
	AdminFillCityDaysOutputDto,
	AdminListCityDaysOutputDto,
	AdminListCityEventsOutputDto,
	CityMonthContextOutputDto,
} from '../dto/admin-city-day.output.dto.js';
import { CityEvent } from '../entities/city-event.entity.js';
import { CityDayService } from '../services/city-day.service.js';

const eventDto = (event: CityEvent) =>
	wrap(event).serialize({
		skipNull: true,
		forceObject: true,
		exclude: ['city'],
	}) as unknown as AdminCityEventOutputDto;

/** A city's day context: weather and holidays by day, the admin's events, the month summary. */
@Controller('/admin/cities')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminCityDaysController {
	constructor(private readonly cityDayService: CityDayService) {}

	@TypedRoute.Get('/:id/days')
	async listCityDays(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminCityDaysQueryDto,
	): Promise<AdminListCityDaysOutputDto> {
		const days = await this.cityDayService.days(id, query.from, query.to);
		return {
			items: days.map(
				day =>
					wrap(day).serialize({
						skipNull: true,
						forceObject: true,
						exclude: ['city', 'id', 'createdAt'],
					}) as unknown as AdminCityDayOutputDto,
			),
		};
	}

	/** Fetches weather and public holidays for the dates (free sources), overwriting the days. */
	@TypedRoute.Post('/:id/days/fill')
	async fillCityDays(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminFillCityDaysInputDto,
	): Promise<AdminFillCityDaysOutputDto> {
		return { written: await this.cityDayService.fill(id, body.from, body.to) };
	}

	@TypedRoute.Get('/:id/context')
	async getCityMonthContext(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminCityContextQueryDto,
	): Promise<CityMonthContextOutputDto> {
		return this.cityDayService.month(id, query.month);
	}

	@TypedRoute.Get('/:id/events')
	async listCityEvents(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminListCityEventsOutputDto> {
		return { items: (await this.cityDayService.events(id)).map(eventDto) };
	}

	@TypedRoute.Post('/:id/events')
	async addCityEvent(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminAddCityEventInputDto,
	): Promise<AdminCityEventOutputDto> {
		return eventDto(await this.cityDayService.addEvent(id, body));
	}

	@TypedRoute.Patch('/:id/events/:eventId')
	async updateCityEvent(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('eventId') eventId: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateCityEventInputDto,
	): Promise<AdminCityEventOutputDto> {
		return eventDto(await this.cityDayService.updateEvent(id, eventId, body));
	}

	@TypedRoute.Delete('/:id/events/:eventId')
	async removeCityEvent(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('eventId') eventId: string & tags.Format<'uuid'>,
	): Promise<void> {
		await this.cityDayService.removeEvent(id, eventId);
	}
}
