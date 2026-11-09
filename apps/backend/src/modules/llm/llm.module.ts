import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { AuthModule } from 'src/modules/auth/auth.module.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { EMBEDDING_ACCOUNT } from './accounts/embedding-account.js';
import { isKeyed } from './accounts/llm-account.js';
import { LLM_ACCOUNTS } from './accounts/llm-accounts.js';
import { OPENAI_EMBEDDING_ACCOUNT } from './accounts/openai.embedding-account.js';
import { TYPESAFE_CLASSIFIER_ACCOUNT } from './accounts/typesafe.classifier-account.js';
import { llmConfig } from './config/llm.config.js';
import { AdminLlmCallsController } from './controllers/admin.llm-calls.controller.js';
import { LlmCall } from './entities/llm-call.entity.js';
import { mastraProvider } from './providers/mastra.provider.js';
import { DecisionModelsService } from './services/decision-models.service.js';
import { DurableLlmService } from './services/durable-llm.service.js';
import { EmbeddingsService } from './services/embeddings.service.js';
import { LlmAccountQuotas } from './services/llm-account-quotas.service.js';
import { LlmCallsService } from './services/llm-calls.service.js';
import { LlmModelsService } from './services/llm-models.service.js';
import { OpenAIAccountsService } from './services/openai-accounts.service.js';
import { LlmWorkflows } from './workflows/llm.workflow.js';

const blockMs = llmConfig.LLM_BLOCK_HOURS * 3_600_000;

const accountOf = (provider: 'anthropic' | 'openrouter') => {
	const accounts = LLM_ACCOUNTS.filter(a => a.provider === provider);
	if (accounts.length > 1)
		throw new Error(`LLM_ACCOUNTS lists more than one ${provider} account`);
	return accounts[0];
};

/** What each account (`accounts/*.llm-account.ts`) used of its daily limits, counted from the ledger */
const quotasProvider = {
	provide: LlmAccountQuotas,
	inject: [LlmCallsService],
	useFactory: (calls: LlmCallsService) => new LlmAccountQuotas({ reader: calls }),
};

const openAIAccountsProvider = {
	provide: OpenAIAccountsService,
	inject: [LlmAccountQuotas],
	useFactory: (quotas: LlmAccountQuotas) =>
		new OpenAIAccountsService({
			accounts: LLM_ACCOUNTS.filter(a => a.provider === 'openai').filter(isKeyed),
			quotas,
			rotateAfterRequests: llmConfig.OPENAI_ROTATE_AFTER_REQUESTS,
			blockMs,
			creditRetryMs: llmConfig.LLM_CREDIT_RETRY_MINUTES * 60_000,
		}),
};

const llmModelsProvider = {
	provide: LlmModelsService,
	inject: [OpenAIAccountsService, LlmAccountQuotas, LlmCallsService],
	useFactory: (
		openAIAccounts: OpenAIAccountsService,
		quotas: LlmAccountQuotas,
		calls: LlmCallsService,
	) =>
		new LlmModelsService({
			openAIAccounts,
			quotas,
			recorder: calls,
			anthropic: accountOf('anthropic'),
			openRouter: accountOf('openrouter'),
			disabled: {
				openai: llmConfig.LLM_DISABLE_OPENAI,
				anthropic: llmConfig.LLM_DISABLE_ANTHROPIC,
				openrouter: llmConfig.LLM_DISABLE_OPENROUTER,
			},
			agentModels: llmConfig.LLM_AGENT_MODELS,
			blockMs,
		}),
};

const decisionModelsProvider = {
	provide: DecisionModelsService,
	inject: [LlmCallsService],
	useFactory: (calls: LlmCallsService) =>
		new DecisionModelsService({
			typesafe: TYPESAFE_CLASSIFIER_ACCOUNT,
			disabled: { typesafe: llmConfig.LLM_DISABLE_TYPESAFE },
			recorder: calls,
		}),
};

/**
 * The models, their accounts, embeddings and the call ledger: every agent, classifier and embedding call is
 * filed in `llm_calls` (`LlmCallsService`), which the accounts' daily counts are read from.
 */
@Module({
	imports: [MikroOrmModule.forFeature([LlmCall, User, UserSession]), AuthModule],
	controllers: [AdminLlmCallsController],
	providers: [
		LlmCallsService,
		{ provide: EMBEDDING_ACCOUNT, useValue: OPENAI_EMBEDDING_ACCOUNT },
		EmbeddingsService,
		mastraProvider,
		quotasProvider,
		openAIAccountsProvider,
		llmModelsProvider,
		decisionModelsProvider,
		// Every agent call through `DurableLlmService` is a workflow of its own (`LlmWorkflows.generate`, the `llm` queue)
		LlmWorkflows,
		DurableLlmService,
	],
	exports: [
		LlmCallsService,
		EmbeddingsService,
		mastraProvider,
		LlmAccountQuotas,
		OpenAIAccountsService,
		LlmModelsService,
		DecisionModelsService,
		DurableLlmService,
	],
})
export class LLMModule {}
