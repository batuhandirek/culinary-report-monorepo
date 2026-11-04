import { Module } from '@nestjs/common';

import { llmConfig } from './config/llm.config.js';
import { mastraProvider } from './providers/mastra.provider.js';
import { LlmModelsService } from './services/llm-models.service.js';
import { OpenAIAccountsService } from './services/openai-accounts.service.js';

const blockMs = llmConfig.LLM_BLOCK_HOURS * 3_600_000;

const openAIAccountsProvider = {
	provide: OpenAIAccountsService,
	useFactory: () =>
		new OpenAIAccountsService({
			apiKeys: llmConfig.OPENAI_API_KEYS,
			rotateAfterRequests: llmConfig.OPENAI_ROTATE_AFTER_REQUESTS,
			blockMs,
			creditRetryMs: llmConfig.LLM_CREDIT_RETRY_MINUTES * 60_000,
		}),
};

const llmModelsProvider = {
	provide: LlmModelsService,
	inject: [OpenAIAccountsService],
	useFactory: (openAIAccounts: OpenAIAccountsService) =>
		new LlmModelsService({
			openAIAccounts,
			anthropicApiKey: llmConfig.ANTHROPIC_API_KEY,
			disabled: {
				openai: llmConfig.LLM_DISABLE_OPENAI,
				anthropic: llmConfig.LLM_DISABLE_ANTHROPIC,
			},
			agentModels: llmConfig.LLM_AGENT_MODELS,
			blockMs,
		}),
};

@Module({
	imports: [],
	controllers: [],
	providers: [mastraProvider, openAIAccountsProvider, llmModelsProvider],
	exports: [mastraProvider, OpenAIAccountsService, LlmModelsService],
})
export class LLMModule {}
