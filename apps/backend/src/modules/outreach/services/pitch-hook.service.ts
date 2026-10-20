import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import type { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { busiestBranch } from 'src/modules/venues/util/brands.js';

import { PitchHookAgent } from '../agents/pitch-hook.agent.js';
import type { ProspectLanguage } from '../constants/outreach.constant.js';

const LANGUAGE_NAMES: Record<ProspectLanguage, string> = { en: 'English', de: 'German' };

/** `{ food: '9 of 14' }`, largest first, for the topics a group criticised. */
const shares = (counts: Record<string, number> | undefined, total: number | undefined) =>
	Object.fromEntries(
		_.sortBy(Object.entries(counts ?? {}), ([, n]) => -n)
			.filter(([topic]) => topic !== 'other')
			.slice(0, 4)
			.map(([topic, n]) => [topic, `${n} of ${total ?? 0}`]),
	);

/**
 * What the hook is written from: the brand (its branches populated), its newest report's
 * findings and complaints, and its lead signals' raw counts. Stored report data may predate a
 * field, so every read is optional. Pure.
 */
export const pitchHookInput = (brand: Brand, report: Report | null, language: ProspectLanguage) => {
	const data = report?.data;
	const reviews = data?.reviews;
	const signals = brand.leadSignals;
	const open = brand.branches.isInitialized() ? brand.branches.getItems().filter(v => !v.closed) : [];
	const place = busiestBranch(open);
	return {
		language: LANGUAGE_NAMES[language],
		venue: _.omitBy(
			{
				name: brand.name,
				category: place?.category,
				// A chain is not one district
				district: open.length > 1 ? undefined : place?.district,
				branches: open.length > 1 ? open.length : undefined,
			},
			_.isNil,
		),
		report: report && {
			month: report.month,
			title: report.highlights.title,
			headline: report.highlights.headline,
			findings: (report.highlights.highlights ?? []).map(p => `${p.title}: ${p.text}`),
			reviews: reviews && {
				reviews: reviews.count,
				avgStars: reviews.avgStars,
				replyRate:
					reviews.replyRate === undefined ?
						undefined
					:	`${Math.round(reviews.replyRate * 100)}%`,
				// What keeps guests from 5 stars: reviews below 5 that raised each topic
				criticisedBelowFiveStars: shares(
					reviews.split?.belowFive.complaints,
					reviews.split?.belowFive.written,
				),
				whatTheyCriticised: (reviews.split?.belowFive.complaintDetails ?? [])
					.slice(0, 6)
					.map(p => `${p.topic}: ${p.detail}`),
				criticalReviews: (reviews.critical ?? []).slice(0, 3).map(r => ({
					stars: r.stars,
					text: r.text.slice(0, 300),
					answered: r.replied,
				})),
				changesNoticed: (reviews.changes ?? []).flatMap(c => c.changes).slice(0, 5),
			},
			social: data && {
				postsByOthers: data.social.postCount,
				views: data.social.views,
				creators: data.social.creators,
				topCreators: (data.creators ?? []).slice(0, 3).map(c => ({
					handle: `@${c.author}`,
					platform: c.platform,
					views: c.views,
				})),
			},
		},
		leadSignals: signals && {
			month: signals.month,
			...Object.fromEntries(
				(['buzz', 'spends', 'problem', 'reachable'] as const).map(key => [
					key,
					signals[key]?.inputs,
				]),
			),
			newPlace: signals.newPlaceBonus > 0,
		},
	};
};

/** Writes `Prospect.hook` with `PitchHookAgent`: one call. */
@Injectable()
export class PitchHookService {
	constructor(
		private readonly reportService: ReportService,
		private readonly pitchHookAgent: PitchHookAgent,
	) {}

	/**
	 * One sentence in `language` from the brand's newest report and lead signals, or null when
	 * there is neither to write it from (no call then). A failed call throws.
	 */
	async suggest(brand: Brand, language: ProspectLanguage): Promise<string | null> {
		const input = pitchHookInput(brand, await this.reportService.latest(brand.id), language);
		if (!input.report && !input.leadSignals) return null;
		const res = await this.pitchHookAgent.generate(JSON.stringify(input));
		return (
			res.object.hook
				?.trim()
				.replace(/^["“„'](.*)["”“']$/s, '$1')
				.trim() || null
		);
	}
}
