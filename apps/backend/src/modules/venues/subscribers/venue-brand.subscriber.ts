import { ChangeSetType, type EventSubscriber, type FlushEventArgs, helper } from '@mikro-orm/core';

import { Mention } from 'src/modules/social/entities/mention.entity.js';

import { Brand } from '../entities/brand.entity.js';
import { Venue } from '../entities/venue.entity.js';
import { brandKey } from '../util/brand-key.js';

/**
 * Every venue is a branch of a brand: one saved without a brand gets a brand of its own, named
 * like it, in the same flush. A relation's `onCreate` would not run (MikroORM skips it for
 * relations), and every place that creates venues (scrapes, lookups, tests) relies on this.
 * Likewise a new mention linked to a venue but no brand gets the venue's brand (when the venue
 * is loaded): a mention's brand is always set when it has a venue.
 */
export class VenueBrandSubscriber implements EventSubscriber {
	onFlush({ em, uow }: FlushEventArgs): void {
		const created = uow.getChangeSets().filter(cs => cs.type === ChangeSetType.CREATE);
		for (const changeSet of created) {
			if (!(changeSet.entity instanceof Venue)) continue;
			const venue = changeSet.entity;
			if (venue.brand) continue;
			const brand = em.create(Brand, { name: venue.name, key: brandKey(venue.name) });
			uow.computeChangeSet(brand);
			venue.brand = brand;
			uow.recomputeSingleChangeSet(venue);
		}
		for (const changeSet of created) {
			if (!(changeSet.entity instanceof Mention)) continue;
			const mention = changeSet.entity;
			const venue = mention.venue;
			if (mention.brand || !venue || !helper(venue).__initialized || !venue.brand) continue;
			mention.brand = venue.brand;
			uow.recomputeSingleChangeSet(mention);
		}
	}
}
