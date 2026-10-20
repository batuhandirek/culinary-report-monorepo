import { Migration } from '@mikro-orm/migrations';

/**
 * Data, written by hand: the accounts the previous migration made each got a creator of their
 * own; one person's TikTok and Instagram with the same letters (`creatorKey`, six or more, one
 * account a platform) become one creator, as `SocialAccountService.ensure` does for new ones.
 */
export class Migration20261019100100_group_creators extends Migration {
	override async up(): Promise<void> {
		await this.execute(`with keyed as (
				select "id", "creator_id", "platform", regexp_replace("handle", '[^a-z0-9]', '', 'g') as "k" from "social_accounts"
			), pairs as (
				select "k" from keyed where length("k") >= 6 group by "k"
				having count(*) filter (where "platform" = 'tiktok') = 1 and count(*) filter (where "platform" = 'instagram') = 1
			)
			update "social_accounts" a set "creator_id" = t."creator_id"
			from keyed i
			join pairs p on p."k" = i."k"
			join keyed t on t."k" = p."k" and t."platform" = 'tiktok'
			where i."platform" = 'instagram' and a."id" = i."id";`);
		await this.execute(`delete from "creators" c where not exists (select 1 from "social_accounts" a where a."creator_id" = c."id");`);
	}
}
