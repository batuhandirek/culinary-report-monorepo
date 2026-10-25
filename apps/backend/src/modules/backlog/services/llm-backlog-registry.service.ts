import { Injectable, Logger } from '@nestjs/common';

import type { LlmBacklog } from '../interfaces/llm-backlog.interface.js';

/**
 * The registered LLM backlogs. Owners register theirs in `onModuleInit`, so the backlog module
 * never imports a domain module.
 */
@Injectable()
export class LlmBacklogRegistry {
	private readonly logger = new Logger(LlmBacklogRegistry.name);
	private readonly backlogs = new Map<string, LlmBacklog>();

	register(backlog: LlmBacklog): void {
		if (this.backlogs.has(backlog.key)) throw new Error(`LLM backlog ${backlog.key} is registered twice`);
		this.backlogs.set(backlog.key, backlog);
		this.logger.log(`Registered LLM backlog ${backlog.key}`);
	}

	/** Every backlog, the order the daily run takes them in: smaller priority first, then key */
	list(): LlmBacklog[] {
		return [...this.backlogs.values()].sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
	}

	get(key: string): LlmBacklog | undefined {
		return this.backlogs.get(key);
	}
}
