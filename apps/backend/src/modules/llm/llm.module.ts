import { Module } from '@nestjs/common';

import { llmConfig } from './config/llm.config.js';
import { mastraProvider } from './providers/mastra.provider.js';
import { OpenAIAccountsService } from './services/openai-accounts.service.js';

const openAIAccountsProvider = {
	provide: OpenAIAccountsService,
	useFactory: () =>
		new OpenAIAccountsService({
			apiKeys: llmConfig.OPENAI_API_KEYS,
			rotateAfterRequests: llmConfig.OPENAI_ROTATE_AFTER_REQUESTS,
			blockMs: llmConfig.OPENAI_BLOCK_HOURS * 3_600_000,
		}),
};

@Module({
	imports: [],
	controllers: [],
	providers: [mastraProvider, openAIAccountsProvider],
	exports: [mastraProvider, OpenAIAccountsService],
})
export class LLMModule {}
