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

	/** How long an account out of credits (or with a rejected key) is left out, per model */
	@IsNumber()
	@Min(0.01)
	@IsOptional()
	@Transform(v => Number(v.value))
	public OPENAI_BLOCK_HOURS: number = 24;

	@IsString()
	public ANTHROPIC_API_KEY: string;

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
