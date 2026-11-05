import { describe, expect, it, jest } from '@jest/globals';
import type { BooleanQuestion, ChoiceQuestion } from '@mastra/core/classifier';

import {
	BaseMastraClassifier,
	type BaseMastraClassifierConfig,
} from '../abstractions/base-mastra-classifier.abstract.js';
import type { DecisionModelId } from '../constants/decision-models.constant.js';
import {
	DecisionModelsService,
	PaidDecisionModelError,
} from '../services/decision-models.service.js';
import { llmPaid } from '../util/llm-scope.js';

type Questions = {
	route: ChoiceQuestion<{ billing: string; technical: string }>;
	urgent: BooleanQuestion;
};

class RouteClassifier extends BaseMastraClassifier<Questions> {
	protected readonly config: BaseMastraClassifierConfig = {
		id: 'route',
		name: 'RouteClassifier',
	};

	protected getModel(): DecisionModelId {
		return 'typesafe-ai/jev-latest';
	}

	protected getQuestions(): Questions {
		return {
			route: {
				type: 'choice',
				instructions: 'Which team handles it?',
				criteria: { billing: 'Charges and refunds', technical: 'Bugs and outages' },
			},
			urgent: { type: 'boolean', instructions: 'Is it urgent?' },
		};
	}
}

// A decision model as the AI SDK specifies one, answering what it is given
const fakeModel = (answers: Record<string, unknown>) => ({
	specificationVersion: 'v4' as const,
	provider: 'typesafe-ai.decision',
	modelId: 'jev-latest',
	supportedQuestionTypes: ['choice', 'score', 'boolean'] as const,
	doDecide: jest.fn(async (_options: unknown) => ({
		answers,
		usage: { inputTokens: 1000, outputTokens: 10 },
		warnings: [],
	})),
});

const classifierOn = (model: ReturnType<typeof fakeModel>) => {
	const classifier = new RouteClassifier();
	const decisionModels = { model: jest.fn((_id: DecisionModelId, _call?: unknown) => model) };
	(classifier as unknown as { decisionModels: typeof decisionModels }).decisionModels =
		decisionModels;
	return { classifier, decisionModels };
};

const ANSWERS = {
	route: { type: 'choice', choice: 'billing', probabilities: { billing: 0.9, technical: 0.1 } },
	urgent: { type: 'boolean', probability: 0.2 },
};

describe('BaseMastraClassifier', () => {
	it('asks its questions about the state through Mastra, and returns the answers, the model and the cost', async () => {
		const model = fakeModel(ANSWERS);
		const { classifier, decisionModels } = classifierOn(model);
		const res = await classifier.decide({ message: 'I was charged twice' });
		expect(decisionModels.model).toHaveBeenCalledWith('typesafe-ai/jev-latest', {
			inProduction: undefined,
		});
		expect(res.answers.route).toMatchObject({ type: 'choice', choice: 'billing' });
		expect(res.answers.urgent).toMatchObject({ type: 'boolean', probability: 0.2 });
		expect(res.model).toBe('typesafe-ai/jev-latest');
		// Input only, at TypeSafe's price
		expect(res.usd).toBeCloseTo((1000 * 0.042) / 1_000_000, 10);
		const [options] = model.doDecide.mock.calls[0] as [{ questions: unknown; state: unknown }];
		expect(options.questions).toEqual(JSON.parse(classifier.rulesFor()));
		expect(JSON.stringify(options.state)).toContain('I was charged twice');
	});

	it('runs on a model a call picks', async () => {
		const { classifier, decisionModels } = classifierOn(fakeModel(ANSWERS));
		const res = await classifier.decide('charged twice', undefined, {
			model: 'typesafe-ai/jev-1.14.0',
		});
		expect(decisionModels.model).toHaveBeenCalledWith('typesafe-ai/jev-1.14.0', {
			inProduction: undefined,
		});
		expect(res.model).toBe('typesafe-ai/jev-1.14.0');
	});

	it('rejects an answer that is none of the options, never a partial result', async () => {
		const { classifier } = classifierOn(
			fakeModel({ ...ANSWERS, route: { type: 'choice', choice: 'sales' } }),
		);
		await expect(classifier.decide('charged twice')).rejects.toThrow();
	});
});

describe('DecisionModelsService', () => {
	it('serves a decision model only inside llmPaid: production never pays', async () => {
		const service = new DecisionModelsService({ typesafeAiApiKey: 'key' });
		expect(() => service.model('typesafe-ai/jev-latest')).toThrow(PaidDecisionModelError);
		const model = await llmPaid(async () => service.model('typesafe-ai/jev-latest'));
		expect(model).toMatchObject({ modelId: 'jev-latest' });
	});

	it('under LLM_INGESTION_ONLY serves only a reading classifier, but anything inside llmPaid', async () => {
		const service = new DecisionModelsService({ typesafeAiApiKey: 'key', ingestionOnly: true });
		expect(() =>
			service.model('typesafe-ai/jev-latest', { inProduction: true, ingestion: true }),
		).not.toThrow();
		expect(() => service.model('typesafe-ai/jev-latest', { inProduction: true })).toThrow(
			'paused, only the reading runs (LLM_INGESTION_ONLY)',
		);
		await expect(
			llmPaid(async () => service.model('typesafe-ai/jev-latest')),
		).resolves.toMatchObject({ modelId: 'jev-latest' });
	});

	it('needs the TypeSafe key', async () => {
		const service = new DecisionModelsService({});
		await expect(llmPaid(async () => service.model('typesafe-ai/jev-latest'))).rejects.toThrow(
			'TYPESAFE_AI_API_KEY',
		);
	});
});
