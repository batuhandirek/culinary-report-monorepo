import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import _ from 'lodash';

import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { normalizeCuisine } from 'src/modules/venues/util/cuisine.js';
import { isFoodVenue } from 'src/modules/venues/util/venue-names.js';

import { FoodTopic, FoodTopicKindEnum } from '../entities/food-topic.entity.js';
import { FoodTopicIgnoredWord } from '../entities/food-topic-ignored-word.entity.js';
import { FoodTopicRelinkJob } from '../jobs/food-topic-relink.job.js';
import { FoodTopicIndex } from '../util/food-topics.js';

// Unmapped keys the admin read lists, most used first, each with the venues it was said of
const UNMAPPED_LIMIT = 100;
const UNMAPPED_EXAMPLES = 3;

export interface FoodTopicCounts {
	topic: FoodTopic;
	/** The city's matched mentions resolving to it (not its children), all time */
	mentions: number;
	/** The city's venues whose Google category resolves to it */
	venues: number;
}

export interface FoodTopicOverview {
	topics: FoodTopicCounts[];
	/** `normalizeCuisine` keys of the city's mentions and food venues' categories that resolve to no topic, ignored ones left out */
	unmapped: { key: string; mentions: number; venues: number; examples: string[] }[];
	/** Words an admin dismissed, of every city */
	ignored: string[];
}

/** What an admin sets on a topic; on an update only the fields given change, null clears. */
export interface FoodTopicInput {
	label?: string;
	kind?: FoodTopicKindEnum;
	parentKey?: string | null;
	aliases?: string[];
	trendsTopicId?: string | null;
	trendsQuery?: string | null;
}

/**
 * The food topics (`FoodTopic`): the index every reader resolves raw cuisines with, the topics
 * Google Trends searches, and the admin's view of how the city's data maps onto them.
 */
@Injectable()
export class FoodTopicService {
	constructor(
		private readonly em: EntityManager,
		private readonly pgBossService: PgBossService,
	) {}

	/**
	 * Queues the re-link of everything stored against topics (`FoodTopicRelinkService`): after every
	 * change to a topic or its aliases, so a new alias reaches every page the way matching on read did.
	 * One runs and one waits.
	 */
	async queueRelink(): Promise<void> {
		await this.pgBossService.sendJob(FoodTopicRelinkJob.jobName, new FoodTopicRelinkJob({}), {
			singletonKey: FoodTopicRelinkJob.singletonKey,
		});
	}

	async all(): Promise<FoodTopic[]> {
		return this.em.find(FoodTopic, { deletedAt: null }, { orderBy: { key: 'asc' } });
	}

	/** The index over every topic, read fresh: topics are few and an admin may have just edited one. */
	async index(): Promise<FoodTopicIndex> {
		return toIndex(await this.all());
	}

	/** The topics Google Trends is searched for: those with a topic id or a query. */
	async searched(): Promise<FoodTopic[]> {
		return (await this.all()).filter(t => t.trendsTopicId || t.trendsQuery);
	}

	/**
	 * A new topic. Its key is the `normalizeCuisine` key of `key`, else of the label: 400 when that
	 * says nothing ("Restaurant"), 409 naming the topic that has it ("Coffee" is the café's "cafe").
	 */
	async create(
		input: FoodTopicInput & { label: string; kind: FoodTopicKindEnum; key?: string },
	): Promise<FoodTopic> {
		const key = normalizeCuisine(input.key ?? input.label);
		if (!key)
			throw new BadRequestException(`"${input.key ?? input.label}" names no kind of food`);
		const taken = await this.em.findOne(FoodTopic, { key });
		// "Coffee" makes the key "cafe": say which topic has it, so the admin picks another label
		if (taken)
			throw new ConflictException(
				`"${input.key ?? input.label}" makes the key "${key}", which ${taken.label} has: pick another label`,
			);
		const topic = this.em.create(FoodTopic, {
			key,
			label: input.label.trim(),
			kind: input.kind,
		});
		await this.apply(topic, input);
		await this.em.flush();
		await this.queueRelink();
		return topic;
	}

	/** Changes what `input` gives; the key stays, since stored trends rows carry it. */
	async update(id: string, input: FoodTopicInput): Promise<FoodTopic> {
		const topic = await this.em.findOneOrFail(FoodTopic, { id, deletedAt: null });
		await this.apply(topic, input);
		await this.em.flush();
		await this.queueRelink();
		return topic;
	}

