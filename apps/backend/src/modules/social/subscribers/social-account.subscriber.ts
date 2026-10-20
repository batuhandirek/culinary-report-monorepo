import { ChangeSetType, type EventSubscriber, type FlushEventArgs } from '@mikro-orm/core';

import { Creator } from '../entities/creator.entity.js';
import { SocialAccount } from '../entities/social-account.entity.js';

/**
 * Every account belongs to a creator: one saved without a creator gets a creator of its own,
 * named like it, in the same flush (as `VenueBrandSubscriber` gives a venue a brand). Joining the
 * creator of the same handle on the other platform needs a query, so `SocialAccountService.ensure`
 * does that before saving; tests and the rest rely on this.
 */
export class SocialAccountSubscriber implements EventSubscriber {
	onFlush({ em, uow }: FlushEventArgs): void {
		for (const changeSet of uow.getChangeSets()) {
			if (changeSet.type !== ChangeSetType.CREATE || !(changeSet.entity instanceof SocialAccount)) continue;
			const account = changeSet.entity;
			if (account.creator) continue;
			const creator = em.create(Creator, { name: account.displayName || account.handle });
			uow.computeChangeSet(creator);
			account.creator = creator;
			uow.recomputeSingleChangeSet(account);
		}
	}
}
