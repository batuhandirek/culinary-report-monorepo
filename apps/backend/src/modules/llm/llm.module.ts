import { Module } from '@nestjs/common';

import { llmConfig } from './config/llm.config.js';
import { mastraProvider } from './providers/mastra.provider.js';
import { DecisionModelsService } from './services/decision-models.service.js';
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
			openRouterApiKey: llmConfig.OPENROUTER_AI_API_KEY,
			openRouterPerMinute: llmConfig.OPENROUTER_REQUESTS_PER_MINUTE,
			disabled: {
				openai: llmConfig.LLM_DISABLE_OPENAI,
				anthropic: llmConfig.LLM_DISABLE_ANTHROPIC,
				openrouter: llmConfig.LLM_DISABLE_OPENROUTER,
			},
			agentModels: llmConfig.LLM_AGENT_MODELS,
			ingestionOnly: llmConfig.LLM_INGESTION_ONLY,
			blockMs,
		}),
};

const decisionModelsProvider = {
	provide: DecisionModelsService,
	useFactory: () =>
		new DecisionModelsService({
			typesafeAiApiKey: llmConfig.TYPESAFE_AI_API_KEY,
			disabled: { typesafe: llmConfig.LLM_DISABLE_TYPESAFE },
			ingestionOnly: llmConfig.LLM_INGESTION_ONLY,
		}),
};

@Module({
	imports: [],
	controllers: [],
	providers: [mastraProvider, openAIAccountsProvider, llmModelsProvider, decisionModelsProvider],
	exports: [mastraProvider, OpenAIAccountsService, LlmModelsService, DecisionModelsService],
})
export class LLMModule {}
