import { Transform } from 'class-transformer';
import {
	ArrayNotEmpty,
	IsArray,
	IsBoolean,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Min,
	ValidateIf,
} from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

import { isLlmModelChoice, LlmModelChoice } from '../constants/llm-models.constant.js';

/** `term-topic:full,topic-discovery:openai/gpt-5.4` → agent id → choice */
const parseAgentModels = (raw: unknown): Record<string, LlmModelChoice> => {
	if (raw && typeof raw === 'object') return raw as Record<string, LlmModelChoice>;
	const out: Record<string, LlmModelChoice> = {};
	for (const pair of String(raw ?? '')
		.split(',')
		.map(p => p.trim())
		.filter(Boolean)) {
		const at = pair.indexOf(':');
		const agent = pair.slice(0, at).trim();
		const choice = pair.slice(at + 1).trim();
		if (at < 1 || !isLlmModelChoice(choice))
			throw new Error(
				`LLM_AGENT_MODELS: "${pair}" is not agent-id:tier or agent-id:provider/model`,
			);
		out[agent] = choice;
	}
	return out;
};

export class LLMConfig {
	/** Comma-separated, one key per OpenAI account; `OpenAIAccountsService` rotates between them */
	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	@Transform(v =>
		String(v.value ?? '')
			.split(',')
			.map(key => key.trim())
			.filter(Boolean),
	)
	public OPENAI_API_KEYS: string[];

	/** Calls served by one account before the next one takes over */
	@IsNumber()
	@Min(1)
	@IsOptional()
	@Transform(v => Number(v.value))
	public OPENAI_ROTATE_AFTER_REQUESTS: number = 20;

	/**
	 * How long a provider account out of allowance or credit (or with a rejected key) is left out:
	 * an OpenAI account for that model, Anthropic for every Claude model
	 */
	@IsNumber()
	@Min(0.01)
	@IsOptional()
	@Transform(v => Number(v.value))
	public LLM_BLOCK_HOURS: number = 24;

	/**
	 * The paid Claude models of the roster (`LLM_ROSTER`), used only inside `llmPaid` (the eval's
	 * hand-started Opus work); unset leaves them out
	 */
	@IsString()
	@IsOptional()
	public ANTHROPIC_API_KEY?: string;

	/** Leaves every OpenAI model out of the roster (agents only: embeddings stay on OpenAI) */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public LLM_DISABLE_OPENAI: boolean = false;

	/** Leaves every Claude model out of the roster */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public LLM_DISABLE_ANTHROPIC: boolean = false;

	/**
	 * Agents put on another tier or model than their own `getModel()`, by agent id
	 * (`term-topic:full`). Free models only, as everywhere outside `llmPaid`: `high` runs on
	 * gpt-5.4, and a Claude model alone serves nothing.
	 */
	@IsOptional()
	@Transform(v => parseAgentModels(v.value))
	public LLM_AGENT_MODELS: Record<string, LlmModelChoice> = {};

	/**
	 * One-off: when set, the boot queues the topics' Claude pass (`TopicsClaudePassService`) with
	 * this many dollars of the Anthropic credit at most. Set for one deploy, then removed.
	 */
	@IsNumber()
	@Min(0)
	@IsOptional()
	@Transform(v => Number(v.value))
	public TOPICS_CLAUDE_PASS_USD: number = 0;

	/**
	 * One-off: when set, the boot queues aspect discovery (`AspectDiscoveryService`, free: mini on
	 * the allowance) for every active city. `dry` names the groups and logs what it would create;
	 * `run` creates the aspects and has agent B read their claims again. Set for one boot, then removed.
	 */
	@IsIn(['off', 'dry', 'run'])
	@IsOptional()
	public ASPECT_DISCOVERY_ON_BOOT: 'off' | 'dry' | 'run' = 'off';

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public POSTHOG_LLM_EXPORT_IS_ENABLED: boolean = false;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: LLMConfig) => {
		return obj.POSTHOG_LLM_EXPORT_IS_ENABLED;
	})
	public POSTHOG_API_KEY: string;

	@IsString()
	@IsNotEmpty()
	@ValidateIf((obj: LLMConfig) => {
		return obj.POSTHOG_LLM_EXPORT_IS_ENABLED;
	})
	public POSTHOG_HOST: string;

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public REASONING_SUMMARY_IS_ENABLED: boolean = false;

	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === 'true')
	public IS_LLM_VERBOSE: boolean = false;
}

const llmConfig = validateEnv(LLMConfig);
export { llmConfig };
