import { Migration } from '@mikro-orm/migrations';

/** The aspects the claims' vectors showed missing: key (`aspectKey` of the label), root, label, hint */
const ADDED: [key: string, parent: string, label: string, hint: string][] = [
	[
		'hype_reputation',
		'vibe',
		'Hype & reputation',
		'whether it lives up to its hype or name: overhyped, worth the hype, a legend, a tourist trap, reviews that look fake or get deleted (a recommendation or a rating is no aspect)',
	],
	[
		'events_entertainment',
		'vibe',
		'Events & entertainment',
		'live music, DJs, shows, quiz or ladies nights, events and their dates, entry tickets and what they cost (a new dish is a new item, not an event)',
	],
	[
		'concept_character',
		'vibe',
		'Concept & character',
		'the idea behind the place and what makes it different: its concept, its character, a meal as an experience, grilling at the table, an open kitchen (the decor is interior, the mood atmosphere)',
	],
	[
		'ordering_system',
		'service',
		'Ordering system',
		'how ordering works: at the counter, a kiosk or screen, a QR code or app, self-service, easy or confusing (wrong or missing items are order accuracy)',
	],
	[
		'professionalism_organisation',
		'service',
		'Professionalism & organisation',
		'competent, well trained and organised, a team working together, or unprofessional, chaotic, disorganised (warmth is friendliness, speed is speed of service)',
	],
	[
		'staffing',
		'service',
		'Staffing',
		'enough staff or too few: understaffed, staff overwhelmed, one person working everything (slow service itself is speed of service)',
	],
];

/**
 * Hand-written (the user's call, 2026-11-10): the aspects grouping the production copy's claims by
 * meaning showed missing, and the labels and hints the claim-labels
 * classifier wobbled on: the root `vibe` read "Atmosphere" like its child `atmosphere`, and
 * hospitality fell between friendliness and the service root. Stored claims are not relabelled
 * here (clearing `parts_at` is the user's spend); new claims are
 * offered the new aspects at once, as the classifier reads the legend from this table.
 */
export class Migration20261110130000_aspects_from_vectors extends Migration {
	override up(): void {
		for (const [key, parent, label, hint] of ADDED)
			this.addSql(
				`insert into "topics" ("key", "label", "kind", "hint", "parent_id")
				select '${key}', '${label}', 'aspect', '${hint.replace(/'/g, "''")}', "id"
				from "topics" where "key" = '${parent}' and "kind" = 'aspect'
				on conflict ("key") do nothing;`,
			);
		this.addSql(
			`update "topics" set "label" = 'Vibe & setting', "hint" = 'about the vibe and the setting as a whole, when nothing finer fits'
			where "key" = 'vibe' and "kind" = 'aspect';`,
		);
		this.addSql(
			`update "topics" set "hint" = 'warm, welcoming, hospitable, or rude, unfriendly, arrogant, and guests treated differently for being tourists or for who they are'
			where "key" = 'friendliness' and "kind" = 'aspect';`,
		);
		this.addSql(
			`update "topics" set "hint" = 'expensive, pricey, or cheap, affordable, for what it is, and the prices stated ("the döner costs 8 €"; an entry ticket is events & entertainment)'
			where "key" = 'price_level' and "kind" = 'aspect';`,
		);
	}

	override down(): void {
		// A claim filed under a new aspect moves to its root, as deleting a leaf aspect does
		for (const [key, parent] of ADDED) {
			this.addSql(
				`update "statement_parts" set "topic_id" = (select "id" from "topics" where "key" = '${parent}')
				where "topic_id" = (select "id" from "topics" where "key" = '${key}');`,
			);
			this.addSql(`delete from "topics" where "key" = '${key}' and "kind" = 'aspect';`);
		}
		this.addSql(
			`update "topics" set "label" = 'Atmosphere', "hint" = 'about the atmosphere, when nothing finer fits' where "key" = 'vibe' and "kind" = 'aspect';`,
		);
		this.addSql(
			`update "topics" set "hint" = 'warm, welcoming, or rude, unfriendly, arrogant, and guests treated differently for being tourists or for who they are' where "key" = 'friendliness' and "kind" = 'aspect';`,
		);
		this.addSql(
			`update "topics" set "hint" = 'expensive, pricey, or cheap, affordable, for what it is, and the prices stated ("the döner costs 8 €")' where "key" = 'price_level' and "kind" = 'aspect';`,
		);
	}
}
