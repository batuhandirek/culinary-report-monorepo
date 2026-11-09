/**
 * The model roster. An agent asks for a tier (`getModel()`), never a provider; the tier's models
 * are tried in order and a provider that can't serve (out of allowance or credit, key rejected) is
 * skipped until its block ends (`LlmModelsService`).
 */
export type LlmTier = 'mini' | 'full' | 'high';
export type LlmModelId = `openai/${string}` | `anthropic/${string}` | `openrouter/${string}`;
/** A tier, or one model first (the rest of its tier behind it) */
export type LlmModelChoice = LlmTier | LlmModelId;
export type LlmProvider = 'openai' | 'anthropic' | 'openrouter';

/**
 * OpenRouter's free model the roster falls to once OpenAI's allowance is out (`<org>/<model>:free`:
 * $0, 20 requests a minute, 50 a day per account, 1,000 once $10 of credit was ever bought). Free
 * models come and go on OpenRouter: when this one is gone, pick another from
 * `https://openrouter.ai/api/v1/models` that lists `structured_outputs`, and run the eval on it.
 */
export const OPENROUTER_FREE_MODEL: LlmModelId = 'openrouter/nvidia/nemotron-3.5-super-vl:free';

/**
 * Each tier's free models are OpenAI's daily complimentary allowance (10M tokens a day per account
 * on mini, 1M on the full model), then OpenRouter's free model (`OPENROUTER_FREE_MODEL`). Its
 * Claude models, paid from the Anthropic credit, serve only inside `llmPaid` (work the user starts
 * by hand): there `mini` and `full` move to Claude once the free ones are out, and `high` asks
 * Claude's top model first. Outside it every tier runs on its free models alone, `high` on
 * gpt-5.4. Per million tokens, input/output: Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5
 * $4/$20.
 */
export const LLM_ROSTER: Record<LlmTier, LlmModelId[]> = {
	mini: ['openai/gpt-5.4-mini', OPENROUTER_FREE_MODEL, 'anthropic/claude-haiku-5-5'],
	full: ['openai/gpt-5.4', OPENROUTER_FREE_MODEL, 'anthropic/claude-sonnet-5-5'],
	high: ['anthropic/claude-opus-5-5', 'openai/gpt-5.4', OPENROUTER_FREE_MODEL],
};

export const LLM_TIERS = Object.keys(LLM_ROSTER) as LlmTier[];

export const isLlmModelChoice = (value: string): value is LlmModelChoice =>
	value in LLM_ROSTER ||
	/^(openai|anthropic)\/[\w.-]+$/.test(value) ||
	/^openrouter\/[\w.-]+\/[\w.-]+(:free)?$/.test(value);

export const providerOf = (model: LlmModelId): LlmProvider =>
	model.startsWith('openai/') ? 'openai'
	: model.startsWith('openrouter/') ? 'openrouter'
	: 'anthropic';

/** An OpenRouter model that costs nothing per token (its `:free` variant) */
export const isOpenRouterFree = (model: LlmModelId): boolean =>
	model.startsWith('openrouter/') && model.endsWith(':free');

/**
 * Paid per token, with no allowance: used only inside `llmPaid`. OpenAI runs on its allowance and
 * OpenRouter's `:free` models cost nothing; any other OpenRouter model is paid (and priced nowhere)
 */
export const isPaidModel = (model: LlmModelId): boolean =>
	!model.startsWith('openai/') && !isOpenRouterFree(model);

/**
 * The tier a choice runs in: the tier itself, or the first tier listing the model (a model no
 * tier lists counts as `full`)
 */
export const tierOf = (choice: LlmModelChoice): LlmTier =>
	choice in LLM_ROSTER ?
		(choice as LlmTier)
	:	(LLM_TIERS.find(t => LLM_ROSTER[t].includes(choice as LlmModelId)) ?? 'full');

/** The models to try, in order: a tier's roster, or the chosen model then the rest of its tier */
export const modelsFor = (choice: LlmModelChoice): LlmModelId[] => {
	if (choice in LLM_ROSTER) return LLM_ROSTER[choice as LlmTier];
	const model = choice as LlmModelId;
	const tier = LLM_TIERS.find(t => LLM_ROSTER[t].includes(model));
	return tier ? [model, ...LLM_ROSTER[tier].filter(m => m !== model)] : [model];
};
