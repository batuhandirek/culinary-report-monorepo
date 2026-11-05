import { Migration } from '@mikro-orm/migrations';

// Hand-written: a data fix. The caption parser cut "@aiko-sushi.de" to "@aiko" (a handle has no
// hyphen), storing someone else's handle in `tagged_handles`; `captionHandles` now drops such a
// token whole. This removes the stored cuts: a tagged handle the post's text writes glued to a
// hyphen (54 handles on 53 dev posts, 2026-11-05).
export class Migration20261105160000_drop_cut_caption_handles extends Migration {
	override up(): void {
		this.addSql(`
			update social_posts p set tagged_handles = (
				select coalesce(jsonb_agg(h), '[]'::jsonb)
				from jsonb_array_elements_text(p.tagged_handles) h
				where position(lower('@' || h || '-') in lower(coalesce(p.text, ''))) = 0
			)
			where exists (
				select 1 from jsonb_array_elements_text(coalesce(p.tagged_handles, '[]'::jsonb)) h
				where position(lower('@' || h || '-') in lower(coalesce(p.text, ''))) > 0
			);
		`);
	}
}
