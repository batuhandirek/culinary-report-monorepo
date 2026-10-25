import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

/**
 * An address signed up on the front page for a city's monthly e-mail. Double opt-in: it gets
 * mail only once `confirmedAt` is set by the link in the confirmation mail, and never after
 * `unsubscribedAt`. `NewsletterService` is the one writer.
 */
@Entity({ tableName: 'newsletter_subscribers' })
@Unique({ properties: ['email', 'city'] })
export class NewsletterSubscriber extends MikroOrmEntityAbstractClass<
	'confirmedAt' | 'unsubscribedAt' | 'confirmMailSentAt'
> {
	// Lower case, trimmed
	@Property({ type: 'text' })
	email: string;

	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	// In the confirm and unsubscribe links; never sent to the client otherwise
	@Property({ type: 'text', unique: true, hidden: true })
	token: string;

	// When the form was sent, and what it said (the proof of consent)
	@Property({ type: 'datetime' })
	consentedAt: Date;

	@Property({ type: 'text' })
	consentText: string;

	@Property({ type: 'datetime', nullable: true })
	confirmMailSentAt?: Date | null;

	@Property({ type: 'datetime', nullable: true })
	confirmedAt?: Date | null;

	@Property({ type: 'datetime', nullable: true })
	unsubscribedAt?: Date | null;
}
