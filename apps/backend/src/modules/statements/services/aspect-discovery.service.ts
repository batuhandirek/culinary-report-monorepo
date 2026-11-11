import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { TopicKindEnum } from 'src/modules/topics/entities/topic.entity.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { aspectKey, type TopicIndex } from 'src/modules/topics/util/topics.js';
import { toVectorLiteral } from 'src/shared/util/vector.js';

import type {
	AspectSuggestion,
	AspectSuggestionContext,
} from '../agents/aspect-suggestion.agent.js';
import {
	DISCOVERY_FLOORS,
	DISCOVERY_MAX_CLAIMS,
	DISCOVERY_MAX_NAMED,
	DISCOVERY_MAX_REFILE,
	DISCOVERY_MIN_WORDS,
	DISCOVERY_READ_CHUNK,
} from '../constants/aspect-discovery.constant.js';
import { CLUSTER_DIMENSIONS, CLUSTER_SAMPLE_THRESHOLD } from '../constants/embeddings.constant.js';
import {
	type ClaimCluster,
	clusterClaims,
	type ClusterItem,
	diverseSamples,
} from '../util/cluster.js';
import { claimsOfCitySql, LOOSE_CLAIM_SQL } from '../util/loose-claims-sql.js';

import { StatementPartsService } from './statement-parts.service.js';

/** What the job made of one group */
export type DiscoveryOutcome =
	/** A new aspect was created from it (or would be, in a dry run) */
	| 'created'
	/** It names an aspect this run created from a larger group: its claims are read into that one */
	| 'joined'
	/** An aspect that existed before covers it: agent B filed it loosely, which a re-read won't change */
	| 'fits'
	/** About a root as a whole ("the food was good"): filed right where it is */
	| 'root'
	/** No aspect: a dish, a place, a verdict, or nothing about a place */
	| 'not_aspect'
	/** The label is a kind of food's name */
	| 'food'
	/** No root, or the agent did not answer */
	| 'unnamed';

export interface DiscoveredGroup {
	claims: number;
	sources: number;
	brands: number;
	samples: string[];
	label?: string;
	hint?: string;
	root?: string;
	outcome: DiscoveryOutcome;
	/** The aspect it was created as, joined or fits */
	aspect?: string;
}

export interface AspectDiscoveryResult {
	cityId: string;
	dryRun: boolean;
	/** Loose claims of 3+ words with a vector, of them the ones grouped */
	claims: number;
	considered: number;
	groups: DiscoveredGroup[];
	/** Groups past the floors beyond the named ones */
	more: number;
	created: string[];
	/** Loose claims near a new aspect's group handed to agent B again, and of them the ones it filed under a new aspect */
	refiled: number;
	filed: number;
}

/** One group as the plan hands it on: its figures, its samples, the agent's message and its centre */
export interface PlannedGroup {
	claims: number;
	sources: number;
	brands: number;
	samples: string[];
	/** `AspectSuggestionAgent`'s input for it */
	message: string;
	/** Its centroid's first `CLUSTER_DIMENSIONS` values, rounded: where the re-filing looks */
	centroid: number[];
}

/**
 * A city's discovery before any call: the loose claims grouped, the largest named groups, and the
 * agent's context (the aspect legend and the roots). Plain data, kept by the run between its plan
 * step and its saves: a city's ~100 groups with their centres, a few hundred kB once a week.
 */
export interface DiscoveryPlan {
	cityId: string;
	claims: number;
	considered: number;
	/** Groups past the floors beyond the named ones */
	more: number;
	groups: PlannedGroup[];
	context: AspectSuggestionContext;
}

/** What the create step made of the named groups, before any claim is read again */
export interface DiscoveryAspects {
	groups: DiscoveredGroup[];
	created: string[];
	/** The planned groups (by index) whose claims go to the aspect they were created as or joined */
	refile: { aspect: string; group: number }[];
}

interface Row extends ClusterItem {
	text: string;
	aspect: string | null;
}

/** Claims the agent reads of a group: the samples, then others */
const AGENT_CLAIMS = 12;
const SAMPLES = 5;
const CITY = 'city';
/** A label naming a root as a whole, whatever the agent was told */
const CATCH_ALL_LABEL = /^(overall|general|generic|total|in general)\b/i;

const parseVector = (text: string): number[] => text.slice(1, -1).split(',').map(Number);

