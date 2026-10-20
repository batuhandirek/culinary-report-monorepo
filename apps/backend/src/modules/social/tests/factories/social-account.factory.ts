import type { EntityManager } from '@mikro-orm/core';

import { Factory } from 'fishery';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { getEntityManager } from 'src/shared/util/em.js';

import { AccountBrandSourceEnum, SocialAccount } from '../../entities/social-account.entity.js';
import { SocialPlatformEnum } from '../../entities/social-post.entity.js';

export interface SocialAccountTransientParams {
	em?: EntityManager;
}

let sequence = 0;

/**
 * An account in a city (association `city`, required), a creator of its own given by the
 * subscriber on flush. Pass `brand` (association) for a brand's own account.
 */
export const socialAccountFactory = Factory.define<SocialAccount, SocialAccountTransientParams, SocialAccount>(
	({ params, associations, transientParams }) => {
		const em = transientParams.em ?? getEntityManager();
		if (!associations.city) throw new Error('socialAccountFactory needs a city association');
		sequence++;
		return em.create(SocialAccount, {
			platform: SocialPlatformEnum.TIKTOK,
			handle: `creator_${sequence}`,
			...(associations.brand && { brandSource: AccountBrandSourceEnum.ADMIN }),
			...params,
			...associations,
		} as SocialAccount);
	},
);

/** A brand's own account in this entity manager, not flushed: posts by it are the brand's own. */
export const ownAccount = (
	em: EntityManager,
	brand: Brand,
	city: City,
	handle: string,
	platform = SocialPlatformEnum.TIKTOK,
): SocialAccount =>
	socialAccountFactory.build({ handle, platform }, { associations: { brand, city }, transient: { em } });
