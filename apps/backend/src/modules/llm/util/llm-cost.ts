/** Tokens of one answer or many, as both providers report them */
export interface LlmUsage {
	inputTokens: number;
	outputTokens: number;
	/** Of `inputTokens`, read from the prompt cache */
	cachedInputTokens: number;
	/** Of `inputTokens`, written to the prompt cache (Claude) */
	cacheWriteTokens: number;
}

/**
 * Per million tokens, in and out (cache reads 0.1×, writes 1.25× the input price), of the paid
 * models (`LLM_ROSTER`); OpenAI runs on its allowance and has no price here
 */
export const PRICES_PER_MTOK: Record<string, { in: number; out: number }> = {
	'anthropic/claude-opus-5-5': { in: 4, out: 20 },
	'anthropic/claude-sonnet-5-5': { in: 2, out: 10 },
	'anthropic/claude-haiku-5-5': { in: 0.1, out: 0.5 },
};

/** A Mastra answer's usage, the fields both providers report */
export const usageOf = (res: {
	totalUsage?: Record<string, unknown>;
	usage?: Record<string, unknown>;
}): LlmUsage => {
	const u = (res.totalUsage ?? res.usage ?? {}) as Record<string, number | undefined>;
	return {
		inputTokens: u.inputTokens ?? 0,
		outputTokens: u.outputTokens ?? 0,
		cachedInputTokens: u.cachedInputTokens ?? 0,
		cacheWriteTokens: u.cacheCreationInputTokens ?? 0,
	};
};

export const addUsage = (a: LlmUsage, b: LlmUsage): LlmUsage => ({
	inputTokens: a.inputTokens + b.inputTokens,
	outputTokens: a.outputTokens + b.outputTokens,
	cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
	cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
});

export const NO_USAGE: LlmUsage = {
	inputTokens: 0,
	outputTokens: 0,
	cachedInputTokens: 0,
	cacheWriteTokens: 0,
};

/**
 * Dollars for a usage on a model (0 for a model with no price: OpenAI's allowance). `inputTokens`
 * counts the cached and written tokens too (the AI SDK's total), so they are priced apart from it.
 */
export const costUsd = (model: string, usage: LlmUsage): number => {
	const price = PRICES_PER_MTOK[model];
	if (!price) return 0;
	const plain = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
	return (
		(plain * price.in +
			usage.cachedInputTokens * price.in * 0.1 +
			usage.cacheWriteTokens * price.in * 1.25 +
			usage.outputTokens * price.out) /
		1_000_000
	);
};

/** What one answer cost (`res.model` is the model that answered) */
export const answerUsd = (res: {
	model: string;
	totalUsage?: Record<string, unknown>;
	usage?: Record<string, unknown>;
}): number => costUsd(res.model, usageOf(res));
