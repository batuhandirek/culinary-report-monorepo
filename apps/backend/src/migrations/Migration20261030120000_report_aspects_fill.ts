import { Migration } from '@mikro-orm/migrations';

/**
 * Written by hand (the program `statements-and-concepts`, phase `topics-tree`): reports built before
 * `ReportData.aspects` existed get the aspect vocabulary they were built against — the same keys and
 * labels that lived in code until `Migration20261030110000_aspect_topics` made them rows — so the
 * report view keeps grouping their theme counts under the roots without a rebuild (the view has no
 * admin API and reads labels from the data). A report built after this carries its own list.
 */
export class Migration20261030120000_report_aspects_fill extends Migration {
	override up(): void {
		this.addSql(`update "reports" r set "data" = jsonb_set(r."data", '{aspects}', (
			select coalesce(jsonb_agg(jsonb_build_object('key', t."key", 'label', t."label", 'root', coalesce(p."key", t."key")) order by coalesce(p."key", t."key"), (p."key" is not null), t."label"), '[]'::jsonb)
			from "topics" t left join "topics" p on p."id" = t."parent_id"
			where t."kind" = 'aspect' and t."deleted_at" is null
		)) where r."data" is not null and not (r."data" ? 'aspects');`);
	}

	override down(): void {
		this.addSql(`update "reports" set "data" = "data" - 'aspects' where "data" ? 'aspects';`);
	}
}
