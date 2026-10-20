import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { OutreachTouchKindEnum, ProspectStageEnum } from '../constants/outreach.constant.js';
import { OutreachTouch } from '../entities/outreach-touch.entity.js';
import { Prospect } from '../entities/prospect.entity.js';
import { dueBefore, normalizeHandle, OutreachService } from '../services/outreach.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('OutreachService (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: OutreachService;
	let venueCount = 0;

	const newProspect = async (name = `Venue ${venueCount}`) => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: `place-${venueCount++}`, name });
		await em.flush();
		return service.add(venue.brand.id);
	};

	const touchesOf = (prospect: Prospect) =>
		harness.orm.em.find(OutreachTouch, { prospect }, { orderBy: { createdAt: 'asc' } });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({ providers: [OutreachService] });
		service = harness.moduleRef.get(OutreachService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	it('adds a brand once, cleaning up what was typed', async () => {
		const em = harness.orm.em;
		const venue = em.create(Venue, { city: testCity(em), placeId: 'place-doner', name: 'Döner Pro' });
		await em.flush();

		const prospect = await service.add(venue.brand.id, {
			contactName: '  Ali  ',
			contactEmail: ' Ali@DonerPro.de ',
			instagram: 'https://www.instagram.com/doner.pro/?hl=de',
			hook: '',
		});
		expect(prospect).toMatchObject({
			stage: ProspectStageEnum.TO_CONTACT,
			language: 'en',
			contactName: 'Ali',
			contactEmail: 'ali@donerpro.de',
			instagram: 'doner.pro',
			hook: null,
			outreachCount: 0,
		});

		const again = await service.add(venue.brand.id, { contactName: 'Someone else' });
		expect(again.id).toBe(prospect.id);
		expect(again.contactName).toBe('Ali');
	});

	it('is one prospect per brand, whatever its cities', async () => {
		const em = harness.orm.em;
		const city = testCity(em);
		const brand = em.create(Brand, {
			name: 'Frittenwerk',
			key: 'frittenwerk',
		});
		em.create(Venue, { city, placeId: 'place-fw-1', name: 'Frittenwerk', brand });
		em.create(Venue, { city, placeId: 'place-fw-2', name: 'Frittenwerk Alexa', brand });
		em.create(Venue, { city: testCity(em, { name: 'Hamburg' }), placeId: 'place-fw-3', name: 'Frittenwerk', brand });
		await em.flush();

		const prospect = await service.add(brand.id);
		expect((await service.add(brand.id)).id).toBe(prospect.id);
		expect(await em.count(Prospect, { brand })).toBe(1);
		expect(await service.forBrand(brand.id)).toMatchObject({ id: prospect.id });
	});

	it('reads a handle from @name, a bare name or a profile link', () => {
		expect(normalizeHandle('@choc.spot')).toBe('choc.spot');
		expect(normalizeHandle('instagram.com/choc.spot/')).toBe('choc.spot');
		expect(normalizeHandle(' choc.spot ')).toBe('choc.spot');
		expect(normalizeHandle('  ')).toBeNull();
	});

	it('runs the follow-up sequence while they stay quiet', async () => {
		const prospect = await newProspect();
		const first = new Date('2026-10-01T09:00:00Z');

		await service.log(prospect.id, {
			kind: OutreachTouchKindEnum.EMAIL,
			at: first,
			subject: 'Your September on TikTok',
			body: 'Hi…',
			template: 'intro',
		});
		expect(prospect.stage).toBe(ProspectStageEnum.CONTACTED);
		expect(prospect.outreachCount).toBe(1);
		expect(prospect.lastTouchAt).toEqual(first);
		expect(prospect.nextFollowUpAt).toEqual(new Date(first.getTime() + 4 * DAY_MS));

		const second = new Date('2026-10-05T09:00:00Z');
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL, at: second });
		expect(prospect.nextFollowUpAt).toEqual(new Date(second.getTime() + 7 * DAY_MS));

		// The third try ends the sequence
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.DM });
		expect(prospect.outreachCount).toBe(3);
		expect(prospect.nextFollowUpAt).toBeNull();

		const [touch] = await touchesOf(prospect);
		expect(touch).toMatchObject({ subject: 'Your September on TikTok', template: 'intro' });
	});

	it('takes the follow-up date it is given, or none', async () => {
		const prospect = await newProspect();
		const followUpAt = new Date('2026-11-01T08:00:00Z');

		await service.log(prospect.id, { kind: OutreachTouchKindEnum.CALL, followUpAt });
		expect(prospect.nextFollowUpAt).toEqual(followUpAt);

		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL, followUpAt: null });
		expect(prospect.nextFollowUpAt).toBeNull();
	});

	it('moves a prospect to replied on their answer and stops chasing them', async () => {
		const prospect = await newProspect();
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL });
		expect(prospect.nextFollowUpAt).not.toBeNull();

		const answeredAt = new Date(Date.now() + 1000);
		await service.log(prospect.id, {
			kind: OutreachTouchKindEnum.REPLY,
			at: answeredAt,
			body: 'Yes, send it',
		});
		expect(prospect.stage).toBe(ProspectStageEnum.REPLIED);
		expect(prospect.nextFollowUpAt).toBeNull();
		expect(prospect.lastTouchAt).toEqual(answeredAt);

		// Writing back in the conversation sets no reminder of its own
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL });
		expect(prospect.stage).toBe(ProspectStageEnum.REPLIED);
		expect(prospect.nextFollowUpAt).toBeNull();
	});

	it('keeps a "later" reply as a date to come back', async () => {
		const prospect = await newProspect();
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL });
		const inThreeMonths = new Date(Date.now() + 90 * DAY_MS);
		await service.log(prospect.id, {
			kind: OutreachTouchKindEnum.REPLY,
			followUpAt: inThreeMonths,
		});
		expect(prospect.nextFollowUpAt).toEqual(inThreeMonths);
	});

	it('leaves the stage, the count and the last contact alone on a note', async () => {
		const prospect = await newProspect();
		await service.log(prospect.id, {
			kind: OutreachTouchKindEnum.NOTE,
			at: new Date(Date.now() + DAY_MS),
			body: 'The owner is in on Tuesdays',
		});
		expect(prospect).toMatchObject({ stage: ProspectStageEnum.TO_CONTACT, outreachCount: 0 });
		expect(prospect.lastTouchAt ?? null).toBeNull();
	});

	it('records a stage change in the log, and closing one drops its follow-up', async () => {
		const prospect = await newProspect();
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL });

		await service.update(prospect.id, { stage: ProspectStageEnum.MEETING });
		await service.update(prospect.id, { stage: ProspectStageEnum.MEETING, notes: 'Call Thu' });
		await service.update(prospect.id, { stage: ProspectStageEnum.WON });

		expect(prospect.stage).toBe(ProspectStageEnum.WON);
		expect(prospect.nextFollowUpAt).toBeNull();
		expect(prospect.notes).toBe('Call Thu');
		const stages = (await touchesOf(prospect))
			.filter(t => t.kind === OutreachTouchKindEnum.STAGE)
			.map(t => t.stage);
		expect(stages).toEqual([ProspectStageEnum.MEETING, ProspectStageEnum.WON]);
	});

	it('never contacts or forgets a prospect who opted out', async () => {
		const prospect = await newProspect('Quiet Café');
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL });
		await service.update(prospect.id, { stage: ProspectStageEnum.OPTED_OUT });
		expect(prospect.nextFollowUpAt).toBeNull();

		await expect(
			service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL }),
		).rejects.toThrow('Quiet Café asked not to be contacted again');
		await expect(
			service.update(prospect.id, { nextFollowUpAt: new Date(Date.now() + DAY_MS) }),
		).rejects.toThrow('asked not to be contacted again');
		await expect(service.remove(prospect.id)).rejects.toThrow('opted out');

		// Their answer and our notes can still be written down
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.NOTE, body: 'Asked twice' });
	});

	it('refuses a stage change logged as a touch', async () => {
		const prospect = await newProspect();
		await expect(
			service.log(prospect.id, { kind: OutreachTouchKindEnum.STAGE }),
		).rejects.toThrow('updating the prospect');
	});

	it('recounts after a mistaken entry is deleted', async () => {
		const prospect = await newProspect();
		const first = new Date('2026-10-01T09:00:00Z');
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL, at: first });
		const wrong = await service.log(prospect.id, {
			kind: OutreachTouchKindEnum.CALL,
			at: new Date('2026-10-03T09:00:00Z'),
		});
		expect(prospect.outreachCount).toBe(2);

		await service.removeTouch(prospect.id, wrong.id);
		const reloaded = await harness.orm.em.findOneOrFail(Prospect, { id: prospect.id });
		expect(reloaded.outreachCount).toBe(1);
		expect(reloaded.lastTouchAt).toEqual(first);
		expect(reloaded.stage).toBe(ProspectStageEnum.CONTACTED);
	});

	it('removes a prospect with its log', async () => {
		const prospect = await newProspect();
		await service.log(prospect.id, { kind: OutreachTouchKindEnum.EMAIL });
		await service.remove(prospect.id);

		const em = harness.orm.em;
		expect(await em.count(Prospect, { id: prospect.id })).toBe(0);
		expect(await em.count(OutreachTouch, { prospect: prospect.id })).toBe(0);
	});

	it('sums up stages, the follow-ups due today and the week of outreach', async () => {
		const em = harness.orm.em;
		await em.nativeDelete(OutreachTouch, {});
		await em.nativeDelete(Prospect, {});
		em.clear();

		const now = new Date();
		const waiting = await newProspect();
		const dueToday = await newProspect();
		await newProspect();
		await service.log(waiting.id, { kind: OutreachTouchKindEnum.EMAIL, at: now });
		await service.log(dueToday.id, {
			kind: OutreachTouchKindEnum.EMAIL,
			at: new Date(now.getTime() - 10 * DAY_MS),
			followUpAt: new Date(dueBefore(now).getTime() - 1000),
		});

		const summary = await service.summary(now);
		expect(summary.due).toBe(1);
		expect(summary.outreachLast7Days).toBe(1);
		expect(summary.stages).toContainEqual({ stage: ProspectStageEnum.CONTACTED, count: 2 });
		expect(summary.stages).toContainEqual({ stage: ProspectStageEnum.TO_CONTACT, count: 1 });
		expect(summary.stages).toContainEqual({ stage: ProspectStageEnum.WON, count: 0 });
	});
});
