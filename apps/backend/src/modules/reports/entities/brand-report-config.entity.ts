import type { Rel } from '@mikro-orm/core';
import { Embedded, Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { ReportConfigStatusEnum } from '../constants/report-section.constant.js';

import { type AnyReportSection, REPORT_SECTION_TYPES } from './report-section.embeddable.js';
import { ReportTemplate } from './report-template.entity.js';

/**
 * One report a brand gets every month: a name an admin gives it and its own copy of the
 * sections, made from a template (or from scratch: custom) and edited for this brand alone.
 * Each active one is built into a report of its own. `ReportConfigService` is the one writer.
 */
@Entity({ tableName: 'brand_report_configs' })
@Unique({ properties: ['brand', 'name'] })
export class BrandReportConfig extends MikroOrmEntityAbstractClass<'status' | 'template'> {
	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade', index: true })
	brand: Rel<Brand>;

	@Property({ type: 'text' })
	name: string;

	// The template it was copied from; null for a custom one, or once that template is deleted
	// Loaded by its own query: a join hydrates the polymorphic `sections` as null, and the next flush writes that
	@ManyToOne({
		entity: () => ReportTemplate,
		nullable: true,
		deleteRule: 'set null',
		strategy: 'select-in',
	})
	template?: Rel<ReportTemplate> | null;

	@Enum({
		items: () => ReportConfigStatusEnum,
		nativeEnumName: 'report_config_status',
		default: ReportConfigStatusEnum.ACTIVE,
	})
	status: ReportConfigStatusEnum = ReportConfigStatusEnum.ACTIVE;

	// Its own: editing the template later never moves them
	@Embedded(REPORT_SECTION_TYPES, { array: true })
	sections: AnyReportSection[] = [];
}
