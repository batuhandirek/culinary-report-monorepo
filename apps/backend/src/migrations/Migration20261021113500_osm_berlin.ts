import { Migration } from '@mikro-orm/migrations';

/**
 * Data, written by hand (not generated): Berlin's boundary on OpenStreetMap (relation 62422,
 * the Land Berlin), so `SYNC_OSM_PLACES` can list its food places.
 */
export class Migration20261021113500_osm_berlin extends Migration {
	override up(): void | Promise<void> {
		this.addSql(
			`update "cities" set "osm_relation_id" = 62422 where "slug" = 'berlin' and "osm_relation_id" is null;`,
		);
	}

	override down(): void | Promise<void> {
		this.addSql(`update "cities" set "osm_relation_id" = null where "slug" = 'berlin';`);
	}
}
