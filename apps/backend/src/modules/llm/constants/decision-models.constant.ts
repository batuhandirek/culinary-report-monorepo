/**
 * Decision models: they write no text, only typed answers to declared questions (pick one option,
 * a score, yes or no), each with probabilities. `*.classifier.ts` files run on them
 * (`BaseMastraClassifier`). `typesafe-ai/<model>` is TypeSafe's Jev (`@ai-sdk/typesafe-ai`).
 */
export type DecisionModelId = `typesafe-ai/${string}`;

export const DECISION_PROVIDERS = ['typesafe-ai'] as const;
export type DecisionProvider = (typeof DECISION_PROVIDERS)[number];

export const isDecisionModelId = (value: string): value is DecisionModelId =>
	/^typesafe-ai\/[\w.-]+$/.test(value);

export const decisionProviderOf = (model: DecisionModelId): DecisionProvider =>
	model.split('/')[0] as DecisionProvider;

/**
 * Per million tokens, in and out, per provider. TypeSafe bills input only ($0.042 a million as
 * reported at launch, 2026-09): no allowance, every call is paid.
 */
export const DECISION_PRICES_PER_MTOK: Record<DecisionProvider, { in: number; out: number }> = {
	'typesafe-ai': { in: 0.042, out: 0 },
};

/** Dollars for one decision's usage */
export const decisionCostUsd = (
	model: DecisionModelId,
	usage: { inputTokens?: number; outputTokens?: number },
): number => {
	const price = DECISION_PRICES_PER_MTOK[decisionProviderOf(model)];
	return (
		((usage.inputTokens ?? 0) * price.in + (usage.outputTokens ?? 0) * price.out) / 1_000_000
	);
};
