import { Injectable, Logger } from '@nestjs/common';

import type { FoodTopicIndex } from '../util/food-topics.js';

import { FoodTopicService } from './food-topic.service.js';
import { VenueFoodTopicService } from './venue-food-topic.service.js';

/**
 * Something stored that points at food topics by matching text (a feedback row's dish, a mention's
 * cuisine): re-resolved against the current index whenever topics or aliases change. Pure matching,
 * never an LLM. Returns its counts for the log.
 */
export interface FoodTopicRelinker {
	key: string;
	relink(index: FoodTopicIndex): Promise<Record<string, number>>;
}

/**
 * The one re-link of everything linked to food topics (`FoodTopicRelinkJob`). Owners register their
 * re-linker at module init, so food-topics never imports them; `FoodTopicService.queueRelink` queues
 * the job on every topic or alias change, and the job runs them all, one after another (the
 * mentions' and menu items' topics, feedback dishes, hashtags), then refreshes every city's venue
 * tags, which read them.
 */
@Injectable()
export class FoodTopicRelinkService {
	private readonly logger = new Logger(FoodTopicRelinkService.name);
	private readonly relinkers = new Map<string, FoodTopicRelinker>();

	constructor(
		private readonly foodTopicService: FoodTopicService,
		private readonly venueFoodTopicService: VenueFoodTopicService,
	) {}

	register(relinker: FoodTopicRelinker): void {
		if (this.relinkers.has(relinker.key)) throw new Error(`Food topic re-linker ${relinker.key} is registered twice`);
		this.relinkers.set(relinker.key, relinker);
	}

	/** Every registered re-linker against the index as it is now, in registration order */
	async relinkAll(): Promise<Record<string, Record<string, number>>> {
		const index = await this.foodTopicService.index();
		const counts: Record<string, Record<string, number>> = {};
		for (const relinker of this.relinkers.values()) {
			counts[relinker.key] = await relinker.relink(index);
			this.logger.log(`Re-linked ${relinker.key} to food topics: ${JSON.stringify(counts[relinker.key])}`);
		}
		// Then every venue's tags, which read the mentions' and menu items' topics
		counts['venue-tags'] = await this.venueFoodTopicService.refreshAll(index);
		this.logger.log(`Refreshed venue tags: ${JSON.stringify(counts['venue-tags'])}`);
		return counts;
	}
}
