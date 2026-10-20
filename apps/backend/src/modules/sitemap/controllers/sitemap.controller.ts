import { Controller } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import {
	SitemapEntriesOutputDto,
	SitemapPaginationInputDto,
	SitemapSectionsOutputDto,
} from '../dto/sitemap.output.dto.js';
import { SitemapService } from '../services/sitemap.service.js';

@Controller('sitemap')
export class SitemapController {
	constructor(private readonly sitemapService: SitemapService) {}

	@TypedRoute.Get('/sections')
	async getSections(): Promise<SitemapSectionsOutputDto> {
		return this.sitemapService.getSections();
	}

	@TypedRoute.Get('/sections/:name')
	async getEntries(
		@TypedParam('name') name: string,
		@TypedQuery() query: SitemapPaginationInputDto,
	): Promise<SitemapEntriesOutputDto> {
		return this.sitemapService.getEntries(name, query.page, query.size);
	}
}
