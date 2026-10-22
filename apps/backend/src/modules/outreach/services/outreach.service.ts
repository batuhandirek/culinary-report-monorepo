import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';

import {
	CLOSED_STAGES,
	FOLLOW_UP_DAYS,
	IN_PERSON_TOUCH_KINDS,
	OUTGOING_TOUCH_KINDS,
	OutreachTouchKindEnum,
	type OutreachTouchOutcomeEnum,
	type ProspectLanguage,
	ProspectStageEnum,
} from '../constants/outreach.constant.js';
import { OutreachTouch } from '../entities/outreach-touch.entity.js';
import { Prospect } from '../entities/prospect.entity.js';

import { PitchHookService } from './pitch-hook.service.js';

/** What we know about a prospect. `null` clears a field; a missing one stays as it is. */
export interface ProspectDetails {
	language?: ProspectLanguage;
	contactName?: string | null;
	contactEmail?: string | null;
	instagram?: string | null;
	hook?: string | null;
	notes?: string | null;
}

export interface ProspectPatch extends ProspectDetails {
	stage?: ProspectStageEnum;
	nextFollowUpAt?: Date | null;
	/** When they said we may e-mail them; `null` takes it back. */
	emailConsentAt?: Date | null;
}

export interface OutreachTouchInput {
	kind: OutreachTouchKindEnum;
	// Defaults to now
	at?: Date;
	subject?: string;
	body?: string;
	template?: string;
	/** The next follow-up: a date, `null` for none, absent for the usual gap. */
	followUpAt?: Date | null;
	/** VISIT or CALL only: who we got hold of. */
	outcome?: OutreachTouchOutcomeEnum;
	/** VISIT or CALL only: when to come back; it becomes the follow-up, over `followUpAt` and the usual gap. */
	comeBackAt?: Date;
	/** VISIT or CALL only: they said we may e-mail them; stamps the prospect's `emailConsentAt`. */
	emailConsent?: boolean;
}

