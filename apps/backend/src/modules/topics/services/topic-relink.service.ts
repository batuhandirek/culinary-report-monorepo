import { Injectable, Logger } from '@nestjs/common';

import type { TopicIndex } from '../util/topics.js';

import { TopicService } from './topic.service.js';
import { VenueTopicService } from './venue-topic.service.js';

/**
 * Something stored that points at food topics by matching text (a menu item, a hashtag):
 * re-resolved against the current index whenever topics change. Pure matching, never an LLM.
 * Returns its counts for the log.
 */
export interface TopicRelinker {
	key: string;
	relink(index: TopicIndex): Promise<Record<string, number>>;
}

/**
 * The one re-link of everything linked to food topics (`TopicRelinkJob`). Owners register their
 * re-linker at module init, so topics never imports them; `TopicService.queueRelink` queues
 * the job on every topic change, and the job runs them all, one after another (the
 * terms, the menu items' topics, hashtags), then refreshes every city's venue tags, which read
 * them and what the posts' claims name.
 */
@Injectable()
export class TopicRelinkService {
	private readonly logger = new Logger(TopicRelinkService.name);
	private readonly relinkers = new Map<string, TopicRelinker>();

	constructor(
		private readonly topicService: TopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	register(relinker: TopicRelinker): void {
		if (this.relinkers.has(relinker.key)) throw new Error(`Food topic re-linker ${relinker.key} is registered twice`);
		this.relinkers.set(relinker.key, relinker);
	}

	/** Every registered re-linker against the index as it is now, in registration order */
	async relinkAll(): Promise<Record<string, Record<string, number>>> {
		let index = await this.topicService.index();
		const counts: Record<string, Record<string, number>> = {};
		// The terms first: their decisions are part of the index the others resolve with
		const ordered = [...this.relinkers.values()].sort((a, b) => Number(b.key === 'terms') - Number(a.key === 'terms'));
		for (const relinker of ordered) {
			counts[relinker.key] = await relinker.relink(index);
			this.logger.log(`Re-linked ${relinker.key} to topics: ${JSON.stringify(counts[relinker.key])}`);
			if (relinker.key === 'terms') index = await this.topicService.index();
		}
		// Then every venue's tags, which read the menu items' topics and the claims' wordings
		counts['venue-tags'] = await this.venueTopicService.refreshAll(index);
		this.logger.log(`Refreshed venue tags: ${JSON.stringify(counts['venue-tags'])}`);
		return counts;
	}
}
