import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { quarterMonths } from 'src/modules/food-trends/util/quarter.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { runPool } from 'src/shared/util/pool.js';

import { AspectSuggestionAgent } from '../agents/aspect-suggestion.agent.js';
import {
	CLUSTER_CACHE_MS,
	CLUSTER_CACHE_SCOPES,
	CLUSTER_DIMENSIONS,
	CLUSTER_FLOORS,
	CLUSTER_MAX_CLAIMS,
	CLUSTER_MAX_LABELLED,
	CLUSTER_SAMPLE_THRESHOLD,
	CLUSTER_SAMPLES,
} from '../constants/embeddings.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import type { StatementSourceKind } from '../entities/statement.entity.js';
import {
	type ClaimCluster,
	clusterClaims,
	type ClusterItem,
	diverseSamples,
} from '../util/cluster.js';
import { claimsOfCitySql, LOOSE_CLAIM_SQL } from '../util/loose-claims-sql.js';

/** Whose claims to cluster: a city's month or quarter, all aspect-less and root-filed claims or one root's (`none`: no aspect) */
export interface ClusterScope {
	cityId: string;
	month?: string;
	/** `YYYY-qN` */
	quarter?: string;
	/** A root's key: only the claims filed at it; `none`: only the claims under no aspect */
	root?: string;
}

/** A claim as a cluster lists it */
export interface ClusterClaim {
	id: number;
	text: string;
	sentiment?: Sentiment;
	sourceKind: StatementSourceKind;
	/** The brand it is about; absent for a claim about the city or nothing */
	brandName?: string;
}

/** A group of claims no aspect fits, with the suggestion agent's reading of it */
export interface MissingAspect {
	/** At most four words; absent when the agent did not answer */
	label?: string;
	hint?: string;
	/** The root it belongs under */
	root?: string;
	/** An existing aspect that already covers it, when the agent says so */
	fits?: { key: string; label: string };
	claims: number;
	sources: number;
	/** Brands it came up at, most claims first; the city counts as its own (no `id`) */
	brands: { id?: string; name: string; claims: number }[];
	/** Where its claims are filed now: a root, or none (`aspect` absent) */
	filedAt: { aspect?: string; label: string; claims: number }[];
	/** One claim per sub-cluster, the most central first */
	samples: ClusterClaim[];
	/** The phrase "See claims" searches the Claims tab with: the most central claim */
	like: string;
}

export interface MissingAspects {
	months: string[];
	root?: string;
	/** The scope's claims with no aspect or only a root, with a vector */
	claims: number;
	/** Of them, the ones clustered (at most `CLUSTER_MAX_CLAIMS`, a fixed pseudo-random pick) */
	considered: number;
	/** The scope's claims with no aspect or only a root that have no vector yet */
	notEmbedded: number;
	clusters: MissingAspect[];
	/** Clusters past the floors beyond the ones labelled and listed */
	more: number;
	computedAt: Date;
}

interface Row extends ClusterItem {
	text: string;
	sentiment: Sentiment | null;
	sourceKind: StatementSourceKind;
	brandName: string | null;
	aspect: string | null;
}

const CONCURRENCY = 5;
/** Claims the agent reads of a cluster: the samples, then others */
const AGENT_CLAIMS = 12;
const CITY = 'city';

/** "[0.1,0.2]" (pgvector's text form) → numbers */
const parseVector = (text: string): number[] => text.slice(1, -1).split(',').map(Number);

/**
 * "Missing aspects": the claims of a city's month or quarter that no aspect fits (no aspect part,
 * or filed at a root because nothing finer did), own posts out, grouped by meaning
 * (`clusterClaims`, greedy cosine over the vectors' first `CLUSTER_DIMENSIONS`), kept at
 * `CLUSTER_FLOORS`, largest first, each named by one `AspectSuggestionAgent` call. Nothing is
 * stored: a scope's answer is kept in memory for `CLUSTER_CACHE_MS`, and a cluster moves when it
 * is worked out again, so it is a discovery layer, never a count a report quotes. An admin creates
 * the aspect from a cluster (`TopicService.create`), and agent B files into it on its next read.
 */
