import { Migration } from '@mikro-orm/migrations';

// Hand-written: the "Full report" template and the configurations copied from it gain the
// analysis section ("What moved, and why it might have") right after the cover, as
// `FULL_REPORT_SECTIONS` now has it. Stored reports keep the sections they were built with.

const SECTION = '{"kind":"analysis","limit":3}';

export class Migration20261025122419_add_analysis_section extends Migration {
	override up(): void | Promise<void> {
		this.addSql(
			`update report_templates set sections = jsonb_insert(sections, '{1}', '${SECTION}'::jsonb)
				where name = 'Full report' and not sections @> '[{"kind":"analysis"}]'::jsonb;`,
		);
		this.addSql(
			`update brand_report_configs c set sections = jsonb_insert(c.sections, '{1}', '${SECTION}'::jsonb)
				from report_templates t
				where c.template_id = t.id and t.name = 'Full report' and not c.sections @> '[{"kind":"analysis"}]'::jsonb;`,
		);
	}

	override down(): void | Promise<void> {
		this.addSql(
			`update report_templates set sections = (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(sections) s where s->>'kind' <> 'analysis')
				where sections @> '[{"kind":"analysis"}]'::jsonb;`,
		);
		this.addSql(
			`update brand_report_configs set sections = (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(sections) s where s->>'kind' <> 'analysis')
				where sections @> '[{"kind":"analysis"}]'::jsonb;`,
		);
	}
}
