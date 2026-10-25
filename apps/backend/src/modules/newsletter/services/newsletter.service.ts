import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import { NewsletterConfirmEmail, newsletterConfirmSubject } from 'emails';
import { randomBytes } from 'node:crypto';

import { mainConfig } from 'src/config/main.config.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';

import {
	NEWSLETTER_CONSENT_TEXT,
	NEWSLETTER_RESEND_MINUTES,
	NEWSLETTER_TOKEN_BYTES,
} from '../constants/newsletter.constant.js';
import { NewsletterSubscriber } from '../entities/newsletter-subscriber.entity.js';

export interface NewsletterCounts {
	confirmed: number;
	pending: number;
	unsubscribed: number;
}

/**
 * The one writer of `NewsletterSubscriber`: sign-up with a confirmation mail (double opt-in),
 * confirming, unsubscribing. Sign-up answers the same whatever the address's state, so the form
 * never tells anyone whether an address is subscribed.
 */
@Injectable()
export class NewsletterService {
	constructor(
		private readonly em: EntityManager,
		private readonly emailService: EmailService,
	) {}

	/**
	 * Records the sign-up and mails the confirmation link, unless the address is already
	 * confirmed or got a link in the last `NEWSLETTER_RESEND_MINUTES`. An unsubscribed address
	 * signs up afresh. 404 for an unknown or inactive city. Flushes.
	 */
	async subscribe(email: string, citySlug: string, now = new Date()): Promise<void> {
		const city = await this.em.findOne(City, { slug: citySlug, active: true });
		if (!city) throw new NotFoundException('No such city');
		const address = email.trim().toLowerCase();

		let subscriber = await this.em.findOne(NewsletterSubscriber, {
			email: address,
			city: city.id,
		});
		if (subscriber?.confirmedAt && !subscriber.unsubscribedAt) return;
		if (
			subscriber?.confirmMailSentAt &&
			!subscriber.unsubscribedAt &&
			now.getTime() - subscriber.confirmMailSentAt.getTime() <
				NEWSLETTER_RESEND_MINUTES * 60_000
		)
			return;

		subscriber ??= this.em.create(NewsletterSubscriber, {
			email: address,
			city,
			token: randomBytes(NEWSLETTER_TOKEN_BYTES).toString('base64url'),
			consentedAt: now,
			consentText: NEWSLETTER_CONSENT_TEXT,
		});
		Object.assign(subscriber, {
			consentedAt: now,
			consentText: NEWSLETTER_CONSENT_TEXT,
			confirmedAt: null,
			unsubscribedAt: null,
			confirmMailSentAt: now,
		});
		await this.em.flush();

		const confirmUrl = `${mainConfig.PUBLIC_APP_URL}/newsletter/confirm?token=${encodeURIComponent(subscriber.token)}`;
		await this.emailService.queueEmail(
			{
				subject: newsletterConfirmSubject(city.name),
				...(await renderEmail(NewsletterConfirmEmail, { cityName: city.name, confirmUrl })),
				to: { email: address },
			},
			{ highPriority: true },
		);
	}

	/** The link in the confirmation mail: the address gets the monthly mail from now on. Flushes. */
	async confirm(token: string, now = new Date()): Promise<NewsletterSubscriber> {
		const subscriber = await this.byToken(token);
		subscriber.confirmedAt ??= now;
		subscriber.unsubscribedAt = null;
		await this.em.flush();
		return subscriber;
	}

	/** The link in every newsletter: no more mail. Flushes. */
	async unsubscribe(token: string, now = new Date()): Promise<NewsletterSubscriber> {
		const subscriber = await this.byToken(token);
		subscriber.unsubscribedAt ??= now;
		await this.em.flush();
		return subscriber;
	}

	/** A city's addresses by state. */
	async counts(cityId: string): Promise<NewsletterCounts> {
		const [row]: { confirmed: string; pending: string; unsubscribed: string }[] = await this.em
			.getConnection()
			.execute(
				`select count(*) filter (where confirmed_at is not null and unsubscribed_at is null) as confirmed,
					count(*) filter (where confirmed_at is null and unsubscribed_at is null) as pending,
					count(*) filter (where unsubscribed_at is not null) as unsubscribed
				from newsletter_subscribers where city_id = ?`,
				[cityId],
			);
		return {
			confirmed: Number(row?.confirmed ?? 0),
			pending: Number(row?.pending ?? 0),
			unsubscribed: Number(row?.unsubscribed ?? 0),
		};
	}

	private async byToken(token: string): Promise<NewsletterSubscriber> {
		const subscriber = await this.em.findOne(
			NewsletterSubscriber,
			{ token },
			{ populate: ['city'] },
		);
		if (!subscriber) throw new NotFoundException('This link is not valid');
		return subscriber;
	}
}
