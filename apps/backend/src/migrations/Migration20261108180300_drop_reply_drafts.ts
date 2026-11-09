import { Migration } from '@mikro-orm/migrations';

// Hand-written: the reply drafts are gone (`ReviewReplyAgent` removed, the user's call,
// 2026-11-08), so the `replies` section kind leaves every stored section list (the templates,
// the brands' configurations and the built reports), and the built reports' data loses
// `reviews.replyDrafts`. The review's own `reply_draft` column is dropped by
// `Migration20261108180237`. Nothing comes back on `down`: the drafts are not kept anywhere.

const TABLES = ['report_templates', 'brand_report_configs', 'reports'];

// The list without its `replies` entries, in its order
const WITHOUT_REPLIES = `(select coalesce(jsonb_agg(e.s order by e.i), '[]'::jsonb)
	from jsonb_array_elements(sections) with ordinality as e(s, i) where e.s->>'kind' <> 'replies')`;

export class Migration20261108180300_drop_reply_drafts extends Migration {
	override up(): void | Promise<void> {
		for (const table of TABLES)
			this.addSql(
				`update "${table}" set sections = ${WITHOUT_REPLIES}
					where sections @> '[{"kind":"replies"}]'::jsonb;`,
			);
		this.addSql(
			`update "reports" set data = data #- '{reviews,replyDrafts}'
				where data->'reviews'->'replyDrafts' is not null;`,
		);
	}

	override down(): void | Promise<void> {
		// The drafts and the section are gone for good: rebuild a report to fill it again
	}
}