/**
 * Aspect discovery, weekly and by itself (`AspectDiscoveryWorkflow`). For a city, its loose claims
 * (under no aspect, or at a root because nothing finer fitted; own posts out; 3+ words) are grouped
 * by meaning at `DISCOVERY_FLOORS` and the largest `DISCOVERY_MAX_NAMED` planned for
 * `AspectSuggestionAgent` (`plan`); the run asks the agent about each (a `DurableLlmService`
 * child, waiting for an account); each group that is an aspect and none that exists becomes one
 * (`createAspects`: `TopicService.create`, `discovered`), under the root the agent gave, with its
 * hint. Then the loose claims closest to each new aspect's group (cosine at the floor,
 * `DISCOVERY_MAX_REFILE` at most) lose `partsAt` and the labeller reads them again at once
 * (`refile`), so they move into it. Groups an existing aspect fits are only logged: the labeller
 * saw that aspect and chose the root, and a re-read with the same legend answers the same. Naming
 * on gpt-5.4's allowance, else Sonnet (cents); no review step (the user's call, 2026-11-03, as for
 * food topics). Weekly over the cron cities (`AspectDiscoverySchedule`).
 */
@Injectable()
export class AspectDiscoveryService {
	private readonly logger = new Logger(AspectDiscoveryService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly statementPartsService: StatementPartsService,
	) {}

	/** The active cities a run goes over, or only those whose cron is on */
	async cityIds(opts: { cronOnly?: boolean } = {}): Promise<string[]> {
		const cities: { id: string }[] = await this.em
			.getConnection()
			.execute(
				`select id from cities where active${opts.cronOnly ? ' and cron_enabled' : ''} order by name`,
			);
		return cities.map(c => c.id);
	}

	/** The city's loose claims grouped and the largest groups planned for the agent; writes nothing */
	async plan(cityId: string): Promise<DiscoveryPlan> {
		const index = await this.topicService.index();
		const { rows, claims } = await this.rows(cityId);
		const found = clusterClaims(rows, DISCOVERY_FLOORS);
		const named = found.slice(0, DISCOVERY_MAX_NAMED);
		return {
			cityId,
			claims,
			considered: rows.length,
			more: found.length - named.length,
			groups: named.map(cluster => {
				const samples = diverseSamples(cluster.items, SAMPLES, CLUSTER_SAMPLE_THRESHOLD);
				const ids = new Set(samples.map(s => s.id));
				const agentClaims = [
					...samples.map(s => s.text),
					...cluster.items.filter(r => !ids.has(r.id)).map(r => r.text),
				].slice(0, AGENT_CLAIMS);
				return {
					claims: cluster.items.length,
					sources: cluster.sources,
					brands: cluster.brands,
					samples: samples.map(r => r.text),
					message: JSON.stringify({
						claims: agentClaims,
						filedAt: this.filedAt(cluster),
					}),
					centroid: Array.from(cluster.centroid, v => Math.round(v * 1e5) / 1e5),
				};
			}),
			context: {
				legend: index.aspectLegend(),
				roots: index.aspects.filter(t => !t.isA.length).map(t => t.key),
			},
		};
	}

	/**
	 * The named groups decided in order (an answer missing, from a call that failed, leaves its group
	 * unnamed) and each new aspect created, so a later group naming it joins it; with `dryRun`
	 * nothing is written.
	 */
	async createAspects(
		plan: DiscoveryPlan,
		answers: (AspectSuggestion | null)[],
		{ dryRun }: { dryRun: boolean },
	): Promise<DiscoveryAspects> {
		let index = await this.topicService.index();
		const groups: DiscoveredGroup[] = [];
		const created: string[] = [];
		const refile: DiscoveryAspects['refile'] = [];
		for (const [i, planned] of plan.groups.entries()) {
			const answer = answers[i] ?? undefined;
			const group: DiscoveredGroup = {
				claims: planned.claims,
				sources: planned.sources,
				brands: planned.brands,
				samples: planned.samples,
				label: answer?.label.trim().split(/\s+/).slice(0, 4).join(' ') || undefined,
				hint: answer?.hint.trim() || undefined,
				root: answer?.root,
				outcome: 'unnamed',
			};
			groups.push(group);
			Object.assign(group, this.decide(group, answer, index, created));
			if (group.outcome === 'created' && !dryRun) {
				try {
					await this.topicService.create({
						label: group.label!,
						kind: TopicKindEnum.ASPECT,
						edges: [{ to: group.root!, type: 'is_a' }],
						hint: group.hint ?? null,
						discovered: true,
					});
					// The next groups are checked against it: a second group naming it joins it
					index = await this.topicService.index();
				} catch (e) {
					this.logger.warn(`Creating "${group.label}" failed: ${(e as Error).message}`);
					group.outcome = 'unnamed';
					continue;
				}
			}
			if (group.outcome === 'created') created.push(group.aspect!);
			if (group.outcome === 'created' || group.outcome === 'joined')
				refile.push({ aspect: group.aspect!, group: i });
		}
		return { groups, created, refile };
	}

