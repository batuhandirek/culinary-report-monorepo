import { createTypeSafeAi, type TypeSafeAiProvider } from '@ai-sdk/typesafe-ai';
import type { ClassifierModel } from '@mastra/core/classifier';

import { type DecisionModelId, decisionProviderOf } from '../constants/decision-models.constant.js';
import { isLlmPaid } from '../util/llm-scope.js';

/**
 * A decision model that can't serve here: switched off, no key, or paid outside hand-started work
 * for a classifier not allowed in production. Its message says "No model can serve", so
 * `isFatalProviderError` stops the pool and a reading pass waits, as with no LLM at all.
 */
export class PaidDecisionModelError extends Error {
	constructor(model: DecisionModelId, why: string) {
		super(`No model can serve ${model}: ${why}`);
		this.name = 'PaidDecisionModelError';
	}
}

/**
 * The decision models `BaseMastraClassifier` runs on, by id. Every decision model is paid (no
 * allowance), so like the roster's Claude models they serve only inside `llmPaid`, except for a
 * classifier the user allowed in production by name (`paidInProduction`: the claim-labels
 * classifier, 2026-11-05). `LLM_DISABLE_TYPESAFE` leaves TypeSafe out entirely.
 */
export class DecisionModelsService {
	private typesafe?: TypeSafeAiProvider;

	constructor(
		private readonly opts: {
			typesafeAiApiKey?: string;
			disabled?: { typesafe?: boolean };
			/** Only the reading classifiers run outside `llmPaid` (`LLM_INGESTION_ONLY`) */
			ingestionOnly?: boolean;
		},
	) {}

	model(
		id: DecisionModelId,
		call: { inProduction?: boolean; ingestion?: boolean } = {},
	): ClassifierModel {
		if (this.opts.ingestionOnly && !call.ingestion && !isLlmPaid())
			throw new PaidDecisionModelError(
				id,
				'paused, only the reading runs (LLM_INGESTION_ONLY)',
			);
		if (!isLlmPaid() && !call.inProduction)
			throw new PaidDecisionModelError(
				id,
				'it is paid per call and this classifier runs only inside llmPaid (work started by hand, such as the eval with --paid)',
			);
		const modelId = id.slice(id.indexOf('/') + 1);
		switch (decisionProviderOf(id)) {
			case 'typesafe-ai': {
				if (this.opts.disabled?.typesafe)
					throw new PaidDecisionModelError(
						id,
						'TypeSafe is switched off (LLM_DISABLE_TYPESAFE)',
					);
				if (!this.opts.typesafeAiApiKey)
					throw new PaidDecisionModelError(
						id,
						'TYPESAFE_AI_API_KEY is not set (env/server/.env.local): TypeSafe classifiers need it',
					);
				this.typesafe ??= createTypeSafeAi({ apiKey: this.opts.typesafeAiApiKey });
				return this.typesafe.decisionModel(modelId) as ClassifierModel;
			}
		}
	}
}
