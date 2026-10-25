import { QueryOrder, UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import type { AnyReportSection } from '../entities/report-section.embeddable.js';
import { ReportTemplate } from '../entities/report-template.entity.js';
import type { ReportSectionDto } from '../interfaces/report-section.interface.js';
import { FULL_REPORT_SECTIONS, toSections } from '../util/report-sections.js';

export interface ReportTemplateInput {
	name?: string;
	description?: string | null;
	sections?: ReportSectionDto[];
}

/** The name of the report a brand gets when there is no template at all. */
export const FULL_REPORT_NAME = 'Full report';

/**
 * Ready-made report layouts: the one writer of `ReportTemplate`. Brands copy them into their own
 * configurations (`ReportConfigService`); a brand without an active configuration gets the
 * default template's report.
 */
@Injectable()
export class ReportTemplateService {
	constructor(private readonly em: EntityManager) {}

	/** Every template, the default first, then by name, with how many brands have a configuration copied from it. */
	async list(): Promise<{ template: ReportTemplate; brands: number }[]> {
		const templates = await this.em.find(
			ReportTemplate,
			{},
			{ orderBy: { isDefault: QueryOrder.DESC, name: QueryOrder.ASC } },
		);
		const counts = await this.brandCounts();
		return templates.map(template => ({ template, brands: counts.get(template.id) ?? 0 }));
	}

	async get(id: string): Promise<ReportTemplate> {
		const template = await this.em.findOne(ReportTemplate, { id });
		if (!template) throw new NotFoundException('No such report template');
		return template;
	}

	async brandCount(id: string): Promise<number> {
		return (await this.brandCounts()).get(id) ?? 0;
	}

	/** A new template; without sections it starts from the full layout. The first one becomes the default. */
	async create(input: ReportTemplateInput & { name: string }): Promise<ReportTemplate> {
		const template = this.em.create(ReportTemplate, {
			name: this.name(input.name),
			description: input.description?.trim() || null,
			sections: input.sections ? toSections(input.sections) : FULL_REPORT_SECTIONS(),
			isDefault: !(await this.em.count(ReportTemplate, {})),
		});
		await this.flushNamed();
		return template;
	}

	/** Renames it, rewrites its description or replaces its sections; configurations copied from it keep theirs. */
	async update(id: string, input: ReportTemplateInput): Promise<ReportTemplate> {
		const template = await this.get(id);
		if (input.name !== undefined) template.name = this.name(input.name);
		if (input.description !== undefined)
			template.description = input.description?.trim() || null;
		if (input.sections) template.sections = toSections(input.sections);
		await this.flushNamed();
		return template;
	}

	/** The template brands without an active configuration get from now on. */
	async setDefault(id: string): Promise<ReportTemplate> {
		const template = await this.get(id);
		await this.em.nativeUpdate(
			ReportTemplate,
			{ isDefault: true, id: { $ne: id } },
			{ isDefault: false },
		);
		template.isDefault = true;
		await this.em.flush();
		return template;
	}

	/**
	 * Deletes a template that is not the default. Configurations copied from it keep their
	 * sections, and they and its reports lose the link (null), never a cascade.
	 */
	async remove(id: string): Promise<void> {
		const template = await this.get(id);
		if (template.isDefault)
			throw new BadRequestException('Make another template the default first');
		await this.em.remove(template).flush();
	}

	/** The default template, or none (then a brand gets the full layout). */
	async defaultTemplate(): Promise<ReportTemplate | null> {
		return this.em.findOne(ReportTemplate, { isDefault: true });
	}

	/** What a brand without an active configuration is built as. */
	async fallback(): Promise<{
		template: ReportTemplate | null;
		name: string;
		sections: AnyReportSection[];
	}> {
		const template = await this.defaultTemplate();
		return template ?
				{ template, name: template.name, sections: template.sections }
			:	{ template: null, name: FULL_REPORT_NAME, sections: FULL_REPORT_SECTIONS() };
	}

	private name(name: string): string {
		const trimmed = name.trim();
		if (!trimmed) throw new BadRequestException('A report template needs a name');
		return trimmed;
	}

	private async flushNamed(): Promise<void> {
		try {
			await this.em.flush();
		} catch (e) {
			if (e instanceof UniqueConstraintViolationException)
				throw new ConflictException('A report template of that name exists');
			throw e;
		}
	}

	private async brandCounts(): Promise<Map<string, number>> {
		const rows: { template_id: string; n: string }[] = await this.em
			.getConnection()
			.execute(
				`select template_id, count(distinct brand_id) as n from brand_report_configs where template_id is not null group by template_id`,
			);
		return new Map(rows.map(r => [r.template_id, Number(r.n)]));
	}
}