	/** What a named group comes to, before anything is written */
	private decide(
		group: DiscoveredGroup,
		answer: AspectSuggestion | undefined,
		index: TopicIndex,
		createdThisRun: string[],
	): Pick<DiscoveredGroup, 'outcome' | 'aspect'> {
		if (!answer || !group.label) return { outcome: 'unnamed' };
		if (!answer.isAspect) return { outcome: 'not_aspect' };
		const fits = index.aspect(answer.fits);
		if (fits && index.isRoot(fits.key)) return { outcome: 'root', aspect: fits.key };
		if (fits)
			return createdThisRun.includes(fits.key) ?
					{ outcome: 'joined', aspect: fits.key }
				:	{ outcome: 'fits', aspect: fits.key };
		// "Overall food quality" is the root itself: there are no catch-all rows under a root
		if (CATCH_ALL_LABEL.test(group.label))
			return { outcome: 'root', aspect: index.aspect(group.root)?.key };
		const key = aspectKey(group.label);
		if (!key) return { outcome: 'unnamed' };
		// A label that is an aspect already ("Price level"), one this run made, or a twin by label
		const same =
			index.aspect(key)?.key ??
			index.aspects.find(a => a.label.toLowerCase() === group.label!.toLowerCase())?.key ??
			(createdThisRun.includes(key) ? key : undefined);
		if (same)
			return createdThisRun.includes(same) ?
					{ outcome: 'joined', aspect: same }
				:	{ outcome: 'fits', aspect: same };
		// "Döner", "Desserts": a kind of food's name is a food wording, never an aspect
		const food = index.exact(group.label);
		if (food && !index.isAspect(food)) return { outcome: 'food', aspect: food };
		if (!group.root || !index.aspect(group.root) || !index.isRoot(group.root))
			return { outcome: 'unnamed' };
		return { outcome: 'created', aspect: key };
	}

