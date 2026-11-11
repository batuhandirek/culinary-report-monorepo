import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { Topic, TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { type AspectCounts, foldAspectCounts } from '../util/aspect-counts.js';
import { monthsBetween, shiftMonth } from '../util/insight.js';

/** How many months, ending with the asked one, the per-month counts cover */
export const ASPECT_OVERVIEW_MONTHS = 12;

export interface AspectOverviewRow extends AspectCounts {
	topic: Topic;
	parentKey?: string;
}

/** Claims of the city with text and no aspect part, per month of the window */
export interface LooseClaimCounts {
	claims: number;
	byMonth: number[];
}

export interface AspectOverview {
	month: string;
	/** The window, oldest first, ending with `month` */
	months: string[];
	aspects: AspectOverviewRow[];
	/** Labelled and filed under no aspect */
	noAspect: LooseClaimCounts;
	/** Not labelled yet (`partsAt` null), so no aspect either */
	unread: LooseClaimCounts;
}

/**
 * The aspects with how many of a city's claims each holds: the admin's Aspects pages. Counts are
 * claims (rows of `statements` with text), not sources, and every claim of the city counts, own
 * posts included: the vocabulary's load, not a share of word of mouth (that is Explore's).
 */
@Injectable()
export class AspectOverviewService {
	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
	) {}

	async overview(cityId: string, month = previousMonth()): Promise<AspectOverview> {
		const months = monthsBetween(shiftMonth(month, -(ASPECT_OVERVIEW_MONTHS - 1)), month);
		const aspects = (await this.topicService.all()).filter(t => t.kind === TopicKindEnum.ASPECT);
		const conn = this.em.getConnection();
		const filed = await conn.execute<{ topicId: string; month: string; claims: number }[]>(
			`select ap.topic_id as "topicId", s.month, count(*)::int as claims
			from statements s join statement_parts ap on ap.statement_id = s.id and ap.role = 'aspect'
			where s.city_id = ? and s.text is not null
			group by 1, 2`,
			[cityId],
		);
		const loose = await conn.execute<{ month: string; noAspect: number; unread: number }[]>(
			`select s.month,
				count(*) filter (where s.parts_at is not null)::int as "noAspect",
				count(*) filter (where s.parts_at is null)::int as unread
			from statements s
			where s.city_id = ? and s.text is not null
				and not exists (select 1 from statement_parts ap where ap.statement_id = s.id and ap.role = 'aspect')
			group by 1`,
			[cityId],
		);
		const counts = foldAspectCounts(
			aspects.map(a => ({ id: a.id, parentId: rootIdOf(a) })),
			filed,
			months,
		);
		const looseOf = (field: 'noAspect' | 'unread'): LooseClaimCounts => {
			const byMonth = new Map(loose.map(r => [r.month, r[field]]));
			return {
				claims: loose.reduce((sum, r) => sum + r[field], 0),
				byMonth: months.map(m => byMonth.get(m) ?? 0),
			};
		};
		return {
			month,
			months,
			aspects: aspects.map(topic => {
				const parentKey = topic.parent?.key;
				return { topic, ...(parentKey && { parentKey }), ...counts.get(topic.id)! };
			}),
			noAspect: looseOf('noAspect'),
			unread: looseOf('unread'),
		};
	}
}

/** The id of an aspect's root (its one `is_a` edge's target); null for a root. `edges` must be loaded */
const rootIdOf = (aspect: Topic): string | null =>
	aspect.edges.getItems().find(e => e.type === 'is_a')?.to.id ?? null;
