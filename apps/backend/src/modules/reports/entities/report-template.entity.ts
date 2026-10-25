import { Embedded, Entity, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { type AnyReportSection, REPORT_SECTION_TYPES } from './report-section.embeddable.js';

/**
 * A ready-made report layout: sections in order, each with its settings. A brand's
 * configuration (`BrandReportConfig`) starts as a copy of one and is edited on its own; a brand
 * without an active configuration gets the default template's report. `ReportTemplateService`
 * is the one writer.
 */
@Entity({ tableName: 'report_templates' })
export class ReportTemplate extends MikroOrmEntityAbstractClass<'description' | 'isDefault'> {
	@Property({ type: 'text', unique: true })
	name: string;

	// What it is for, on the admin's list
	@Property({ type: 'text', nullable: true })
	description?: string | null;

	// What brands without an active configuration get; one at most
	@Property({ type: 'boolean', default: false })
	isDefault: boolean = false;

	@Embedded(REPORT_SECTION_TYPES, { array: true })
	sections: AnyReportSection[] = [];
}
