import { Transform } from 'class-transformer';
import {
	ArrayNotEmpty,
	IsArray,
	IsBoolean,
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
	 * The longest a provider account is left out: Anthropic for every Claude model, an OpenAI
	 * account with a rejected key. An OpenAI account out of its daily allowance waits for 00:00
	 * UTC instead, one out of credit `LLM_CREDIT_RETRY_MINUTES`, never longer than this
	 */
	@IsNumber()
	@Min(0.01)
	@IsOptional()
	@Transform(v => Number(v.value))
	public LLM_BLOCK_HOURS: number = 24;

	/** How soon an OpenAI account out of credit is tried again: credit can be added any time */
	@IsNumber()
	@Min(1)
	@IsOptional()
	@Transform(v => Number(v.value))
	public LLM_CREDIT_RETRY_MINUTES: number = 60;

	/**
	 * The paid Claude models of the roster (`LLM_ROSTER`), used only inside `llmPaid` (the eval's
	 * hand-started Opus work); unset leaves them out
	 */
	@IsString()
	@IsOptional()
	public ANTHROPIC_API_KEY?: string;

	/**
	 * OpenRouter, for its free models (`OPENROUTER_FREE_MODEL`, `<org>/<model>:free`: $0, 20 requests
	 * a minute, 50 a day, 1,000 once $10 of credit was ever bought), which the roster falls to once
	 * OpenAI's allowance is out; unset leaves them out
	 */
	@IsString()
	@IsOptional()
	public OPENROUTER_AI_API_KEY?: string;

	/** OpenRouter's cap on free-model requests a minute: the roster spaces its calls to stay under it */
	@IsNumber()
	@Min(1)
	@IsOptional()
	@Transform(v => Number(v.value))
	public OPENROUTER_REQUESTS_PER_MINUTE: number = 20;

	/**
	 * TypeSafe's decision models (Jev), which the classifiers (`*.classifier.ts`) run on: paid per
	 * call (the claim-labels classifier in production, every other one only inside `llmPaid`);
	 * unset, no classifier can run and the claims wait unlabelled
	 */
	@IsString()
	@IsOptional()
	public TYPESAFE_AI_API_KEY?: string;

	/** Leaves TypeSafe's decision models out: no classifier runs (the pipeline waits, as with no LLM) */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public LLM_DISABLE_TYPESAFE: boolean = false;

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
	 * Only the reading runs: the agents and classifiers marked `ingestion` (a post, a review, a
	 * comment, a press page, a claim's labels, a wording's topics, a place's match) and the backlogs
	 * marked so. Every other agent call fails at once as with no model left (reports keep their data
	 * without the written part, the front page its fallback lines, the analyst says so), and the
	 * other backlogs wait in their queue. Work started by hand inside `llmPaid` is not paused.
	 */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public LLM_INGESTION_ONLY: boolean = false;

	/** Leaves OpenRouter's free models out of the roster */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public LLM_DISABLE_OPENROUTER: boolean = false;

	/**
	 * Agents put on another tier or model than their own `getModel()`, by agent id
	 * (`term-topic:full`, `post-claims:openrouter/nvidia/nemotron-3.5-super-vl:free`). Free models
	 * only, as everywhere outside `llmPaid`: `high` runs on gpt-5.4, and a Claude model alone serves
	 * nothing.
	 */
	@IsOptional()
	@Transform(v => parseAgentModels(v.value))
	public LLM_AGENT_MODELS: Record<string, LlmModelChoice> = {};

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
