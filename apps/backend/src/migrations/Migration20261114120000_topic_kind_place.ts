import { Migration } from '@mikro-orm/migrations';

// Hand-written: the topic kind `format` (a kind of place: café, bar, fine dining) is called `place`,
// as the pages already labelled it. A rename of the enum value keeps every row; the generator would
// drop and re-create the type. `terms.proposed_kind` is text holding the same values.
export class Migration20261114120000_topic_kind_place extends Migration {
	override up(): void {
		this.addSql(`alter type "topic_kind" rename value 'format' to 'place';`);
		this.addSql(`update "terms" set "proposed_kind" = 'place' where "proposed_kind" = 'format';`);
	}

	override down(): void {
		this.addSql(`alter type "topic_kind" rename value 'place' to 'format';`);
		this.addSql(`update "terms" set "proposed_kind" = 'format' where "proposed_kind" = 'place';`);
	}
}
