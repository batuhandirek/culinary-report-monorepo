/** Who answered an LLM call (`LlmCall.provider`); `apify` stays in the database enum, unused */
export enum LlmCallProviderEnum {
	APIFY = 'apify',
	OPENAI = 'openai',
	ANTHROPIC = 'anthropic',
	OPENROUTER = 'openrouter',
	TYPESAFE = 'typesafe',
}

/** What an LLM call did: an agent's answer, a classifier's decision, an embedding */
export enum LlmCallKindEnum {
	GENERATE = 'generate',
	DECIDE = 'decide',
	EMBED = 'embed',
}

/** The provider of a model id (`openai/gpt-5.4-mini`, `anthropic/…`, `openrouter/…`, `typesafe-ai/…`) */
export const llmCallProviderOf = (model: string | null | undefined): LlmCallProviderEnum | null => {
	if (!model) return null;
	const prefix = model.slice(0, model.indexOf('/'));
	switch (prefix) {
		case 'openai':
			return LlmCallProviderEnum.OPENAI;
		case 'anthropic':
			return LlmCallProviderEnum.ANTHROPIC;
		case 'openrouter':
			return LlmCallProviderEnum.OPENROUTER;
		case 'typesafe-ai':
			return LlmCallProviderEnum.TYPESAFE;
		default:
			return null;
	}
};
