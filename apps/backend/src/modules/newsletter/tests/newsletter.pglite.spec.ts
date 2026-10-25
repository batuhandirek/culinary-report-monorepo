import { NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { NEWSLETTER_CONSENT_TEXT } from '../constants/newsletter.constant.js';
import { NewsletterSubscriber } from '../entities/newsletter-subscriber.entity.js';
import { NewsletterService } from '../services/newsletter.service.js';

describe('NewsletterService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: NewsletterService;
	let city: City;
	const email = { queueEmail: jest.fn(async (..._args: unknown[]) => undefined) };
	const T0 = new Date('2026-10-25T10:00:00Z');
	const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);
	const sent = () =>
		email.queueEmail.mock.calls as unknown as [
			{ subject: string; html: string; to: { email: string } },
		][];
	const row = (address: string) =>
		harness.orm.em
			.fork()
			.findOneOrFail(NewsletterSubscriber, { email: address, city: city.id });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [NewsletterService, { provide: EmailService, useValue: email }],
		});
		service = harness.moduleRef.get(NewsletterService);
		entityManagerManager.setEntityManager(harness.orm.em);
		city = testCity(harness.orm.em, { slug: 'berlin', name: 'Berlin' });
		testCity(harness.orm.em, { slug: 'paused', name: 'Paused', active: false });
		await harness.orm.em.flush();
	});

	beforeEach(() => {
		email.queueEmail.mockClear();
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('records the sign-up with its consent and mails a confirmation link, nothing more', async () => {
		await service.subscribe('  Anna@Example.com ', 'berlin', T0);
		const subscriber = await row('anna@example.com');
		expect(subscriber).toMatchObject({
			consentedAt: T0,
			consentText: NEWSLETTER_CONSENT_TEXT,
			confirmMailSentAt: T0,
		});
		expect(subscriber.confirmedAt).toBeNull();
		expect(subscriber.token).toMatch(/^[\w-]{22}$/);
		expect(sent()).toHaveLength(1);
		const [[mail]] = sent();
		expect(mail.to).toEqual({ email: 'anna@example.com' });
		expect(mail.subject).toBe('Confirm your Munchwerk Berlin e-mail');
		expect(mail.html).toContain(`/newsletter/confirm?token=${subscriber.token}`);
	});

	it('mails one address at most once in ten minutes, and never again once confirmed', async () => {
		await service.subscribe('ben@example.com', 'berlin', T0);
		await service.subscribe('ben@example.com', 'berlin', minutes(5));
		expect(sent()).toHaveLength(1);
		await service.subscribe('ben@example.com', 'berlin', minutes(11));
		expect(sent()).toHaveLength(2);

		const { token } = await row('ben@example.com');
		const confirmed = await service.confirm(token, minutes(12));
		expect(confirmed.confirmedAt).toEqual(minutes(12));
		await service.subscribe('ben@example.com', 'berlin', minutes(60));
		expect(sent()).toHaveLength(2);
	});

	it('unsubscribes for good, and a new sign-up asks for confirmation again', async () => {
		await service.subscribe('cleo@example.com', 'berlin', T0);
		const { token } = await row('cleo@example.com');
		await service.confirm(token, minutes(1));
		const gone = await service.unsubscribe(token, minutes(2));
		expect(gone.unsubscribedAt).toEqual(minutes(2));

		await service.subscribe('cleo@example.com', 'berlin', minutes(3));
		const again = await row('cleo@example.com');
		expect(again).toMatchObject({
			unsubscribedAt: null,
			confirmedAt: null,
			consentedAt: minutes(3),
			token,
		});
		expect(sent()).toHaveLength(2);
	});

	it('counts addresses by state', async () => {
		expect(await service.counts(city.id)).toEqual({
			confirmed: 1,
			pending: 2,
			unsubscribed: 0,
		});
	});

	it('refuses an unknown or inactive city and an unknown token', async () => {
		await expect(service.subscribe('dora@example.com', 'nowhere', T0)).rejects.toBeInstanceOf(
			NotFoundException,
		);
		await expect(service.subscribe('dora@example.com', 'paused', T0)).rejects.toBeInstanceOf(
			NotFoundException,
		);
		await expect(service.confirm('not-a-real-token-at-all')).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(sent()).toHaveLength(0);
	});
});