@Injectable()
export class StatementClusterService {
	private readonly logger = new Logger(StatementClusterService.name);
	private readonly cache = new Map<string, { at: number; value: Promise<MissingAspects> }>();

	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly aspectSuggestionAgent: AspectSuggestionAgent,
	) {}

	clusters(scope: ClusterScope, now = Date.now()): Promise<MissingAspects> {
		const months = scopeMonths(scope);
		const key = [scope.cityId, months.join(','), scope.root ?? ''].join('|');
		const cached = this.cache.get(key);
		if (cached && now - cached.at < CLUSTER_CACHE_MS) {
			this.cache.delete(key);
			this.cache.set(key, cached);
			return cached.value;
		}
		const value = this.compute(scope.cityId, months, scope.root);
		this.cache.set(key, { at: now, value });
		// A failure, or a cluster the agent left unnamed, is worked out again on the next ask
		value.then(
			res => res.clusters.some(c => !c.label) && this.cache.delete(key),
			() => this.cache.delete(key),
		);
		if (this.cache.size > CLUSTER_CACHE_SCOPES)
			this.cache.delete(this.cache.keys().next().value!);
		return value;
	}

	private async compute(
		cityId: string,
		months: string[],
		root?: string,
	): Promise<MissingAspects> {
		const index = await this.topicService.index();
		if (root && root !== 'none' && !(index.isAspect(root) && index.isRoot(root)))
			throw new BadRequestException(`Not a root aspect: ${root}`);
		const { rows, claims, notEmbedded } = await this.rows(cityId, months, root);
		const found = clusterClaims(rows, CLUSTER_FLOORS);
		const labelled = found.slice(0, CLUSTER_MAX_LABELLED);
		const clusters = labelled.map(cluster => this.describe(cluster, index));
		await this.label(labelled, clusters, index);
		this.logger.log(
			`Missing aspects of ${months.join(', ')}${root ? ` (${root})` : ''}: ${found.length} clusters from ${rows.length} of ${claims} claims`,
		);
		return {
			months,
			root,
			claims,
			considered: rows.length,
			notEmbedded,
			clusters,
			more: found.length - labelled.length,
			computedAt: new Date(),
		};
	}

	/** The scope's claims to cluster, with their sources and brands, and the counts around them */
	private async rows(
		cityId: string,
		months: string[],
		root?: string,
	): Promise<{ rows: Row[]; claims: number; notEmbedded: number }> {
		const monthList = months.map(() => '?').join(', ');
		const rootSql =
			root === 'none' ? 'and a.id is null'
			: root ? 'and a.key = ?'
			: `and ${LOOSE_CLAIM_SQL}`;
		const from = claimsOfCitySql(`and s.month in (${monthList}) ${rootSql}`);
		const params = [cityId, ...months, ...(root && root !== 'none' ? [root] : [])];
		const conn = this.em.getConnection();
		const [counts]: { claims: number; notEmbedded: number }[] = await conn.execute(
			`select count(*) filter (where s.embedded_at is not null)::int as claims,
				count(*) filter (where s.embedded_at is null)::int as "notEmbedded" ${from}`,
			params,
		);
		const raw: {
			id: number;
			text: string;
			sentiment: Sentiment | null;
			sourceKind: StatementSourceKind;
			subject: string;
			vector: string;
			source: string;
			brandId: string | null;
			brandName: string | null;
			venueName: string | null;
			aspect: string | null;
		}[] = await conn.execute(
			`select s.id, s.text, s.sentiment, s.source_kind as "sourceKind", s.subject,
				subvector(s.embedding, 1, ${CLUSTER_DIMENSIONS})::text as vector,
				coalesce('r' || s.review_id::text, 'p' || s.post_id::text, 'c' || s.comment_id::text,
					'w' || s.web_mention_id::text, 'v' || s.venue_id::text) as source,
				coalesce(rv.brand_id, m.brand_id)::text as "brandId", coalesce(rb.name, mb.name) as "brandName",
				m.venue_name as "venueName", a.key as aspect
			${from} and s.embedded_at is not null
			order by md5(s.id::text) limit ?`,
			[...params, CLUSTER_MAX_CLAIMS],
		);
		const rows = raw.map((r): Row => ({
			id: Number(r.id),
			text: r.text,
			sentiment: r.sentiment,
			sourceKind: r.sourceKind,
			vector: parseVector(r.vector),
			source: r.source,
			// A claim about the city or nothing counts as the city's; an unmatched place by its name
			brand: r.brandId ?? (r.venueName ? `place:${r.venueName.toLowerCase()}` : CITY),
			brandName: r.brandName ?? r.venueName,
			aspect: r.aspect,
		}));
		return { rows, claims: counts.claims, notEmbedded: counts.notEmbedded };
	}

	/** What a cluster shows besides the agent's answer */
	private describe(cluster: ClaimCluster<Row>, index: TopicIndex): MissingAspect {
		const samples = diverseSamples(
			cluster.items,
			CLUSTER_SAMPLES,
			CLUSTER_SAMPLE_THRESHOLD,
		).map((row): ClusterClaim => ({
			id: row.id,
			text: row.text,
			sentiment: row.sentiment ?? undefined,
			sourceKind: row.sourceKind,
			brandName: row.brand === CITY ? undefined : (row.brandName ?? undefined),
		}));
		const brands = _.sortBy(
			Object.values(_.groupBy(cluster.items, row => row.brand)).map(group => ({
				id:
					group[0].brand === CITY || group[0].brand.startsWith('place:') ?
						undefined
					:	group[0].brand,
				name: group[0].brand === CITY ? 'The city' : (group[0].brandName ?? group[0].brand),
				claims: group.length,
			})),
			b => -b.claims,
		);
		const filedAt = _.sortBy(
			Object.entries(_.countBy(cluster.items, row => row.aspect ?? '')).map(
				([aspect, claims]) => ({
					aspect: aspect || undefined,
					label: aspect ? index.label(aspect) : 'No aspect',
					claims,
				}),
			),
			f => -f.claims,
		);
		return {
			claims: cluster.items.length,
			sources: cluster.sources,
			brands,
			filedAt,
			samples,
			like: samples[0].text,
		};
	}

	/** One suggestion call per cluster, side by side; a cluster the agent didn't answer stays unlabelled */
	private async label(
		found: ClaimCluster<Row>[],
		clusters: MissingAspect[],
		index: TopicIndex,
	): Promise<void> {
		const roots = index.aspects.filter(t => !t.parentKey).map(t => t.key);
		const legend = index.aspectLegend();
		try {
			await runPool(
				found.map((cluster, i) => i),
				CONCURRENCY,
				async i => {
					const out = clusters[i];
					const sampleIds = new Set(out.samples.map(s => s.id));
					const claims = [
						...out.samples.map(s => s.text),
						...found[i].items
							.filter(row => !sampleIds.has(row.id))
							.map(row => row.text),
					].slice(0, AGENT_CLAIMS);
					const res = await this.aspectSuggestionAgent.generate(
						JSON.stringify({
							claims,
							filedAt: out.filedAt.map(f => ({
								aspect: f.aspect ?? 'none',
								claims: f.claims,
							})),
						}),
						{ legend, roots },
					);
					const answer = res.object;
					out.label = answer.label.trim().split(/\s+/).slice(0, 4).join(' ') || undefined;
					out.hint = answer.hint.trim() || undefined;
					out.root =
						roots.includes(answer.root) ?
							answer.root
						:	(out.filedAt.find(f => f.aspect)?.aspect ?? undefined);
					// A root is no fit: these claims are filed at one already
					const fits = index.aspect(answer.fits);
					if (fits && !index.isRoot(fits.key))
						out.fits = { key: fits.key, label: index.label(fits.key) };
				},
				(i, e) =>
					this.logger.warn(
						`Naming a cluster of ${clusters[i].claims} claims failed: ${e.message}`,
					),
			);
		} catch (e) {
			// Every account out of allowance: the clusters are still worth showing, unnamed
			this.logger.warn(`Naming the clusters stopped: ${(e as Error).message}`);
		}
	}
}

/** The months a scope covers: its month, or its quarter's three */
export const scopeMonths = (scope: { month?: string; quarter?: string }): string[] => {
	if (scope.month && !scope.quarter) return [scope.month];
	if (scope.quarter && !scope.month) return quarterMonths(scope.quarter);
	throw new BadRequestException('Give a month or a quarter');
};
