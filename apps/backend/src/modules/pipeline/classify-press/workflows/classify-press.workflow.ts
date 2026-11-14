import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { ITEM_RUN_KEEP_DAYS } from 'src/modules/durable-workflows/constants/durable-workflows.constant.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { WebMentionKindEnum } from 'src/modules/venues/entities/web-mention.entity.js';
import {
	type PressPageForClassifying,
	WebMentionService,
} from 'src/modules/venues/services/web-mention.service.js';

import { PressClassificationAgent } from '../agents/press-classification.agent.js';
import {
	CLASSIFY_PRESS_PER_RUN,
	classifyPageWorkflowId,
} from '../constants/classify-press.constant.js';
import { CLASSIFY_PRESS_CITY_QUEUE, CLASSIFY_PRESS_QUEUE } from '../queues/classify-press.queue.js';
import { pressMessage } from '../util/press-message.js';

/** What classifying one page did: its kind, or nothing when it was classified meanwhile */
export type ClassifyPageResult = { classified: false } | { kind: WebMentionKindEnum };

/** What a city's run did: pages started, classified, and failed (each waits for an admin) */
export interface ClassifyPressCityResult {
	pages: number;
	classified: number;
	failed: number;
}

/**
 * The classification of the press pages `SCRAPE_PRESS` found (a feature, a listicle, a passing
 * mention or a namesake): one workflow per page, `PressClassificationAgent` as a child that waits
 * until an account can serve it, then its verdict saved. A city's run starts every unclassified
 * page's workflow under its fixed id and awaits them: the hourly schedule's, and what an operation
 * that needs the city's press read calls (`classifyPressOfCity`).
 */
@Injectable()
export class ClassifyPressWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly webMentionService: WebMentionService,
		private readonly agent: PressClassificationAgent,
	) {}

	@DurableWorkflow({ name: 'classify-press.city', keepDays: ITEM_RUN_KEEP_DAYS })
	@EnsureRequestContext()
	async classifyCity(cityId: string): Promise<ClassifyPressCityResult> {
		const pageIds = await this.unclassifiedPages(cityId);
		const handles: WorkflowHandle<ClassifyPageResult>[] = [];
		for (const pageId of pageIds)
			handles.push(
				await this.durable.start(this.classifyPage, [pageId], {
					queue: CLASSIFY_PRESS_QUEUE,
					workflowId: classifyPageWorkflowId(pageId),
					attributes: { cityId, purpose: 'classify-press' },
				}),
			);
		const result = { pages: pageIds.length, classified: 0, failed: 0 };
		for (const handle of handles) {
			const done = await handle.getResult().catch(() => null);
			if (!done) result.failed++;
			else if ('kind' in done) result.classified++;
		}
		return result;
	}

	@DurableWorkflow({ name: 'classify-press.page' })
	@EnsureRequestContext()
	async classifyPage(pageId: string): Promise<ClassifyPageResult> {
		const page = await this.plan(pageId);
		if (!page) return { classified: false };
		return withLlmCallContext({ cityId: page.cityId, purpose: 'classify-press' }, async () => {
			const answer = await this.durableLlm.generate(this.agent, pressMessage(page), {
				cityName: page.cityName,
			});
			await this.save(page.id, answer.object);
			return { kind: answer.object.kind };
		});
	}

	@DurableStep({ name: 'unclassified pages' })
	private async unclassifiedPages(cityId: string): Promise<string[]> {
		return this.webMentionService.unclassifiedIds(cityId, CLASSIFY_PRESS_PER_RUN);
	}

	/** The page as the classifier reads it; none when it was classified meanwhile */
	@DurableStep({ name: 'plan' })
	private async plan(pageId: string): Promise<PressPageForClassifying | null> {
		return this.webMentionService.pageForClassifying(pageId);
	}

	@DurableStep({ name: 'save classification' })
	private async save(
		pageId: string,
		answer: { kind: WebMentionKindEnum; summary: string },
	): Promise<void> {
		await this.webMentionService.saveClassification(pageId, answer);
	}
}

/**
 * The city's unclassified press pages classified, for an operation that needs them before it goes
 * on: its run on the city queue (one in flight per city) awaited. From a workflow's body only.
 */
export const classifyPressOfCity = async (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: ClassifyPressWorkflow,
	cityId: string,
): Promise<ClassifyPressCityResult> =>
	(
		await durable.start(workflow.classifyCity, [cityId], {
			queue: CLASSIFY_PRESS_CITY_QUEUE,
			dedupe: cityId,
			onDuplicate: 'return-existing',
			attributes: { cityId, purpose: 'classify-press' },
		})
	).getResult();
