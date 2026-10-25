import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Formula, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Image } from 'src/modules/image/entities/image.entity.js';
import type { LinkedProfile } from 'src/modules/social/util/accounts.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';
import { dedent } from 'src/shared/util/string.js';

import type { VenueDetails } from '../interfaces/venue-details.interface.js';
import { VenueRepository } from '../repositories/venue.repository.js';

import { Brand } from './brand.entity.js';
import { VenueSnapshot } from './venue-snapshot.entity.js';

/** A restaurant, bar or café, as Google Maps knows it. */
@Entity({ tableName: 'venues', repository: () => VenueRepository })
export class Venue extends MikroOrmEntityAbstractClass<'mentionCount' | 'closed' | 'brand'> {
	@Property({ type: 'text', unique: true })
	placeId: string;

	@Index()
	@Property({ type: 'text' })
	name: string;

	// The city whose pipeline found it: its matching, reports and trends stay inside it
	@ManyToOne({ entity: () => City, index: true })
	city: Rel<City>;

	// The business it is a branch of (`BrandService`): a brand of its own until an admin merges it
	// into a chain. What reports, prospects, the portal and the lead score are keyed by
	// A venue saved without one gets a brand of its own, named like it (`VenueBrandSubscriber`)
	@ManyToOne({ entity: () => Brand, index: true })
	brand: Rel<Brand>;

	// Google's own city or locality field, e.g. "Berlin" or "Potsdam"
	@Property({ type: 'text', nullable: true })
	locality?: string | null;

	@Index()
	@Property({ type: 'text', nullable: true })
	district?: string | null;

	@Property({ type: 'text', nullable: true })
	street?: string | null;

	@Property({ type: 'text', nullable: true })
	postalCode?: string | null;

	@Property({ type: 'text', nullable: true })
	category?: string | null;

	@Property({ type: 'jsonb', nullable: true })
	categories?: string[] | null;

	@Property({ type: 'double', nullable: true })
	lat?: number | null;

	@Property({ type: 'double', nullable: true })
	lng?: number | null;

	@Property({ type: 'text', nullable: true })
	priceLevel?: string | null;

	@Property({ type: 'text', nullable: true })
	website?: string | null;

	// Its website's icon on ImageKit (`VenueFaviconService`); kept when a later fetch fails
	@ManyToOne({ entity: () => Image, nullable: true, deleteRule: 'set null' })
	favicon?: Rel<Image> | null;

	// sha256 of the icon's bytes, so an unchanged icon is not uploaded again
	@Property({ type: 'text', nullable: true })
	faviconHash?: string | null;

	// When the icon was last looked for, found or not; null when the website changed since
	@Index()
	@Property({ type: 'datetime', nullable: true })
	faviconCheckedAt?: Date | null;

	// The Instagram and TikTok profiles its website links (the home page, else its contact or
	// Impressum page), read with the icon (`VenueFaviconService`); `AccountMatchingService` links
	// them. Null until read; kept when a later read fails
	@Property({ type: 'jsonb', nullable: true })
	siteProfiles?: LinkedProfile[] | null;

	// When the website was last read for profiles, found or not; null when the website changed since
	@Property({ type: 'datetime', nullable: true })
	siteProfilesAt?: Date | null;

	// Its booking page (TheFork, OpenTable or Google's own), set by hand when the scrape missed
	// it (`VenueReservationService.setBookingUrl`); sampled before Google's reservation link.
	// Kept out of `details`, which scrapes merge into
	@Property({ type: 'text', nullable: true })
	bookingUrl?: string | null;

	// The platform behind its Google booking page ("OpenTable", "resmio"), as the page's footer
	// names it; rewritten by every Google sample, so a venue that moves platform updates
	@Property({ type: 'text', nullable: true })
	reservationPartner?: string | null;

	@Property({ type: 'text', nullable: true })
	phone?: string | null;

	@Property({ type: 'text', nullable: true })
	googleUrl?: string | null;

	@Property({ type: 'boolean', default: false })
	closed: boolean = false;

	// The latest snapshot's figures, copied here so lists can sort by them
	@Property({ type: 'float', nullable: true })
	rating?: number | null;

	@Property({ type: 'int', nullable: true })
	reviewsCount?: number | null;

	// Hours, amenities, popular times, "people also search" (`mergeVenueDetails`); when they
	// last changed. A field no scrape has carried yet is absent: unknown, not "none"
	@Property({ type: 'jsonb', nullable: true })
	details?: VenueDetails | null;

	@Property({ type: 'datetime', nullable: true })
	detailsAt?: Date | null;

	// When the monthly press search (`WebMentionService`) last looked for it: without one, its
	// press is unknown, not none
	@Property({ type: 'datetime', nullable: true })
	pressSearchedAt?: Date | null;

	// Its TripAdvisor page, found once by a web search and confirmed by name (`isSameVenue`)
	@Property({ type: 'text', nullable: true })
	tripadvisorUrl?: string | null;

	// When that search ran, found or not: it is not repeated
	@Property({ type: 'datetime', nullable: true })
	tripadvisorSearchedAt?: Date | null;

	// Its all-time TripAdvisor figures, as of the last review scrape that returned an item
	@Property({ type: 'float', nullable: true })
	tripadvisorRating?: number | null;

	@Property({ type: 'int', nullable: true })
	tripadvisorReviewsCount?: number | null;

	@OneToMany(() => VenueSnapshot, snapshot => snapshot.venue)
	snapshots = new Collection<VenueSnapshot>(this);

	// Every social media mention linked to it, of any month
	@Formula(
		alias => dedent`(
			SELECT COUNT(*) FROM mentions WHERE mentions.venue_id = ${alias}.id
		)::int`,
		{ lazy: true, type: 'int' },
	)
	mentionCount?: number;
}