	private filedAt(cluster: ClaimCluster<Row>) {
		const counts = new Map<string, number>();
		for (const row of cluster.items) {
			const key = row.aspect ?? 'none';
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return [...counts]
			.map(([aspect, claims]) => ({ aspect, claims }))
			.sort((a, b) => b.claims - a.claims);
	}

	/** The city's loose claims of `DISCOVERY_MIN_WORDS`+ words with a vector, a fixed sample */
	private async rows(cityId: string): Promise<{ rows: Row[]; claims: number }> {
		const from = claimsOfCitySql(
			`and ${LOOSE_CLAIM_SQL} and s.embedded_at is not null
			and array_length(regexp_split_to_array(trim(s.text), '\\s+'), 1) >= ${DISCOVERY_MIN_WORDS}`,
		);
		const conn = this.em.getConnection();
		const [count]: { n: number }[] = await conn.execute(`select count(*)::int as n ${from}`, [
			cityId,
		]);
		const raw: {
			id: number;
			text: string;
			vector: string;
			source: string;
			brandId: string | null;
			venueName: string | null;
			aspect: string | null;
		}[] = await conn.execute(
			`select s.id, s.text, subvector(s.embedding, 1, ${CLUSTER_DIMENSIONS})::text as vector,
				coalesce('r' || s.review_id::text, 'p' || s.post_id::text, 'c' || s.comment_id::text,
					'w' || s.web_mention_id::text) as source,
				coalesce(rv.brand_id, m.brand_id)::text as "brandId", m.venue_name as "venueName", a.key as aspect
			${from} order by md5(s.id::text) limit ?`,
			[cityId, DISCOVERY_MAX_CLAIMS],
		);
		const rows = raw.map(r => ({
			id: Number(r.id),
			text: r.text,
			vector: parseVector(r.vector),
			source: r.source,
			brand: r.brandId ?? (r.venueName ? `place:${r.venueName.toLowerCase()}` : CITY),
			aspect: r.aspect,
		}));
		return { rows, claims: count.n };
	}

	/**
	 * The loose claims of the city (every one, not only the sample; own posts and short ones too)
	 * within the floor of a new aspect's groups, the closest first: their parts are cleared and
	 * agent B reads them again now, with the new aspects in its legend.
	 */
	async refile(
		plan: DiscoveryPlan,
		refile: DiscoveryAspects['refile'],
	): Promise<{ refiled: number; filed: number }> {
		if (!refile.length) return { refiled: 0, filed: 0 };
		const { cityId } = plan;
		const centroids = new Map<string, number[][]>();
		for (const { aspect, group } of refile)
			centroids.set(aspect, [...(centroids.get(aspect) ?? []), plan.groups[group].centroid]);
		const conn = this.em.getConnection();
		const ids = new Set<number>();
		for (const list of centroids.values())
			for (const centroid of list) {
				const vector = `${toVectorLiteral(centroid)}`;
				const near: { id: number }[] = await conn.execute(
					`select s.id from statements s
					left join statement_parts ap on ap.statement_id = s.id and ap.role = 'aspect'
					left join topics a on a.id = ap.topic_id
					where s.city_id = ? and s.text is not null and s.embedded_at is not null and ${LOOSE_CLAIM_SQL}
						and (subvector(s.embedding, 1, ${CLUSTER_DIMENSIONS}) <=> ?::halfvec(${CLUSTER_DIMENSIONS})) <= ?
					order by subvector(s.embedding, 1, ${CLUSTER_DIMENSIONS}) <=> ?::halfvec(${CLUSTER_DIMENSIONS})
					limit ?`,
					[cityId, vector, 1 - DISCOVERY_FLOORS.threshold, vector, DISCOVERY_MAX_REFILE],
				);
				near.forEach(r => ids.add(Number(r.id)));
			}
		const list = [...ids];
		// Cleared first, all of them: a read B can't finish (no free model left) leaves the rest to
		// the nightly `statement-parts` backlog, which reads every claim without `partsAt`
		for (let i = 0; i < list.length; i += DISCOVERY_READ_CHUNK) {
			const chunk = list.slice(i, i + DISCOVERY_READ_CHUNK);
			await conn.execute(
				`update statements set parts_at = null where id in (${chunk.map(() => '?').join(', ')})`,
				chunk,
				'run',
			);
		}
		this.em.clear();
		try {
			for (let i = 0; i < list.length; i += DISCOVERY_READ_CHUNK)
				await this.statementPartsService.read({
					ids: list.slice(i, i + DISCOVERY_READ_CHUNK),
				});
		} catch (e) {
			this.logger.warn(
				`Agent B stopped re-reading: ${(e as Error).message}. The rest waits for the nightly statement-parts backlog`,
			);
		}
		const keys = [...centroids.keys()];
		const [row]: { n: number }[] =
			list.length ?
				await conn.execute(
					`select count(distinct ap.statement_id)::int as n from statement_parts ap
					join topics a on a.id = ap.topic_id
					where ap.role = 'aspect' and a.key in (${keys.map(() => '?').join(', ')})
						and ap.statement_id in (${list.map(() => '?').join(', ')})`,
					[...keys, ...list],
				)
			:	[{ n: 0 }];
		return { refiled: list.length, filed: row.n };
	}

	/** The run's outcome in the log, a line per group */
	report(res: AspectDiscoveryResult): void {
		const lines = res.groups.map(
			g =>
				`  ${g.outcome.padEnd(10)} ${String(g.claims).padStart(4)} claims · ${g.label ?? '—'}` +
				(g.aspect ? ` → ${g.aspect}` : '') +
				(g.root && g.outcome === 'created' ? ` (under ${g.root})` : '') +
				` · "${g.samples.slice(0, 2).join('" / "')}"`,
		);
		this.logger.warn(
			`Aspect discovery${res.dryRun ? ' (dry run)' : ''} for city ${res.cityId}: ${res.considered} of ${res.claims} loose claims grouped, ` +
				`${res.groups.length} groups named (${res.more} more), ${res.created.length} aspects ${res.dryRun ? 'would be ' : ''}created` +
				(res.dryRun ? '' : (
					`, ${res.refiled} claims read again, ${res.filed} of them filed under a new aspect`
				)) +
				`\n${lines.join('\n')}`,
		);
	}
}
