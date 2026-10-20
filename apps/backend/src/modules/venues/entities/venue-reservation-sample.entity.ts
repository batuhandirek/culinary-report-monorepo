import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Venue } from './venue.entity.js';

/**
 * A booking platform whose open tables we sample. `google` is Google's own booking page (Reserve
 * with Google), fed by a partner platform named on `Venue.reservationPartner`. Quandoo shut down
 * on 30 September 2026.
 */
export enum ReservationPlatformEnum {
	THEFORK = 'thefork',
	OPENTABLE = 'opentable',
	GOOGLE = 'google',
}

/**
 * How many evening slots a booking platform had open for one date, sampled ahead of it
 * (`SAMPLE_RESERVATIONS`). `slotsAsked` is the evening window's slot count (18:00–22:00 in
 * quarter hours), so `1 - slotsOpen / slotsAsked` is how booked out the evening was.
 */
@Entity({ tableName: 'venue_reservation_samples' })
@Index({ properties: ['venue', 'forDate'] })
export class VenueReservationSample extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	@Enum({ items: () => ReservationPlatformEnum, nativeEnumName: 'reservation_platform' })
	platform: ReservationPlatformEnum;

	@Property({ type: 'datetime' })
	sampledAt: Date;

	// YYYY-MM-DD, the evening asked about, in the city's time zone
	@Property({ type: 'text' })
	forDate: string;

	@Property({ type: 'int' })
	slotsOpen: number;

	@Property({ type: 'int' })
	slotsAsked: number;

	// The party size asked for; null where the platform's data doesn't depend on one (TheFork)
	@Property({ type: 'int', nullable: true })
	partySize?: number | null;
}
