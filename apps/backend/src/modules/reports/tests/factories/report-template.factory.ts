import type { EntityManager } from '@mikro-orm/core';

import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';

import { ReportTemplate } from '../../entities/report-template.entity.js';
import { FULL_REPORT_SECTIONS } from '../../util/report-sections.js';

export interface ReportTemplateTransientParams {
	em?: EntityManager;
}

let sequence = 0;

/** A report template, the full layout unless `sections` are given; not the default unless asked. */
export const reportTemplateFactory = Factory.define<
	ReportTemplate,
	ReportTemplateTransientParams,
	ReportTemplate
>(({ params, transientParams, onCreate }) => {
	const em = transientParams.em ?? getEntityManager();
	onCreate(async template => {
		await em.flush();
		return template;
	});
	sequence++;
	return em.create(ReportTemplate, {
		name: `Template ${sequence}`,
		sections: FULL_REPORT_SECTIONS(),
		...params,
	} as ReportTemplate);
});
