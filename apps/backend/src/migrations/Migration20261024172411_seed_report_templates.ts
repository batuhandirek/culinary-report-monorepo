import { Migration } from '@mikro-orm/migrations';

// Hand-written: the ready-made report templates, "Full report" the default with every section
// in the order reports had before templates, and the reports built before them marked as made
// from it. The JSON is each section's embeddable as MikroORM stores it (`kind` + its settings).

const s = (kind: string, settings: Record<string, unknown> = {}) => ({ kind, ...settings });
const ALL_KPIS = ['views', 'creators', 'interactions', 'stars', 'reviews', 'answered'];
const ALL_PARTS = ['busyness', 'prices', 'neighbourhood', 'search_ranks'];

const FULL = [
	s('cover', { kpis: ALL_KPIS }),
	s('stars'),
	s('branches'),
	s('competitors'),
	s('actions'),
	s('posts', { platforms: [], limit: 6 }),
	s('own_accounts'),
	s('comments'),
	s('press'),
	s('creators', { nearby: true }),
	s('reviews'),
	s('replies'),
	s('dishes', { limit: 12 }),
	s('places', { parts: ALL_PARTS }),
	s('patterns'),
	s('city'),
	s('appendix'),
];

const TEMPLATES = [
	{
		name: 'Full report',
		description: 'Everything we track: social media, reviews, competitors, each place and the city.',
		isDefault: true,
		sections: FULL,
	},
	{
		name: 'Social buzz',
		description: 'What people posted, who posted it and what came up: for brands that live on TikTok and Instagram.',
		isDefault: false,
		sections: [
			s('cover', { kpis: ['views', 'creators', 'interactions'] }),
			s('actions'),
			s('posts', { platforms: [], limit: 12 }),
			s('own_accounts'),
			s('comments'),
			s('press'),
			s('creators', { nearby: true }),
			s('dishes', { limit: 12 }),
			s('city'),
			s('appendix'),
		],
	},
	{
		name: 'Reviews and reputation',
		description: 'Google and TripAdvisor reviews: what decides the stars, what changed, and replies ready to post.',
		isDefault: false,
		sections: [
			s('cover', { kpis: ['stars', 'reviews', 'answered'] }),
			s('stars'),
			s('actions'),
			s('reviews'),
			s('replies'),
			s('dishes', { limit: 12 }),
			s('appendix'),
		],
	},
	{
		name: 'Competitor watch',
		description: 'The brand next to its competitors, and each place against its street: tables, prices, searches.',
		isDefault: false,
		sections: [
			s('cover', { kpis: ALL_KPIS }),
			s('competitors'),
			s('actions'),
			s('branches'),
			s('places', { parts: ['busyness', 'prices', 'search_ranks'] }),
			s('city'),
			s('appendix'),
		],
	},
];

// A SQL string literal (`addSql` takes no bindings)
const lit = (value: string) => `'${value.replaceAll("'", "''")}'`;

export class Migration20261024172411_seed_report_templates extends Migration {
	override up(): void | Promise<void> {
		for (const t of TEMPLATES)
			this.addSql(
				`insert into "report_templates" ("name", "description", "is_default", "sections") values ` +
					`(${lit(t.name)}, ${lit(t.description)}, ${t.isDefault}, ${lit(JSON.stringify(t.sections))}::jsonb);`,
			);
		this.addSql(
			`update "reports" set "sections" = ${lit(JSON.stringify(FULL))}::jsonb, "name" = 'Full report', ` +
				`"template_id" = (select "id" from "report_templates" where "name" = 'Full report');`,
		);
	}

	override down(): void | Promise<void> {
		this.addSql(`update "reports" set "sections" = '[]'::jsonb, "template_id" = null;`);
		this.addSql(`delete from "report_templates" where "name" in (${TEMPLATES.map(t => lit(t.name)).join(', ')});`);
	}
}