	/**
	 * Sets the input's fields. A parent must exist and not sit under the topic (400); an alias that
	 * already names another topic as a whole is refused (400), since the first topic would keep it.
	 * Aliases are trimmed and kept once; one that is the topic's own key is dropped.
	 */
	private async apply(topic: FoodTopic, input: FoodTopicInput): Promise<void> {
		const others = (await this.all()).filter(t => t.key !== topic.key);
		if (input.label !== undefined) topic.label = input.label.trim();
		if (input.kind !== undefined) topic.kind = input.kind;
		if (input.parentKey !== undefined) {
			if (input.parentKey === null) topic.parent = null;
			else {
				const parent = others.find(t => t.key === input.parentKey);
				if (!parent) throw new BadRequestException(`No topic "${input.parentKey}"`);
				// A new topic has no children yet, so only a stored one can become its own ancestor
				const byId = new Map(others.map(t => [t.id, t]));
				for (
					let up: FoodTopic | undefined = parent;
					topic.id && up;
					up = up.parent ? byId.get(up.parent.id) : undefined
				) {
					if (up.parent && up.parent.id === topic.id) {
						throw new BadRequestException(
							`"${parent.label}" sits under "${topic.label}": pick another parent`,
						);
					}
				}
				topic.parent = parent;
			}
		}
		if (input.aliases !== undefined) {
			const index = toIndex(others);
			const aliases = _.uniqBy(
				input.aliases.map(a => a.trim()).filter(Boolean),
				a => normalizeCuisine(a) ?? a.toLowerCase(),
			).filter(a => normalizeCuisine(a) !== topic.key);
			for (const alias of aliases) {
				const taken = index.exact(alias);
				if (taken)
					throw new BadRequestException(
						`"${alias}" already means "${index.get(taken)?.label ?? taken}"`,
					);
			}
			topic.aliases = aliases;
		}
		if (input.trendsTopicId !== undefined)
			topic.trendsTopicId = input.trendsTopicId?.trim() || null;
		if (input.trendsQuery !== undefined) topic.trendsQuery = input.trendsQuery?.trim() || null;
	}

	/** Dismisses a word from the unrecognised list (`ignore`), or brings it back. Idempotent; flushes. */
	async setIgnored(word: string, ignored: boolean): Promise<void> {
		const key = normalizeCuisine(word) ?? word.trim().toLowerCase();
		const row = await this.em.findOne(FoodTopicIgnoredWord, { key });
		if (ignored && !row) this.em.create(FoodTopicIgnoredWord, { key });
		if (!ignored && row) this.em.remove(row);
		await this.em.flush();
	}

	async overview(cityId: string): Promise<FoodTopicOverview> {
		const topics = await this.all();
		const ignored = (
			await this.em.find(FoodTopicIgnoredWord, {}, { orderBy: { key: 'asc' } })
		).map(w => w.key);
		const index = toIndex(topics);
		const conn = this.em.getConnection();
		const [mentionRows, venueRows] = await Promise.all([
			conn.execute<
				{ cuisine: string | null; category: string | null; name: string; n: number }[]
			>(
				`select m.cuisine, v.category, v.name, count(*)::int as n from mentions m
					join venues v on v.id = m.venue_id
					where v.city_id = ? group by 1, 2, 3`,
				[cityId],
			),
			conn.execute<{ category: string | null; name: string; n: number }[]>(
				`select category, name, 1 as n from venues where city_id = ?`,
				[cityId],
			),
		]);
		const mentions = new Map<string, number>();
		const venues = new Map<string, number>();
		const unmapped = new Map<
			string,
			{ key: string; mentions: number; venues: number; names: Map<string, number> }
		>();
		const miss = (
			raw: string | null,
			field: 'mentions' | 'venues',
			n: number,
			name: string,
		) => {
			const key = normalizeCuisine(raw);
			if (!key) return;
			const row = unmapped.get(key) ?? {
				key,
				mentions: 0,
				venues: 0,
				names: new Map<string, number>(),
			};
			row[field] += n;
			row.names.set(name, (row.names.get(name) ?? 0) + n);
			unmapped.set(key, row);
		};
		for (const r of mentionRows) {
			const keys = index.resolveMention(r.cuisine, r.category);
			if (!keys.length) miss(r.cuisine ?? r.category, 'mentions', r.n, r.name);
			for (const k of keys) mentions.set(k, (mentions.get(k) ?? 0) + r.n);
		}
		for (const r of venueRows) {
			const keys = index.resolve(r.category);
			// A hotel or a dance school a scrape found is no kind of food to map
			if (!keys.length && isFoodVenue(r.category)) miss(r.category, 'venues', r.n, r.name);
			for (const k of keys) venues.set(k, (venues.get(k) ?? 0) + r.n);
		}
		return {
			topics: topics.map(topic => ({
				topic,
				mentions: mentions.get(topic.key) ?? 0,
				venues: venues.get(topic.key) ?? 0,
			})),
			ignored,
			unmapped: _.sortBy(
				[...unmapped.values()].filter(r => !ignored.includes(r.key)),
				r => -(r.mentions * 5 + r.venues),
				r => r.key,
			)
				.slice(0, UNMAPPED_LIMIT)
				.map(({ names, ...r }) => ({
					...r,
					examples: _.sortBy(
						[...names],
						([, n]) => -n,
						([name]) => name,
					)
						.slice(0, UNMAPPED_EXAMPLES)
						.map(([name]) => name),
				})),
		};
	}
}

const toIndex = (topics: FoodTopic[]) =>
	new FoodTopicIndex(
		topics.map(t => ({
			id: t.id,
			key: t.key,
			label: t.label,
			kind: t.kind,
			parentKey: t.parent ? (topics.find(p => p.id === t.parent!.id)?.key ?? null) : null,
			aliases: t.aliases,
		})),
	);
