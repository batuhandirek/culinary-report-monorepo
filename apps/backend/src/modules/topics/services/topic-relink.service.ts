import { Injectable, Logger } from '@nestjs/common';

import type { TopicIndex } from '../util/topics.js';

import { TopicService } from './topic.service.js';
import { VenueTopicService } from './venue-topic.service.js';

/**
 * Something stored that points at food topics by matching text (a feedback row's dish, a mention's
 * cuisine): re-resolved against the current index whenever topics or aliases change. Pure matching,
 * never an LLM. Returns its counts for the log.
 */
export interface TopicRelinker {
	key: string;
	relink(index: TopicIndex): Promise<Record<string, number>>;
}

/**
 * The one re-link of everything linked to food topics (`TopicRelinkJob`). Owners register their
 * re-linker at module init, so topics never imports them; `TopicService.queueRelink` queues
 * the job on every topic or alias change, and the job runs them all, one after another (the
 * mentions' and menu items' topics, feedback dishes, hashtags), then refreshes every city's venue
 * tags, which read them.
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
		const index = await this.topicService.index();
		const counts: Record<string, Record<string, number>> = {};
		for (const relinker of this.relinkers.values()) {
			counts[relinker.key] = await relinker.relink(index);
			this.logger.log(`Re-linked ${relinker.key} to food topics: ${JSON.stringify(counts[relinker.key])}`);
		}
		// Then every venue's tags, which read the mentions' and menu items' topics
		counts['venue-tags'] = await this.venueTopicService.refreshAll(index);
		this.logger.log(`Refreshed venue tags: ${JSON.stringify(counts['venue-tags'])}`);
		return counts;
	}
}
