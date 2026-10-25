import { QueryOrder, UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';

import { ReportConfigStatusEnum } from '../constants/report-section.constant.js';
import { BrandReportConfig } from '../entities/brand-report-config.entity.js';
import type { AnyReportSection } from '../entities/report-section.embeddable.js';
import type { ReportTemplate } from '../entities/report-template.entity.js';
import type { ReportSectionDto } from '../interfaces/report-section.interface.js';
import { FULL_REPORT_SECTIONS, sectionsOutput, toSections } from '../util/report-sections.js';

import { ReportTemplateService } from './report-template.service.js';

export interface ReportConfigInput {
	name?: string;
	sections?: ReportSectionDto[];
	status?: ReportConfigStatusEnum;
}

/** One report a build makes: a configuration of the brand, or the default when it has no active one. */
export interface ReportTarget {
	config: BrandReportConfig | null;
	template: ReportTemplate | null;
	name: string;
	sections: AnyReportSection[];
}

const CUSTOM_NAME = 'Custom report';

/**
 * A brand's report configurations: the one writer of `BrandReportConfig`. Each is a copy of a
 * template's sections (or the full layout, for a custom one) that an admin names and edits for
 * this brand alone; every active one is built into a report of its own each month.
 */
@Injectable()
export class ReportConfigService {
	constructor(
		private readonly em: EntityManager,
		private readonly reportTemplateService: ReportTemplateService,
	) {}

	/** A brand's configurations, oldest first (the order reports are built and listed in). */
	async list(brandId: string): Promise<BrandReportConfig[]> {
		return this.em.find(
			BrandReportConfig,
			{ brand: brandId },
			{ populate: ['template'], orderBy: { createdAt: QueryOrder.ASC } },
		);
	}

	async get(id: string): Promise<BrandReportConfig> {
		const config = await this.em.findOne(
			BrandReportConfig,
			{ id },
			{ populate: ['template', 'brand'] },
		);
		if (!config) throw new NotFoundException('No such report configuration');
		return config;
	}

	/**
	 * A new configuration for a brand: a copy of a template's sections, named after it unless a
	 * name is given, or (no template) a custom one starting from the full layout.
	 */
	async create(
		brandId: string,
		input: { templateId?: string | null; name?: string },
	): Promise<BrandReportConfig> {
		const brand = await this.em.findOne(Brand, { id: brandId });
		if (!brand) throw new NotFoundException('No such brand');
		const template =
			input.templateId ? await this.reportTemplateService.get(input.templateId) : null;
		const taken = new Set((await this.list(brandId)).map(c => c.name.toLowerCase()));
		let name = input.name?.trim() || template?.name || CUSTOM_NAME;
		// A second copy of one template gets a number rather than a conflict
		if (!input.name?.trim())
			for (let n = 2; taken.has(name.toLowerCase()); n++)
				name = `${template?.name ?? CUSTOM_NAME} ${n}`;
		const config = this.em.create(BrandReportConfig, {
			brand,
			name,
			template,
			// A copy: the template's own objects stay the template's
			sections:
				template ? toSections(sectionsOutput(template.sections)) : FULL_REPORT_SECTIONS(),
		});
		await this.flushNamed();
		return config;
	}

	/** Renames it, replaces its sections or switches it on or off; built reports keep theirs. */
	async update(id: string, input: ReportConfigInput): Promise<BrandReportConfig> {
		const config = await this.get(id);
		if (input.name !== undefined) {
			const name = input.name.trim();
			if (!name) throw new BadRequestException('A report configuration needs a name');
			config.name = name;
		}
		if (input.sections) config.sections = toSections(input.sections);
		if (input.status) config.status = input.status;
		await this.flushNamed();
		return config;
	}

	/** Deletes it; its reports stay, their configuration link null. */
	async remove(id: string): Promise<void> {
		await this.em.remove(await this.get(id)).flush();
	}

	/**
	 * The reports a build of the brand makes: one per active configuration, oldest first, or
	 * (none active) the default template's. `configId` narrows it to that configuration, active
	 * or not (a rebuild); 404 when it isn't the brand's.
	 */
	async targets(brandId: string, configId?: string): Promise<ReportTarget[]> {
		const configs = await this.list(brandId);
		if (configId) {
			const config = configs.find(c => c.id === configId);
			if (!config) throw new NotFoundException('Not a report configuration of the brand');
			return [this.target(config)];
		}
		const active = configs.filter(c => c.status === ReportConfigStatusEnum.ACTIVE);
		if (active.length) return active.map(c => this.target(c));
		return [{ config: null, ...(await this.reportTemplateService.fallback()) }];
	}

	private target(config: BrandReportConfig): ReportTarget {
		return {
			config,
			template: config.template ?? null,
			name: config.name,
			sections: config.sections,
		};
	}

	private async flushNamed(): Promise<void> {
		try {
			await this.em.flush();
		} catch (e) {
			if (e instanceof UniqueConstraintViolationException)
				throw new ConflictException('The brand has a report configuration of that name');
			throw e;
		}
	}
}