export interface OutreachSummary {
	stages: { stage: ProspectStageEnum; count: number }[];
	due: number;
	outreachLast7Days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const clean = (text: string | null | undefined) => text?.trim() || null;

/** `@name`, `instagram.com/name/` or a full profile URL, as the bare handle. */
export const normalizeHandle = (handle: string | null | undefined) =>
	clean(
		handle
			?.trim()
			.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
			.replace(/^instagram\.com\//i, '')
			.replace(/^@/, '')
			.replace(/[/?#].*$/, ''),
	);

/** The day after `at` when the n-th unanswered outreach is followed up, or null when it is the last. */
export const followUpAfter = (at: Date, outreachCount: number): Date | null => {
	const days = FOLLOW_UP_DAYS[outreachCount - 1];
	return days === undefined ? null : new Date(at.getTime() + days * DAY_MS);
};

/** Follow-ups count as due all through their day (UTC), so a morning shows the whole day's list. */
export const dueBefore = (now: Date) =>
	new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

/**
 * The one entry point for the sales pipeline: adding brands, logging what was sent and said,
 * and moving prospects between stages. Logging an outreach schedules its follow-up; a reply
 * clears it. A prospect who opted out is never contacted again and never deleted.
 */
@Injectable()
export class OutreachService {
	private readonly logger = new Logger(OutreachService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly pitchHookService: PitchHookService,
	) {}

	/**
	 * Makes a brand a prospect; adding one twice returns the prospect it already has. Without a
	 * hook, one is written from its report (an LLM call; a failed one leaves it empty). Flushes.
	 */
	async add(brandId: string, details: ProspectDetails = {}): Promise<Prospect> {
		const brand = await this.em.findOneOrFail(Brand, { id: brandId }, { populate: ['branches'] });
		const existing = await this.em.findOne(Prospect, { brand });
		if (existing) return existing;
		const prospect = this.em.create(Prospect, { brand });
		this.assignDetails(prospect, details);
		if (!prospect.hook) {
			try {
				prospect.hook = (await this.pitchHookService.suggest(brand, prospect.language)) ?? null;
			} catch (e) {
				this.logger.warn(`Hook for ${brand.name} failed: ${(e as Error).message}`);
			}
		}
		await this.em.flush();
		return prospect;
	}

	/** Writes the prospect's hook anew from its report, over what is there. Flushes. */
	async writeHook(id: string): Promise<Prospect> {
		const prospect = await this.em.findOneOrFail(Prospect, { id }, { populate: ['brand', 'brand.branches'] });
		const hook = await this.pitchHookService.suggest(prospect.brand, prospect.language);
		if (!hook)
			throw new BadRequestException(
				`${prospect.brand.name} has no report or lead score to write a hook from`,
			);
		prospect.hook = hook;
		await this.em.flush();
		return prospect;
	}

	/** The brand's prospect, if it is one (the portal's settings read and write it). */
	async forBrand(brandId: string): Promise<Prospect | null> {
		return this.em.findOne(Prospect, { brand: brandId });
	}

	/** Changes what we know about a prospect, its stage and its follow-up. Flushes. */
	async update(id: string, patch: ProspectPatch): Promise<Prospect> {
		const prospect = await this.em.findOneOrFail(Prospect, { id }, { populate: ['brand'] });
		const { stage, nextFollowUpAt, emailConsentAt, ...details } = patch;
		this.assignDetails(prospect, details);
		if (emailConsentAt !== undefined) prospect.emailConsentAt = emailConsentAt;
		if (stage && stage !== prospect.stage) {
			prospect.stage = stage;
			if (CLOSED_STAGES.includes(stage)) prospect.nextFollowUpAt = null;
			this.em.create(OutreachTouch, {
				prospect,
				kind: OutreachTouchKindEnum.STAGE,
				at: new Date(),
				stage,
			});
		}
		if (nextFollowUpAt !== undefined) this.setFollowUp(prospect, nextFollowUpAt);
		await this.em.flush();
		return prospect;
	}

	/** Records an outreach, a reply or a note, and moves the prospect along. Flushes. */
	async log(id: string, input: OutreachTouchInput): Promise<OutreachTouch> {
		if (input.kind === OutreachTouchKindEnum.STAGE)
			throw new BadRequestException('A stage change is made by updating the prospect');
		const prospect = await this.em.findOneOrFail(Prospect, { id }, { populate: ['brand'] });
		const outgoing = OUTGOING_TOUCH_KINDS.includes(input.kind);
		if (outgoing && prospect.stage === ProspectStageEnum.OPTED_OUT)
			throw new BadRequestException(
				`${prospect.brand.name} asked not to be contacted again`,
			);
		// Only a visit or a call has someone at the other end to record
		const inPerson = IN_PERSON_TOUCH_KINDS.includes(input.kind);
		if (!inPerson && (input.outcome || input.comeBackAt || input.emailConsent))
			throw new BadRequestException(
				'An outcome, a come-back time and consent belong to a visit or a call',
			);

		const at = input.at ?? new Date();
		const touch = this.em.create(OutreachTouch, {
			prospect,
			kind: input.kind,
			at,
			subject: clean(input.subject),
			body: clean(input.body),
			template: clean(input.template),
			outcome: input.outcome ?? null,
			comeBackAt: input.comeBackAt ?? null,
			emailConsent: !!input.emailConsent,
		});
		if (input.emailConsent) prospect.emailConsentAt = at;

		if (outgoing) {
			prospect.outreachCount += 1;
			if (prospect.stage === ProspectStageEnum.TO_CONTACT)
				prospect.stage = ProspectStageEnum.CONTACTED;
			// "Come back on Tuesday" is the follow-up, whatever the sequence says; otherwise the
			// sequence runs only while we wait for a first answer
			if (input.comeBackAt) this.setFollowUp(prospect, input.comeBackAt);
			else if (input.followUpAt !== undefined) this.setFollowUp(prospect, input.followUpAt);
			else if (prospect.stage === ProspectStageEnum.CONTACTED)
				prospect.nextFollowUpAt = followUpAfter(at, prospect.outreachCount);
		} else if (input.kind === OutreachTouchKindEnum.REPLY) {
			if (
				prospect.stage === ProspectStageEnum.TO_CONTACT ||
				prospect.stage === ProspectStageEnum.CONTACTED
			)
				prospect.stage = ProspectStageEnum.REPLIED;
			// Our move now, unless they asked us to come back later
			this.setFollowUp(prospect, input.followUpAt ?? null);
		} else if (input.followUpAt !== undefined) {
			this.setFollowUp(prospect, input.followUpAt);
		}

		if (input.kind !== OutreachTouchKindEnum.NOTE)
			if (!prospect.lastTouchAt || at > prospect.lastTouchAt) prospect.lastTouchAt = at;

		await this.em.flush();
		return touch;
	}

	/** Deletes a log entry logged by mistake and recounts. The stage stays. Flushes. */
	async removeTouch(prospectId: string, touchId: string): Promise<void> {
		const touch = await this.em.findOneOrFail(OutreachTouch, {
			id: touchId,
			prospect: prospectId,
		});
		this.em.remove(touch);
		await this.em.flush();

		const prospect = await this.em.findOneOrFail(Prospect, { id: prospectId });
		const touches = await this.em.find(OutreachTouch, { prospect });
		prospect.outreachCount = touches.filter(t => OUTGOING_TOUCH_KINDS.includes(t.kind)).length;
		const contacts = touches.filter(
			t => t.kind !== OutreachTouchKindEnum.NOTE && t.kind !== OutreachTouchKindEnum.STAGE,
		);
		prospect.lastTouchAt = contacts.length
			? new Date(Math.max(...contacts.map(t => t.at.getTime())))
			: null;
		await this.em.flush();
	}

	/** Takes a brand off the list with its log. An opt-out stays on record. */
	async remove(id: string): Promise<void> {
		const prospect = await this.em.findOneOrFail(Prospect, { id }, { populate: ['brand'] });
		if (prospect.stage === ProspectStageEnum.OPTED_OUT)
			throw new BadRequestException(
				`${prospect.brand.name} opted out: the record keeps anyone from writing to them again`,
			);
		await this.em.nativeDelete(Prospect, { id });
		this.em.clear();
	}

	/** How many prospects are in each stage, how many follow-ups are due, and the week's pace. */
	async summary(now = new Date()): Promise<OutreachSummary> {
		const rows: { stage: ProspectStageEnum; count: number }[] = await this.em
			.getConnection()
			.execute('select stage, count(*)::int as count from prospects group by stage');
		const [due, outreachLast7Days] = await Promise.all([
			this.em.count(Prospect, { nextFollowUpAt: { $lt: dueBefore(now) } }),
			this.em.count(OutreachTouch, {
				kind: { $in: OUTGOING_TOUCH_KINDS },
				at: { $gte: new Date(now.getTime() - 7 * DAY_MS) },
			}),
		]);
		return {
			stages: Object.values(ProspectStageEnum).map(stage => ({
				stage,
				count: rows.find(row => row.stage === stage)?.count ?? 0,
			})),
			due,
			outreachLast7Days,
		};
	}

	private assignDetails(prospect: Prospect, details: ProspectDetails) {
		if (details.language) prospect.language = details.language;
		if (details.contactName !== undefined) prospect.contactName = clean(details.contactName);
		if (details.contactEmail !== undefined)
			prospect.contactEmail = clean(details.contactEmail)?.toLowerCase() ?? null;
		if (details.instagram !== undefined) prospect.instagram = normalizeHandle(details.instagram);
		if (details.hook !== undefined) prospect.hook = clean(details.hook);
		if (details.notes !== undefined) prospect.notes = clean(details.notes);
	}

	private setFollowUp(prospect: Prospect, at: Date | null) {
		if (at && prospect.stage === ProspectStageEnum.OPTED_OUT)
			throw new BadRequestException(
				`${prospect.brand.name} asked not to be contacted again`,
			);
		prospect.nextFollowUpAt = at;
	}
}
