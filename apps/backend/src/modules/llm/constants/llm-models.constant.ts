/**
 * The model roster. An agent asks for a tier (`getModel()`), never a provider; the tier's models
 * are tried in order and a provider that can't serve (out of allowance or credit, key rejected) is
 * skipped until its block ends (`LlmModelsService`).
 */
export type LlmTier = 'mini' | 'full' | 'high';
export type LlmModelId = `openai/${string}` | `anthropic/${string}`;
/** A tier, or one model first (the rest of its tier behind it) */
export type LlmModelChoice = LlmTier | LlmModelId;

/**
 * Each tier's free model is OpenAI's daily complimentary allowance (10M tokens a day per account
 * on mini, 1M on the full model). Its Claude models, paid from the Anthropic credit, serve only
 * inside `llmPaid` (work the user starts by hand): there `mini` and `full` move to Claude once the
 * allowance is out, and `high` asks Claude's top model first. Outside it every tier runs on its
 * OpenAI model alone, `high` on the full one. Per million tokens, input/output: Haiku 5.5
 * $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20.
 */
export const LLM_ROSTER: Record<LlmTier, LlmModelId[]> = {
	mini: ['openai/gpt-5.4-mini', 'anthropic/claude-haiku-5-5'],
	full: ['openai/gpt-5.4', 'anthropic/claude-sonnet-5-5'],
	high: ['anthropic/claude-opus-5-5', 'openai/gpt-5.4'],
};

export const LLM_TIERS = Object.keys(LLM_ROSTER) as LlmTier[];

export const isLlmModelChoice = (value: string): value is LlmModelChoice =>
	value in LLM_ROSTER || /^(openai|anthropic)\/[\w.-]+$/.test(value);

export const providerOf = (model: LlmModelId): 'openai' | 'anthropic' =>
	model.startsWith('openai/') ? 'openai' : 'anthropic';

/** Paid per token, with no allowance: used only inside `llmPaid` */
export const isPaidModel = (model: LlmModelId): boolean => !model.startsWith('openai/');

/** The models to try, in order: a tier's roster, or the chosen model then the rest of its tier */
export const modelsFor = (choice: LlmModelChoice): LlmModelId[] => {
	if (choice in LLM_ROSTER) return LLM_ROSTER[choice as LlmTier];
	const model = choice as LlmModelId;
	const tier = LLM_TIERS.find(t => LLM_ROSTER[t].includes(model));
	return tier ? [model, ...LLM_ROSTER[tier].filter(m => m !== model)] : [model];
};
