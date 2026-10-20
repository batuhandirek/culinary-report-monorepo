import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';

import { ProspectStageEnum } from '../constants/outreach.constant.js';
import { Prospect } from '../entities/prospect.entity.js';

import { dueBefore } from './outreach.service.js';

/**
 * Read-only questions other modules ask the sales pipeline. Kept apart from `OutreachService` so
 * the pipeline module can import outreach without pulling its mutations along.
 */
@Injectable()
export class ProspectQueryService {
	constructor(
		private readonly em: EntityManager,
		private readonly brandLeadScoreService: BrandLeadScoreService,
	) {}

	/** Brands of `WON` prospects: subscribers, who get their report every month whatever their rank. */
	async wonBrandIds(): Promise<string[]> {
		const won = await this.em.find(Prospect, { stage: ProspectStageEnum.WON }, { fields: ['brand'] });
		return won.map(prospect => prospect.brand.id);
	}

	/** The Instagram handles outreach knows for these brands: their own accounts. */
	async instagramHandles(brandIds: string[]): Promise<{ brandId: string; instagram: string }[]> {
		if (!brandIds.length) return [];
		const prospects = await this.em.find(
			Prospect,
			{ brand: { $in: brandIds }, instagram: { $ne: null } },
			{ fields: ['brand', 'instagram'] },
		);
		return prospects.map(p => ({ brandId: p.brand.id, instagram: p.instagram! }));
	}

	/** The highest lead scores among brands with an open branch that are not prospects yet. */
	async suggested(size: number): Promise<Brand[]> {
		const prospects: { brand_id: string }[] = await this.em
			.getConnection()
			.execute('select brand_id from prospects');
		return this.brandLeadScoreService.ranked({
			limit: size,
			excludeIds: prospects.map(row => row.brand_id),
		});
	}

	/** Prospects whose follow-up is due by the end of today, the most overdue first. */
	async due(limit: number, now = new Date()): Promise<Prospect[]> {
		return this.em.find(
			Prospect,
			{ nextFollowUpAt: { $lt: dueBefore(now) } },
			{
				populate: ['brand', 'brand.branches'],
				orderBy: { nextFollowUpAt: QueryOrder.ASC, createdAt: QueryOrder.ASC },
				limit,
			},
		);
	}
}
